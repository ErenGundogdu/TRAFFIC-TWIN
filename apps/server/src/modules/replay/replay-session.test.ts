import type { ReplayFrame } from "@traffic-twin/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReplaySession } from "./replay-session.js";

const frames: ReplayFrame[] = [
  {
    timestamp: "2026-09-02T21:00:00Z",
    values: [
      {
        assetId: "fintraffic-tms:20002",
        averageSpeedKmh: 88,
        vehicleCount: 3,
        sampleCount: 3,
      },
    ],
  },
  {
    timestamp: "2026-09-02T21:01:00Z",
    values: [
      {
        assetId: "fintraffic-tms:20002",
        averageSpeedKmh: 92,
        vehicleCount: 4,
        sampleCount: 4,
      },
    ],
  },
];

describe("ReplaySession", () => {
  afterEach(() => vi.useRealTimers());

  it("supports play, pause, speed change, resume and completion", () => {
    vi.useFakeTimers();
    const emitFrame = vi.fn();
    const emitEnded = vi.fn();
    const session = new ReplaySession(frames, 1, emitFrame, emitEnded);

    session.start();
    vi.advanceTimersByTime(1_000);
    expect(emitFrame).toHaveBeenCalledWith(frames[0]);

    session.pause();
    vi.advanceTimersByTime(5_000);
    expect(emitFrame).toHaveBeenCalledTimes(1);

    session.setSpeed(2);
    session.resume();
    vi.advanceTimersByTime(500);
    expect(emitFrame).toHaveBeenLastCalledWith(frames[1]);
    vi.advanceTimersByTime(500);
    expect(emitEnded).toHaveBeenCalledOnce();
  });

  it("seeks to the nearest real frame and continues from there", () => {
    vi.useFakeTimers();
    const emitFrame = vi.fn();
    const session = new ReplaySession(frames, 1, emitFrame, vi.fn());

    session.start();
    session.seek("2026-09-02T21:00:40.000Z");

    expect(emitFrame).toHaveBeenCalledWith(frames[1]);
  });

  it("keeps a paused replay paused after seeking", () => {
    vi.useFakeTimers();
    const emitFrame = vi.fn();
    const session = new ReplaySession(frames, 1, emitFrame, vi.fn());

    session.start();
    session.pause();
    session.seek("2026-09-02T21:00:00.000Z");
    vi.advanceTimersByTime(5_000);

    expect(emitFrame).toHaveBeenCalledTimes(1);
    expect(emitFrame).toHaveBeenCalledWith(frames[0]);
  });
});
