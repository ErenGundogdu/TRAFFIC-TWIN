import type { HistoryQuery, HistoryResponse } from "@traffic-twin/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReplayController } from "../hooks/use-replay";
import { ReplayControls } from "./replay-controls";

afterEach(cleanup);

describe("ReplayControls", () => {
  it("starts replay with the selected real history query", () => {
    const replay = createReplayController();
    render(
      <ReplayControls
        coverageAreaId="helsinki"
        history={history}
        query={history.query}
        replay={replay}
        seriesLabels={{ station: "Hirvisuo · Yön 1" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Baştan oynat" }));

    expect(replay.start).toHaveBeenCalledWith({
      coverageAreaId: "helsinki",
      assetIds: ["station"],
      direction: 1,
      from: "2026-09-03T00:00:00.000Z",
      to: "2026-09-04T00:00:00.000Z",
      speed: 8,
      resolution: "minute",
    });
    expect(screen.getByText(/Henüz başlatılmadı/)).toBeInTheDocument();
  });

  it("keeps replay disabled for ranges longer than two days", () => {
    const replay = createReplayController();
    const longQuery: HistoryQuery = {
      ...history.query,
      to: "2026-09-07T00:00:00.000Z",
    };

    render(
      <ReplayControls
        coverageAreaId="helsinki"
        history={history}
        query={longQuery}
        replay={replay}
        seriesLabels={{}}
      />,
    );

    expect(screen.getByRole("button", { name: "Baştan oynat" })).toBeDisabled();
    expect(screen.getByText(/en fazla 2 günlük/)).toBeInTheDocument();
  });

  it("explains why a daily summary cannot be replayed", () => {
    const replay = createReplayController();
    render(
      <ReplayControls
        coverageAreaId="helsinki"
        history={{ ...history, resolution: "day" }}
        query={{ ...history.query, resolution: "day" }}
        replay={replay}
        seriesLabels={{}}
      />,
    );

    expect(screen.getByRole("button", { name: "Baştan oynat" })).toBeDisabled();
    expect(
      screen.getByText(/dakika veya saat ölçümleri gerekir/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: "Replay zamanı" }),
    ).not.toBeInTheDocument();
  });

  it("plays hour-resolution data from the bulk statistics import", () => {
    const replay = createReplayController();
    const hourHistory: HistoryResponse = {
      ...history,
      resolution: "hour",
      series: [
        {
          assetId: "station",
          assetName: "Hirvisuo",
          points: [
            {
              timestamp: "2026-09-03T08:00:00.000Z",
              value: 84,
              sampleCount: 890,
            },
            {
              timestamp: "2026-09-03T09:00:00.000Z",
              value: 82,
              sampleCount: 910,
            },
          ],
        },
      ],
    };
    render(
      <ReplayControls
        coverageAreaId="helsinki"
        history={hourHistory}
        query={{ ...history.query, resolution: "hour" }}
        replay={replay}
        seriesLabels={{}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Baştan oynat" }),
    ).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Baştan oynat" }));
    expect(replay.start).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: "hour" }),
    );
    expect(screen.getByLabelText("Bir saat geri git")).toBeInTheDocument();
  });

  it("allows a much longer range for hour-resolution replay than for minute", () => {
    const replay = createReplayController();
    const longHourHistory: HistoryResponse = {
      ...history,
      resolution: "hour",
      series: [
        {
          assetId: "station",
          assetName: "Hirvisuo",
          points: [
            {
              timestamp: "2026-08-01T08:00:00.000Z",
              value: 84,
              sampleCount: 890,
            },
            {
              timestamp: "2026-08-20T09:00:00.000Z",
              value: 82,
              sampleCount: 910,
            },
          ],
        },
      ],
    };

    render(
      <ReplayControls
        coverageAreaId="helsinki"
        history={longHourHistory}
        query={{
          ...history.query,
          resolution: "hour",
          from: "2026-08-01T00:00:00.000Z",
          to: "2026-08-20T00:00:00.000Z",
        }}
        replay={replay}
        seriesLabels={{}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Baştan oynat" }),
    ).not.toBeDisabled();
  });

  it("shows the server explanation when replay data cannot be paired", () => {
    render(
      <ReplayControls
        coverageAreaId="helsinki"
        history={history}
        query={history.query}
        replay={{
          ...createReplayController(),
          status: "error",
          errorMessage:
            "Replay için hız ve geçiş bilgisi bulunan en az iki gerçek ölçüm gerekir.",
        }}
        seriesLabels={{}}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /hız ve geçiş bilgisi bulunan en az iki gerçek ölçüm gerekir/,
    );
  });
});

function createReplayController(): ReplayController {
  return {
    status: "idle",
    frame: null,
    frameCount: 0,
    resolution: "minute",
    errorMessage: null,
    start: vi.fn(),
    control: vi.fn(),
    setSpeed: vi.fn(),
    seek: vi.fn(),
  };
}

const history: HistoryResponse = {
  query: {
    assetIds: ["station"],
    metric: "average-speed-kmh",
    direction: 1,
    resolution: "minute",
    from: "2026-09-03T00:00:00.000Z",
    to: "2026-09-04T00:00:00.000Z",
  },
  resolution: "minute",
  timeZone: "Europe/Helsinki",
  coverage: {
    status: "COMPLETE",
    requestedDays: 1,
    availableDays: 1,
    missingDates: [],
    missingDetails: [],
  },
  series: [
    {
      assetId: "station",
      assetName: "Hirvisuo",
      points: [
        {
          timestamp: "2026-09-03T08:00:00.000Z",
          value: 84,
          sampleCount: 1,
        },
        {
          timestamp: "2026-09-03T08:01:00.000Z",
          value: 82,
          sampleCount: 1,
        },
      ],
    },
  ],
  summaries: [],
};
