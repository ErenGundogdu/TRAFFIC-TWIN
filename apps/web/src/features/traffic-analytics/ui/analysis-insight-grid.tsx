import type { HistoryResponse, HistorySummary } from "@traffic-twin/contracts";

import { createAnalysisPresentation } from "../lib/analysis-presentation";

export function AnalysisInsightGrid({ history }: { history: HistoryResponse }) {
  return (
    <section
      aria-label="Karşılaştırmalı analiz içgörüleri"
      className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]"
    >
      <ComparisonCard history={history} />
      <DirectionDistributionCard summaries={history.summaries} />
    </section>
  );
}

function ComparisonCard({ history }: { history: HistoryResponse }) {
  const presentation = createAnalysisPresentation(history);
  const { primary, comparison } = presentation;

  return (
    <article className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900">
      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-violet-600 uppercase dark:text-violet-300">
          İstasyon karşılaştırması
        </p>
        <h2 className="mt-1 text-sm font-semibold">
          Aynı dönem, aynı yön, aynı çözünürlük
        </h2>
      </div>

      {!primary ? (
        <EmptyInsight text="Karşılaştırma için hesaplanmış istasyon özeti yok." />
      ) : !comparison ? (
        <EmptyInsight text="İkinci bir istasyon seçildiğinde hız ve araç hacmi farkları burada karşılaştırılır." />
      ) : (
        <div className="px-5 pt-2 pb-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
            <StationIdentity summary={primary} color="sky" />
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
              VS
            </span>
            <StationIdentity
              summary={comparison}
              color="violet"
              align="right"
            />
          </div>

          <div className="mt-3 space-y-2.5">
            <MagnitudeBar
              label="Ortalama hız"
              unit="km/sa"
              primaryValue={primary.averageSpeedKmh}
              comparisonValue={comparison.averageSpeedKmh}
            />
            <MagnitudeBar
              label="Toplam geçiş"
              unit="araç"
              primaryValue={primary.totalVehicleCount}
              comparisonValue={comparison.totalVehicleCount}
            />
          </div>

          <div className="mt-3 grid gap-px overflow-hidden rounded-2xl bg-slate-200 sm:grid-cols-2 dark:bg-slate-800">
            <DifferenceMetric
              label="Ortalama hız farkı"
              value={formatSigned(
                presentation.averageSpeedDifferenceKmh,
                "km/sa",
              )}
              percentage={presentation.averageSpeedDifferencePercent}
              positiveText="daha hızlı"
              negativeText="daha yavaş"
            />
            <DifferenceMetric
              label="Toplam geçiş farkı"
              value={formatSigned(presentation.vehicleCountDifference, "araç")}
              percentage={presentation.vehicleCountDifferencePercent}
              positiveText="daha fazla geçiş"
              negativeText="daha az geçiş"
            />
          </div>
          <p className="mt-3 text-[10px] leading-4 text-slate-400">
            Fark = ana istasyon − karşılaştırma istasyonu.
          </p>
        </div>
      )}
    </article>
  );
}

function DirectionDistributionCard({
  summaries,
}: {
  summaries: HistorySummary[];
}) {
  return (
    <article className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-sky-700 uppercase dark:text-sky-300">
        Yön dengesi
      </p>
      <h2 className="mt-1 text-sm font-semibold">Toplam araç dağılımı</h2>
      <div className="mt-4 space-y-4">
        {summaries.map((summary) => {
          const distribution = summary.directionDistribution;
          const directionOne = distribution.directionOnePercent;
          const directionTwo = distribution.directionTwoPercent;
          return (
            <div key={summary.assetId}>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="min-w-0 truncate font-semibold">
                  {summary.assetName}
                </span>
                <span className="shrink-0 text-slate-400">
                  {directionOne === null || directionTwo === null
                    ? "Yetersiz veri"
                    : `%${formatNumber(directionOne)} / %${formatNumber(directionTwo)}`}
                </span>
              </div>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                {directionOne !== null && directionTwo !== null ? (
                  <>
                    <div
                      className="bg-sky-500"
                      style={{ width: `${directionOne}%` }}
                      title={`Yön 1: %${formatNumber(directionOne)}`}
                    />
                    <div
                      className="bg-violet-500"
                      style={{ width: `${directionTwo}%` }}
                      title={`Yön 2: %${formatNumber(directionTwo)}`}
                    />
                  </>
                ) : null}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                <span>
                  Yön 1 · {formatInteger(distribution.directionOneVehicleCount)}
                </span>
                <span>
                  Yön 2 · {formatInteger(distribution.directionTwoVehicleCount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-[10px] text-slate-500 dark:border-slate-800">
        <LegendDot className="bg-sky-500" label="Yön 1" />
        <LegendDot className="bg-violet-500" label="Yön 2" />
      </div>
    </article>
  );
}

function StationIdentity({
  summary,
  color,
  align = "left",
}: {
  summary: HistorySummary;
  color: "sky" | "violet";
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <span
        className={`inline-block size-2 rounded-full ${color === "sky" ? "bg-sky-500" : "bg-violet-500"}`}
      />
      <p
        className="mt-1 truncate text-xs font-semibold"
        title={summary.assetName}
      >
        {summary.assetName}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-500">
        {formatSpeed(summary.averageSpeedKmh)} ·{" "}
        {formatInteger(summary.totalVehicleCount)} araç
      </p>
    </div>
  );
}

function MagnitudeBar({
  label,
  unit,
  primaryValue,
  comparisonValue,
}: {
  label: string;
  unit: string;
  primaryValue: number | null;
  comparisonValue: number | null;
}) {
  const maximum = Math.max(primaryValue ?? 0, comparisonValue ?? 0, 1);
  const primaryWidth =
    primaryValue === null ? 0 : Math.max(4, (primaryValue / maximum) * 100);
  const comparisonWidth =
    comparisonValue === null
      ? 0
      : Math.max(4, (comparisonValue / maximum) * 100);
  const primaryLeads =
    primaryValue !== null &&
    comparisonValue !== null &&
    primaryValue > comparisonValue;
  const comparisonLeads =
    primaryValue !== null &&
    comparisonValue !== null &&
    comparisonValue > primaryValue;

  return (
    <div>
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <div className="mt-1 space-y-1">
        <BarRow
          value={primaryValue}
          width={primaryWidth}
          unit={unit}
          color="bg-sky-500"
          leads={primaryLeads}
        />
        <BarRow
          value={comparisonValue}
          width={comparisonWidth}
          unit={unit}
          color="bg-violet-500"
          leads={comparisonLeads}
        />
      </div>
    </div>
  );
}

function BarRow({
  value,
  width,
  unit,
  color,
  leads,
}: {
  value: number | null;
  width: number;
  unit: string;
  color: string;
  leads: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${color} ${leads ? "" : "opacity-60"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span
        className={`w-20 shrink-0 text-right text-[10px] tabular-nums ${leads ? "font-semibold text-slate-800 dark:text-slate-200" : "text-slate-400"}`}
      >
        {value === null ? "Veri yok" : `${formatNumber(value)} ${unit}`}
      </span>
    </div>
  );
}

function DifferenceMetric({
  label,
  value,
  percentage,
  positiveText,
  negativeText,
}: {
  label: string;
  value: string;
  percentage: number | null;
  positiveText: string;
  negativeText: string;
}) {
  const description =
    percentage === null
      ? "Oran hesaplanamadı"
      : percentage === 0
        ? "İki istasyon eşit"
        : `%${formatNumber(Math.abs(percentage))} ${percentage > 0 ? positiveText : negativeText}`;
  return (
    <div className="bg-white p-3.5 dark:bg-slate-900">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{description}</p>
    </div>
  );
}

function EmptyInsight({ text }: { text: string }) {
  return (
    <p className="m-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-950">
      {text}
    </p>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} /> {label}
    </span>
  );
}

function formatSigned(value: number | null, unit: string) {
  if (value === null) return "Yetersiz veri";
  return `${value > 0 ? "+" : ""}${formatNumber(value)} ${unit}`;
}

function formatSpeed(value: number | null) {
  return value === null ? "Hız yok" : `${formatNumber(value)} km/sa`;
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
