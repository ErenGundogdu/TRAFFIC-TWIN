interface StatisticsSyncRange {
  from: string;
  to: string;
  recordCheckpoint: boolean;
}

export function resolveRecentDailyStatisticsRanges(
  timeZone: string,
  now: Date = new Date(),
): StatisticsSyncRange[] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const previousMonthStart = new Date(Date.UTC(year, month - 2, 1));
  const previousMonthEnd = new Date(Date.UTC(year, month - 1, 0));
  const ranges: StatisticsSyncRange[] = [
    {
      from: dateLabel(previousMonthStart),
      to: dateLabel(previousMonthEnd),
      // Recheck the just-closed month before declaring its source coverage final.
      recordCheckpoint: day >= 3,
    },
  ];

  if (day > 1) {
    ranges.push({
      from: dateLabel(new Date(Date.UTC(year, month - 1, 1))),
      to: dateLabel(new Date(Date.UTC(year, month - 1, day - 1))),
      // The open month grows and can be corrected by the source on later runs.
      recordCheckpoint: false,
    });
  }

  return ranges;
}

function dateLabel(date: Date) {
  return date.toISOString().slice(0, 10);
}
