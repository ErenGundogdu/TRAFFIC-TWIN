import type { HistoryAssetAvailability } from "@traffic-twin/contracts";

export function findAssetAvailability(
  availability: HistoryAssetAvailability[],
  assetId: string,
) {
  return availability.find((item) => item.assetId === assetId) ?? null;
}

export function commonAvailableDates(
  availability: HistoryAssetAvailability[],
  assetIds: string[],
) {
  if (assetIds.length === 0) return [];

  const dateSets = assetIds.map(
    (assetId) =>
      new Set(
        findAssetAvailability(availability, assetId)?.availableDates ?? [],
      ),
  );

  return [...dateSets[0]!].filter((date) =>
    dateSets.slice(1).every((dates) => dates.has(date)),
  );
}
