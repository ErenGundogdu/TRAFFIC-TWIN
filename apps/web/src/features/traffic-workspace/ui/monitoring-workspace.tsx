"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  StationDetailPanel,
  StationList,
  useStationCatalog,
} from "@/features/station-monitoring";
import { TrafficMap } from "@/features/traffic-map";
import { OperatorNotesPanel } from "@/features/operator-notes";
import { useRealtimeSync } from "@/features/realtime";

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
  const catalogQuery = useStationCatalog(coverageAreaId);
  const realtime = useRealtimeSync(coverageAreaId);
  const selectedStation =
    catalogQuery.data?.stations.find(
      (station) => station.id === selectedStationId,
    ) ?? null;

  function selectStation(stationId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("station", stationId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  if (catalogQuery.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
          Gerçek Fintraffic istasyonları yükleniyor…
        </div>
      </main>
    );
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <section className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
            Veri kaynağına ulaşılamadı
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-950">
            İstasyonlar yüklenemedi
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
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

  return (
    <main className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
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
            className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:block"
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
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Yenile
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_330px]">
        <div className="hidden min-h-0 border-r border-slate-200 bg-white md:block">
          <StationList
            stations={stations}
            selectedStationId={selectedStationId}
            onSelect={selectStation}
          />
        </div>

        <section
          className="relative min-h-[440px] overflow-hidden"
          aria-label="Trafik haritası"
        >
          <TrafficMap
            bbox={coverageArea.bbox}
            stations={stations}
            selectedStationId={selectedStationId}
            onSelect={selectStation}
          />
          <div className="pointer-events-none absolute top-4 left-4 rounded-xl border border-white/70 bg-white/92 px-3 py-2 text-xs shadow-lg backdrop-blur">
            <p className="font-semibold text-slate-800">
              Canlı istasyon görünümü
            </p>
            <p className="mt-0.5 text-slate-500">
              Yeşil güncel · Turuncu gecikmiş · Gri veri yok
            </p>
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

        <div className="hidden min-h-0 border-l border-slate-200 bg-slate-50 xl:block">
          <StationDetailPanel
            station={selectedStation}
            timeZone={coverageArea.timeZone}
            footer={
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
        </div>
      </div>
    </main>
  );
}
