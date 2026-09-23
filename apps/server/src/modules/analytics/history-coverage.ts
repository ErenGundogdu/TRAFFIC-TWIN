import type { IngestionCoverage } from "@traffic-twin/contracts";

interface AvailableDate {
  assetId: string;
  sourceDate: string;
}

interface CompletedChunk {
  assetId: string;
  fromDate: string;
  toDate: string;
}

export function describeHistoryCoverage(input: {
  assetIds: string[];
  requestedDates: string[];
  availableDates: AvailableDate[];
  completedChunks: CompletedChunk[];
  failedRanges: CompletedChunk[];
  resolution: "minute" | "hour" | "day";
}): IngestionCoverage {
  const available = new Set(
    input.availableDates.map((row) => `${row.assetId}:${row.sourceDate}`),
  );
  const missingDetails: IngestionCoverage["missingDetails"] = [];
  const missingDates: string[] = [];

  for (const date of input.requestedDates) {
    let missingForDate = false;
    for (const assetId of input.assetIds) {
      if (available.has(`${assetId}:${date}`)) continue;
      missingForDate = true;
      const imported = input.completedChunks.some(
        (chunk) =>
          chunk.assetId === assetId &&
          chunk.fromDate <= date &&
          chunk.toDate >= date,
      );
      const failed = input.failedRanges.some(
        (range) =>
          range.assetId === assetId &&
          range.fromDate <= date &&
          range.toDate >= date,
      );
      missingDetails.push({
        assetId,
        date,
        reason:
          input.resolution === "minute"
            ? "UNVERIFIED"
            : imported
              ? "SOURCE_GAP"
              : failed
                ? "SOURCE_ERROR"
                : "NOT_IMPORTED",
      });
    }
    if (missingForDate) missingDates.push(date);
  }

  const availableDays = input.requestedDates.length - missingDates.length;
  return {
    status:
      availableDays === 0
        ? "NO_DATA"
        : missingDates.length === 0
          ? "COMPLETE"
          : "PARTIAL",
    requestedDays: input.requestedDates.length,
    availableDays,
    missingDates: missingDates.slice(0, 31),
    missingDetails,
  };
}
