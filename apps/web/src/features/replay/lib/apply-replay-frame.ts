import type {
  ReplayFrame,
  ReplayResolution,
  StationSummary,
} from "@traffic-twin/contracts";

export function applyReplayFrame(
  stations: StationSummary[],
  frame: ReplayFrame | null,
  direction: 1 | 2,
  resolution: ReplayResolution,
) {
  const valuesByAsset = new Map(
    (frame?.values ?? []).map((value) => [value.assetId, value]),
  );
  // A minute frame's vehicleCount covers one minute, so it's scaled up to a
  // per-hour rate. An hour frame's vehicleCount already is the hourly count.
  const perHourMultiplier = resolution === "hour" ? 1 : 60;

  return stations.map((station): StationSummary => {
    const value = valuesByAsset.get(station.id);
    return {
      ...station,
      directions: station.directions.map((item) => ({
        ...item,
        averageSpeedKmh:
          value && item.direction === direction ? value.averageSpeedKmh : null,
        flowVehiclesPerHour:
          value && item.direction === direction
            ? value.vehicleCount * perHourMultiplier
            : null,
        measuredAt:
          value && item.direction === direction && frame
            ? frame.timestamp
            : null,
        trafficFlow: {
          ...item.trafficFlow,
          status: "INSUFFICIENT_DATA",
          speedPercentOfFreeFlow: null,
          flowPercentOfCapacity: null,
        },
      })),
    };
  });
}
