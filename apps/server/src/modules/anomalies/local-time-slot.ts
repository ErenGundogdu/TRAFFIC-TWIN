const WEEKDAY_BY_NAME: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function getLocalTimeSlot(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const weekdayName = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const weekday = weekdayName ? WEEKDAY_BY_NAME[weekdayName] : undefined;

  if (!weekday || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`Could not resolve local time slot for '${timeZone}'.`);
  }

  return { weekday, hour };
}
