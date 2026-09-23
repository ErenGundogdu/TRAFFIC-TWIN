import type { ReplayFrame } from "@traffic-twin/contracts";

import { TrafficAssetIcon } from "@/shared/ui";

import type { LiveTrafficOverview } from "../lib/live-traffic-overview";
import type { WorkspaceMode } from "../model/workspace-mode";

function SummaryItem({
  label,
  value,
  markerClassName,
}: {
  label: string;
  value: number;
  markerClassName: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className={`size-2 rounded-full ${markerClassName}`}
        aria-hidden="true"
      />
      <span>{label}</span>
      <strong className="font-semibold text-slate-950 dark:text-white">
        {value}
      </strong>
    </span>
  );
}

export function LiveStatusSummary({
  overview,
  mode,
  activeEventCount,
  junctionCount,
  replayFrame,
  timeZone,
  embedded = false,
}: {
  overview: LiveTrafficOverview;
  mode: WorkspaceMode;
  activeEventCount: number;
  junctionCount: number;
  replayFrame?: ReplayFrame | null;
  timeZone: string;
  embedded?: boolean;
}) {
  if (mode === "replay") {
    return (
      <section className="pointer-events-none absolute top-4 left-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-white/80 bg-white/92 px-3.5 py-3 text-[11px] text-slate-600 shadow-xl backdrop-blur-md sm:max-w-[calc(100%-11rem)] dark:border-slate-700/90 dark:bg-slate-900/92 dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <strong className="text-xs text-slate-950 dark:text-white">
            Replay bağlamı
          </strong>
          {replayFrame ? (
            <>
              <span>{replayFrame.values.length} gerçek istasyon ölçümü</span>
              <span>{formatReplayTime(replayFrame.timestamp, timeZone)}</span>
            </>
          ) : (
            <span>Oynatma bekleniyor · canlı ölçümler gizlendi</span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <TrafficAssetIcon
              kind="junction"
              className="size-3.5 text-violet-600"
            />
            {junctionCount} doğrulanmış kavşak
          </span>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Güncel yol olayları ve saha bildirimleri geçmiş kareyle karıştırılmaz.
        </p>
      </section>
    );
  }

  return (
    <section
      className={
        embedded
          ? "pointer-events-none border-t border-slate-200/80 bg-slate-50/65 px-3.5 py-2.5 text-[11px] text-slate-600 dark:border-slate-700/80 dark:bg-slate-950/35 dark:text-slate-300"
          : "pointer-events-none absolute top-16 left-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-white/80 bg-white/92 px-3.5 py-3 text-[11px] text-slate-600 shadow-xl backdrop-blur-md sm:max-w-[calc(100%-11rem)] dark:border-slate-700/90 dark:bg-slate-900/92 dark:text-slate-300"
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <strong className="text-xs text-slate-950 dark:text-white">
          {mode === "analysis" ? "Analiz bağlamı" : "Canlı durum"}
        </strong>
        <span className="inline-flex items-center gap-1.5">
          <TrafficAssetIcon
            kind="station"
            className="size-3.5 text-emerald-600"
          />
          {overview.freshStations}/{overview.totalStations} güncel istasyon
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TrafficAssetIcon
            kind="road-work"
            className="size-3.5 text-orange-600"
          />
          {activeEventCount} aktif yol olayı
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TrafficAssetIcon
            kind="junction"
            className="size-3.5 text-violet-600"
          />
          {junctionCount} doğrulanmış kavşak
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
        <SummaryItem
          label="Akıcı"
          value={overview.flowingStations}
          markerClassName="bg-emerald-500"
        />
        <SummaryItem
          label="Yavaş"
          value={overview.slowStations}
          markerClassName="bg-amber-500"
        />
        <SummaryItem
          label="Kuyruk/duruş"
          value={overview.congestedStations}
          markerClassName="bg-rose-500"
        />
        <SummaryItem
          label="Yetersiz veri"
          value={overview.insufficientStations}
          markerClassName="bg-slate-400"
        />
      </div>
    </section>
  );
}

function formatReplayTime(timestamp: string, timeZone: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(timestamp));
}
