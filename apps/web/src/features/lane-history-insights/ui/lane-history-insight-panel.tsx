import type {
  LaneBaselineState,
  LaneHistoryInsightResponse,
  LaneMetricBaseline,
  TrafficDirection,
} from "@traffic-twin/contracts";

import { formatTrafficDirectionLabel } from "@/shared/traffic";
import { InlineQueryError } from "@/shared/ui";

interface Props {
  insight: LaneHistoryInsightResponse | undefined;
  directions: TrafficDirection[];
  status: "loading" | "error" | "ready";
  onRetry: () => void;
}

const STATE_LABELS: Record<LaneBaselineState, string> = {
  LOW: "Olağandan düşük",
  EXPECTED: "Olağan aralıkta",
  HIGH: "Olağandan yüksek",
  INSUFFICIENT_DATA: "Geçmiş yetersiz",
};

const STATE_BADGE_CLASSES: Record<LaneBaselineState, string> = {
  LOW: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  EXPECTED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  INSUFFICIENT_DATA:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const number = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

export function LaneHistoryInsightPanel({
  insight,
  directions,
  status,
  onRetry,
}: Props) {
  const sampleCounts =
    insight?.evaluations.flatMap((item) => [
      item.speed.sampleCount,
      item.flow.sampleCount,
    ]) ?? [];
  const maximumSamples =
    sampleCounts.length > 0 ? Math.max(...sampleCounts) : 0;
  const hasBaseline =
    insight?.evaluations.some(
      (item) =>
        item.speed.state !== "INSUFFICIENT_DATA" ||
        item.flow.state !== "INSUFFICIENT_DATA",
    ) ?? false;
  const sampleProgress = insight
    ? Math.min(100, (maximumSamples / insight.minimumSamples) * 100)
    : 0;

  return (
    <section
      aria-labelledby="lane-history-title"
      className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-violet-600 uppercase dark:text-violet-300">
            Geçmiş referansı
          </p>
          <h3
            id="lane-history-title"
            className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Benzer saatlerle karşılaştırma
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Bu şeridin şimdiki değeri, geçmişte tam bu gün ve saatte ölçülen
            değerlerle kıyaslanır
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          Son {insight ? insight.baselineWindowWeeks : 12} hafta
        </span>
      </div>

      {status === "loading" ? (
        <p className="mx-4 mb-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Benzer saatler kontrol ediliyor…
        </p>
      ) : status === "error" ? (
        <InlineQueryError
          className="mx-4 mb-4"
          message="Şerit geçmişi alınamadı."
          onRetry={onRetry}
        />
      ) : !insight || insight.evaluations.length === 0 ? (
        <p className="mx-4 mb-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          Bu şerit için yön veya güncel ölçüm bulunmuyor, bu yüzden geçmişle
          kıyaslama yapılamıyor.
        </p>
      ) : !hasBaseline ? (
        <div className="mx-4 mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Yeterli geçmiş henüz birikmedi
            </p>
            <span className="text-[10px] font-semibold text-slate-500">
              {maximumSamples}/{insight.minimumSamples} örnek
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-violet-500"
              style={{ width: `${sampleProgress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            Bu gün-saat diliminden en fazla {maximumSamples}/
            {insight.minimumSamples} geçmiş örnek var; güvenilir bir kıyas için
            en az {insight.minimumSamples} gerekiyor. Yeterli referans oluşana
            kadar yukarıdaki anlık şerit kıyasını kullanın.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 px-4 pb-4">
          {insight.evaluations.map((evaluation) => {
            const identity = directions.find(
              (item) => item.direction === evaluation.direction,
            );
            return (
              <li
                key={`${evaluation.direction}-${evaluation.lane}`}
                className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {identity
                    ? formatTrafficDirectionLabel(identity, "short")
                    : `Yön ${evaluation.direction}`}{" "}
                  · Şerit {evaluation.lane}
                </p>
                <MetricRow label="Hız" metric={evaluation.speed} unit="km/sa" />
                <MetricRow
                  label="Geçiş"
                  metric={evaluation.flow}
                  unit="araç/sa"
                />
              </li>
            );
          })}
        </ul>
      )}

      <details className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-300">
          Karşılaştırma nasıl hesaplanır?
        </summary>
        <p className="mt-2 leading-4">
          Karşılaştırma 12 haftalık aynı gün ve saat örneklerinin ortanca
          aralığını kullanır. Sonuç bir engel, kapanma veya neden tespiti
          değildir.
        </p>
      </details>
    </section>
  );
}

function MetricRow({
  label,
  metric,
  unit,
}: {
  label: string;
  metric: LaneMetricBaseline;
  unit: string;
}) {
  const range =
    metric.expectedLowerBound === null || metric.expectedUpperBound === null
      ? `${metric.sampleCount} örnek`
      : `olağan ${number.format(metric.expectedLowerBound)}–${number.format(metric.expectedUpperBound)} ${unit}`;
  return (
    <div className="mt-2 flex items-start justify-between gap-3 text-[11px]">
      <p className="text-slate-600 dark:text-slate-400">
        {label}:{" "}
        {metric.currentValue === null
          ? "—"
          : number.format(metric.currentValue)}{" "}
        {unit}
        <span className="block text-[10px] text-slate-400">{range}</span>
      </p>
      <span
        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${STATE_BADGE_CLASSES[metric.state]}`}
      >
        {STATE_LABELS[metric.state]}
      </span>
    </div>
  );
}
