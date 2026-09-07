"use client";

import type {
  HistoryAssetAvailability,
  JunctionSummary,
  StationSummary,
} from "@traffic-twin/contracts";
import { useEffect, useMemo, useRef, useState } from "react";

interface AssetSelectionBarProps {
  stations: StationSummary[];
  junctions: JunctionSummary[];
  selectedStationId: string | null;
  selectedJunctionId: string | null;
  onSelectStation: (stationId: string) => void;
  onSelectJunction: (junctionId: string) => void;
  onClearSelection: () => void;
  junctionStatus: "loading" | "error" | "ready";
  onRetryJunctions: () => void;
  showHistoryAvailability?: boolean;
  historyAvailability?: HistoryAssetAvailability[];
  historyAvailabilityStatus?: "loading" | "error" | "ready";
}

type AssetKind = "station" | "junction";

const freshnessLabels = {
  FRESH: "Güncel",
  STALE: "Gecikmeli",
  OUTDATED: "Eski veri",
  UNAVAILABLE: "Veri yok",
} as const;

const coverageLabels = {
  FULL: "Tam kapsama",
  PARTIAL: "Kısmi kapsama",
  INSUFFICIENT: "Yetersiz kapsama",
} as const;

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

export function AssetSelectionBar({
  stations,
  junctions,
  selectedStationId,
  selectedJunctionId,
  onSelectStation,
  onSelectJunction,
  onClearSelection,
  junctionStatus,
  onRetryJunctions,
  showHistoryAvailability = false,
  historyAvailability = [],
  historyAvailabilityStatus = "ready",
}: AssetSelectionBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [assetKind, setAssetKind] = useState<AssetKind>(
    selectedJunctionId ? "junction" : "station",
  );
  const [query, setQuery] = useState("");
  const selectedStation = stations.find(
    (station) => station.id === selectedStationId,
  );
  const selectedJunction = junctions.find(
    (junction) => junction.id === selectedJunctionId,
  );
  const normalizedQuery = normalizeSearch(query);
  const historyByAsset = useMemo(
    () => new Map(historyAvailability.map((item) => [item.assetId, item])),
    [historyAvailability],
  );
  const filteredStations = useMemo(
    () =>
      stations
        .filter((station) =>
          normalizeSearch(`${station.name} ${station.tmsNumber}`).includes(
            normalizedQuery,
          ),
        )
        .sort((left, right) => {
          if (!showHistoryAvailability) return 0;
          return (
            Number(historyByAsset.has(right.id)) -
            Number(historyByAsset.has(left.id))
          );
        }),
    [historyByAsset, normalizedQuery, showHistoryAvailability, stations],
  );
  const filteredJunctions = useMemo(
    () =>
      junctions.filter((junction) =>
        normalizeSearch(
          `${junction.name} ${junction.roadRefs.join(" ")}`,
        ).includes(normalizedQuery),
      ),
    [junctions, normalizedQuery],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchRef.current?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function finishSelection(action: () => void) {
    action();
    setIsOpen(false);
    setQuery("");
  }

  function togglePanel() {
    if (!isOpen) {
      setAssetKind(selectedJunctionId ? "junction" : "station");
    }
    setIsOpen((open) => !open);
  }

  const selectionName = selectedStation?.name ?? selectedJunction?.name;
  const selectionMeta = selectedStation
    ? `İstasyon · TMS ${selectedStation.tmsNumber}${
        showHistoryAvailability
          ? historyByAsset.has(selectedStation.id)
            ? ` · ${historyByAsset.get(selectedStation.id)!.availableDayCount} gün geçmiş`
            : " · geçmiş yok"
          : ""
      }`
    : selectedJunction
      ? `Kavşak · ${coverageLabels[selectedJunction.coverage]}`
      : "Haritada incelemek istediğiniz varlığı seçin";
  const visibleResultCount =
    assetKind === "station"
      ? filteredStations.length
      : filteredJunctions.length;

  return (
    <div
      ref={rootRef}
      className="relative z-30 shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePanel}
          aria-expanded={isOpen}
          aria-controls="asset-selection-panel"
          aria-label={
            selectionName
              ? `${selectionName} seçimini değiştir`
              : "İstasyon veya kavşak seç"
          }
          className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-left transition hover:border-sky-300 hover:bg-sky-50/60 sm:max-w-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-700 dark:hover:bg-sky-950/40"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {selectionName ?? "İstasyon veya kavşak seç"}
            </span>
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
              {selectionMeta}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-sm text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>

        <div className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 sm:flex dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setAssetKind("station");
              setIsOpen(true);
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              assetKind === "station" && isOpen
                ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            İstasyonlar{" "}
            <span className="ml-1 opacity-70">{stations.length}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAssetKind("junction");
              setIsOpen(true);
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              assetKind === "junction" && isOpen
                ? "bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-violet-300"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Kavşaklar{" "}
            <span className="ml-1 opacity-70">{junctions.length}</span>
          </button>
        </div>

        {selectionName ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Seçimi temizle
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <section
          id="asset-selection-panel"
          aria-label="Trafik varlığı seçimi"
          className="absolute top-[calc(100%+8px)] right-3 left-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-auto sm:left-5 sm:w-[min(760px,calc(100vw-2.5rem))] dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 p-3 dark:border-slate-800">
            <div className="flex gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setAssetKind("station")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${assetKind === "station" ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                İstasyonlar · {stations.length}
              </button>
              <button
                type="button"
                onClick={() => setAssetKind("junction")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${assetKind === "junction" ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                Kavşaklar · {junctions.length}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3 sm:mt-0">
              <label htmlFor="asset-search" className="sr-only">
                İstasyon veya kavşak ara
              </label>
              <input
                ref={searchRef}
                id="asset-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  assetKind === "station"
                    ? "İstasyon adı veya TMS numarası ara…"
                    : "Kavşak veya yol adı ara…"
                }
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                {visibleResultCount} sonuç
              </span>
            </div>
          </div>

          <ul className="grid max-h-[min(56vh,460px)] grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
            {assetKind === "junction" && junctionStatus === "loading" ? (
              <li className="col-span-full p-5 text-center text-sm text-slate-500 dark:text-slate-400">
                Kavşaklar yükleniyor…
              </li>
            ) : null}
            {assetKind === "junction" && junctionStatus === "error" ? (
              <li className="col-span-full rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
                <p>Kavşak kataloğu alınamadı.</p>
                <button
                  type="button"
                  onClick={onRetryJunctions}
                  className="mt-2 font-semibold underline underline-offset-2"
                >
                  Tekrar dene
                </button>
              </li>
            ) : null}
            {assetKind === "station"
              ? filteredStations.map((station) => (
                  <li key={station.id}>
                    <button
                      type="button"
                      onClick={() =>
                        finishSelection(() => onSelectStation(station.id))
                      }
                      aria-pressed={station.id === selectedStationId}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        station.id === selectedStationId
                          ? "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {station.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                          TMS {station.tmsNumber}
                        </span>
                      </span>
                      {showHistoryAvailability ? (
                        <HistoryAvailabilityBadge
                          availability={historyByAsset.get(station.id)}
                          status={historyAvailabilityStatus}
                        />
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span
                            aria-hidden="true"
                            className={`size-2 rounded-full ${
                              station.freshness === "FRESH"
                                ? "bg-emerald-500"
                                : station.freshness === "STALE"
                                  ? "bg-amber-500"
                                  : station.freshness === "OUTDATED"
                                    ? "bg-rose-500"
                                    : "bg-slate-400"
                            }`}
                          />
                          {freshnessLabels[station.freshness]}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              : junctionStatus === "ready"
                ? filteredJunctions.map((junction) => (
                    <li key={junction.id}>
                      <button
                        type="button"
                        onClick={() =>
                          finishSelection(() => onSelectJunction(junction.id))
                        }
                        aria-pressed={junction.id === selectedJunctionId}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                          junction.id === selectedJunctionId
                            ? "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {junction.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {junction.roadRefs.join(" · ") || "Yol bilgisi yok"}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="block">
                            {coverageLabels[junction.coverage]}
                          </span>
                          <span className="block">
                            {junction.sensors.length} sensör
                          </span>
                        </span>
                      </button>
                    </li>
                  ))
                : null}
            {visibleResultCount === 0 &&
            (assetKind === "station" || junctionStatus === "ready") ? (
              <li className="col-span-full rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Aramanızla eşleşen bir varlık bulunamadı.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function HistoryAvailabilityBadge({
  availability,
  status,
}: {
  availability: HistoryAssetAvailability | undefined;
  status: "loading" | "error" | "ready";
}) {
  if (status === "loading") {
    return (
      <span className="shrink-0 text-[11px] text-slate-400">
        Geçmiş kontrol ediliyor
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="shrink-0 text-[11px] text-amber-600 dark:text-amber-300">
        Geçmiş bilgisi alınamadı
      </span>
    );
  }
  return availability ? (
    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      Geçmiş · {availability.availableDayCount} gün
    </span>
  ) : (
    <span className="shrink-0 text-[11px] text-slate-400">Geçmiş yok</span>
  );
}
