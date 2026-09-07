"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  historyMetricSchema,
  historyResolutionSchema,
  type HistoryAssetAvailability,
  type HistoryQuery,
  type HistoryResponse,
  type ReplaySpeed,
  type StationCatalogResponse,
} from "@traffic-twin/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";

import { useReplay } from "@/features/replay";
import {
  dateLabelAt,
  shiftDateLabel,
  zonedDateStartIso,
} from "@/shared/time/zoned-date";

import { useTrafficHistory } from "../hooks/use-traffic-history";
import {
  commonAvailableDates,
  findAssetAvailability,
} from "../lib/history-availability";
import { HistoryChart } from "./history-chart";
import { HistorySummaryPanel } from "./history-summary-panel";

const filterSchema = z
  .object({
    compareAssetId: z.string(),
    metric: historyMetricSchema,
    direction: z.union([z.literal("1"), z.literal("2")]),
    resolution: historyResolutionSchema,
    fromDate: z.iso.date(),
    toDate: z.iso.date(),
  })
  .refine((value) => value.fromDate < value.toDate, {
    message: "Bitiş tarihi başlangıçtan sonra olmalıdır.",
    path: ["toDate"],
  });

type FilterValues = z.infer<typeof filterSchema>;

interface AnalyticsPanelProps {
  catalog: StationCatalogResponse;
  selectedStationId: string;
  onReturnLive: () => void;
  availability: HistoryAssetAvailability[];
  availabilityStatus: "loading" | "error" | "ready";
}

export function AnalyticsPanel({
  catalog,
  selectedStationId,
  onReturnLive,
  availability,
  availabilityStatus,
}: AnalyticsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = dateLabelAt(new Date(), catalog.coverageArea.timeZone);
  const requestedComparison = searchParams.get("compare") ?? "";
  const compareAssetId = catalog.stations.some(
    (station) =>
      station.id === requestedComparison && station.id !== selectedStationId,
  )
    ? requestedComparison
    : "";
  const values: FilterValues = {
    compareAssetId,
    metric: historyMetricSchema
      .catch("average-speed-kmh")
      .parse(searchParams.get("metric")),
    direction: searchParams.get("direction") === "2" ? "2" : "1",
    resolution: historyResolutionSchema
      .catch("auto")
      .parse(searchParams.get("resolution")),
    fromDate: searchParams.get("from") ?? shiftDateLabel(today, -1),
    toDate: searchParams.get("to") ?? today,
  };
  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    values,
  });
  const query: HistoryQuery = {
    assetIds: [selectedStationId, values.compareAssetId].filter(Boolean),
    metric: values.metric,
    direction: Number(values.direction) as 1 | 2,
    resolution: values.resolution,
    from: zonedDateStartIso(values.fromDate, catalog.coverageArea.timeZone),
    to: zonedDateStartIso(values.toDate, catalog.coverageArea.timeZone),
  };
  const history = useTrafficHistory(catalog.coverageArea.id, query);
  const replay = useReplay();
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(8);
  const selectedStation = catalog.stations.find(
    (station) => station.id === selectedStationId,
  );
  const selectedAvailability = findAssetAvailability(
    availability,
    selectedStationId,
  );
  const selectedAssetIds = [selectedStationId, values.compareAssetId].filter(
    Boolean,
  );
  const sharedDates = commonAvailableDates(availability, selectedAssetIds);
  const firstSharedDate = sharedDates[0] ?? null;
  const lastSharedDate = sharedDates.at(-1) ?? null;
  const availableStationIds = new Set(availability.map((item) => item.assetId));
  const suggestedStations = catalog.stations.filter((station) =>
    availableStationIds.has(station.id),
  );
  const replayAvailable =
    new Date(query.to).getTime() - new Date(query.from).getTime() <=
      2 * 86_400_000 &&
    Boolean(history.data?.series.some((series) => series.points.length));

  function submit(next: FilterValues) {
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
    const rangeEnd = lastSharedDate ? shiftDateLabel(lastSharedDate, 1) : today;
    submit({
      ...form.getValues(),
      fromDate: shiftDateLabel(rangeEnd, -days),
      toDate: rangeEnd,
    });
  }

  function openLatestAvailableDay() {
    if (!lastSharedDate) return;
    submit({
      ...form.getValues(),
      fromDate: lastSharedDate,
      toDate: shiftDateLabel(lastSharedDate, 1),
      resolution: "minute",
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
    params.set("to", shiftDateLabel(assetAvailability.lastDate, 1));
    params.set("resolution", "minute");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <section
      aria-label="Trafik analizi"
      className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="grid gap-3 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-sky-700 uppercase dark:text-sky-300">
                Analiz modu
              </p>
              <h2 className="mt-1 truncate text-sm font-semibold">
                {selectedStation?.name ?? selectedStationId}
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                {availabilityStatus === "loading"
                  ? "Geçmiş veri tarihleri kontrol ediliyor…"
                  : selectedAvailability
                    ? `${selectedAvailability.availableDayCount} verili gün · ${formatDate(selectedAvailability.firstDate)}–${formatDate(selectedAvailability.lastDate)}`
                    : availabilityStatus === "error"
                      ? "Geçmiş bilgisi şu anda alınamadı."
                      : "Bu istasyon için geçmiş veri içeri alınmamış."}
              </p>
            </div>
            <button
              type="button"
              onClick={onReturnLive}
              className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Canlıya dön
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              [1, "Son gün"],
              [30, "Son ay"],
              [365, "Son yıl"],
            ].map(([days, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => applyRange(Number(days))}
                disabled={
                  availabilityStatus === "ready" && sharedDates.length === 0
                }
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {label}
              </button>
            ))}
          </div>

          {availabilityStatus === "ready" ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              {sharedDates.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {values.compareAssetId
                          ? `${sharedDates.length} ortak verili gün`
                          : `${sharedDates.length} verili gün`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        En son: {formatDate(lastSharedDate!)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openLatestAvailableDay}
                      className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200"
                    >
                      En son günü aç
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sharedDates.slice(-6).map((date) => (
                      <span
                        key={date}
                        className="rounded-md bg-white px-1.5 py-1 text-[10px] text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                      >
                        {formatDate(date)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
                  {values.compareAssetId
                    ? "Seçilen iki istasyonun ortak geçmiş günü bulunmuyor."
                    : "Bu istasyon için geçmiş veri bulunmuyor."}
                </p>
              )}
            </div>
          ) : null}

          <form
            onSubmit={form.handleSubmit(submit)}
            className="mt-3 space-y-2.5"
          >
            <FilterSelect
              label="Karşılaştırma istasyonu"
              registration={form.register("compareAssetId")}
            >
              <option value="">Karşılaştırma yok</option>
              {[...catalog.stations]
                .filter((station) => station.id !== selectedStationId)
                .sort(
                  (left, right) =>
                    Number(availableStationIds.has(right.id)) -
                    Number(availableStationIds.has(left.id)),
                )
                .map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                    {availableStationIds.has(station.id)
                      ? ` · ${findAssetAvailability(availability, station.id)!.availableDayCount} gün geçmiş`
                      : " · geçmiş yok"}
                  </option>
                ))}
            </FilterSelect>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="Metrik"
                registration={form.register("metric")}
              >
                <option value="average-speed-kmh">Ortalama hız</option>
                <option value="vehicle-count">Araç sayısı</option>
              </FilterSelect>
              <FilterSelect
                label="Yön"
                registration={form.register("direction")}
              >
                <option value="1">Yön 1</option>
                <option value="2">Yön 2</option>
              </FilterSelect>
            </div>
            <FilterSelect
              label="Çözünürlük"
              registration={form.register("resolution")}
            >
              <option value="auto">Otomatik</option>
              <option value="minute">Dakika</option>
              <option value="hour">Saat</option>
              <option value="day">Gün</option>
            </FilterSelect>
            <div className="grid grid-cols-2 gap-2">
              <FilterInput
                label="Başlangıç"
                registration={form.register("fromDate")}
                min={firstSharedDate ?? undefined}
                max={lastSharedDate ?? undefined}
              />
              <FilterInput
                label="Bitiş"
                registration={form.register("toDate")}
                min={
                  firstSharedDate
                    ? shiftDateLabel(firstSharedDate, 1)
                    : undefined
                }
                max={
                  lastSharedDate ? shiftDateLabel(lastSharedDate, 1) : undefined
                }
              />
            </div>
            {form.formState.errors.toDate?.message ? (
              <p className="text-xs text-rose-600">
                {form.formState.errors.toDate.message}
              </p>
            ) : null}
            <button className="w-full rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white dark:bg-sky-700">
              Analizi uygula
            </button>
          </form>
        </aside>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                {values.metric === "average-speed-kmh"
                  ? "Ortalama hız"
                  : "Araç sayısı"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {history.data?.resolution ?? values.resolution} çözünürlük · Yön{" "}
                {values.direction} · {catalog.coverageArea.timeZone}
              </p>
            </div>
            {history.data ? <CoverageBadge history={history.data} /> : null}
          </div>

          {history.data && history.data.coverage.status !== "NO_DATA" ? (
            <HistorySummaryPanel
              summaries={history.data.summaries}
              resolution={history.data.resolution}
              timeZone={history.data.timeZone}
            />
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
            <button
              type="button"
              disabled={!replayAvailable}
              title={
                replayAvailable
                  ? undefined
                  : "Replay en fazla iki günlük, mevcut veri içeren aralıkta çalışır."
              }
              onClick={() =>
                replay.start({
                  coverageAreaId: catalog.coverageArea.id,
                  assetIds: query.assetIds,
                  direction: query.direction,
                  from: query.from,
                  to: query.to,
                  speed: replaySpeed,
                })
              }
              className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              Baştan oynat
            </button>
            {replay.status === "playing" ? (
              <button
                type="button"
                onClick={() => replay.control({ action: "pause" })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
              >
                Duraklat
              </button>
            ) : replay.status === "paused" ? (
              <button
                type="button"
                onClick={() => replay.control({ action: "resume" })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
              >
                Sürdür
              </button>
            ) : null}
            {replay.status !== "idle" ? (
              <button
                type="button"
                onClick={() => replay.control({ action: "stop" })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
              >
                Replay&apos;i durdur
              </button>
            ) : null}
            <select
              value={replaySpeed}
              onChange={(event) => {
                const speed = Number(event.target.value) as ReplaySpeed;
                setReplaySpeed(speed);
                replay.setSpeed(speed);
              }}
              aria-label="Replay hızı"
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            >
              {[1, 2, 4, 8, 16, 32].map((speed) => (
                <option key={speed} value={speed}>
                  {speed}×
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              {replay.frame
                ? new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: catalog.coverageArea.timeZone,
                  }).format(new Date(replay.frame.timestamp))
                : replay.status === "error"
                  ? "Replay başlatılamadı"
                  : `${replay.frameCount} kare`}
            </span>
          </div>

          {replay.frame ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {replay.frame.values.map((value) => (
                <span
                  key={value.assetId}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {catalog.stations.find(
                    (station) => station.id === value.assetId,
                  )?.name ?? value.assetId}
                  : {value.averageSpeedKmh.toFixed(1)} km/sa ·{" "}
                  {value.vehicleCount} araç/dk
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3">
            {history.isPending ? (
              <div className="grid h-80 place-items-center text-sm text-slate-500">
                Gerçek geçmiş verisi sorgulanıyor…
              </div>
            ) : history.isError || !history.data ? (
              <div className="grid h-80 place-items-center text-center text-sm text-rose-600 dark:text-rose-300">
                <div>
                  <p>Geçmiş verisi alınamadı.</p>
                  <button
                    type="button"
                    onClick={() => void history.refetch()}
                    className="mt-2 font-semibold underline underline-offset-2"
                  >
                    Tekrar dene
                  </button>
                </div>
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
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  registration,
  children,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      {label}
      <select
        {...registration}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {children}
      </select>
    </label>
  );
}

function FilterInput({
  label,
  registration,
  min,
  max,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      {label}
      <input
        type="date"
        min={min}
        max={max}
        {...registration}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
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
    <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
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
      title={`${history.coverage.availableDays}/${history.coverage.requestedDays} gün mevcut`}
    >
      {label} · {history.coverage.availableDays}/
      {history.coverage.requestedDays} gün
    </span>
  );
}
