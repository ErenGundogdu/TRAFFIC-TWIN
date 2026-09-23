import type { StationCatalogResponse } from "@traffic-twin/contracts";

import { formatTrafficDirectionLabel } from "@/shared/traffic";

import type {
  ComparisonReading,
  ComparisonSide,
} from "../lib/independent-comparison";

interface Props {
  label: string;
  side: ComparisonSide;
  reading: ComparisonReading;
  catalog: StationCatalogResponse;
  loading: boolean;
}

export function ComparisonReadingCard({
  label,
  side,
  reading,
  catalog,
  loading,
}: Props) {
  const station = catalog.stations.find((item) => item.id === side.assetId);
  const direction = station?.directions.find(
    (item) => String(item.direction) === side.direction,
  );
  const directionLabel = direction
    ? formatTrafficDirectionLabel(direction)
    : `Yön ${side.direction} · yön bilgisi yok`;
  const measuredAt = reading.measuredAt
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: catalog.coverageArea.timeZone,
      }).format(new Date(reading.measuredAt))
    : "zaman yok";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
        {label}
      </p>
      <h3 className="mt-1 text-sm font-semibold">
        {station?.name ?? side.assetId} · {directionLabel}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {side.period === "live"
          ? "Canlı · kayan 5 dk"
          : `${side.fromDate} – ${side.toDate} · ${catalog.coverageArea.timeZone}`}
      </p>
      <p className="mt-4 text-2xl font-semibold">
        {loading
          ? "Yükleniyor…"
          : reading.value === null
            ? "Veri yok"
            : `${formatNumber(reading.value)} ${reading.unit}`}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {reading.source === "CANLI"
          ? `${reading.status === "READY" ? "Güncel" : "Güncel değil / ölçüm yok"} · ${measuredAt}`
          : `Kapsam: ${reading.coverage ?? "bilinmiyor"} · ${reading.resolution ?? "—"} · ${reading.requestedDays ?? 0} gün`}
      </p>
    </article>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(
    value,
  );
}
