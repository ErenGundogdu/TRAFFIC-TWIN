import type {
  CorridorDirectionInsight,
  CorridorStationReading,
  StationSummary,
  TrafficDirection,
} from "@traffic-twin/contracts";

const MAX_MEASUREMENT_AGE_MS = 5 * 60 * 1_000;
const MAX_MEASUREMENT_SKEW_MS = 10 * 60 * 1_000;
const MAX_HEADING_DIFFERENCE_DEGREES = 45;
const MAX_PEERS = 4;
const SLOW_SPEED_PERCENT = 80;
const MATERIAL_GAP_PERCENTAGE_POINTS = 15;

export function analyzeCorridorDirection(
  selectedStation: StationSummary,
  direction: 1 | 2,
  corridorStations: StationSummary[],
  now: Date,
): CorridorDirectionInsight {
  const selectedDirection = selectedStation.directions.find(
    (item) => item.direction === direction,
  );
  const selected = selectedDirection
    ? createReading(selectedStation, selectedDirection, selectedStation, now)
    : null;

  if (!selected || !selectedDirection?.heading) {
    return insufficient(direction, selected);
  }

  const peers = corridorStations
    .filter((station) => station.id !== selectedStation.id)
    .flatMap((station) => {
      const alignedDirection = findAlignedDirection(
        station.directions,
        selectedDirection.heading!.degrees,
      );
      if (!alignedDirection) return [];
      const reading = createReading(
        station,
        alignedDirection,
        selectedStation,
        now,
      );
      if (
        !reading ||
        Math.abs(
          Date.parse(reading.measuredAt) - Date.parse(selected.measuredAt),
        ) > MAX_MEASUREMENT_SKEW_MS
      ) {
        return [];
      }
      return [reading];
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, MAX_PEERS);

  if (peers.length < 2) return insufficient(direction, selected, peers);

  const peerMedian = median(peers.map((peer) => peer.speedPercentOfFreeFlow));
  const difference = selected.speedPercentOfFreeFlow - peerMedian;
  const slowPeerCount = peers.filter(
    (peer) => peer.speedPercentOfFreeFlow <= SLOW_SPEED_PERCENT,
  ).length;

  let status: CorridorDirectionInsight["status"] = "BALANCED";
  if (
    selected.speedPercentOfFreeFlow <= SLOW_SPEED_PERCENT &&
    slowPeerCount >= Math.ceil(peers.length / 2)
  ) {
    status = "WIDESPREAD_SLOWDOWN";
  } else if (
    selected.speedPercentOfFreeFlow <= SLOW_SPEED_PERCENT &&
    difference <= -MATERIAL_GAP_PERCENTAGE_POINTS
  ) {
    status = "LOCAL_SLOWDOWN";
  } else if (
    peerMedian <= SLOW_SPEED_PERCENT &&
    difference >= MATERIAL_GAP_PERCENTAGE_POINTS
  ) {
    status = "PEER_SLOWDOWN";
  }

  return {
    direction,
    status,
    selected,
    peers,
    peerMedianSpeedPercentOfFreeFlow: peerMedian,
    selectedDifferencePercentagePoints: difference,
  };
}

function insufficient(
  direction: 1 | 2,
  selected: CorridorStationReading | null,
  peers: CorridorStationReading[] = [],
): CorridorDirectionInsight {
  return {
    direction,
    status: "INSUFFICIENT_DATA",
    selected,
    peers,
    peerMedianSpeedPercentOfFreeFlow: null,
    selectedDifferencePercentagePoints: null,
  };
}

function createReading(
  station: StationSummary,
  direction: TrafficDirection,
  selectedStation: StationSummary,
  now: Date,
): CorridorStationReading | null {
  const measuredAt = direction.measuredAt;
  const speedPercent = direction.trafficFlow.speedPercentOfFreeFlow;
  if (
    station.freshness !== "FRESH" ||
    measuredAt === null ||
    direction.averageSpeedKmh === null ||
    speedPercent === null
  ) {
    return null;
  }
  const age = now.getTime() - Date.parse(measuredAt);
  if (age < -60_000 || age > MAX_MEASUREMENT_AGE_MS) return null;

  return {
    assetId: station.id,
    name: station.name,
    tmsNumber: station.tmsNumber,
    direction: direction.direction,
    heading: direction.heading,
    distanceMeters:
      station.id === selectedStation.id
        ? 0
        : haversineDistanceMeters(selectedStation, station),
    averageSpeedKmh: direction.averageSpeedKmh,
    speedPercentOfFreeFlow: speedPercent,
    flowVehiclesPerHour: direction.flowVehiclesPerHour,
    measuredAt,
  };
}

function findAlignedDirection(
  directions: TrafficDirection[],
  selectedHeading: number,
) {
  return directions
    .filter(
      (
        direction,
      ): direction is TrafficDirection & {
        heading: NonNullable<TrafficDirection["heading"]>;
      } =>
        direction.heading !== null &&
        angularDifference(direction.heading.degrees, selectedHeading) <=
          MAX_HEADING_DIFFERENCE_DEGREES,
    )
    .sort(
      (left, right) =>
        angularDifference(left.heading.degrees, selectedHeading) -
        angularDifference(right.heading.degrees, selectedHeading),
    )[0];
}

function angularDifference(left: number, right: number) {
  const difference = Math.abs(left - right) % 360;
  return Math.min(difference, 360 - difference);
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function haversineDistanceMeters(
  left: Pick<StationSummary, "latitude" | "longitude">,
  right: Pick<StationSummary, "latitude" | "longitude">,
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDifference = toRadians(right.latitude - left.latitude);
  const longitudeDifference = toRadians(right.longitude - left.longitude);
  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(left.latitude)) *
      Math.cos(toRadians(right.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
