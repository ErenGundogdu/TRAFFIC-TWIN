import type { HistoryResponse } from "@traffic-twin/contracts";

import { createAnalysisPresentation } from "../lib/analysis-presentation";

export function AnalysisKpiStrip({ history }: { history: HistoryResponse }) {
  const presentation = createAnalysisPresentation(history);
  const primary = presentation.primary;

  const cards = [
    {
      label: "Ortalama hız",
      value: formatSpeed(primary?.averageSpeedKmh ?? null),
      detail: presentation.comparison
        ? formatDifference(presentation.averageSpeedDifferenceKmh)
        : "Seçili istasyon",
      accent: "sky",
    },
    {
      label: "Toplam geçiş",
      value: primary
        ? `${formatInteger(primary.totalVehicleCount)} araç`
        : "Yetersiz veri",
      detail: presentation.comparison
        ? `Karşılaştırma: ${formatInteger(presentation.comparison.totalVehicleCount)} araç`
        : `${primary?.bucketCount ?? 0} zaman dilimi`,
      accent: "violet",
    },
    {
      label: "En yoğun dilim",
      value:
        primary?.peakVehicleCount === null || !primary
          ? "Yetersiz veri"
          : `${formatInteger(primary.peakVehicleCount)} araç`,
      detail: formatMoment(primary?.peakVehicleAt ?? null, history.timeZone),
      accent: "amber",
    },
    {
      label: "Veri kapsamı",
      value: `%${presentation.coveragePercent}`,
      detail: `${history.coverage.availableDays}/${history.coverage.requestedDays} gün mevcut`,
      accent: "emerald",
    },
  ] as const;

  return (
    <section
      aria-label="Analiz özeti"
      className="grid overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800 dark:bg-slate-900"
    >
      {cards.map((card, index) => (
        <article
          key={card.label}
          className={`relative px-4 py-3.5 ${
            index > 0
              ? "border-t border-slate-100 sm:border-l xl:border-t-0 dark:border-slate-800"
              : ""
          } ${index === 2 ? "sm:border-l-0 xl:border-l" : ""}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${accentClasses[card.accent]}`}
              aria-hidden="true"
            />
            <p className="text-[11px] font-medium text-slate-500">
              {card.label}
            </p>
          </div>
          <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
            {card.value}
          </p>
          <p
            className="mt-1 truncate text-[10px] text-slate-400"
            title={card.detail}
          >
            {card.detail}
          </p>
        </article>
      ))}
    </section>
  );
}

const accentClasses = {
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
} as const;

function formatDifference(value: number | null) {
  if (value === null) return "Karşılaştırma için yetersiz veri";
  if (value === 0) return "Karşılaştırmayla aynı";
  return `${value > 0 ? "+" : ""}${formatNumber(value)} km/sa karşılaştırmaya göre`;
}

function formatSpeed(value: number | null) {
  return value === null ? "Yetersiz veri" : `${formatNumber(value)} km/sa`;
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
