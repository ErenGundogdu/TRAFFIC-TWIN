import type {
  TrafficEventDirection,
  TrafficEventSeverity,
} from "@traffic-twin/contracts";

export function formatTrafficEventDirection(
  direction: TrafficEventDirection,
  description: string | null,
) {
  if (direction === "BOTH") return "Her iki yön";
  const directionLabel =
    direction === "POSITIVE"
      ? "Artan yol numarası yönü"
      : direction === "NEGATIVE"
        ? "Azalan yol numarası yönü"
        : "Yön bilgisi sağlanmadı";
  if (description) return `${directionLabel} · Kaynak hedefi: ${description}`;
  if (direction !== "UNKNOWN") return directionLabel;
  return "Yön bilgisi sağlanmadı";
}

export function formatTrafficEventSeverity(severity: TrafficEventSeverity) {
  switch (severity) {
    case "HIGH":
      return "Yüksek";
    case "MEDIUM":
      return "Orta";
    case "LOW":
      return "Düşük";
    default:
      return "Sağlanmadı";
  }
}

export function formatTrafficEventDate(value: string | null, timeZone: string) {
  if (!value) return "Belirtilmedi";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
