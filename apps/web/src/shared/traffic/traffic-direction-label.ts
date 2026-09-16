import type { CompassPoint, TrafficDirection } from "@traffic-twin/contracts";

const COMPASS_POINT_LABELS: Record<
  CompassPoint,
  { long: string; short: string }
> = {
  N: { long: "Kuzey", short: "K" },
  NE: { long: "Kuzeydoğu", short: "KD" },
  E: { long: "Doğu", short: "D" },
  SE: { long: "Güneydoğu", short: "GD" },
  S: { long: "Güney", short: "G" },
  SW: { long: "Güneybatı", short: "GB" },
  W: { long: "Batı", short: "B" },
  NW: { long: "Kuzeybatı", short: "KB" },
};

type DirectionIdentity = Pick<TrafficDirection, "direction" | "heading">;

export function formatTrafficDirectionLabel(
  direction: DirectionIdentity,
  variant: "long" | "short" = "long",
) {
  const baseLabel = `Yön ${direction.direction}`;
  if (!direction.heading) {
    return `${baseLabel} · yön bilgisi yok`;
  }

  const compassLabel =
    COMPASS_POINT_LABELS[direction.heading.compassPoint][variant];
  if (variant === "short") {
    return `${baseLabel} · ${compassLabel}`;
  }

  const degrees = direction.heading.degrees.toLocaleString("tr-TR", {
    maximumFractionDigits: 1,
  });
  return `${baseLabel} · ${compassLabel} (${degrees}°)`;
}
