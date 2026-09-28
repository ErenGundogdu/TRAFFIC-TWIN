"use client";

import type {
  HistoryAssetAvailability,
  StationCatalogResponse,
} from "@traffic-twin/contracts";
import { useSearchParams } from "next/navigation";

import {
  getReplayAvailability,
  ReplayControls,
  type ReplayController,
} from "@/features/replay";
import { dateLabelAt } from "@/shared/time/zoned-date";
import { InlineQueryError } from "@/shared/ui";

import { useTrafficHistory } from "../hooks/use-traffic-history";
import { parseAnalyticsUrlFilters } from "../lib/analytics-filters";
import { createAnalyticsHistoryQuery } from "../lib/analytics-query";
import { createDirectionSeriesLabels } from "../lib/direction-series-labels";
import { commonAvailableDates } from "../lib/history-availability";
import { HistoryChart } from "./history-chart";

interface ReplayPanelProps {
  catalog: StationCatalogResponse;
  selectedStationId: string;
  availability: HistoryAssetAvailability[];
  replay: ReplayController;
  onOpenAnalysis: () => void;
  onReturnLive: () => void;
}

export function ReplayPanel({
  catalog,
  selectedStationId,
  availability,
  replay,
  onOpenAnalysis,
  onReturnLive,
}: ReplayPanelProps) {
  const searchParams = useSearchParams();
  const requestedComparison = searchParams.get("compare") ?? "";
  const compareAssetId = catalog.stations.some(
    (station) =>
      station.id === requestedComparison && station.id !== selectedStationId,
  )
    ? requestedComparison
    : "";
  const sharedDates = commonAvailableDates(
    availability,
    [selectedStationId, compareAssetId].filter(Boolean),
  );
  const defaultDate =
    sharedDates.at(-1) ??
    dateLabelAt(new Date(), catalog.coverageArea.timeZone);
  const { values } = parseAnalyticsUrlFilters(searchParams, {
    compareAssetId,
    defaultDate,
    comparisonWasIgnored: requestedComparison !== "" && compareAssetId === "",
  });
  const query = createAnalyticsHistoryQuery({
    selectedStationId,
    filters: values,
    timeZone: catalog.coverageArea.timeZone,
  });
  const history = useTrafficHistory(catalog.coverageArea.id, query);
  const replayAvailability = history.data
    ? getReplayAvailability({ ...history.data, query })
    : null;
  const selectedStation = catalog.stations.find(
    (station) => station.id === selectedStationId,
  );
  const comparisonStation = catalog.stations.find(
    (station) => station.id === values.compareAssetId,
  );
  const seriesLabels = createDirectionSeriesLabels(
    [selectedStation, comparisonStation].filter(
      (station): station is NonNullable<typeof station> => Boolean(station),
    ),
    query.direction,
  );

  return (
    <section
      aria-label="Trafik replay"
      className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-100 p-3 xl:border-t-0 xl:border-l xl:p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="mx-auto grid max-w-[1500px] gap-3 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-3">
          <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-sky-700 uppercase dark:text-sky-300">
                Gerçek veri replay
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight">
                {selectedStation?.name ?? selectedStationId}
                {comparisonStation ? ` ↔ ${comparisonStation.name}` : ""}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(values.fromDate)}–{formatDate(values.toDate)} · Yön{" "}
                {values.direction} · {catalog.coverageArea.timeZone}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenAnalysis}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Filtreleri düzenle
              </button>
              <button
                type="button"
                onClick={onReturnLive}
                className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-sky-700"
              >
                Canlıya dön
              </button>
            </div>
          </header>

          {history.isPending ? (
            <ReplayState message="Gerçek replay kareleri hazırlanıyor…" />
          ) : history.isError || !history.data ? (
            <div className="grid min-h-44 place-items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <InlineQueryError
                className="w-full max-w-md text-center text-sm"
                message="Replay için geçmiş veri alınamadı."
                onRetry={() => void history.refetch()}
              />
            </div>
          ) : history.data.coverage.status === "NO_DATA" ? (
            <ReplayState message="Bu seçim için oynatılabilecek gerçek geçmiş verisi bulunmuyor." />
          ) : (
            <>
              <ReplayControls
                coverageAreaId={catalog.coverageArea.id}
                history={history.data}
                query={query}
                replay={replay}
                seriesLabels={seriesLabels}
              />
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Senkron geçmiş grafiği
                    </h2>
                  </div>
                  <span
                    className="text-[10px] text-slate-400"
                    aria-live="polite"
                  >
                    {replay.frame
                      ? formatFrameTime(
                          replay.frame.timestamp,
                          catalog.coverageArea.timeZone,
                        )
                      : "Oynatma bekleniyor"}
                  </span>
                </div>
                <div className="mt-3">
                  <HistoryChart
                    history={history.data}
                    cursorTimestamp={replay.frame?.timestamp}
                    seriesLabels={seriesLabels}
                  />
                </div>
              </section>
            </>
          )}
        </main>

        <aside className="space-y-3">
          <ReplayContextCard
            title="Oynatma kapsamı"
            rows={[
              ["Ana istasyon", selectedStation?.name ?? selectedStationId],
              ["Karşılaştırma", comparisonStation?.name ?? "Yok"],
              ["Metrik", metricLabel(values.metric)],
              ["Çözünürlük", resolutionLabel(values.resolution)],
            ]}
          />
          <ReplayContextCard
            title="Harita senkronu"
            rows={[
              [
                "Durum",
                replayAvailability?.available === false
                  ? "Kullanılamıyor"
                  : statusLabel(replay.status),
              ],
              [
                "Kare",
                replayAvailability?.available === false
                  ? "Oynatma yok"
                  : replay.frame
                    ? "Gerçek ölçüm"
                    : "Henüz başlamadı",
              ],
              [
                "Zaman",
                formatFrameTime(
                  replay.frame?.timestamp,
                  catalog.coverageArea.timeZone,
                ),
              ],
            ]}
          />
        </aside>
      </div>
    </section>
  );
}

function ReplayState({ message }: { message: string }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
      {message}
    </div>
  );
}

function ReplayContextCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<readonly [string, string]>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2 text-xs first:border-0 first:pt-0 dark:border-slate-800"
          >
            <dt className="text-slate-500">{label}</dt>
            <dd className="max-w-[60%] text-right font-medium text-slate-800 dark:text-slate-200">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatFrameTime(value: string | undefined, timeZone: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function metricLabel(metric: string) {
  return metric === "vehicle-count" ? "Araç sayısı" : "Ortalama hız";
}

function resolutionLabel(resolution: string) {
  return (
    {
      auto: "Otomatik",
      minute: "Dakika",
      hour: "Saat",
      day: "Gün",
    }[resolution] ?? resolution
  );
}

function statusLabel(status: ReplayController["status"]) {
  return (
    {
      idle: "Hazır",
      loading: "Hazırlanıyor",
      playing: "Oynatılıyor",
      paused: "Duraklatıldı",
      ended: "Tamamlandı",
      error: "Başlatılamadı",
    }[status] ?? status
  );
}
