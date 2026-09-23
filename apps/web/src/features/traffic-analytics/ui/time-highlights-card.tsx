import type { HistoryResponse } from "@traffic-twin/contracts";

import {
  createTimePattern,
  findBusiestHour,
  findBusiestWeekday,
} from "../lib/time-pattern";

export function TimeHighlightsCard({ history }: { history: HistoryResponse }) {
  const primary = history.summaries[0] ?? null;
  const pattern = createTimePattern(history);
  const busiestHour = pattern ? findBusiestHour(pattern) : null;
  const busiestWeekday = pattern ? findBusiestWeekday(pattern) : null;

  const tiles = [
    {
      key: "hour",
      icon: "🕐",
      accent: "amber" as const,
      label: "Günün en yoğun saati",
      value: busiestHour ? busiestHour.label : "Yetersiz veri",
      detail: busiestHour
        ? `Ortalama ${formatMetricValue(busiestHour.value, history.query.metric)} · ${busiestHour.sampleCount} ölçüm`
        : notAvailableReason(history),
    },
    {
      key: "day",
      icon: "📅",
      accent: "violet" as const,
      label: "Haftanın en yoğun günü",
      value: busiestWeekday ? busiestWeekday.label : "Yetersiz veri",
      detail: busiestWeekday
        ? `Ortalama ${formatMetricValue(busiestWeekday.value, history.query.metric)} · ${busiestWeekday.sampleCount} ölçüm`
        : notAvailableReason(history),
    },
    {
      key: "peak",
      icon: "🚗",
      accent: "sky" as const,
      label: "En fazla geçiş anı",
      value:
        primary?.peakVehicleCount != null
          ? `${formatInteger(primary.peakVehicleCount)} araç`
          : "Yetersiz veri",
      detail: formatMoment(primary?.peakVehicleAt ?? null, history.timeZone),
    },
    {
      key: "fastest",
      icon: "⚡",
      accent: "emerald" as const,
      label: "En hızlı aktığı an",
      value:
        primary?.maximumSpeedKmh != null
          ? `${formatSpeed(primary.maximumSpeedKmh)}`
          : "Yetersiz veri",
      detail: formatMoment(primary?.maximumSpeedAt ?? null, history.timeZone),
    },
  ];

  return (
    <section
      aria-label="Zaman deseni öne çıkanları"
      className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="px-5 pt-4 pb-3">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-rose-600 uppercase dark:text-rose-300">
          Öne çıkanlar
        </p>
        <h2 className="mt-1 text-sm font-semibold">
          Seçili dönemde dikkat çeken anlar
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-px overflow-hidden bg-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:bg-slate-800">
        {tiles.map((tile) => (
          <article key={tile.key} className="bg-white p-4 dark:bg-slate-900">
            <span
              className={`grid size-8 place-items-center rounded-lg text-sm ${accentClasses[tile.accent]}`}
              aria-hidden="true"
            >
              {tile.icon}
            </span>
            <p className="mt-2.5 text-[10px] font-medium text-slate-500">
              {tile.label}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {tile.value}
            </p>
            <p
              className="mt-0.5 truncate text-[10px] text-slate-400"
              title={tile.detail}
            >
              {tile.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

const accentClasses = {
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  violet:
    "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
} as const;

function notAvailableReason(history: HistoryResponse) {
  if (history.resolution !== "day") return "Bu dönemde yeterli ölçüm yok";
  return history.query.resolution === "auto"
    ? "Bu tarih aralığında saatlik veri yok; sistem günlük toplama düştü. Bu günü “Şerit ve araç sınıfı verisi” ile içeri alın veya daha geniş bir aralık seçin."
    : "Gün çözünürlüğü seçili; saat/gün deseni için Çözünürlük'ten Saat veya Dakika seçin.";
}

function formatMetricValue(
  value: number,
  metric: HistoryResponse["query"]["metric"],
) {
  return metric === "average-speed-kmh"
    ? `${formatNumber(value)} km/sa`
    : `${formatNumber(value)} araç`;
}

function formatSpeed(value: number) {
  return `${formatNumber(value)} km/sa`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatMoment(value: string | null, timeZone: string) {
  if (!value) return "Zaman bilgisi yok";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
