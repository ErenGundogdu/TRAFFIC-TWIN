import { describe, expect, it, vi } from "vitest";

import { RoadContextWarmer } from "./road-context-warmer.js";

function setup({
  stationIds = ["a", "b", "c"],
  existing = ["b"],
  getStationRoadContext = vi.fn(async () => undefined),
}: {
  stationIds?: string[];
  existing?: string[];
  getStationRoadContext?: ReturnType<typeof vi.fn>;
} = {}) {
  const sleep = vi.fn<(ms: number) => Promise<void>>(async () => undefined);
  const onError = vi.fn();
  const warmer = new RoadContextWarmer(
    "helsinki",
    { listStations: async () => stationIds.map((id) => ({ id })) },
    {
      findByAssetIds: async () =>
        existing.map((assetId) => ({ assetId })) as never,
    },
    { getStationRoadContext } as never,
    { requestDelayMs: 10, retryDelayMs: 100, maxAttempts: 3 },
    sleep,
    onError,
  );
  return { warmer, sleep, onError, getStationRoadContext };
}

describe("RoadContextWarmer", () => {
  it("fetches only stations that have no persisted road context", async () => {
    const { warmer, getStationRoadContext } = setup();

    const result = await warmer.runOnce();

    expect(getStationRoadContext.mock.calls).toEqual([
      ["helsinki", "a"],
      ["helsinki", "c"],
    ]);
    expect(result).toEqual({
      missingCount: 2,
      warmedCount: 2,
      failedAssetIds: [],
    });
  });

  it("does nothing when every station already has persisted context", async () => {
    const { warmer, getStationRoadContext } = setup({
      existing: ["a", "b", "c"],
    });

    expect(await warmer.runOnce()).toMatchObject({ missingCount: 0 });
    expect(getStationRoadContext).not.toHaveBeenCalled();
  });

  it("retries a transient Overpass failure with a growing delay", async () => {
    const getStationRoadContext = vi
      .fn()
      .mockRejectedValueOnce(new Error("504"))
      .mockRejectedValueOnce(new Error("504"))
      .mockResolvedValue(undefined);
    const { warmer, sleep, onError } = setup({
      stationIds: ["a"],
      existing: [],
      getStationRoadContext,
    });

    const result = await warmer.runOnce();

    expect(result.warmedCount).toBe(1);
    expect(getStationRoadContext).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([100, 200, 10]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("gives up on a station after the last attempt but keeps warming the rest", async () => {
    const getStationRoadContext = vi.fn(async (_area: string, id: string) => {
      if (id === "a") throw new Error("504");
    });
    const { warmer, onError } = setup({
      stationIds: ["a", "c"],
      existing: [],
      getStationRoadContext,
    });

    const result = await warmer.runOnce();

    expect(result).toEqual({
      missingCount: 2,
      warmedCount: 1,
      failedAssetIds: ["a"],
    });
    expect(getStationRoadContext).toHaveBeenCalledTimes(4);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("shares one run between overlapping callers", async () => {
    const { warmer, getStationRoadContext } = setup();

    await Promise.all([warmer.runOnce(), warmer.runOnce()]);

    expect(getStationRoadContext).toHaveBeenCalledTimes(2);
  });

  it("stops between stations without recording the interrupted one as failed", async () => {
    const holder: { warmer?: RoadContextWarmer } = {};
    const getStationRoadContext = vi.fn(async () => {
      void holder.warmer?.stop();
    });
    const context = setup({ existing: [], getStationRoadContext });
    holder.warmer = context.warmer;

    const result = await context.warmer.runOnce();

    expect(getStationRoadContext).toHaveBeenCalledTimes(1);
    expect(result.failedAssetIds).toEqual([]);
  });
});
