"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  AnalyticsPanel,
  ReplayPanel,
  useHistoryAvailability,
} from "@/features/traffic-analytics";
import {
  StationDetailPanel,
  useStationCatalog,
} from "@/features/station-monitoring";
import {
  countAnomalousAssets,
  MapVisualizationLegend,
  TrafficMap,
  type MapVisualizationMode,
} from "@/features/traffic-map";
import { OperatorNotesPanel } from "@/features/operator-notes";
import { FieldReportComposer, useFieldReports } from "@/features/field-reports";
import type { FieldReportLocation } from "@traffic-twin/contracts";
import { useStationRoadContext } from "@/features/road-context";
import { useRealtimeSync } from "@/features/realtime";
import { applyReplayFrame, useReplay } from "@/features/replay";
import {
  JunctionDetailPanel,
  useJunctionCatalog,
} from "@/features/junction-monitoring";
import { AnomalyPanel, useAnomalyCatalog } from "@/features/anomaly-monitoring";
import {
  CorridorDetailPanel,
  CorridorInsightPanel,
  useCorridorCatalog,
  useCorridorInsight,
} from "@/features/corridor-insights";
import {
  LaneHistoryInsightPanel,
  useLaneHistoryInsight,
} from "@/features/lane-history-insights";
import {
  defaultTrafficEventFilters,
  filterTrafficEvents,
  parseTrafficEventFilters,
  setTrafficEventFilters,
  TrafficEventExplorer,
  StationTrafficEventContextPanel,
  useTrafficEventCatalog,
  useStationTrafficEventContext,
  type TrafficEventFilters,
} from "@/features/traffic-events";

import { AssetSelectionBar } from "./asset-selection-bar";
import { createLiveTrafficOverview } from "../lib/live-traffic-overview";
import {
  defaultMapLayerSettings,
  filterStationsForMap,
} from "../model/map-layer-settings";
import {
  parseWorkspaceMode,
  setWorkspaceMode,
  type WorkspaceMode,
} from "../model/workspace-mode";
import { LiveStatusSummary } from "./live-status-summary";
import { MapLayerControl } from "./map-layer-control";
import { StationRequiredPanel } from "./station-required-panel";
import { TodaySummaryPanel } from "./today-summary-panel";
import { WorkspaceHeader } from "./workspace-header";

interface MonitoringWorkspaceProps {
  coverageAreaId: string;
}

export function MonitoringWorkspace({
  coverageAreaId,
}: MonitoringWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mapVisualizationMode, setMapVisualizationMode] =
    useState<MapVisualizationMode>("flow");
  const [mapLayerSettings, setMapLayerSettings] = useState(
    defaultMapLayerSettings,
  );
  const [fieldReportToolActive, setFieldReportToolActive] = useState(false);
  const [fieldReportDraftLocation, setFieldReportDraftLocation] =
    useState<FieldReportLocation | null>(null);
  // Mobile-only: lets the summary overlay be closed to reveal the map
  // underneath, since on narrow screens it isn't a sidebar but a card that
  // covers most of the map when nothing is selected.
  const [isSummaryDismissedOnMobile, setIsSummaryDismissedOnMobile] =
    useState(false);
  const mode = parseWorkspaceMode(searchParams.get("mode"));
  const trafficEventFilters = parseTrafficEventFilters(searchParams);
  const requestedStationId = searchParams.get("station");
  const selectedJunctionId = searchParams.get("junction");
  const selectedCorridorId = searchParams.get("corridor");
  const catalogQuery = useStationCatalog(coverageAreaId);
  const junctionQuery = useJunctionCatalog(coverageAreaId);
  const corridorCatalogQuery = useCorridorCatalog(coverageAreaId);
  const anomalyQuery = useAnomalyCatalog(coverageAreaId);
  const trafficEventQuery = useTrafficEventCatalog(coverageAreaId);
  const fieldReportsQuery = useFieldReports(coverageAreaId);
  const liveTrafficEvents =
    trafficEventQuery.data?.events.filter(
      (event) => event.status !== "ENDED",
    ) ?? [];
  const filteredTrafficEvents = filterTrafficEvents(
    liveTrafficEvents,
    trafficEventFilters,
  );
  const requestedTrafficEventId = searchParams.get("event");
  const selectedTrafficEventId = filteredTrafficEvents.some(
    (event) => event.id === requestedTrafficEventId,
  )
    ? requestedTrafficEventId
    : null;
  const requestedFieldReportId = searchParams.get("report");
  const fieldReports = fieldReportsQuery.data ?? [];
  const selectedFieldReportId = fieldReports.some(
    (report) =>
      report.id === requestedFieldReportId &&
      report.status !== "REJECTED" &&
      report.status !== "RESOLVED",
  )
    ? requestedFieldReportId
    : null;
  const historyAvailabilityQuery = useHistoryAvailability(
    coverageAreaId,
    mode !== "live",
  );
  const realtime = useRealtimeSync(coverageAreaId);
  const replay = useReplay();
  const requestedStation =
    catalogQuery.data?.stations.find(
      (station) => station.id === requestedStationId,
    ) ?? null;
  // Never pick a station on the user's behalf: analysis and replay without a
  // selection show an explicit prompt instead.
  const selectedStationId = requestedStation?.id ?? null;
  const replayView = mode === "replay" && selectedStationId !== null;
  const roadContextQuery = useStationRoadContext(
    coverageAreaId,
    mapVisualizationMode === "flow" ? selectedStationId : null,
  );
  const selectedStation =
    catalogQuery.data?.stations.find(
      (station) => station.id === selectedStationId,
    ) ?? null;
  const trafficEventContextQuery = useStationTrafficEventContext(
    coverageAreaId,
    selectedStationId,
  );
  const selectedJunction =
    junctionQuery.data?.junctions.find(
      (junction) => junction.id === selectedJunctionId,
    ) ?? null;
  const selectedCorridor =
    corridorCatalogQuery.data?.corridors.find(
      (corridor) => corridor.id === selectedCorridorId,
    ) ?? null;
  const highlightedStationIds = useMemo(
    () => new Set(selectedCorridor?.stationIds ?? []),
    [selectedCorridor],
  );
  const selectedAnomalies =
    anomalyQuery.data?.evaluations.filter(
      (evaluation) => evaluation.assetId === selectedStationId,
    ) ?? [];
  const corridorInsightQuery = useCorridorInsight(
    coverageAreaId,
    selectedStationId,
    mode === "live",
  );
  const laneHistoryQuery = useLaneHistoryInsight(
    coverageAreaId,
    selectedStationId,
    mode === "live",
  );

  function selectStation(stationId: string) {
    if (mode !== "live") replay.control({ action: "stop" });
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("station", stationId);
    if (
      mode === "analysis" &&
      nextParams.get("analysisView") === "comparison"
    ) {
      nextParams.set("cmpAAsset", stationId);
    }
    nextParams.delete("junction");
    if (!selectedCorridor?.stationIds.includes(stationId)) {
      nextParams.delete("corridor");
    }
    nextParams.delete("event");
    nextParams.delete("report");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function selectJunction(junctionId: string) {
    replay.control({ action: "stop" });
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("junction", junctionId);
    nextParams.delete("station");
    nextParams.delete("corridor");
    nextParams.delete("mode");
    nextParams.delete("event");
    nextParams.delete("report");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function selectCorridor(corridorId: string) {
    replay.control({ action: "stop" });
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("corridor", corridorId);
    nextParams.delete("station");
    nextParams.delete("junction");
    nextParams.delete("mode");
    nextParams.delete("event");
    nextParams.delete("report");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function clearSelection() {
    replay.control({ action: "stop" });
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("station");
    nextParams.delete("junction");
    nextParams.delete("corridor");
    nextParams.delete("report");
    if (mode !== "live") {
      nextParams.delete("mode");
    }
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function changeTrafficEventFilters(filters: TrafficEventFilters) {
    replaceSearchParams(setTrafficEventFilters(searchParams, filters));
  }

  function selectTrafficEvent(eventId: string | null) {
    const selectedEventIsVisible = filteredTrafficEvents.some(
      (event) => event.id === eventId,
    );
    const nextParams =
      eventId && !selectedEventIsVisible
        ? setTrafficEventFilters(searchParams, defaultTrafficEventFilters)
        : new URLSearchParams(searchParams.toString());
    if (eventId) nextParams.set("event", eventId);
    else nextParams.delete("event");
    if (eventId) nextParams.delete("report");
    replaceSearchParams(nextParams);
  }

  function selectFieldReport(reportId: string | null) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (reportId) {
      nextParams.set("report", reportId);
      nextParams.delete("event");
    } else {
      nextParams.delete("report");
    }
    replaceSearchParams(nextParams);
  }

  function startFieldReport() {
    setFieldReportToolActive(true);
    setFieldReportDraftLocation(null);
    selectFieldReport(null);
  }

  function cancelFieldReport() {
    setFieldReportToolActive(false);
    setFieldReportDraftLocation(null);
  }

  function replaceSearchParams(nextParams: URLSearchParams) {
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function changeMode(nextMode: WorkspaceMode) {
    if (nextMode !== "replay") replay.control({ action: "stop" });
    const nextParams = setWorkspaceMode(searchParams, nextMode);
    nextParams.delete("junction");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  if (catalogQuery.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Gerçek Fintraffic istasyonları yükleniyor…
        </div>
      </main>
    );
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6 dark:bg-slate-950">
        <section className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900 dark:bg-slate-900">
          <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
            Veri kaynağına ulaşılamadı
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50">
            İstasyonlar yüklenemedi
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            API ve Fintraffic bağlantısını kontrol edip tekrar deneyin. Eksik
            ölçümlerin yerine veri üretilmedi.
          </p>
          <button
            type="button"
            onClick={() => void catalogQuery.refetch()}
            className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Tekrar dene
          </button>
        </section>
      </main>
    );
  }

  const { coverageArea, source, stations } = catalogQuery.data;
  const junctions = junctionQuery.data?.junctions ?? [];
  const corridors = corridorCatalogQuery.data?.corridors ?? [];
  const replayDirection = searchParams.get("direction") === "2" ? 2 : 1;
  const mapStations = replayView
    ? applyReplayFrame(
        stations,
        replay.frame,
        replayDirection,
        replay.resolution,
      )
    : stations;
  const visibleMapStations = filterStationsForMap(
    mapStations,
    mapLayerSettings,
    selectedStationId,
  );
  const visibleTrafficEvents = filteredTrafficEvents.filter(
    (trafficEvent) =>
      trafficEvent.id === selectedTrafficEventId ||
      (trafficEvent.category === "ROAD_WORK"
        ? mapLayerSettings.roadWorks
        : mapLayerSettings.trafficAnnouncements),
  );
  const visibleFieldReports = mapLayerSettings.fieldReports ? fieldReports : [];
  const visibleJunctions = mapLayerSettings.junctions ? junctions : [];
  const liveTrafficOverview = createLiveTrafficOverview(mapStations);
  const mapLayerCounts = {
    stations: mapStations.length,
    junctions: junctions.length,
    anomalies: countAnomalousAssets(anomalyQuery.data?.evaluations ?? []),
    roadWorks: liveTrafficEvents.filter(
      (trafficEvent) => trafficEvent.category === "ROAD_WORK",
    ).length,
    trafficAnnouncements: liveTrafficEvents.filter(
      (trafficEvent) => trafficEvent.category === "TRAFFIC_ANNOUNCEMENT",
    ).length,
    fieldReports: fieldReports.filter(
      (report) => report.status !== "REJECTED" && report.status !== "RESOLVED",
    ).length,
  };

  return (
    <main className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <WorkspaceHeader
        coverageAreaName={coverageArea.name}
        timeZone={coverageArea.timeZone}
        mode={mode}
        onModeChange={changeMode}
        realtimeStatus={realtime.status}
        source={source}
        refreshing={catalogQuery.isFetching}
        onRefresh={() => void catalogQuery.refetch()}
      />

      <AssetSelectionBar
        stations={stations}
        junctions={junctions}
        corridors={corridors}
        selectedStationId={selectedStationId}
        selectedJunctionId={selectedJunctionId}
        selectedCorridorId={selectedCorridorId}
        onSelectStation={selectStation}
        onSelectJunction={selectJunction}
        onSelectCorridor={selectCorridor}
        onClearSelection={clearSelection}
        junctionStatus={
          junctionQuery.isPending
            ? "loading"
            : junctionQuery.isError
              ? "error"
              : "ready"
        }
        onRetryJunctions={() => void junctionQuery.refetch()}
        corridorStatus={
          corridorCatalogQuery.isPending
            ? "loading"
            : corridorCatalogQuery.isError
              ? "error"
              : "ready"
        }
        onRetryCorridors={() => void corridorCatalogQuery.refetch()}
        showHistoryAvailability={mode !== "live"}
        historyAvailability={historyAvailabilityQuery.data?.assets}
        historyAvailabilityStatus={
          historyAvailabilityQuery.isPending
            ? "loading"
            : historyAvailabilityQuery.isError
              ? "error"
              : "ready"
        }
      />

      <div
        className={`relative grid min-h-0 flex-1 grid-cols-1 ${
          mode !== "live"
            ? "grid-rows-[minmax(260px,1fr)_minmax(300px,46vh)] xl:grid-cols-[minmax(440px,42vw)_minmax(0,1fr)] xl:grid-rows-1"
            : "xl:grid-cols-[minmax(0,1fr)_380px]"
        }`}
      >
        <section
          className={`relative overflow-hidden ${mode === "live" ? "min-h-[440px]" : "min-h-[260px] xl:min-h-0"}`}
          aria-label="Trafik haritası"
        >
          <TrafficMap
            bbox={coverageArea.bbox}
            timeZone={coverageArea.timeZone}
            stations={visibleMapStations}
            selectedStationId={selectedStationId}
            highlightedStationIds={highlightedStationIds}
            onSelect={selectStation}
            junctions={visibleJunctions}
            selectedJunctionId={selectedJunctionId}
            onSelectJunction={selectJunction}
            anomalies={
              replayView || !mapLayerSettings.anomalies
                ? []
                : anomalyQuery.data?.evaluations
            }
            trafficEvents={replayView ? [] : visibleTrafficEvents}
            selectedTrafficEventId={replayView ? null : selectedTrafficEventId}
            onSelectTrafficEvent={selectTrafficEvent}
            fieldReports={replayView ? [] : visibleFieldReports}
            selectedFieldReportId={replayView ? null : selectedFieldReportId}
            onSelectFieldReport={selectFieldReport}
            fieldReportPickMode={fieldReportToolActive}
            fieldReportDraftLocation={fieldReportDraftLocation}
            onPickFieldReportLocation={setFieldReportDraftLocation}
            visualizationMode={mapVisualizationMode}
            onVisualizationModeChange={setMapVisualizationMode}
            roadContext={roadContextQuery.data}
            roadContextStatus={
              mapVisualizationMode !== "flow" || !selectedStationId
                ? "idle"
                : roadContextQuery.isPending
                  ? "loading"
                  : roadContextQuery.isError
                    ? "error"
                    : "ready"
            }
            showLegend={false}
          />
          {mode !== "replay" ? (
            <div className="pointer-events-none absolute top-16 right-4 left-4 z-20 flex flex-col items-stretch gap-2 md:top-4 md:flex-row md:items-start md:justify-between">
              <div className="w-full md:w-[min(360px,calc(100%-22rem))] md:min-w-72">
                <MapLayerControl
                  value={mapLayerSettings}
                  counts={mapLayerCounts}
                  visibleStationCount={visibleMapStations.length}
                  onChange={setMapLayerSettings}
                  statusSummary={
                    <LiveStatusSummary
                      overview={liveTrafficOverview}
                      mode={mode}
                      activeEventCount={filteredTrafficEvents.length}
                      junctionCount={junctions.length}
                      timeZone={coverageArea.timeZone}
                      embedded
                    />
                  }
                />
              </div>
              <div className="w-full md:mt-12 md:w-[min(340px,calc(100%-20rem))] md:min-w-64">
                <TrafficEventExplorer
                  events={filteredTrafficEvents}
                  allEvents={liveTrafficEvents}
                  filters={trafficEventFilters}
                  onFiltersChange={changeTrafficEventFilters}
                  selectedEventId={selectedTrafficEventId}
                  onSelectEvent={selectTrafficEvent}
                  source={trafficEventQuery.data?.source}
                  timeZone={coverageArea.timeZone}
                  status={
                    trafficEventQuery.isPending
                      ? "loading"
                      : trafficEventQuery.isError
                        ? "error"
                        : "ready"
                  }
                  onRetry={() => void trafficEventQuery.refetch()}
                  embedded
                />
              </div>
            </div>
          ) : null}
          <div className="pointer-events-none absolute right-14 bottom-4 left-16 z-20 flex flex-col-reverse items-start gap-2 sm:flex-row sm:items-end">
            {mode !== "replay" ? (
              <div className="pointer-events-auto shrink-0">
                <FieldReportComposer
                  coverageAreaId={coverageAreaId}
                  active={fieldReportToolActive}
                  location={fieldReportDraftLocation}
                  realtimeConnected={realtime.status === "connected"}
                  catalogStatus={
                    fieldReportsQuery.isPending
                      ? "loading"
                      : fieldReportsQuery.isError
                        ? "error"
                        : "ready"
                  }
                  createReport={realtime.createFieldReport}
                  onStart={startFieldReport}
                  onCancel={cancelFieldReport}
                  onCreated={(reportId) => {
                    cancelFieldReport();
                    selectFieldReport(reportId);
                  }}
                  onRetryCatalog={() => void fieldReportsQuery.refetch()}
                  embedded
                />
              </div>
            ) : null}
            <MapVisualizationLegend
              mode={mapVisualizationMode}
              timeZone={coverageArea.timeZone}
              selectedStationId={selectedStationId}
              selectedStation={selectedStation}
              roadContext={roadContextQuery.data}
              roadContextStatus={
                mapVisualizationMode !== "flow" || !selectedStationId
                  ? "idle"
                  : roadContextQuery.isPending
                    ? "loading"
                    : roadContextQuery.isError
                      ? "error"
                      : "ready"
              }
              embedded
            />
          </div>
          {realtime.status === "disconnected" ? (
            <div
              role="status"
              className="absolute top-4 left-1/2 -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs font-semibold text-amber-900 shadow dark:border-amber-700 dark:bg-amber-950/95 dark:text-amber-100"
            >
              Canlı bağlantı kesildi · son bilinen gerçek ölçümler gösteriliyor
            </div>
          ) : null}
          {replayView ? (
            <LiveStatusSummary
              overview={liveTrafficOverview}
              mode={mode}
              activeEventCount={filteredTrafficEvents.length}
              junctionCount={junctions.length}
              replayFrame={replay.frame}
              timeZone={coverageArea.timeZone}
            />
          ) : null}
          <a
            href={source.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute right-2 bottom-2 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow"
          >
            {source.attribution}
          </a>
        </section>

        {mode === "analysis" && selectedStationId ? (
          <AnalyticsPanel
            catalog={catalogQuery.data}
            selectedStationId={selectedStationId}
            onReturnLive={() => {
              replay.control({ action: "stop" });
              changeMode("live");
            }}
            onOpenReplay={() => changeMode("replay")}
            availability={historyAvailabilityQuery.data?.assets ?? []}
            availabilityStatus={
              historyAvailabilityQuery.isPending
                ? "loading"
                : historyAvailabilityQuery.isError
                  ? "error"
                  : "ready"
            }
            replay={replay}
          />
        ) : mode === "replay" && selectedStationId ? (
          <ReplayPanel
            catalog={catalogQuery.data}
            selectedStationId={selectedStationId}
            availability={historyAvailabilityQuery.data?.assets ?? []}
            replay={replay}
            onOpenAnalysis={() => changeMode("analysis")}
            onReturnLive={() => changeMode("live")}
          />
        ) : mode !== "live" ? (
          <StationRequiredPanel
            mode={mode}
            onReturnLive={() => changeMode("live")}
          />
        ) : (
          <>
            <div
              className={`absolute inset-y-4 right-4 z-20 w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl xl:static xl:z-auto xl:block xl:w-auto xl:rounded-none xl:border-y-0 xl:border-r-0 xl:shadow-none dark:border-slate-800 dark:bg-slate-950 ${
                selectedStation ||
                selectedJunction ||
                selectedCorridor ||
                !isSummaryDismissedOnMobile
                  ? "block"
                  : "hidden"
              }`}
            >
              {selectedStation || selectedJunction || selectedCorridor ? (
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Detay panelini kapat"
                  className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-lg leading-none text-slate-600 shadow-sm xl:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <span aria-hidden="true">×</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSummaryDismissedOnMobile(true)}
                  aria-label="Özeti kapat"
                  className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-lg leading-none text-slate-600 shadow-sm xl:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {selectedJunction ? (
                <JunctionDetailPanel junction={selectedJunction} />
              ) : !selectedStation && selectedCorridor ? (
                <CorridorDetailPanel
                  corridor={selectedCorridor}
                  stations={stations}
                  onSelectStation={selectStation}
                />
              ) : !selectedStation ? (
                <TodaySummaryPanel
                  overview={liveTrafficOverview}
                  anomalies={anomalyQuery.data?.evaluations ?? []}
                  trafficEvents={liveTrafficEvents}
                  stations={catalogQuery.data?.stations ?? []}
                  onSelectStation={selectStation}
                  onSelectEvent={selectTrafficEvent}
                />
              ) : (
                <StationDetailPanel
                  station={selectedStation}
                  timeZone={coverageArea.timeZone}
                  laneHistory={
                    selectedStation ? (
                      <LaneHistoryInsightPanel
                        insight={laneHistoryQuery.data}
                        directions={selectedStation.directions}
                        status={
                          laneHistoryQuery.isPending
                            ? "loading"
                            : laneHistoryQuery.isError
                              ? "error"
                              : "ready"
                        }
                        onRetry={() => void laneHistoryQuery.refetch()}
                      />
                    ) : null
                  }
                  context={
                    selectedStation ? (
                      <StationTrafficEventContextPanel
                        context={trafficEventContextQuery.data}
                        timeZone={coverageArea.timeZone}
                        status={
                          trafficEventContextQuery.isPending
                            ? "loading"
                            : trafficEventContextQuery.isError
                              ? "error"
                              : "ready"
                        }
                        onRetry={() => void trafficEventContextQuery.refetch()}
                        onSelectEvent={(eventId) => selectTrafficEvent(eventId)}
                      />
                    ) : null
                  }
                  insights={
                    selectedStation ? (
                      <>
                        <CorridorInsightPanel
                          insight={corridorInsightQuery.data}
                          status={
                            corridorInsightQuery.isPending
                              ? "loading"
                              : corridorInsightQuery.isError
                                ? "error"
                                : "ready"
                          }
                          onRetry={() => void corridorInsightQuery.refetch()}
                          onSelectStation={selectStation}
                        />
                        <AnomalyPanel
                          evaluations={selectedAnomalies}
                          directions={selectedStation.directions}
                          status={
                            anomalyQuery.isPending
                              ? "loading"
                              : anomalyQuery.isError
                                ? "error"
                                : "ready"
                          }
                          onRetry={() => void anomalyQuery.refetch()}
                        />
                      </>
                    ) : null
                  }
                  notes={
                    selectedStation ? (
                      <OperatorNotesPanel
                        key={selectedStation.id}
                        assetId={selectedStation.id}
                        timeZone={coverageArea.timeZone}
                        createNote={realtime.createNote}
                        realtimeConnected={realtime.status === "connected"}
                      />
                    ) : null
                  }
                />
              )}
            </div>
            {isSummaryDismissedOnMobile &&
            !selectedStation &&
            !selectedJunction &&
            !selectedCorridor ? (
              <button
                type="button"
                onClick={() => setIsSummaryDismissedOnMobile(false)}
                className="absolute bottom-24 right-3 z-20 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xl xl:hidden dark:bg-sky-700 dark:hover:bg-sky-600"
              >
                Bugünün özeti
              </button>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
