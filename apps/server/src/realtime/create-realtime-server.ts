import {
  REALTIME_EVENTS,
  coverageSubscriptionSchema,
  createOperatorNoteSchema,
  replayControlSchema,
  replayStartSchema,
  type NoteAcknowledgement,
  type ReplayStartAcknowledgement,
  type TrafficBatch,
} from "@traffic-twin/contracts";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import type { OperatorNoteService } from "../modules/operator-notes/operator-note-service.js";
import type { ReplayService } from "../modules/replay/replay-service.js";
import { ReplaySession } from "../modules/replay/replay-session.js";

const coverageRoom = (coverageAreaId: string) => `coverage:${coverageAreaId}`;

export function createRealtimeServer(
  httpServer: HttpServer,
  clientOrigin: string,
  noteService: OperatorNoteService,
  replayService: Pick<ReplayService, "load">,
) {
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin },
  });

  io.on("connection", (socket) => {
    let replaySession: ReplaySession | undefined;
    socket.on(REALTIME_EVENTS.coverageSubscribe, (payload: unknown) => {
      const result = coverageSubscriptionSchema.safeParse(payload);
      if (result.success) {
        void socket.join(coverageRoom(result.data.coverageAreaId));
      }
    });

    socket.on(
      REALTIME_EVENTS.noteCreate,
      async (
        payload: unknown,
        acknowledge: ((ack: NoteAcknowledgement) => void) | undefined,
      ) => {
        const respond =
          typeof acknowledge === "function" ? acknowledge : () => undefined;
        try {
          const input = createOperatorNoteSchema.parse(payload);
          const note = await noteService.create(input);
          const acknowledgement = { ok: true as const, note };

          respond(acknowledgement);
          io.to(coverageRoom(note.coverageAreaId)).emit(
            REALTIME_EVENTS.noteCreated,
            note,
          );
        } catch {
          respond({
            ok: false,
            error: {
              code: "INVALID_OPERATOR_NOTE",
              message: "Not kaydedilemedi. Alanları ve istasyonu kontrol edin.",
            },
          });
        }
      },
    );

    socket.on(
      REALTIME_EVENTS.replayStart,
      async (
        payload: unknown,
        acknowledge:
          ((acknowledgement: ReplayStartAcknowledgement) => void) | undefined,
      ) => {
        const respond =
          typeof acknowledge === "function" ? acknowledge : () => undefined;
        try {
          const command = replayStartSchema.parse(payload);
          const frames = await replayService.load(command);
          replaySession?.stop();
          replaySession = new ReplaySession(
            frames,
            command.speed,
            (frame) => socket.emit(REALTIME_EVENTS.replayFrame, frame),
            () => socket.emit(REALTIME_EVENTS.replayEnded),
          );
          respond({ ok: true, frameCount: frames.length });
          replaySession.start();
        } catch {
          respond({
            ok: false,
            error: {
              code: "INVALID_REPLAY",
              message:
                "Replay başlatılamadı. Aralığı ve varlıkları kontrol edin.",
            },
          });
        }
      },
    );

    socket.on(REALTIME_EVENTS.replayControl, (payload: unknown) => {
      const result = replayControlSchema.safeParse(payload);
      if (!result.success || !replaySession) return;

      if (result.data.action === "pause") replaySession.pause();
      if (result.data.action === "resume") replaySession.resume();
      if (result.data.action === "stop") replaySession.stop();
      if (result.data.action === "set-speed") {
        replaySession.setSpeed(result.data.speed);
      }
      if (result.data.action === "seek") {
        replaySession.seek(result.data.timestamp);
      }
    });

    socket.on("disconnect", () => replaySession?.stop());
  });

  return {
    close: () => io.close(),
    publishTrafficBatch(batch: TrafficBatch) {
      io.to(coverageRoom(batch.coverageAreaId)).emit(
        REALTIME_EVENTS.trafficBatch,
        batch,
      );
    },
  };
}
