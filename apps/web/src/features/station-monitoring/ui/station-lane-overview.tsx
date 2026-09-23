import type {
  LaneDirectionEvidence,
  LaneFlowWindow,
  TrafficLane,
} from "@traffic-twin/contracts";

interface StationLaneOverviewProps {
  lanes: TrafficLane[];
  timeZone: string;
  now?: Date;
}

const FRESH_LIMIT_MS = 5 * 60 * 1_000;
const STALE_LIMIT_MS = 15 * 60 * 1_000;

type LaneFreshness = "FRESH" | "STALE" | "OUTDATED" | "UNAVAILABLE";

export function StationLaneOverview({
  lanes,
  timeZone,
  now = new Date(),
}: StationLaneOverviewProps) {
  if (lanes.length === 0) return null;
  const directionGroups = groupLanes(lanes);

  return (
    <section
      aria-labelledby="live-lane-title"
      className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-sky-600 uppercase dark:text-sky-300">
            Anlık ölçüm
          </p>
          <h3 id="live-lane-title" className="mt-1 text-sm font-semibold">
            Canlı şerit görünümü
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Şerit hızı ve geçiş temposu ayrı kaynak ölçümleridir; eksik hız
            tahmin edilmez.
          </p>
        </div>
        <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          {lanes.length} şerit
        </span>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        {directionGroups.map((group) => (
          <div key={group.key} className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {group.label}
              </p>
              <span className="text-[10px] text-slate-400">
                {group.lanes.length} şerit
              </span>
            </div>
            <div className="space-y-2.5">
              {group.lanes.map((lane) => (
                <LaneRow
                  key={lane.lane}
                  lane={lane}
                  lanes={group.lanes}
                  timeZone={timeZone}
                  now={now}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <details className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-300">
          Ölçümler nasıl okunur?
        </summary>
        <p className="mt-2 leading-4">
          Geçiş temposu, Fintraffic’in beş dakikalık gerçek ölçümünden saatlik
          karşılığa çevrilir. Kayan veya sabit pencere her şeritte gösterilir.
          Son 5 dakikadaki ölçüm güncel, 5–15 dakika arası gecikmeli, daha eski
          ölçüm ise eski kayıt olarak işaretlenir. Yön kanıtı bulunmayan şerit
          için yön tahmin edilmez.
        </p>
      </details>
    </section>
  );
}

function LaneRow({
  lane,
  lanes,
  timeZone,
  now,
}: {
  lane: TrafficLane;
  lanes: TrafficLane[];
  timeZone: string;
  now: Date;
}) {
  const freshness = classifyLaneFreshness(lane.measuredAt, now);
  const presentation = freshnessPresentation[freshness];
  const isOutdated = freshness === "OUTDATED";
  const maximumSpeed = Math.max(
    ...lanes.map((item) => item.averageSpeedKmh ?? 0),
    1,
  );
  const speedWidth = lane.averageSpeedKmh
    ? Math.max(8, (lane.averageSpeedKmh / maximumSpeed) * 100)
    : 0;

  return (
    <article
      className={`rounded-xl border px-3 py-2.5 ${presentation.containerClassName}`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
        >
          {lane.lane}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Şerit {lane.lane}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-semibold ${presentation.textClassName}`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${presentation.dotClassName}`}
              />
              {presentation.label}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {isOutdated && lane.averageSpeedKmh !== null ? (
                <span className="font-normal text-slate-500">Son kayıt: </span>
              ) : null}
              <span>{formatSpeed(lane.averageSpeedKmh)}</span>
            </p>
            <p className="shrink-0 text-[10px] font-medium text-slate-500">
              {isOutdated && lane.flowVehiclesPerHour !== null ? (
                <span>Son kayıt: </span>
              ) : null}
              <span>{formatFlow(lane.flowVehiclesPerHour)}</span>
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${presentation.barClassName}`}
              style={{ width: `${speedWidth}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-slate-400">
            <span>
              {formatDirectionLabel(lane.direction, lane.directionEvidence)}
            </span>
            <span className="text-right">
              {formatMeasuredAt(lane.measuredAt, timeZone)} ·{" "}
              {formatFlowWindow(lane.flowWindow)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function groupLanes(lanes: TrafficLane[]) {
  const groups = new Map<string, TrafficLane[]>();
  for (const lane of lanes) {
    const key = lane.direction === null ? "unknown" : String(lane.direction);
    groups.set(key, [...(groups.get(key) ?? []), lane]);
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    label:
      group[0]?.direction === null
        ? "Yön eşleşmesi olmayan şeritler"
        : `Yön ${group[0]?.direction}`,
    lanes: group.sort((left, right) => left.lane - right.lane),
  }));
}

function formatDirectionLabel(
  direction: 1 | 2 | null,
  evidence: LaneDirectionEvidence | null,
) {
  if (direction === null) return "Yön eşleşmesi yok";
  const source =
    evidence === "OBSERVED_PASSAGES"
      ? "geçmiş veriden"
      : "resmî şerit sayısından";
  return `Yön ${direction} · ${source}`;
}

function formatSpeed(value: number | null) {
  return value === null
    ? "Şerit hız verisi yok"
    : `${formatNumber(value)} km/sa`;
}

function formatFlow(value: number | null) {
  return value === null ? "Veri yok" : `${formatNumber(value)} araç/sa`;
}

function formatFlowWindow(value: LaneFlowWindow | null) {
  if (value === "ROLLING_5_MINUTES") return "Kayan 5 dk.";
  if (value === "FIXED_5_MINUTES") return "Sabit 5 dk.";
  return "Pencere bilgisi yok";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function classifyLaneFreshness(
  measuredAt: string | null,
  now: Date,
): LaneFreshness {
  if (!measuredAt) return "UNAVAILABLE";
  const measuredAtMs = Date.parse(measuredAt);
  if (!Number.isFinite(measuredAtMs)) return "UNAVAILABLE";
  const ageMs = now.getTime() - measuredAtMs;
  if (ageMs <= FRESH_LIMIT_MS) return "FRESH";
  return ageMs <= STALE_LIMIT_MS ? "STALE" : "OUTDATED";
}

function formatMeasuredAt(measuredAt: string | null, timeZone: string) {
  if (!measuredAt) return "Ölçüm zamanı yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(measuredAt));
}

const freshnessPresentation = {
  FRESH: {
    label: "Güncel",
    containerClassName: "border-transparent bg-slate-50 dark:bg-slate-950",
    textClassName: "text-emerald-700 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
    barClassName: "bg-sky-500",
  },
  STALE: {
    label: "Gecikmeli",
    containerClassName:
      "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
    textClassName: "text-amber-700 dark:text-amber-300",
    dotClassName: "bg-amber-500",
    barClassName: "bg-amber-500",
  },
  OUTDATED: {
    label: "Eski ölçüm",
    containerClassName:
      "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
    textClassName: "text-rose-700 dark:text-rose-300",
    dotClassName: "bg-rose-500",
    barClassName: "bg-rose-400",
  },
  UNAVAILABLE: {
    label: "Zaman bilinmiyor",
    containerClassName:
      "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950",
    textClassName: "text-slate-500 dark:text-slate-400",
    dotClassName: "bg-slate-400",
    barClassName: "bg-slate-400",
  },
} as const;
