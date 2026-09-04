function partsAt(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function zonedDateStartIso(date: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const desired = Date.UTC(year!, month! - 1, day!);
  let candidate = desired;

  for (let iteration = 0; iteration < 2; iteration += 1) {
    const rendered = partsAt(new Date(candidate), timeZone);
    candidate +=
      desired -
      Date.UTC(
        rendered.year,
        rendered.month - 1,
        rendered.day,
        rendered.hour,
        rendered.minute,
        rendered.second,
      );
  }

  return new Date(candidate).toISOString();
}

export function dateLabelAt(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDateLabel(date: string, dayDelta: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + dayDelta);
  return value.toISOString().slice(0, 10);
}
