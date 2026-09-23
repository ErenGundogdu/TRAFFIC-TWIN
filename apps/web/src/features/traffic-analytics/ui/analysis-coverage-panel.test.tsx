import { historyResponseSchema } from "@traffic-twin/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalysisCoveragePanel } from "./analysis-coverage-panel";

describe("AnalysisCoveragePanel", () => {
  it("explains verified source gaps separately from unimported dates", () => {
    const history = historyResponseSchema.parse({
      query: {
        assetIds: ["station-a"],
        metric: "vehicle-count",
        direction: 1,
        resolution: "day",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-05T00:00:00.000Z",
      },
      resolution: "day",
      timeZone: "Europe/Helsinki",
      coverage: {
        status: "PARTIAL",
        requestedDays: 4,
        availableDays: 1,
        missingDates: ["2026-09-02", "2026-09-03", "2026-09-04"],
        missingDetails: [
          { assetId: "station-a", date: "2026-09-02", reason: "SOURCE_GAP" },
          { assetId: "station-a", date: "2026-09-03", reason: "NOT_IMPORTED" },
          { assetId: "station-a", date: "2026-09-04", reason: "SOURCE_ERROR" },
        ],
      },
      series: [],
      summaries: [],
    });

    render(<AnalysisCoveragePanel history={history} stations={[]} />);

    expect(screen.getByText("Kaynak raporunda ölçüm yok: 1")).toBeTruthy();
    expect(screen.getByText("Henüz içeri alınmadı: 1")).toBeTruthy();
    expect(screen.getByText("Kaynak raporu hata verdi: 1")).toBeTruthy();
    expect(screen.getByText(/station-a · 2026-09-02/)).toBeTruthy();
  });
});
