"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  StationDetailPanel,
  useStationCatalog,
} from "@/features/station-monitoring";
import { TrafficMap } from "@/features/traffic-map";
import { OperatorNotesPanel } from "@/features/operator-notes";
import { useRealtimeSync } from "@/features/realtime";
import {
  JunctionDetailPanel,
  useJunctionCatalog,
} from "@/features/junction-monitoring";
import { AnomalyPanel, useAnomalyCatalog } from "@/features/anomaly-monitoring";
import { ThemeToggle } from "@/shared/theme";

import { AssetSelectionBar } from "./asset-selection-bar";

interface MonitoringWorkspaceProps {
  coverageAreaId: string;
}

function formatSourceTime(value: string | null, timeZone: string) {
  if (!value) {
    return "Güncelleme zamanı yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  }).format(new Date(value));
}

export function MonitoringWorkspace({
  coverageAreaId,
}: MonitoringWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedStationId = searchParams.get("station");
  const selectedJunctionId = searchParams.get("junction");
  const catalogQuery = useStationCatalog(coverageAreaId);
  const junctionQuery = useJunctionCatalog(coverageAreaId);
  const anomalyQuery = useAnomalyCatalog(coverageAreaId);
  const realtime = useRealtimeSync(coverageAreaId);
  const selectedStation =
    catalogQuery.data?.stations.find(
      (station) => station.id === selectedStationId,
    ) ?? null;
  const selectedJunction =
    junctionQuery.data?.junctions.find(
      (junction) => junction.id === selectedJunctionId,
    ) ?? null;
  const selectedAnomalies =
    anomalyQuery.data?.evaluations.filter(
      (evaluation) => evaluation.assetId === selectedStationId,
    ) ?? [];

  function selectStation(stationId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("station", stationId);
    nextParams.delete("junction");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function selectJunction(junctionId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("junction", junctionId);
    nextParams.delete("station");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function clearSelection() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("station");
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

  return (
    <main className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            TT
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Traffic Twin</p>
            <p className="truncate text-xs text-slate-500">
              {coverageArea.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/analytics${
              selectedStationId
                ? `?station=${encodeURIComponent(selectedStationId)}`
                : ""
            }`}
            className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:block dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Analiz
          </Link>
          <div className="hidden items-center gap-1.5 text-[11px] text-slate-500 lg:flex">
            <span
              className={`size-2 rounded-full ${
                realtime.status === "connected"
                  ? "bg-sky-500"
                  : realtime.status === "connecting"
                    ? "bg-amber-400"
                    : "bg-slate-400"
              }`}
            />
            {realtime.status === "connected"
              ? "Canlı bağlı"
              : realtime.status === "connecting"
                ? "Bağlanıyor"
                : "Canlı bağlantı kesildi"}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-slate-700">
              {source.status === "AVAILABLE"
                ? "Kaynak güncel"
                : "Kaynak kesintili"}
            </p>
            <p className="text-[11px] text-slate-500">
              {formatSourceTime(source.updatedAt, coverageArea.timeZone)} ·{" "}
              {coverageArea.timeZone}
            </p>
          </div>
          <span
            className={`size-2.5 rounded-full ${
              source.status === "AVAILABLE" ? "bg-emerald-500" : "bg-amber-500"
            }`}
            aria-label={
              source.status === "AVAILABLE"
                ? "Kaynak güncel"
                : "Kaynak kesintili"
            }
          />
          <button
            type="button"
            onClick={() => void catalogQuery.refetch()}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Yenile
          </button>
          <ThemeToggle />
        </div>
      </header>

      <AssetSelectionBar
        stations={stations}
        junctions={junctions}
        selectedStationId={selectedStationId}
        selectedJunctionId={selectedJunctionId}
        onSelectStation={selectStation}
        onSelectJunction={selectJunction}
        onClearSelection={clearSelection}
        junctionStatus={
          junctionQuery.isPending
            ? "loading"
            : junctionQuery.isError
              ? "error"
              : "ready"
        }
        onRetryJunctions={() => void junctionQuery.refetch()}
      />

      <div className="relative grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section
          className="relative min-h-[440px] overflow-hidden"
          aria-label="Trafik haritası"
        >
          <TrafficMap
            bbox={coverageArea.bbox}
            stations={stations}
            selectedStationId={selectedStationId}
            onSelect={selectStation}
            junctions={junctions}
            selectedJunctionId={selectedJunctionId}
            onSelectJunction={selectJunction}
            anomalies={anomalyQuery.data?.evaluations}
          />
          {realtime.status === "disconnected" ? (
            <div
              role="status"
              className="absolute top-4 left-1/2 -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs font-semibold text-amber-900 shadow dark:border-amber-700 dark:bg-amber-950/95 dark:text-amber-100"
            >
              Canlı bağlantı kesildi · son bilinen gerçek ölçümler gösteriliyor
            </div>
          ) : null}
          <div className="pointer-events-none absolute top-4 left-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              Canlı trafik
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
              Güncel
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              Gecikmeli
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500 ring-2 ring-rose-200" />
              Eski
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-violet-600 ring-2 ring-violet-200" />
              Kavşak
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full border-2 border-rose-500" />
              Anomali
            </span>
          </div>
          <a
            href={source.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute right-2 bottom-2 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow"
          >
            {source.attribution}
          </a>
        </section>

        <div
          className={`absolute inset-y-4 right-4 z-20 w-[min(330px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl xl:static xl:z-auto xl:block xl:w-auto xl:rounded-none xl:border-y-0 xl:border-r-0 xl:shadow-none dark:border-slate-800 dark:bg-slate-950 ${
            selectedStation || selectedJunction ? "block" : "hidden"
          }`}
        >
          {selectedStation || selectedJunction ? (
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Detay panelini kapat"
              className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-lg leading-none text-slate-600 shadow-sm xl:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedJunction ? (
            <JunctionDetailPanel junction={selectedJunction} />
          ) : (
            <StationDetailPanel
              station={selectedStation}
              timeZone={coverageArea.timeZone}
              footer={
                selectedStation ? (
                  <>
                    <AnomalyPanel
                      evaluations={selectedAnomalies}
                      status={
                        anomalyQuery.isPending
                          ? "loading"
                          : anomalyQuery.isError
                            ? "error"
                            : "ready"
                      }
                      onRetry={() => void anomalyQuery.refetch()}
                    />
                    <OperatorNotesPanel
                      key={selectedStation.id}
                      assetId={selectedStation.id}
                      timeZone={coverageArea.timeZone}
                      createNote={realtime.createNote}
                      realtimeConnected={realtime.status === "connected"}
                    />
                  </>
                ) : null
              }
            />
          )}
        </div>
      </div>
    </main>
  );
}
