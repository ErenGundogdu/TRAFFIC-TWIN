import type { StationSummary, TrafficLane } from "@traffic-twin/contracts";

const MAX_MEASUREMENT_AGE_MS = 5 * 60_000;
const MAX_PEER_TIME_GAP_MS = 2 * 60_000;
const MIN_FLOW_VEHICLES_PER_HOUR = 60;
const MIN_REFERENCE_SPEED_KMH = 30;
const MIN_SPEED_DIFFERENCE_KMH = 15;
const MIN_SLOWER_PERCENT = 40;

export interface LaneComparison {
  direction: 1 | 2;
  lane: number;
  speedKmh: number;
  referenceSpeedKmh: number;
  slowerPercent: number;
  flowVehiclesPerHour: number;
  referenceFlowVehiclesPerHour: number;
  isNotable: boolean;
  peerLanes: number[];
  measuredAt: string;
}

export type LaneImbalance = LaneComparison;

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

type ComparableLane = TrafficLane & {
  direction: 1 | 2;
  averageSpeedKmh: number;
  flowVehiclesPerHour: number;
  measuredAt: string;
  measuredAtMs: number;
};

function comparableLanes(
  lanes: TrafficLane[],
  nowMs: number,
): ComparableLane[] {
  const measured = lanes.flatMap((lane): ComparableLane[] => {
    const { direction, averageSpeedKmh, flowVehiclesPerHour, measuredAt } =
      lane;
    if (
      direction === null ||
      averageSpeedKmh === null ||
      flowVehiclesPerHour === null ||
      flowVehiclesPerHour < MIN_FLOW_VEHICLES_PER_HOUR ||
      measuredAt === null
    ) {
      return [];
    }
    const measuredAtMs = Date.parse(measuredAt);
    const ageMs = nowMs - measuredAtMs;
    return Number.isFinite(measuredAtMs) &&
      ageMs >= 0 &&
      ageMs <= MAX_MEASUREMENT_AGE_MS
      ? [
          {
            ...lane,
            direction,
            averageSpeedKmh,
            flowVehiclesPerHour,
            measuredAt,
            measuredAtMs,
          },
        ]
      : [];
  });

  return ([1, 2] as const).flatMap((direction) => {
    const directionLanes = measured.filter(
      (lane) => lane.direction === direction,
    );
    if (directionLanes.length === 0) return [];
    const newest = Math.max(...directionLanes.map((lane) => lane.measuredAtMs));
    return directionLanes.filter(
      (lane) => newest - lane.measuredAtMs <= MAX_PEER_TIME_GAP_MS,
    );
  });
}

function compareAgainstPeers(
  candidate: ComparableLane,
  peers: ComparableLane[],
  direction: 1 | 2,
): LaneComparison {
  const otherLanes = peers.filter((peer) => peer.lane !== candidate.lane);
  const referenceSpeedKmh = median(
    otherLanes.map((peer) => peer.averageSpeedKmh),
  );
  const referenceFlowVehiclesPerHour = median(
    otherLanes.map((peer) => peer.flowVehiclesPerHour),
  );
  const slowerPercent =
    referenceSpeedKmh > 0
      ? ((referenceSpeedKmh - candidate.averageSpeedKmh) / referenceSpeedKmh) *
        100
      : 0;

  return {
    direction,
    lane: candidate.lane,
    speedKmh: candidate.averageSpeedKmh,
    referenceSpeedKmh,
    slowerPercent: Math.max(0, Math.round(slowerPercent)),
    flowVehiclesPerHour: candidate.flowVehiclesPerHour,
    referenceFlowVehiclesPerHour,
    isNotable:
      referenceSpeedKmh >= MIN_REFERENCE_SPEED_KMH &&
      referenceSpeedKmh - candidate.averageSpeedKmh >=
        MIN_SPEED_DIFFERENCE_KMH &&
      slowerPercent >= MIN_SLOWER_PERCENT,
    peerLanes: otherLanes.map((peer) => peer.lane),
    measuredAt: candidate.measuredAt,
  };
}

export function compareStationLanes(
  station: Pick<StationSummary, "lanes">,
  now: Date = new Date(),
): LaneComparison[] {
  const lanes = comparableLanes(station.lanes, now.getTime());
  return ([1, 2] as const).flatMap((direction) => {
    const peers = lanes.filter((lane) => lane.direction === direction);
    if (peers.length < 2) return [];

    // Every lane is weighed against the median of the *other* lanes so a
    // second genuinely slow lane cannot drag its own reference down and
    // hide behind the one already reported as the worst.
    const evaluated = peers.map((candidate) =>
      compareAgainstPeers(candidate, peers, direction),
    );
    const notable = evaluated.filter((comparison) => comparison.isNotable);
    if (notable.length > 0) {
      return notable.sort((left, right) => left.lane - right.lane);
    }

    // Nothing crosses the threshold: keep today's single-row context view
    // (the closest lane to standing out) instead of listing every lane.
    return [
      evaluated.reduce((worst, comparison) =>
        comparison.slowerPercent > worst.slowerPercent ? comparison : worst,
      ),
    ];
  });
}

export function findLaneImbalances(
  station: Pick<StationSummary, "lanes">,
  now: Date = new Date(),
): LaneImbalance[] {
  return compareStationLanes(station, now).filter(
    (comparison) => comparison.isNotable,
  );
}
