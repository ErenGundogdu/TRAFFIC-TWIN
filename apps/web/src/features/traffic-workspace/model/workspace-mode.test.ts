import { describe, expect, it } from "vitest";

import { parseWorkspaceMode, setWorkspaceMode } from "./workspace-mode";

describe("workspace mode URL state", () => {
  it("uses live mode for absent and unsupported mode values", () => {
    expect(parseWorkspaceMode(null)).toBe("live");
    expect(parseWorkspaceMode("simulation")).toBe("live");
  });

  it("preserves analysis filters while changing modes", () => {
    const current = new URLSearchParams(
      "station=fintraffic-tms%3A20002&metric=vehicle-count",
    );
    const analysis = setWorkspaceMode(current, "analysis");
    const live = setWorkspaceMode(analysis, "live");

    expect(analysis.get("mode")).toBe("analysis");
    expect(analysis.get("station")).toBe("fintraffic-tms:20002");
    expect(analysis.get("metric")).toBe("vehicle-count");
    expect(live.get("mode")).toBeNull();
    expect(live.get("metric")).toBe("vehicle-count");
  });

  it("keeps filters when opening the replay workspace", () => {
    const current = new URLSearchParams(
      "station=fintraffic-tms%3A20002&from=2026-09-03&to=2026-09-03",
    );
    const replay = setWorkspaceMode(current, "replay");

    expect(parseWorkspaceMode(replay.get("mode"))).toBe("replay");
    expect(replay.get("station")).toBe("fintraffic-tms:20002");
    expect(replay.get("from")).toBe("2026-09-03");
    expect(replay.get("to")).toBe("2026-09-03");
  });
});
