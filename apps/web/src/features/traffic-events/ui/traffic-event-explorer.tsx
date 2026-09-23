import type {
  TrafficEvent,
  TrafficEventCatalogResponse,
} from "@traffic-twin/contracts";
import { useState } from "react";

import type { TrafficEventFilters } from "../model/traffic-event-filters";
import {
  formatTrafficEventDate,
  formatTrafficEventSeverity,
} from "../lib/traffic-event-formatters";

interface TrafficEventExplorerProps {
  events: TrafficEvent[];
  allEvents: TrafficEvent[];
  filters: TrafficEventFilters;
  onFiltersChange: (filters: TrafficEventFilters) => void;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
  source?: TrafficEventCatalogResponse["source"];
  timeZone: string;
  status: "loading" | "error" | "ready";
  onRetry: () => void;
  embedded?: boolean;
}

export function TrafficEventExplorer({
  events,
  allEvents,
  filters,
  onFiltersChange,
  selectedEventId,
  onSelectEvent,
  source,
  timeZone,
  status,
  onRetry,
  embedded = false,
}: TrafficEventExplorerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`${embedded ? "pointer-events-auto relative w-full" : "absolute top-56 right-4 left-4 z-10 w-auto sm:top-16 sm:left-auto sm:w-[min(340px,calc(100%-2rem))]"} overflow-hidden rounded-xl border border-white/70 bg-white/95 text-[11px] shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="font-semibold text-slate-900 dark:text-white">
          Yol olayları
        </span>
        <span className="text-slate-500">
          {status === "loading"
            ? "Yükleniyor"
            : status === "error"
              ? "Alınamadı"
              : `${events.length}/${allEvents.length}`}
          <span aria-hidden="true" className="ml-2">
            {expanded ? "▴" : "▾"}
          </span>
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 p-3 dark:border-slate-700">
          <TrafficEventSourceStatus source={source} timeZone={timeZone} />
          {status === "error" ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              <p>Olay kataloğu alınamadı.</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 font-semibold underline"
              >
                Tekrar dene
              </button>
            </div>
          ) : (
            <>
              <div className="mt-2 flex gap-2 text-[10px] text-slate-500">
                <span>
                  {countCategory(allEvents, "ROAD_WORK")} yol çalışması
                </span>
                <span>·</span>
                <span>
                  {countCategory(allEvents, "TRAFFIC_ANNOUNCEMENT")} duyuru
                </span>
              </div>
              <TrafficEventFilterFields
                value={filters}
                onChange={onFiltersChange}
              />
              <TrafficEventResults
                events={events}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                onSelect={onSelectEvent}
              />
            </>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function countCategory(
  events: TrafficEvent[],
  category: TrafficEvent["category"],
) {
  return events.filter((event) => event.category === category).length;
}

function TrafficEventFilterFields({
  value,
  onChange,
}: {
  value: TrafficEventFilters;
  onChange: (filters: TrafficEventFilters) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <label className="col-span-2">
        <span className="sr-only">Yol olaylarında ara</span>
        <input
          type="search"
          value={value.query}
          maxLength={80}
          onChange={(event) =>
            onChange({ ...value, query: event.target.value })
          }
          placeholder="Yol, başlık veya etki ara"
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>
      <FilterSelect
        label="Kategori"
        value={value.category}
        onChange={(category) => onChange({ ...value, category })}
        options={[
          ["all", "Tüm kategoriler"],
          ["road-work", "Yol çalışması"],
          ["traffic-announcement", "Trafik duyurusu"],
          ["none", "Olayları gizle"],
        ]}
      />
      <FilterSelect
        label="Durum"
        value={value.status}
        onChange={(eventStatus) => onChange({ ...value, status: eventStatus })}
        options={[
          ["all", "Tüm durumlar"],
          ["active", "Aktif"],
          ["upcoming", "Yaklaşan"],
        ]}
      />
      <FilterSelect
        label="Etki düzeyi"
        value={value.severity}
        onChange={(severity) => onChange({ ...value, severity })}
        options={[
          ["all", "Tüm etkiler"],
          ["high", "Yüksek"],
          ["medium", "Orta"],
          ["low", "Düşük"],
          ["unknown", "Sağlanmadı"],
        ]}
        className="col-span-2"
      />
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<readonly [T, string]>;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[10px] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TrafficEventResults({
  events,
  selectedEventId,
  timeZone,
  onSelect,
}: {
  events: TrafficEvent[];
  selectedEventId: string | null;
  timeZone: string;
  onSelect: (eventId: string | null) => void;
}) {
  if (events.length === 0) {
    return (
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-center text-slate-500 dark:bg-slate-800">
        Bu filtrelerle eşleşen güncel olay yok.
      </p>
    );
  }

  return (
    <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
      {events.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            aria-pressed={event.id === selectedEventId}
            onClick={() =>
              onSelect(event.id === selectedEventId ? null : event.id)
            }
            className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
              event.id === selectedEventId
                ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {event.category === "ROAD_WORK"
                  ? "Yol çalışması"
                  : "Trafik duyurusu"}
              </span>
              <span className="text-slate-500">
                {event.status === "ACTIVE" ? "Aktif" : "Yaklaşan"}
              </span>
            </span>
            <span className="mt-1 block line-clamp-2 text-xs leading-4 text-slate-700 dark:text-slate-300">
              {event.title}
            </span>
            <span className="mt-1 block text-[10px] text-slate-500">
              {formatTrafficEventSeverity(event.severity)} ·{" "}
              {formatTrafficEventDate(event.startsAt, timeZone)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TrafficEventSourceStatus({
  source,
  timeZone,
}: {
  source?: TrafficEventCatalogResponse["source"];
  timeZone: string;
}) {
  const freshness = source?.freshness ?? "UNAVAILABLE";
  const labels = {
    FRESH: "Kaynak güncel",
    STALE: "Son geçerli veri",
    UNAVAILABLE: "Henüz veri alınmadı",
  } as const;
  const dotColors = {
    FRESH: "bg-emerald-500",
    STALE: "bg-amber-500",
    UNAVAILABLE: "bg-slate-400",
  } as const;

  return (
    <div
      role="status"
      className="rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    >
      <p className="flex items-center gap-1.5 font-medium">
        <span className={`size-2 rounded-full ${dotColors[freshness]}`} />
        {labels[freshness]}
      </p>
      {source?.fetchedAt ? (
        <p className="mt-0.5">
          Son başarılı: {formatTrafficEventDate(source.fetchedAt, timeZone)}
        </p>
      ) : null}
    </div>
  );
}
