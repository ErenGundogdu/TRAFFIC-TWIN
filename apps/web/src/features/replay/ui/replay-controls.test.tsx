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
    expect(screen.getByText(/en fazla iki günlük/)).toBeInTheDocument();
  });
});

function createReplayController(): ReplayController {
  return {
    status: "idle",
    frame: null,
    frameCount: 0,
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
