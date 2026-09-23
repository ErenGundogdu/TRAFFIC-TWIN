"use client";

import { useState } from "react";

import { TrafficAssetIcon } from "@/shared/ui";

import {
  defaultMapLayerSettings,
  stationFreshnessFilters,
  stationTrafficStateFilters,
  type MapLayerSettings,
  type StationFreshnessFilter,
  type StationTrafficStateFilter,
} from "../model/map-layer-settings";

interface MapLayerCounts {
  stations: number;
  junctions: number;
  anomalies: number;
  roadWorks: number;
  trafficAnnouncements: number;
  fieldReports: number;
}

export function MapLayerControl({
  value,
  counts,
  visibleStationCount,
  onChange,
  statusSummary,
}: {
  value: MapLayerSettings;
  counts: MapLayerCounts;
  visibleStationCount: number;
  onChange: (value: MapLayerSettings) => void;
  statusSummary?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeLayerCount = layerKeys.filter((key) => value[key]).length;

  function toggleLayer(key: (typeof layerKeys)[number]) {
    onChange({ ...value, [key]: !value[key] });
  }

  return (
    <aside className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-white/80 bg-white/94 text-slate-700 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/94 dark:text-slate-200">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-3.5 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <LayersIcon />
          </span>
          <span>
            <strong className="block text-xs text-slate-950 dark:text-white">
              Harita katmanları
            </strong>
            <span className="block text-[10px] text-slate-500">
              {activeLayerCount}/6 katman · {visibleStationCount} istasyon
              görünür
            </span>
          </span>
        </span>
        <span aria-hidden="true" className="text-xs text-slate-400">
          {expanded ? "▴" : "▾"}
        </span>
      </button>

      {expanded ? (
        <div className="max-h-[min(560px,calc(100vh-12rem))] overflow-y-auto border-t border-slate-200 p-3 dark:border-slate-700">
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Görünür katmanlar
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Harita istasyonlarla açılır. İhtiyaç duyduğunuz bağlamı buradan
            ekleyin.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <LayerToggle
              label="İstasyonlar"
              count={counts.stations}
              active={value.stations}
              icon={<TrafficAssetIcon kind="station" className="size-4" />}
              onClick={() => toggleLayer("stations")}
            />
            <LayerToggle
              label="Kavşaklar"
              count={counts.junctions}
              active={value.junctions}
              icon={<TrafficAssetIcon kind="junction" className="size-4" />}
              onClick={() => toggleLayer("junctions")}
            />
            <LayerToggle
              label="Yol çalışması"
              count={counts.roadWorks}
              active={value.roadWorks}
              icon={<TrafficAssetIcon kind="road-work" className="size-4" />}
              onClick={() => toggleLayer("roadWorks")}
            />
            <LayerToggle
              label="Duyurular"
              count={counts.trafficAnnouncements}
              active={value.trafficAnnouncements}
              icon={
                <TrafficAssetIcon
                  kind="traffic-announcement"
                  className="size-4"
                />
              }
              onClick={() => toggleLayer("trafficAnnouncements")}
            />
            <LayerToggle
              label="Anomaliler"
              count={counts.anomalies}
              active={value.anomalies}
              icon={
                <span className="size-3 rounded-full border-2 border-rose-500" />
              }
              onClick={() => toggleLayer("anomalies")}
            />
            <LayerToggle
              label="Saha bildirimleri"
              count={counts.fieldReports}
              active={value.fieldReports}
              icon={<TrafficAssetIcon kind="field-report" className="size-4" />}
              onClick={() => toggleLayer("fieldReports")}
            />
          </div>
          {value.anomalies ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full border-2 border-rose-600" />
                Aktif
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full border-2 border-amber-500" />
                Aday
              </span>
              <span>Uzak görünümde renk cluster’a taşınır.</span>
            </p>
          ) : null}

          <FilterGroup
            label="Veri tazeliği"
            values={stationFreshnessFilters}
            selected={value.freshness}
            labels={freshnessLabels}
            colors={freshnessColors}
            onToggle={(item) =>
              onChange({
                ...value,
                freshness: toggleFilter(value.freshness, item),
              })
            }
          />
          <FilterGroup
            label="Trafik durumu"
            values={stationTrafficStateFilters}
            selected={value.trafficStates}
            labels={trafficStateLabels}
            colors={trafficStateColors}
            onToggle={(item) =>
              onChange({
                ...value,
                trafficStates: toggleFilter(value.trafficStates, item),
              })
            }
          />

          <button
            type="button"
            onClick={() => onChange(defaultMapLayerSettings)}
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Katmanları sıfırla
          </button>
        </div>
      ) : null}
      {statusSummary}
    </aside>
  );
}

const layerKeys = [
  "stations",
  "junctions",
  "anomalies",
  "roadWorks",
  "trafficAnnouncements",
  "fieldReports",
] as const;

function LayerToggle({
  label,
  count,
  active,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
        active
          ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200"
          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-950"
      }`}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/80 shadow-sm dark:bg-slate-900">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold">
          {label}
        </span>
        <span className="block text-[10px] opacity-70">{count} kayıt</span>
      </span>
    </button>
  );
}

function FilterGroup<T extends string>({
  label,
  values,
  selected,
  labels,
  colors,
  onToggle,
}: {
  label: string;
  values: readonly T[];
  selected: T[];
  labels: Record<T, string>;
  colors: Record<T, string>;
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
      <legend className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {label}
      </legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(item)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition ${
                active
                  ? "border-slate-300 bg-white text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-950"
              }`}
            >
              <span className={`size-2 rounded-full ${colors[item]}`} />
              {labels[item]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function toggleFilter<T>(selected: T[], value: T) {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}

const freshnessLabels: Record<StationFreshnessFilter, string> = {
  FRESH: "Güncel",
  STALE: "Gecikmeli",
  OUTDATED: "Eski",
  UNAVAILABLE: "Veri yok",
};

const freshnessColors: Record<StationFreshnessFilter, string> = {
  FRESH: "bg-emerald-500",
  STALE: "bg-amber-500",
  OUTDATED: "bg-rose-500",
  UNAVAILABLE: "bg-slate-400",
};

const trafficStateLabels: Record<StationTrafficStateFilter, string> = {
  FLOWING: "Akıcı",
  SLOW: "Yavaş",
  CONGESTED: "Kuyruk/duruş",
  INSUFFICIENT_DATA: "Yetersiz veri",
};

const trafficStateColors: Record<StationTrafficStateFilter, string> = {
  FLOWING: "bg-emerald-500",
  SLOW: "bg-amber-500",
  CONGESTED: "bg-rose-500",
  INSUFFICIENT_DATA: "bg-slate-400",
};

function LayersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden="true"
    >
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </svg>
  );
}

export type { MapLayerCounts };
