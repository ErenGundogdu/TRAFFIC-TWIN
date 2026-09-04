"use client";

import {
  REALTIME_EVENTS,
  replayFrameSchema,
  replayStartAcknowledgementSchema,
  type ReplayControl,
  type ReplayFrame,
  type ReplaySpeed,
  type ReplayStart,
} from "@traffic-twin/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ReplayStatus =
  "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export function useReplay() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ReplayStatus>("idle");
  const [frame, setFrame] = useState<ReplayFrame | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    const socket = io(apiUrl);
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
      return;
    }

    setFrame(null);
    setStatus("loading");
    socket
      .timeout(8_000)
      .emit(
        REALTIME_EVENTS.replayStart,
        command,
        (error: Error | null, payload: unknown) => {
          if (error) {
            setStatus("error");
            return;
          }
          const result = replayStartAcknowledgementSchema.safeParse(payload);
          if (!result.success || !result.data.ok) {
            setStatus("error");
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
    if (command.action === "stop") {
      setStatus("idle");
      setFrame(null);
    }
  }, []);

  const setSpeed = useCallback(
    (speed: ReplaySpeed) => control({ action: "set-speed", speed }),
    [control],
  );

  return { status, frame, frameCount, start, control, setSpeed };
}
