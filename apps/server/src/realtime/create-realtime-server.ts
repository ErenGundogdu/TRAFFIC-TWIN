import {
  REALTIME_EVENTS,
  coverageSubscriptionSchema,
  createOperatorNoteSchema,
  type NoteAcknowledgement,
  type TrafficBatch,
} from "@traffic-twin/contracts";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import type { OperatorNoteService } from "../modules/operator-notes/operator-note-service.js";

const coverageRoom = (coverageAreaId: string) => `coverage:${coverageAreaId}`;

export function createRealtimeServer(
  httpServer: HttpServer,
  clientOrigin: string,
  noteService: OperatorNoteService,
) {
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin },
  });

  io.on("connection", (socket) => {
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
