import type { AnomalyEvaluation } from "@traffic-twin/contracts";

interface AnomalyPanelProps {
  evaluations: AnomalyEvaluation[];
  status?: "loading" | "error" | "ready";
  onRetry?: () => void;
}

const STATUS_LABELS = {
  INSUFFICIENT_DATA: "Yetersiz geçmiş",
  NORMAL: "Beklenen aralıkta",
  CANDIDATE: "İzleniyor",
  ACTIVE: "Aktif anomali",
} as const;

function metricLabel(metric: AnomalyEvaluation["metric"]) {
  return metric === "average-speed-kmh" ? "Ortalama hız" : "Trafik hacmi";
}

function unit(metric: AnomalyEvaluation["metric"]) {
  return metric === "average-speed-kmh" ? "km/sa" : "araç/sa";
}

function format(value: number | null, metric: AnomalyEvaluation["metric"]) {
  return value === null
    ? "—"
    : `${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} ${unit(metric)}`;
}

export function AnomalyPanel({
  evaluations,
  status = "ready",
  onRetry,
}: AnomalyPanelProps) {
  return (
    <section
      className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800"
      aria-labelledby="anomaly-title"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-rose-700 uppercase">
            Açıklanabilir içgörü
          </p>
          <h3
            id="anomaly-title"
            className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Kayan baseline karşılaştırması
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Median / MAD
        </span>
      </div>

      {status === "loading" ? (
        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Anomali değerlendirmeleri yükleniyor…
        </p>
      ) : status === "error" ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
          <p>Anomali değerlendirmeleri alınamadı.</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 font-semibold underline underline-offset-2"
            >
              Tekrar dene
            </button>
          ) : null}
        </div>
      ) : evaluations.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">
          Bu istasyon için henüz değerlendirme üretilmedi. Sistem eksik geçmişte
          anomali uydurmaz.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {evaluations.map((evaluation) => (
            <article
              key={`${evaluation.direction}-${evaluation.metric}`}
              className={`rounded-xl border p-3 ${
                evaluation.status === "ACTIVE"
                  ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950"
                  : evaluation.status === "CANDIDATE"
                    ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Yön {evaluation.direction} · {metricLabel(evaluation.metric)}
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {STATUS_LABELS[evaluation.status]}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <dt className="text-slate-500">Mevcut</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {format(evaluation.currentValue, evaluation.metric)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Beklenen aralık</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {evaluation.expectedLowerBound === null
                      ? "Yetersiz veri"
                      : `${format(evaluation.expectedLowerBound, evaluation.metric)} – ${format(evaluation.expectedUpperBound, evaluation.metric)}`}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                Son {evaluation.baselineWindowWeeks} haftada aynı yerel
                gün/saatten {evaluation.sampleCount}/{evaluation.minimumSamples}{" "}
                örnek · Güven: {evaluation.confidence} · Ardışık sapma:{" "}
                {evaluation.consecutiveDeviations}/
                {evaluation.requiredConsecutiveDeviations}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {evaluation.localTimeZone} · {evaluation.policyVersion}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
