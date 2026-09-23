"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  HistoryAssetAvailability,
  HistoryResponse,
  StationCatalogResponse,
} from "@traffic-twin/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import {
  getReplayAvailability,
  type ReplayController,
} from "@/features/replay";
import { dateLabelAt, shiftDateLabel } from "@/shared/time/zoned-date";
import { InlineQueryError } from "@/shared/ui";

import { useTrafficHistory } from "../hooks/use-traffic-history";
import {
  commonAvailableDates,
  findAssetAvailability,
} from "../lib/history-availability";
import { createDirectionSeriesLabels } from "../lib/direction-series-labels";
import {
  analyticsFilterSchema,
  parseAnalyticsUrlFilters,
  type AnalyticsFilterValues,
} from "../lib/analytics-filters";
import { createAnalyticsHistoryQuery } from "../lib/analytics-query";
import { AnalysisKpiStrip } from "./analysis-kpi-strip";
import { AnalysisCoveragePanel } from "./analysis-coverage-panel";
import { AnalysisInsightGrid } from "./analysis-insight-grid";
import { AnalyticsFilterPanel } from "./analytics-filter-panel";
import { HistoryChart } from "./history-chart";
import { HistorySummaryPanel } from "./history-summary-panel";
import { IndependentComparisonPanel } from "./independent-comparison-panel";
import { TimeHighlightsCard } from "./time-highlights-card";
import { TimePatternCard } from "./time-pattern-card";

interface AnalyticsPanelProps {
  catalog: StationCatalogResponse;
  selectedStationId: string;
  onReturnLive: () => void;
  onOpenReplay: () => void;
  availability: HistoryAssetAvailability[];
  availabilityStatus: "loading" | "error" | "ready";
  replay: ReplayController;
}

export function AnalyticsPanel({
  catalog,
  selectedStationId,
  onReturnLive,
  onOpenReplay,
  availability,
  availabilityStatus,
  replay,
}: AnalyticsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const comparisonView = searchParams.get("analysisView") === "comparison";
  const today = dateLabelAt(new Date(), catalog.coverageArea.timeZone);
  const requestedComparison = searchParams.get("compare") ?? "";
  const compareAssetId = catalog.stations.some(
    (station) =>
      station.id === requestedComparison && station.id !== selectedStationId,
  )
    ? requestedComparison
    : "";
  const selectedAssetIds = [selectedStationId, compareAssetId].filter(Boolean);
  const sharedDates = commonAvailableDates(availability, selectedAssetIds);
  const firstSharedDate = sharedDates[0] ?? null;
  const lastSharedDate = sharedDates.at(-1) ?? null;
  const { values, ignoredParameters } = parseAnalyticsUrlFilters(searchParams, {
    compareAssetId,
    defaultDate: lastSharedDate ?? today,
    comparisonWasIgnored: requestedComparison !== "" && compareAssetId === "",
  });
  const form = useForm<AnalyticsFilterValues>({
    resolver: zodResolver(analyticsFilterSchema),
    values,
  });
  const query = createAnalyticsHistoryQuery({
    selectedStationId,
    filters: values,
    timeZone: catalog.coverageArea.timeZone,
  });
  const history = useTrafficHistory(
    catalog.coverageArea.id,
    query,
    !comparisonView,
  );
  const selectedStation = catalog.stations.find(
    (station) => station.id === selectedStationId,
  );
  const comparisonStation = catalog.stations.find(
    (station) => station.id === values.compareAssetId,
  );
  const directionSeriesLabels = createDirectionSeriesLabels(
    [selectedStation, comparisonStation].filter(
      (station): station is NonNullable<typeof station> => Boolean(station),
    ),
    Number(values.direction) as 1 | 2,
  );
  const availableStationIds = new Set(availability.map((item) => item.assetId));
  const suggestedStations = catalog.stations.filter((station) =>
    availableStationIds.has(station.id),
  );

  function submit(next: AnalyticsFilterValues) {
    replay.control({ action: "stop" });
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", "analysis");
    params.set("station", selectedStationId);
    params.delete("junction");
    if (next.compareAssetId && next.compareAssetId !== selectedStationId) {
      params.set("compare", next.compareAssetId);
    } else {
      params.delete("compare");
    }
    params.set("metric", next.metric);
    params.set("direction", next.direction);
    params.set("resolution", next.resolution);
    params.set("from", next.fromDate);
    params.set("to", next.toDate);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyRange(days: number) {
    const rangeEnd = lastSharedDate ?? today;
    submit({
      ...form.getValues(),
      fromDate: shiftDateLabel(rangeEnd, 1 - days),
      toDate: rangeEnd,
    });
  }

  function openLatestAvailableDay() {
    if (!lastSharedDate) return;
    submit({
      ...form.getValues(),
      fromDate: lastSharedDate,
      toDate: lastSharedDate,
      resolution: "auto",
    });
  }

  function openAvailableStation(assetId: string) {
    const assetAvailability = findAssetAvailability(availability, assetId);
    if (!assetAvailability) return;

    replay.control({ action: "stop" });
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", "analysis");
    params.set("station", assetId);
    params.delete("junction");
    params.delete("compare");
    params.set("from", assetAvailability.lastDate);
    params.set("to", assetAvailability.lastDate);
    params.set("resolution", "auto");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function changeAnalysisView(view: "history" | "comparison") {
    replay.control({ action: "stop" });
    const params = new URLSearchParams(searchParams.toString());
    if (view === "comparison") params.set("analysisView", "comparison");
    else params.delete("analysisView");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <section
      aria-label="Trafik analizi"
      className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-100 p-3 xl:border-t-0 xl:border-l xl:p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div
        className="sticky top-0 z-20 -mx-3 -mt-3 mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-slate-100/95 px-3 py-3 backdrop-blur xl:-mx-4 xl:-mt-4 xl:px-4 xl:py-4 dark:border-slate-800 dark:bg-slate-950/95"
        aria-label="Analiz görünümü"
      >
        <button
          type="button"
          onClick={() => changeAnalysisView("history")}
          aria-pressed={!comparisonView}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${!comparisonView ? "bg-slate-950 text-white dark:bg-sky-600" : "border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"}`}
        >
          Dönem analizi
        </button>
        <button
          type="button"
          onClick={() => changeAnalysisView("comparison")}
          aria-pressed={comparisonView}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${comparisonView ? "bg-slate-950 text-white dark:bg-sky-600" : "border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"}`}
        >
          Esnek karşılaştırma
        </button>
      </div>
      {comparisonView ? (
        <IndependentComparisonPanel
          catalog={catalog}
          selectedStationId={selectedStationId}
          availability={availability}
          today={today}
        />
      ) : (
        <div className="grid items-start gap-4 2xl:grid-cols-[320px_minmax(0,1fr)]">
          <AnalyticsFilterPanel
            catalog={catalog}
            selectedStationId={selectedStationId}
            availability={availability}
            availabilityStatus={availabilityStatus}
            sharedDates={sharedDates}
            firstSharedDate={firstSharedDate}
            lastSharedDate={lastSharedDate}
            ignoredParameters={ignoredParameters}
            form={form}
            values={values}
            onSubmit={submit}
            onApplyRange={applyRange}
            onOpenLatest={openLatestAvailableDay}
            onReturnLive={onReturnLive}
          />

          <main className="min-w-0 space-y-4">
            <AnalysisHeading
              metric={values.metric}
              direction={values.direction}
              resolution={history.data?.resolution ?? values.resolution}
              timeZone={catalog.coverageArea.timeZone}
              history={history.data}
            />

            {history.data ? (
              <AnalysisCoveragePanel
                history={history.data}
                stations={catalog.stations}
              />
            ) : null}

            {history.data && history.data.coverage.status !== "NO_DATA" ? (
              <>
                <AnalysisKpiStrip history={history.data} />
                <AnalysisInsightGrid history={history.data} />
              </>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Zaman serisi</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Boş aralıklar birleştirilmez; yalnız gerçek ölçüm dilimleri
                    çizilir.
                  </p>
                </div>
                {history.data?.series.length ? (
                  <span className="text-[10px] text-slate-400">
                    {history.data.series.length} seri
                  </span>
                ) : null}
              </div>

              <div className="mt-3">
                {history.isPending ? (
                  <div className="grid h-96 place-items-center text-sm text-slate-500">
                    Gerçek geçmiş verisi sorgulanıyor…
                  </div>
                ) : history.isError || !history.data ? (
                  <div className="grid h-96 place-items-center">
                    <InlineQueryError
                      className="w-full max-w-md text-center text-sm"
                      message="Geçmiş verisi alınamadı."
                      onRetry={() => void history.refetch()}
                    />
                  </div>
                ) : history.data.coverage.status === "NO_DATA" ? (
                  <HistoryDiscoveryEmptyState
                    suggestedStations={suggestedStations}
                    availability={availability}
                    onSelect={openAvailableStation}
                    onOpenLatest={
                      lastSharedDate ? openLatestAvailableDay : undefined
                    }
                  />
                ) : (
                  <HistoryChart
                    history={history.data}
                    cursorTimestamp={replay.frame?.timestamp}
                    seriesLabels={directionSeriesLabels}
                  />
                )}
              </div>
            </section>

            {history.data && history.data.coverage.status !== "NO_DATA" ? (
              <>
                <TimeHighlightsCard history={history.data} />
                <TimePatternCard history={history.data} />
                <ReplayModeCallout
                  history={history.data}
                  onOpenReplay={onOpenReplay}
                />
                <HistorySummaryPanel
                  summaries={history.data.summaries}
                  resolution={history.data.resolution}
                  timeZone={history.data.timeZone}
                />
              </>
            ) : null}
          </main>
        </div>
      )}
    </section>
  );
}

function ReplayModeCallout({
  history,
  onOpenReplay,
}: {
  history: HistoryResponse;
  onOpenReplay: () => void;
}) {
  const availability = getReplayAvailability(history);

  return (
    <section
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${availability.available ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"}`}
    >
      <div>
        <h2
          className={`text-sm font-semibold ${availability.available ? "text-sky-950 dark:text-sky-100" : "text-amber-950 dark:text-amber-100"}`}
        >
          {availability.available
            ? "Bu aralığı haritada oynat"
            : "Bu aralık Replay için hazır değil"}
        </h2>
        <p
          className={`mt-0.5 max-w-2xl text-[11px] ${availability.available ? "text-sky-700 dark:text-sky-300" : "text-amber-800 dark:text-amber-200"}`}
        >
          {availability.message}
        </p>
      </div>
      <button
        type="button"
        disabled={!availability.available}
        onClick={onOpenReplay}
        className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
      >
        Replay modunda aç
      </button>
    </section>
  );
}

function AnalysisHeading({
  metric,
  direction,
  resolution,
  timeZone,
  history,
}: {
  metric: AnalyticsFilterValues["metric"];
  direction: AnalyticsFilterValues["direction"];
  resolution: string;
  timeZone: string;
  history?: HistoryResponse;
}) {
  return (
    <header className="relative flex flex-wrap items-start justify-between gap-3 overflow-hidden rounded-[20px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900">
      <span className="absolute inset-y-0 left-0 w-1 bg-sky-500" />
      <div className="pl-1">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-sky-700 uppercase dark:text-sky-300">
          Geçmiş trafik analizi
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-[-0.025em]">
          {metric === "average-speed-kmh"
            ? "Hız karşılaştırması"
            : "Araç hacmi karşılaştırması"}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {formatResolution(resolution)} çözünürlük · Yön {direction} ·{" "}
          {timeZone}
        </p>
      </div>
      {history ? <CoverageBadge history={history} /> : null}
    </header>
  );
}

function HistoryDiscoveryEmptyState({
  suggestedStations,
  availability,
  onSelect,
  onOpenLatest,
}: {
  suggestedStations: StationCatalogResponse["stations"];
  availability: HistoryAssetAvailability[];
  onSelect: (assetId: string) => void;
  onOpenLatest?: () => void;
}) {
  return (
    <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
      <div className="max-w-xl">
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          Bu seçimde geçmiş veri yok
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {onOpenLatest
            ? "Eksik günler ölçüm gibi doldurulmadı. Seçimin en son ortak verili gününü açabilirsiniz."
            : "Bu istasyon için geçmiş veri içeri alınmamış. Aşağıdaki gerçek verili istasyonlardan birini seçebilirsiniz."}
        </p>
        {onOpenLatest ? (
          <button
            type="button"
            onClick={onOpenLatest}
            className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-sky-700"
          >
            En son verili günü aç
          </button>
        ) : null}
        {suggestedStations.length > 0 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestedStations.map((station) => {
              const item = findAssetAvailability(availability, station.id)!;
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => onSelect(station.id)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900"
                >
                  <span className="block font-semibold">{station.name}</span>
                  <span className="mt-0.5 block text-slate-500">
                    TMS {station.tmsNumber} · {item.availableDayCount} gün · son{" "}
                    {formatDate(item.lastDate)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatResolution(resolution: string) {
  return (
    {
      auto: "otomatik",
      minute: "dakika",
      hour: "saat",
      day: "gün",
    }[resolution] ?? resolution
  );
}

function CoverageBadge({ history }: { history: HistoryResponse }) {
  const label =
    history.coverage.status === "COMPLETE"
      ? "Tam kapsama"
      : history.coverage.status === "PARTIAL"
        ? "Kısmi kapsama"
        : "Veri yok";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        history.coverage.status === "COMPLETE"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : history.coverage.status === "PARTIAL"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
      title={`${history.coverage.availableDays}/${history.coverage.requestedDays} gün mevcut · sunucudaki gün agregalarından hesaplanır, şerit/araç sınıfı kaynağından bağımsızdır`}
    >
      {label} · {history.coverage.availableDays}/
      {history.coverage.requestedDays} gün
    </span>
  );
}
