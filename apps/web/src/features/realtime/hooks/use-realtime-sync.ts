"use client";

import {
  REALTIME_EVENTS,
  fieldReportAcknowledgementSchema,
  fieldReportSchema,
  noteAcknowledgementSchema,
  operatorNoteSchema,
  trafficBatchSchema,
  type CreateFieldReport,
  type CreateOperatorNote,
  type FieldReport,
  type FieldReportAcknowledgement,
  type NoteAcknowledgement,
  type OperatorNote,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type StationCatalogResponse,
} from "@traffic-twin/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { operatorNotesQueryKey } from "@/features/operator-notes";
import { fieldReportsQueryKey } from "@/features/field-reports";
import { webConfig } from "@/shared/config";

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export function useRealtimeSync(coverageAreaId: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      webConfig.backendUrl,
      { autoConnect: false },
    );
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit(REALTIME_EVENTS.coverageSubscribe, { coverageAreaId });
      void queryClient.invalidateQueries({
        queryKey: ["station-catalog", coverageAreaId],
      });
      void queryClient.invalidateQueries({ queryKey: ["operator-notes"] });
      void queryClient.invalidateQueries({ queryKey: ["field-reports"] });
    });
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on(REALTIME_EVENTS.trafficBatch, (payload: unknown) => {
      const result = trafficBatchSchema.safeParse(payload);
      if (!result.success || result.data.coverageAreaId !== coverageAreaId)
        return;

      queryClient.setQueryData<StationCatalogResponse>(
        ["station-catalog", coverageAreaId],
        (current) =>
          current
            ? {
                ...current,
                source: {
                  ...current.source,
                  status: "AVAILABLE",
                  updatedAt: result.data.sourceUpdatedAt,
                  fetchedAt: result.data.emittedAt,
                },
                stations: result.data.stations.map((station) => {
                  const previous = current.stations.find(
                    (item) => item.id === station.id,
                  );
                  const knownDirections = new Map(
                    previous?.lanes.map((lane) => [lane.lane, lane.direction]),
                  );
                  return {
                    ...station,
                    lanes: station.lanes.map((lane) => ({
                      ...lane,
                      // Live payloads do not carry the historical lane-direction evidence.
                      direction:
                        lane.direction ??
                        knownDirections.get(lane.lane) ??
                        null,
                    })),
                  };
                }),
              }
            : current,
      );
    });
    socket.on(REALTIME_EVENTS.noteCreated, (payload: unknown) => {
      const result = operatorNoteSchema.safeParse(payload);
      if (!result.success || result.data.coverageAreaId !== coverageAreaId)
        return;

      queryClient.setQueryData<OperatorNote[]>(
        operatorNotesQueryKey(result.data.assetId),
        (current = []) => [
          result.data,
          ...current.filter((note) => note.id !== result.data.id),
        ],
      );
    });
    socket.on(REALTIME_EVENTS.fieldReportCreated, (payload: unknown) => {
      const result = fieldReportSchema.safeParse(payload);
      if (!result.success || result.data.coverageAreaId !== coverageAreaId)
        return;

      queryClient.setQueryData<FieldReport[]>(
        fieldReportsQueryKey(coverageAreaId),
        (current = []) => [
          result.data,
          ...current.filter((report) => report.id !== result.data.id),
        ],
      );
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [coverageAreaId, queryClient]);

  const createNote = useCallback(
    (input: CreateOperatorNote): Promise<NoteAcknowledgement> =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({
            ok: false,
            error: {
              code: "REALTIME_DISCONNECTED",
              message: "Canlı bağlantı kurulmadan not kaydedilemez.",
            },
          });
          return;
        }

        socket
          .timeout(8_000)
          .emit(
            REALTIME_EVENTS.noteCreate,
            input,
            (error: Error | null, payload: unknown) => {
              if (error) {
                resolve({
                  ok: false,
                  error: {
                    code: "ACK_TIMEOUT",
                    message: "Sunucudan kayıt onayı alınamadı.",
                  },
                });
                return;
              }

              const result = noteAcknowledgementSchema.safeParse(payload);
              resolve(
                result.success
                  ? result.data
                  : {
                      ok: false,
                      error: {
                        code: "INVALID_ACK",
                        message: "Sunucudan geçersiz bir yanıt alındı.",
                      },
                    },
              );
            },
          );
      }),
    [],
  );

  const createFieldReport = useCallback(
    (input: CreateFieldReport): Promise<FieldReportAcknowledgement> =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({
            ok: false,
            error: {
              code: "REALTIME_DISCONNECTED",
              message: "Canlı bağlantı kurulmadan bildirim kaydedilemez.",
            },
          });
          return;
        }

        socket
          .timeout(8_000)
          .emit(
            REALTIME_EVENTS.fieldReportCreate,
            input,
            (error: Error | null, payload: unknown) => {
              if (error) {
                resolve({
                  ok: false,
                  error: {
                    code: "ACK_TIMEOUT",
                    message: "Sunucudan bildirim onayı alınamadı.",
                  },
                });
                return;
              }

              const result =
                fieldReportAcknowledgementSchema.safeParse(payload);
              resolve(
                result.success
                  ? result.data
                  : {
                      ok: false,
                      error: {
                        code: "INVALID_ACK",
                        message:
                          "Sunucudan geçersiz bir bildirim yanıtı alındı.",
                      },
                    },
              );
            },
          );
      }),
    [],
  );

  return { status, createNote, createFieldReport };
}
