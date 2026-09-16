import type { StationSummary } from "@traffic-twin/contracts";

import { formatTrafficDirectionLabel } from "@/shared/traffic";

type DirectionNumber = 1 | 2;

export function formatStationDirectionLabel(
  station: StationSummary,
  directionNumber: DirectionNumber,
) {
  const direction = station.directions.find(
    (candidate) => candidate.direction === directionNumber,
  );
  const directionLabel = direction
    ? formatTrafficDirectionLabel(direction, "short")
    : `Yön ${directionNumber} · yön bilgisi yok`;

  return `${station.name} · ${directionLabel}`;
}

export function createDirectionSeriesLabels(
  stations: StationSummary[],
  directionNumber: DirectionNumber,
) {
  return Object.fromEntries(
    stations.map((station) => [
      station.id,
      formatStationDirectionLabel(station, directionNumber),
    ]),
  );
}
