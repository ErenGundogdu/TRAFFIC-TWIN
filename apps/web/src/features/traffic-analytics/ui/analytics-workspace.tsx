"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  historyMetricSchema,
  historyResolutionSchema,
  type HistoryQuery,
  type HistoryResponse,
  type ReplaySpeed,
  type StationCatalogResponse,
} from "@traffic-twin/contracts";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import { useStationCatalog } from "@/features/station-monitoring";
import { TrafficMap } from "@/features/traffic-map";
import { useReplay } from "@/features/replay";
import {
  dateLabelAt,
  shiftDateLabel,
  zonedDateStartIso,
} from "@/shared/time/zoned-date";

import { useTrafficHistory } from "../hooks/use-traffic-history";
import { HistoryChart } from "./history-chart";

const filterSchema = z
  .object({
    assetId: z.string().min(1),
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

function AnalyticsContent({ catalog }: { catalog: StationCatalogResponse }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = dateLabelAt(new Date(), catalog.coverageArea.timeZone);
  const firstStationId = catalog.stations[0]?.id ?? "";
  const requestedStation = searchParams.get("station") ?? firstStationId;
  const assetId = catalog.stations.some(
    (station) => station.id === requestedStation,
  )
    ? requestedStation
    : firstStationId;
  const requestedComparison = searchParams.get("compare") ?? "";
  const compareAssetId = catalog.stations.some(
    (station) => station.id === requestedComparison,
  )
    ? requestedComparison
    : "";
  const values: FilterValues = {
    assetId,
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
  const selectedAssetId = useWatch({
    control: form.control,
    name: "assetId",
  });
  const query: HistoryQuery = {
    assetIds: [values.assetId, values.compareAssetId].filter(Boolean),
    metric: values.metric,
    direction: Number(values.direction) as 1 | 2,
    resolution: values.resolution,
    from: zonedDateStartIso(values.fromDate, catalog.coverageArea.timeZone),
    to: zonedDateStartIso(values.toDate, catalog.coverageArea.timeZone),
  };
  const history = useTrafficHistory(catalog.coverageArea.id, query);
  const replay = useReplay();
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(8);
  const replayAvailable =
    new Date(query.to).getTime() - new Date(query.from).getTime() <=
      2 * 86_400_000 &&
    Boolean(history.data?.series.some((series) => series.points.length));

  function submit(next: FilterValues) {
    replay.control({ action: "stop" });
    const params = new URLSearchParams();
    params.set("station", next.assetId);
    if (next.compareAssetId && next.compareAssetId !== next.assetId) {
      params.set("compare", next.compareAssetId);
    }
    params.set("metric", next.metric);
    params.set("direction", next.direction);
    params.set("resolution", next.resolution);
    params.set("from", next.fromDate);
    params.set("to", next.toDate);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyRange(days: number) {
    submit({
      ...form.getValues(),
      fromDate: shiftDateLabel(today, -days),
      toDate: today,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-sky-700 uppercase">
              Traffic Twin
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              Geçmiş ve karşılaştırma
            </h1>
          </div>
          <Link
            href={`/monitoring?station=${encodeURIComponent(values.assetId)}`}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Haritada canlı göster
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Analiz filtresi</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              [1, "Gün"],
              [30, "Ay"],
              [365, "Yıl"],
            ].map(([days, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => applyRange(Number(days))}
                className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={form.handleSubmit(submit)} className="mt-4 space-y-3">
            <FilterSelect
              label="Ana istasyon"
              registration={form.register("assetId")}
            >
              {catalog.stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Karşılaştırma"
              registration={form.register("compareAssetId")}
            >
              <option value="">Karşılaştırma yok</option>
              {catalog.stations
                .filter((station) => station.id !== selectedAssetId)
                .map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
            </FilterSelect>
            <FilterSelect label="Metrik" registration={form.register("metric")}>
              <option value="average-speed-kmh">Ortalama hız</option>
              <option value="vehicle-count">Araç sayısı</option>
            </FilterSelect>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="Yön"
                registration={form.register("direction")}
              >
                <option value="1">Yön 1</option>
                <option value="2">Yön 2</option>
              </FilterSelect>
              <FilterSelect
                label="Çözünürlük"
                registration={form.register("resolution")}
              >
                <option value="auto">Otomatik</option>
                <option value="minute">Dakika</option>
                <option value="hour">Saat</option>
                <option value="day">Gün</option>
              </FilterSelect>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FilterInput
                label="Başlangıç"
                registration={form.register("fromDate")}
              />
              <FilterInput
                label="Bitiş"
                registration={form.register("toDate")}
              />
            </div>
            {form.formState.errors.toDate?.message ? (
              <p className="text-xs text-rose-600">
                {form.formState.errors.toDate.message}
              </p>
            ) : null}
            <button className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white">
              Analizi uygula
            </button>
          </form>
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {values.metric === "average-speed-kmh"
                        ? "Ortalama hız"
                        : "Araç sayısı"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {history.data?.resolution ?? values.resolution} çözünürlük
                      · Yön {values.direction} · {catalog.coverageArea.timeZone}
                    </p>
                  </div>
                  {history.data ? (
                    <CoverageBadge history={history.data} />
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
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
                    className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300"
                  >
                    Baştan oynat
                  </button>
                  {replay.status === "playing" ? (
                    <button
                      type="button"
                      onClick={() => replay.control({ action: "pause" })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                    >
                      Duraklat
                    </button>
                  ) : replay.status === "paused" ? (
                    <button
                      type="button"
                      onClick={() => replay.control({ action: "resume" })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                    >
                      Sürdür
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => replay.control({ action: "stop" })}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                  >
                    Canlı moda dön
                  </button>
                  <select
                    value={replaySpeed}
                    onChange={(event) => {
                      const speed = Number(event.target.value) as ReplaySpeed;
                      setReplaySpeed(speed);
                      replay.setSpeed(speed);
                    }}
                    aria-label="Replay hızı"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
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
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
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
                <div className="mt-4">
                  {history.isPending ? (
                    <div className="grid h-80 place-items-center text-sm text-slate-500">
                      Gerçek geçmiş verisi sorgulanıyor…
                    </div>
                  ) : history.isError || !history.data ? (
                    <div className="grid h-80 place-items-center text-sm text-rose-600">
                      Geçmiş verisi alınamadı.
                    </div>
                  ) : (
                    <HistoryChart
                      history={history.data}
                      cursorTimestamp={replay.frame?.timestamp}
                    />
                  )}
                </div>
              </div>
              <div className="relative h-80 border-t border-slate-200 md:h-auto md:border-t-0 md:border-l">
                <TrafficMap
                  bbox={catalog.coverageArea.bbox}
                  stations={catalog.stations}
                  selectedStationId={values.assetId}
                  onSelect={(nextAssetId) =>
                    submit({ ...form.getValues(), assetId: nextAssetId })
                  }
                />
                {replay.frame ? (
                  <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow">
                    Replay ·{" "}
                    {new Intl.DateTimeFormat("tr-TR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: catalog.coverageArea.timeZone,
                    }).format(new Date(replay.frame.timestamp))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
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
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <select
        {...registration}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function FilterInput({
  label,
  registration,
}: {
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input
        type="date"
        {...registration}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
      />
    </label>
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
          ? "bg-emerald-100 text-emerald-700"
          : history.coverage.status === "PARTIAL"
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-200 text-slate-600"
      }`}
      title={`${history.coverage.availableDays}/${history.coverage.requestedDays} gün mevcut`}
    >
      {label} · {history.coverage.availableDays}/
      {history.coverage.requestedDays} gün
    </span>
  );
}

export function AnalyticsWorkspace({
  coverageAreaId,
}: {
  coverageAreaId: string;
}) {
  const catalog = useStationCatalog(coverageAreaId);

  if (catalog.isPending) {
    return <main className="app-loading">İstasyon kataloğu yükleniyor…</main>;
  }
  if (catalog.isError || !catalog.data) {
    return <main className="app-loading">İstasyon kataloğu alınamadı.</main>;
  }

  return <AnalyticsContent catalog={catalog.data} />;
}
