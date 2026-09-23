export const LANE_DIRECTION_POLICY = {
  minimumVehicleCount: 20,
  minimumConfidencePercent: 98,
  version: "history-lane-direction-v1",
} as const;

export interface LaneDirectionEvidenceRow {
  assetId: string;
  lane: number;
  direction: 1 | 2;
  vehicleCount: number;
}

export interface ResolvedLaneDirection {
  assetId: string;
  lane: number;
  direction: 1 | 2;
}

export function resolveLaneDirections(
  rows: LaneDirectionEvidenceRow[],
): ResolvedLaneDirection[] {
  const groups = new Map<string, LaneDirectionEvidenceRow[]>();

  for (const row of rows) {
    const key = `${row.assetId}:${row.lane}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.values()].flatMap((evidence) => {
    const totalVehicleCount = evidence.reduce(
      (total, row) => total + row.vehicleCount,
      0,
    );
    const dominant = [...evidence].sort(
      (left, right) => right.vehicleCount - left.vehicleCount,
    )[0];
    if (
      !dominant ||
      totalVehicleCount < LANE_DIRECTION_POLICY.minimumVehicleCount
    ) {
      return [];
    }

    const confidencePercent = (dominant.vehicleCount / totalVehicleCount) * 100;
    if (confidencePercent < LANE_DIRECTION_POLICY.minimumConfidencePercent) {
      return [];
    }

    return [
      {
        assetId: dominant.assetId,
        lane: dominant.lane,
        direction: dominant.direction,
      },
    ];
  });
}

// Secondary, lower-confidence source: the road authority's own lane count
// per direction (kaista1/kaista2), used only where no station has yet
// produced real observed-passage evidence above. A station is only ever
// resolved by one policy at a time; the caller decides precedence.
export const LANE_LAYOUT_POLICY = {
  version: "kaista-sequential-v1",
} as const;

export interface StationLaneLayoutInput {
  tmsNumber: number;
  forwardLaneCount: number;
  reverseLaneCount: number;
}

export interface StationLanesInput {
  assetId: string;
  tmsNumber: number;
  lanes: number[];
}

export function resolveLaneDirectionsFromLayout(
  layouts: StationLaneLayoutInput[],
  stations: StationLanesInput[],
): ResolvedLaneDirection[] {
  const layoutByTmsNumber = new Map(
    layouts.map((layout) => [layout.tmsNumber, layout]),
  );

  return stations.flatMap((station) => {
    const layout = layoutByTmsNumber.get(station.tmsNumber);
    if (!layout) return [];

    // Lanes are numbered sequentially from the road authority's own
    // direction-1 count into direction 2. A lane number never observed on
    // the live sensor, or one beyond the official total, is left
    // unresolved rather than guessed.
    return station.lanes.flatMap((lane): ResolvedLaneDirection[] => {
      if (lane <= layout.forwardLaneCount) {
        return [{ assetId: station.assetId, lane, direction: 1 }];
      }
      if (lane <= layout.forwardLaneCount + layout.reverseLaneCount) {
        return [{ assetId: station.assetId, lane, direction: 2 }];
      }
      return [];
    });
  });
}
