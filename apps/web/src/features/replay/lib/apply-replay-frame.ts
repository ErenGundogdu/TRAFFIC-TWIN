import type { ReplayFrame, StationSummary } from "@traffic-twin/contracts";

export function applyReplayFrame(
  stations: StationSummary[],
  frame: ReplayFrame,
  direction: 1 | 2,
) {
  const valuesByAsset = new Map(
    frame.values.map((value) => [value.assetId, value]),
  );

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
            ? value.vehicleCount * 60
            : null,
        measuredAt:
          value && item.direction === direction ? frame.timestamp : null,
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
