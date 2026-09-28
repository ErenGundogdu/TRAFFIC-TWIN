import { useState } from "react";
import type {
  AnomalyConfidence,
  AnomalyEvaluation,
  StationSummary,
  TrafficEvent,
  TrafficEventSeverity,
} from "@traffic-twin/contracts";

import type { LiveTrafficOverview } from "../lib/live-traffic-overview";

interface TodaySummaryPanelProps {
  overview: LiveTrafficOverview;
  anomalies: AnomalyEvaluation[];
  trafficEvents: TrafficEvent[];
  stations: StationSummary[];
  onSelectStation: (stationId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

const severityRank: Record<TrafficEventSeverity, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};

const severityLabel: Record<TrafficEventSeverity, string> = {
  HIGH: "Yüksek etki",
  MEDIUM: "Orta etki",
  LOW: "Düşük etki",
  UNKNOWN: "Etki bilinmiyor",
};

const confidenceRank: Record<AnomalyConfidence, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INSUFFICIENT: 0,
};

const confidenceLabel: Record<AnomalyConfidence, string> = {
  HIGH: "Yüksek güven",
  MEDIUM: "Orta güven",
  LOW: "Düşük güven",
  INSUFFICIENT: "Yetersiz güven",
};

const MAX_LISTED_ANOMALIES = 3;

/**
 * Higher confidence first, then larger absolute deviation first — so the
 * most reliably-detected and most pronounced anomaly wins, not just
 * whichever happened to be listed first by the API.
 */
function compareAnomalySeverity(
  left: AnomalyEvaluation,
  right: AnomalyEvaluation,
) {
  const confidenceDiff =
    confidenceRank[right.confidence] - confidenceRank[left.confidence];
  if (confidenceDiff !== 0) return confidenceDiff;
  return normalizedDeviation(right) - normalizedDeviation(left);
}

function normalizedDeviation(evaluation: AnomalyEvaluation) {
  if (!evaluation.expectedMedian || evaluation.expectedMedian <= 0) return 0;
  return (
    Math.abs(evaluation.currentValue - evaluation.expectedMedian) /
    evaluation.expectedMedian
  );
}

function anomalyReading(evaluation: AnomalyEvaluation) {
  const metricLabel =
    evaluation.metric === "average-speed-kmh" ? "Hız" : "Araç akışı";
  if (evaluation.expectedMedian === null || evaluation.expectedMedian <= 0) {
    return `${metricLabel} beklenen aralığın dışında`;
  }

  const differencePercent = Math.round(
    (Math.abs(evaluation.currentValue - evaluation.expectedMedian) /
      evaluation.expectedMedian) *
      100,
  );
  const direction =
    evaluation.currentValue < evaluation.expectedMedian ? "düşük" : "yüksek";
  return `${metricLabel} beklenenden %${differencePercent} ${direction}`;
}

function formatAnomalyValue(evaluation: AnomalyEvaluation, value: number) {
  const formatted = value.toLocaleString("tr-TR", {
    maximumFractionDigits: 1,
  });
  return evaluation.metric === "average-speed-kmh"
    ? `${formatted} km/sa`
    : `${formatted} araç/sa`;
}

function formatObservedAt(evaluation: AnomalyEvaluation) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: evaluation.localTimeZone,
  }).format(new Date(evaluation.observedAt));
}

/**
 * A station can have an active anomaly on each direction at once; showing
 * both would waste two of the three highlighted slots on one place. Keep
 * only each station's worst anomaly so the list surfaces distinct stations.
 */
function pickWorstAnomalyPerStation(anomalies: AnomalyEvaluation[]) {
  const worstByStation = new Map<string, AnomalyEvaluation>();
  for (const anomaly of anomalies) {
    const current = worstByStation.get(anomaly.assetId);
    if (!current || compareAnomalySeverity(anomaly, current) < 0) {
      worstByStation.set(anomaly.assetId, anomaly);
    }
  }
  return [...worstByStation.values()].sort(compareAnomalySeverity);
}

export function TodaySummaryPanel({
  overview,
  anomalies,
  trafficEvents,
  stations,
  onSelectStation,
  onSelectEvent,
}: TodaySummaryPanelProps) {
  const activeAnomalies = anomalies.filter((item) => item.status === "ACTIVE");
  const worstAnomalyPerStation = pickWorstAnomalyPerStation(activeAnomalies);
  const listedAnomalies = worstAnomalyPerStation.slice(0, MAX_LISTED_ANOMALIES);
  const remainingAnomalies = worstAnomalyPerStation.slice(MAX_LISTED_ANOMALIES);
  const [showRemaining, setShowRemaining] = useState(false);
  const stationById = new Map(
    stations.map((station) => [station.id, station] as const),
  );

  const activeEvents = trafficEvents.filter(
    (event) => event.status === "ACTIVE",
  );
  const topEvent = [...activeEvents].sort((left, right) => {
    const severityDiff =
      severityRank[right.severity] - severityRank[left.severity];
    if (severityDiff !== 0) return severityDiff;
    // Same severity: prefer the event with more reported concrete effects
    // (e.g. lane closures, speed limits) over one with fewer — a signal
    // from Fintraffic's own report, not a proxy for nearby station density.
    return right.effects.length - left.effects.length;
  })[0];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50 p-5 dark:bg-slate-950">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-sky-700 uppercase dark:text-sky-300">
          Genel bakış
        </p>
        <h2 className="mt-1.5 text-lg font-semibold text-slate-950 dark:text-white">
          Bugünün özeti
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Ayrıntı için bir istasyon, kavşak veya koridor seçin.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2.5">
        <SummaryStat
          label="Akıcı"
          value={overview.flowingStations}
          accent="emerald"
        />
        <SummaryStat
          label="Yavaş"
          value={overview.slowStations}
          accent="amber"
        />
        <SummaryStat
          label="Kuyruk/duruş"
          value={overview.congestedStations}
          accent="rose"
        />
        <SummaryStat
          label="Yetersiz veri"
          value={overview.insufficientStations}
          accent="slate"
        />
      </dl>
      <p className="mt-2 text-[10px] text-slate-400">
        {overview.freshStations}/{overview.totalStations} istasyondan güncel
        ölçüm alınıyor.
      </p>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Olağandışı durumlar
        </h3>
        {listedAnomalies.length === 0 ? (
          <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            Şu an olağandışı olarak işaretlenmiş bir istasyon yok.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {listedAnomalies.map((anomaly) => {
              const station = stationById.get(anomaly.assetId);
              return (
                <li key={anomaly.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStation(anomaly.assetId)}
                    aria-label={`${station?.name ?? anomaly.assetId} anomalisini incele`}
                    className="group w-full overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/70 text-left text-amber-950 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-amber-900/80 dark:bg-amber-950/30 dark:text-amber-50 dark:hover:border-amber-800 dark:hover:bg-amber-950/50"
                  >
                    <span className="block px-3 py-2.5">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-semibold">
                            {station?.name ?? anomaly.assetId}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-amber-700 dark:text-amber-300">
                            Yön {anomaly.direction} ·{" "}
                            {formatObservedAt(anomaly)}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-white/75 px-2 py-1 text-[9px] font-semibold text-amber-800 dark:bg-black/20 dark:text-amber-200">
                          {confidenceLabel[anomaly.confidence]}
                        </span>
                      </span>

                      <span className="mt-2 block text-xs font-semibold">
                        {anomalyReading(anomaly)}
                      </span>

                      <span className="mt-2 grid grid-cols-2 gap-2">
                        <span className="rounded-lg bg-white/70 px-2.5 py-2 dark:bg-black/15">
                          <span className="block text-[9px] text-amber-700/80 dark:text-amber-300/80">
                            Şu an
                          </span>
                          <strong className="mt-0.5 block text-[11px]">
                            {formatAnomalyValue(anomaly, anomaly.currentValue)}
                          </strong>
                        </span>
                        <span className="rounded-lg bg-white/70 px-2.5 py-2 dark:bg-black/15">
                          <span className="block text-[9px] text-amber-700/80 dark:text-amber-300/80">
                            Beklenen
                          </span>
                          <strong className="mt-0.5 block text-[11px]">
                            {anomaly.expectedMedian === null
                              ? "Yetersiz veri"
                              : formatAnomalyValue(
                                  anomaly,
                                  anomaly.expectedMedian,
                                )}
                          </strong>
                        </span>
                      </span>

                      <span className="mt-2 flex items-center justify-between gap-2 text-[9px] text-amber-700 dark:text-amber-300">
                        <span
                          title={`Son ${anomaly.baselineWindowWeeks} haftanın ${anomaly.sampleCount} tanesinde, aynı gün ve saatte bu istasyon ve yön için ölçüm var. "Beklenen" değer bu ${anomaly.sampleCount} saatlik değerin ortancasıdır; eksik haftalar hesaba katılmaz.`}
                        >
                          {anomaly.sampleCount}/{anomaly.baselineWindowWeeks}{" "}
                          hafta verisi · aynı gün ve saat
                        </span>
                        <span className="font-semibold group-hover:underline">
                          İncele →
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {remainingAnomalies.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              aria-expanded={showRemaining}
              onClick={() => setShowRemaining((open) => !open)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {showRemaining
                ? "Diğer istasyonları gizle"
                : `+${remainingAnomalies.length} istasyon daha göster`}
            </button>
            {showRemaining ? (
              <ul
                aria-label="Diğer olağandışı istasyonlar"
                className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1"
              >
                {remainingAnomalies.map((anomaly) => (
                  <li key={anomaly.id}>
                    <button
                      type="button"
                      onClick={() => onSelectStation(anomaly.assetId)}
                      className="w-full rounded-lg border border-amber-200/80 bg-amber-50/60 px-2.5 py-2 text-left hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[11px] font-semibold text-amber-950 dark:text-amber-50">
                          {stationById.get(anomaly.assetId)?.name ??
                            anomaly.assetId}
                        </span>
                        <span className="shrink-0 text-[9px] font-semibold text-amber-800 dark:text-amber-200">
                          {confidenceLabel[anomaly.confidence]}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] text-amber-800 dark:text-amber-300">
                        Yön {anomaly.direction} · {anomalyReading(anomaly)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Öne çıkan yol olayı
        </h3>
        {!topEvent ? (
          <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            Şu an aktif bir yol olayı yok.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onSelectEvent(topEvent.id)}
            className="mt-2 w-full rounded-xl bg-orange-50 px-3 py-2 text-left text-[11px] text-orange-900 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-100 dark:hover:bg-orange-950/70"
          >
            <span className="block truncate font-medium">{topEvent.title}</span>
            <span className="mt-0.5 block text-[10px] text-orange-700 dark:text-orange-300">
              {topEvent.category === "ROAD_WORK"
                ? "Yol çalışması"
                : "Trafik duyurusu"}{" "}
              · {severityLabel[topEvent.severity]}
            </span>
          </button>
        )}
        {activeEvents.length > (topEvent ? 1 : 0) ? (
          <p className="mt-1.5 text-[10px] text-slate-400">
            Toplam {activeEvents.length} aktif yol olayı var; tümünü sağ üstteki
            listeden görebilirsiniz.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "emerald" | "amber" | "rose" | "slate";
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${accentClasses[accent].container}`}
    >
      <p className={`text-[10px] font-medium ${accentClasses[accent].label}`}>
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

const accentClasses = {
  emerald: {
    container: "bg-emerald-50 dark:bg-emerald-950/40",
    label: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    container: "bg-amber-50 dark:bg-amber-950/40",
    label: "text-amber-700 dark:text-amber-300",
  },
  rose: {
    container: "bg-rose-50 dark:bg-rose-950/40",
    label: "text-rose-700 dark:text-rose-300",
  },
  slate: {
    container: "bg-slate-100 dark:bg-slate-800",
    label: "text-slate-600 dark:text-slate-300",
  },
} as const;
