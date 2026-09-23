import type {
  JunctionSummary,
  StationSummary,
  TrafficEvent,
} from "@traffic-twin/contracts";
import { Marker } from "react-map-gl/maplibre";

import { TrafficAssetIcon } from "@/shared/ui";

import { getTrafficEventAnchor } from "../lib/traffic-map-data";

interface MarkerHoverDetail {
  longitude: number;
  latitude: number;
  name: string;
  category: string;
  detail: string;
}

const freshnessClassNames = {
  FRESH: "bg-emerald-600 text-white",
  STALE: "bg-amber-500 text-white",
  OUTDATED: "bg-rose-600 text-white",
  UNAVAILABLE: "bg-slate-500 text-white",
} as const;

const junctionClassNames = {
  FULL: "border-violet-600 text-violet-700 dark:text-violet-300",
  PARTIAL: "border-blue-600 text-blue-700 dark:text-blue-300",
  INSUFFICIENT: "border-slate-500 text-slate-600 dark:text-slate-300",
} as const;

function formatMetric(value: number | null, suffix: string) {
  return value === null ? "Veri yok" : `${Math.round(value)} ${suffix}`;
}

function stopMapClick(event: React.MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

export function StationMapMarkers({
  stations,
  selectedStationId,
  onSelect,
  onHover,
  showDirection,
}: {
  stations: StationSummary[];
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
  onHover: (detail: MarkerHoverDetail | null) => void;
  showDirection: boolean;
}) {
  return stations.map((station) => {
    const selected = station.id === selectedStationId;
    const bearing =
      station.directions[0]?.heading?.degrees ?? station.bearing ?? null;
    const hoverDetail: MarkerHoverDetail = {
      longitude: station.longitude,
      latitude: station.latitude,
      name: station.name,
      category: `Ölçüm istasyonu · TMS ${station.tmsNumber}`,
      detail: `Yön 1: ${formatMetric(station.directions[0]?.averageSpeedKmh ?? null, "km/sa")} · Yön 2: ${formatMetric(station.directions[1]?.averageSpeedKmh ?? null, "km/sa")}`,
    };

    return (
      <Marker
        key={station.id}
        longitude={station.longitude}
        latitude={station.latitude}
        anchor="center"
      >
        <button
          type="button"
          aria-label={`${station.name}, TMS ${station.tmsNumber} ölçüm istasyonu`}
          aria-pressed={selected}
          onClick={(event) => {
            stopMapClick(event);
            onSelect(station.id);
          }}
          onMouseEnter={() => onHover(hoverDetail)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(hoverDetail)}
          onBlur={() => onHover(null)}
          className={`traffic-map-marker group relative grid place-items-center rounded-full border-[3px] border-white shadow-lg transition duration-200 ${
            selected
              ? "size-11 scale-110 ring-4 ring-sky-400/35"
              : "size-8 hover:scale-110"
          } ${freshnessClassNames[station.freshness]}`}
        >
          <TrafficAssetIcon
            kind="station"
            className={selected ? "size-5" : "size-4"}
          />
          {bearing !== null && showDirection ? (
            <span
              aria-hidden="true"
              className="absolute -top-2 left-1/2 h-[calc(50%+7px)] w-0.5 origin-bottom -translate-x-1/2 rounded-full bg-slate-950 shadow-[0_0_0_1px_white] dark:bg-white"
              style={{ transform: `translateX(-50%) rotate(${bearing}deg)` }}
            >
              <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rotate-45 bg-current" />
            </span>
          ) : null}
          {selected ? (
            <span className="pointer-events-none absolute top-[calc(100%+7px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-800 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-white">
              TMS {station.tmsNumber}
            </span>
          ) : null}
        </button>
      </Marker>
    );
  });
}

export function JunctionMapMarkers({
  junctions,
  selectedJunctionId,
  onSelect,
  onHover,
}: {
  junctions: JunctionSummary[];
  selectedJunctionId: string | null;
  onSelect?: (junctionId: string) => void;
  onHover: (detail: MarkerHoverDetail | null) => void;
}) {
  return junctions.map((junction) => {
    const selected = junction.id === selectedJunctionId;
    const hoverDetail: MarkerHoverDetail = {
      longitude: junction.longitude,
      latitude: junction.latitude,
      name: junction.name,
      category: "Doğrulanmış kavşak",
      detail: `${junction.sensors.length} sensör · ${junction.coverage}`,
    };

    return (
      <Marker
        key={junction.id}
        longitude={junction.longitude}
        latitude={junction.latitude}
        anchor="center"
      >
        <button
          type="button"
          aria-label={`${junction.name}, doğrulanmış kavşak`}
          aria-pressed={selected}
          onClick={(event) => {
            stopMapClick(event);
            onSelect?.(junction.id);
          }}
          onMouseEnter={() => onHover(hoverDetail)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(hoverDetail)}
          onBlur={() => onHover(null)}
          className={`traffic-map-marker grid place-items-center rounded-xl border-2 bg-white shadow-xl transition duration-200 dark:bg-slate-900 ${
            selected
              ? "size-11 rotate-45 scale-110 ring-4 ring-violet-400/30"
              : "size-9 rotate-45 hover:scale-110"
          } ${junctionClassNames[junction.coverage]}`}
        >
          <TrafficAssetIcon
            kind="junction"
            className={`${selected ? "size-6" : "size-5"} -rotate-45`}
          />
        </button>
      </Marker>
    );
  });
}

export function TrafficEventMapMarkers({
  events,
  selectedEventId,
  onSelect,
  onHover,
}: {
  events: TrafficEvent[];
  selectedEventId: string | null;
  onSelect?: (eventId: string | null) => void;
  onHover: (detail: MarkerHoverDetail | null) => void;
}) {
  return events.flatMap((event) => {
    if (event.status === "ENDED") return [];
    const anchor = getTrafficEventAnchor(event);
    if (!anchor) return [];
    const roadWork = event.category === "ROAD_WORK";
    const selected = event.id === selectedEventId;
    const hoverDetail: MarkerHoverDetail = {
      ...anchor,
      name: event.title,
      category: `${roadWork ? "Yol çalışması" : "Trafik duyurusu"} · ${
        event.status === "UPCOMING" ? "Yaklaşan" : "Aktif"
      } · Kaynak dili: ${event.language.toUpperCase()}`,
      detail: event.description ?? "Konum açıklaması sağlanmadı.",
    };

    return [
      <Marker
        key={event.id}
        longitude={anchor.longitude}
        latitude={anchor.latitude}
        anchor="center"
      >
        <button
          type="button"
          aria-label={`${roadWork ? "Yol çalışması" : "Trafik duyurusu"}: ${event.title}`}
          aria-pressed={selected}
          onClick={(mouseEvent) => {
            stopMapClick(mouseEvent);
            onSelect?.(event.id);
          }}
          onMouseEnter={() => onHover(hoverDetail)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(hoverDetail)}
          onBlur={() => onHover(null)}
          className={`traffic-map-marker grid place-items-center shadow-lg transition duration-200 hover:scale-110 ${
            roadWork
              ? "size-8 rotate-45 rounded-[9px] border-2 border-white bg-orange-500 text-white"
              : "size-9 rounded-full border-2 border-white bg-rose-600 text-white"
          } ${selected ? "scale-110 ring-4 ring-slate-950/25" : ""} ${
            event.status === "UPCOMING" ? "opacity-70" : ""
          }`}
        >
          <TrafficAssetIcon
            kind={roadWork ? "road-work" : "traffic-announcement"}
            className={`size-5 ${roadWork ? "-rotate-45" : ""}`}
          />
        </button>
      </Marker>,
    ];
  });
}

export type { MarkerHoverDetail };
