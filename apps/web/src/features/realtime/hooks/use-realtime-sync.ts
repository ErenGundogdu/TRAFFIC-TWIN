"use client";

import {
  REALTIME_EVENTS,
  noteAcknowledgementSchema,
  operatorNoteSchema,
  trafficBatchSchema,
  type CreateOperatorNote,
  type NoteAcknowledgement,
  type OperatorNote,
  type StationCatalogResponse,
} from "@traffic-twin/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { operatorNotesQueryKey } from "@/features/operator-notes/hooks/use-operator-notes";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export function useRealtimeSync(coverageAreaId: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    const socket = io(apiUrl, { autoConnect: false });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit(REALTIME_EVENTS.coverageSubscribe, { coverageAreaId });
      void queryClient.invalidateQueries({
        queryKey: ["station-catalog", coverageAreaId],
      });
      void queryClient.invalidateQueries({ queryKey: ["operator-notes"] });
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
                stations: result.data.stations,
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

  return { status, createNote };
}
