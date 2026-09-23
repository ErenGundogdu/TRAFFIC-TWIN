"use client";

import {
  REALTIME_EVENTS,
  replayFrameSchema,
  replayStartAcknowledgementSchema,
  type ReplayControl,
  type ReplayFrame,
  type ReplayResolution,
  type ReplaySpeed,
  type ReplayStart,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@traffic-twin/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { webConfig } from "@/shared/config";

export type ReplayStatus =
  "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export function useReplay() {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const [status, setStatus] = useState<ReplayStatus>("idle");
  const [frame, setFrame] = useState<ReplayFrame | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [resolution, setResolution] = useState<ReplayResolution>("minute");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      webConfig.backendUrl,
    );
    socketRef.current = socket;
    socket.on(REALTIME_EVENTS.replayFrame, (payload: unknown) => {
      const result = replayFrameSchema.safeParse(payload);
      if (result.success) setFrame(result.data);
    });
    socket.on(REALTIME_EVENTS.replayEnded, () => setStatus("ended"));

    return () => {
      socket.emit(REALTIME_EVENTS.replayControl, { action: "stop" });
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const start = useCallback((command: ReplayStart) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setStatus("error");
      setErrorMessage("Canlı bağlantı kurulamadığı için Replay başlatılamadı.");
      return;
    }

    setFrame(null);
    setFrameCount(0);
    setErrorMessage(null);
    setStatus("loading");
    setResolution(command.resolution);
    socket
      .timeout(8_000)
      .emit(
        REALTIME_EVENTS.replayStart,
        command,
        (error: Error | null, payload: unknown) => {
          if (error) {
            setStatus("error");
            setErrorMessage("Replay isteği zaman aşımına uğradı.");
            return;
          }
          const result = replayStartAcknowledgementSchema.safeParse(payload);
          if (!result.success) {
            setStatus("error");
            setErrorMessage("Sunucudan geçerli bir Replay yanıtı alınamadı.");
            return;
          }
          if (!result.data.ok) {
            setStatus("error");
            setErrorMessage(result.data.error.message);
            return;
          }
          setFrameCount(result.data.frameCount);
          setStatus(result.data.frameCount > 0 ? "playing" : "ended");
        },
      );
  }, []);

  const control = useCallback((command: ReplayControl) => {
    socketRef.current?.emit(REALTIME_EVENTS.replayControl, command);
    if (command.action === "pause") setStatus("paused");
    if (command.action === "resume") setStatus("playing");
    if (command.action === "seek") {
      setStatus((current) => (current === "ended" ? "paused" : current));
    }
    if (command.action === "stop") {
      setStatus("idle");
      setFrame(null);
      setFrameCount(0);
      setErrorMessage(null);
    }
  }, []);

  const setSpeed = useCallback(
    (speed: ReplaySpeed) => control({ action: "set-speed", speed }),
    [control],
  );

  const seek = useCallback(
    (timestamp: string) => control({ action: "seek", timestamp }),
    [control],
  );

  return {
    status,
    frame,
    frameCount,
    resolution,
    errorMessage,
    start,
    control,
    setSpeed,
    seek,
  };
}

export type ReplayController = ReturnType<typeof useReplay>;
