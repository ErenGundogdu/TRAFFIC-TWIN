"use client";

import type { StationSummary } from "@traffic-twin/contracts";
import { useRef, useState, type ReactNode } from "react";

import type { StationDetailView } from "../model/station-detail-view";
import { compareStationLanes } from "../model/lane-imbalance";
import { LaneComparisonOverview } from "./lane-comparison-overview";
import { StationDetailTabs } from "./station-detail-tabs";
import { StationDirectionCard } from "./station-direction-card";
import { StationLaneOverview } from "./station-lane-overview";

interface StationDetailPanelProps {
  station: StationSummary;
  timeZone: string;
  context?: ReactNode;
  insights?: ReactNode;
  laneHistory?: ReactNode;
  notes?: ReactNode;
}

const freshnessPresentation = {
  FRESH: { label: "Güncel", className: "bg-emerald-500" },
  STALE: { label: "Gecikmeli", className: "bg-amber-500" },
  OUTDATED: { label: "Eski veri", className: "bg-rose-500" },
  UNAVAILABLE: { label: "Veri yok", className: "bg-slate-400" },
} as const;

interface ViewState {
  stationId: string | null;
  view: StationDetailView;
}

export function StationDetailPanel({
  station,
  timeZone,
  context,
  insights,
  laneHistory,
  notes,
}: StationDetailPanelProps) {
  const [viewState, setViewState] = useState<ViewState>({
    stationId: station.id,
    view: "overview",
  });
  const activeView =
    viewState.stationId === station.id ? viewState.view : "overview";

  const freshness = freshnessPresentation[station.freshness];

  function changeView(view: StationDetailView) {
    setViewState({ stationId: station.id, view });
  }

  return (
    <aside
      className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950"
      aria-labelledby="station-title"
    >
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 pt-5 pb-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 pr-8 xl:pr-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-sky-700 uppercase dark:text-sky-300">
              Sensör istasyonu
            </p>
            <h2
              id="station-title"
              className="mt-1.5 break-words text-lg font-semibold text-slate-950 dark:text-white"
            >
              {station.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              TMS {station.tmsNumber} · Fintraffic
            </p>
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span
              className={`size-2.5 rounded-full ${freshness.className}`}
              aria-hidden="true"
            />
            {freshness.label}
          </span>
        </div>
        <div className="mt-4">
          <StationDetailTabs value={activeView} onChange={changeView} />
        </div>
      </header>

      <DetailPanel view="overview" activeView={activeView}>
        <Overview
          station={station}
          timeZone={timeZone}
          laneHistory={laneHistory}
        />
      </DetailPanel>
      <DetailPanel view="context" activeView={activeView}>
        <SlotContent view="context">{context}</SlotContent>
      </DetailPanel>
      <DetailPanel view="insights" activeView={activeView}>
        <SlotContent view="insights">{insights}</SlotContent>
      </DetailPanel>
      <DetailPanel view="notes" activeView={activeView}>
        <SlotContent view="notes">{notes}</SlotContent>
      </DetailPanel>
    </aside>
  );
}

function DetailPanel({
  view,
  activeView,
  children,
}: {
  view: StationDetailView;
  activeView: StationDetailView;
  children: ReactNode;
}) {
  const active = view === activeView;
  return (
    <div
      id={`station-detail-panel-${view}`}
      role="tabpanel"
      aria-labelledby={`station-detail-tab-${view}`}
      hidden={!active}
      className={`min-h-0 flex-1 overflow-y-auto p-4 ${active ? "block" : "hidden"}`}
    >
      {children}
    </div>
  );
}

function Overview({
  station,
  timeZone,
  laneHistory,
}: {
  station: StationSummary;
  timeZone: string;
  laneHistory?: ReactNode;
}) {
  const laneOverviewRef = useRef<HTMLDivElement>(null);
  const comparisons = compareStationLanes(station);

  return (
    <div className="space-y-3">
      {comparisons.length > 0 && (
        <LaneComparisonOverview
          comparisons={comparisons}
          timeZone={timeZone}
          onInspect={() =>
            laneOverviewRef.current?.scrollIntoView({ block: "start" })
          }
        />
      )}
      <div ref={laneOverviewRef}>
        <StationLaneOverview lanes={station.lanes} timeZone={timeZone} />
      </div>
      {laneHistory}
      {station.directions.map((direction) => (
        <StationDirectionCard
          key={direction.direction}
          direction={direction}
          timeZone={timeZone}
        />
      ))}
      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div>
          <dt className="text-slate-500">Enlem</dt>
          <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
            {station.latitude.toFixed(6)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Boylam</dt>
          <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
            {station.longitude.toFixed(6)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function SlotContent({
  view,
  children,
}: {
  view: Exclude<StationDetailView, "overview">;
  children: ReactNode;
}) {
  if (children) {
    return (
      <div className="[&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0">
        {children}
      </div>
    );
  }

  const label =
    view === "context" ? "Bağlam" : view === "insights" ? "İçgörü" : "Not";
  return (
    <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      {label} içeriği bu istasyon için kullanılamıyor.
    </p>
  );
}
