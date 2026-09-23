import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReplayTimeline } from "./replay-timeline";

afterEach(cleanup);

describe("ReplayTimeline", () => {
  it("seeks with a canonical UTC timestamp", () => {
    const onSeek = vi.fn();
    render(
      <ReplayTimeline
        start="2026-09-03T08:00:00.000Z"
        end="2026-09-03T09:00:00.000Z"
        current="2026-09-03T08:15:00.000Z"
        timeZone="Europe/Helsinki"
        resolution="minute"
        disabled={false}
        onSeek={onSeek}
      />,
    );

    fireEvent.change(screen.getByRole("slider", { name: "Replay zamanı" }), {
      target: { value: new Date("2026-09-03T08:30:00.000Z").getTime() },
    });

    expect(onSeek).toHaveBeenCalledWith("2026-09-03T08:30:00.000Z");
  });

  it("keeps seeking disabled until a replay session exists", () => {
    render(
      <ReplayTimeline
        start="2026-09-03T08:00:00.000Z"
        end="2026-09-03T09:00:00.000Z"
        timeZone="Europe/Helsinki"
        resolution="minute"
        disabled
        onSeek={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("slider", { name: "Replay zamanı" }),
    ).toBeDisabled();
  });

  it("steps by a full hour when replaying hour-resolution data", () => {
    const onSeek = vi.fn();
    render(
      <ReplayTimeline
        start="2026-09-03T00:00:00.000Z"
        end="2026-09-03T23:00:00.000Z"
        current="2026-09-03T08:00:00.000Z"
        timeZone="Europe/Helsinki"
        resolution="hour"
        disabled={false}
        onSeek={onSeek}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bir saat ileri git" }));
    expect(onSeek).toHaveBeenCalledWith("2026-09-03T09:00:00.000Z");
    expect(
      screen.getByRole("slider", { name: "Replay zamanı" }),
    ).toHaveAttribute("step", String(3_600_000));
  });
});
