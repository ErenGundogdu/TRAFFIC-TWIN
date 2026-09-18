"use client";

import type {
  AnomalyEvaluation,
  CoverageArea,
  FieldReport,
  FieldReportLocation,
  JunctionSummary,
  StationRoadContext,
  StationSummary,
  TrafficEvent,
} from "@traffic-twin/contracts";
import type {
  Map as MapLibreMap,
  MapStyleImageMissingEvent,
} from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layer,
  Map,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
} from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";

import { useTheme } from "@/shared/theme";
import { formatTrafficDirectionLabel } from "@/shared/traffic";
import { TrafficEventDetailCard } from "@/features/traffic-events";
import {
  FIELD_REPORT_LAYER_ID,
  FieldReportDetailCard,
  FieldReportMapLayer,
} from "@/features/field-reports";

import {
  createAnomalyGeoJson,
  createJunctionGeoJson,
  createStationGeoJson,
  createTrafficEventGeoJson,
  getTrafficEventAnchor,
} from "../lib/traffic-map-data";
import {
  createRoadFlowGeoJson,
  createTrafficDensityGeoJson,
  createTrafficVolumeGeoJson,
} from "../lib/traffic-flow-data";
import { provideTransparentStyleImageFallback } from "../lib/map-style-image-fallback";
import type { MapVisualizationMode } from "../model/map-visualization-mode";
import { MapVisualizationSwitcher } from "./map-visualization-switcher";
import {
  roadFlowArrowLayer,
  roadFlowCasingLayer,
  roadFlowLayer,
  trafficHeatmapLayer,
  trafficDensityGlowLayer,
  trafficVolumeLayer,
} from "./traffic-flow-layers";
import {
  anomalyLayer,
  junctionHaloLayer,
  junctionLayer,
  selectedStationLabelLayer,
  stationHaloLayer,
  stationLayer,
  trafficEventAreaLayer,
  trafficEventLineLayer,
  trafficEventPointLayer,
} from "./traffic-map-layers";

interface TrafficMapProps {
  bbox: CoverageArea["bbox"];
  timeZone: CoverageArea["timeZone"];
  stations: StationSummary[];
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
  junctions?: JunctionSummary[];
  selectedJunctionId?: string | null;
  onSelectJunction?: (junctionId: string) => void;
  anomalies?: AnomalyEvaluation[];
  trafficEvents?: TrafficEvent[];
  selectedTrafficEventId?: string | null;
  onSelectTrafficEvent?: (eventId: string | null) => void;
  fieldReports?: FieldReport[];
  selectedFieldReportId?: string | null;
  onSelectFieldReport?: (reportId: string | null) => void;
  fieldReportPickMode?: boolean;
  fieldReportDraftLocation?: FieldReportLocation | null;
  onPickFieldReportLocation?: (location: FieldReportLocation) => void;
  roadContext?: StationRoadContext;
  roadContextStatus?: "idle" | "loading" | "error" | "ready";
  visualizationMode: MapVisualizationMode;
  onVisualizationModeChange: (mode: MapVisualizationMode) => void;
}

interface HoveredAsset {
  longitude: number;
  latitude: number;
  name: string;
  category: string;
  detail: string;
}

function formatMetric(value: number | null, suffix: string) {
  return value === null ? "Veri yok" : `${Math.round(value)} ${suffix}`;
}

function handleMissingStyleImage(event: MapStyleImageMissingEvent) {
  provideTransparentStyleImageFallback(event.target, event.id);
}

export function TrafficMap({
  bbox,
  timeZone,
  stations,
  selectedStationId,
  onSelect,
  junctions = [],
  selectedJunctionId = null,
  onSelectJunction,
  anomalies = [],
  trafficEvents = [],
  selectedTrafficEventId = null,
  onSelectTrafficEvent,
  fieldReports = [],
  selectedFieldReportId = null,
  onSelectFieldReport,
  fieldReportPickMode = false,
  fieldReportDraftLocation = null,
  onPickFieldReportLocation,
  roadContext,
  roadContextStatus = "idle",
  visualizationMode,
  onVisualizationModeChange,
}: TrafficMapProps) {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const subscribedMapRef = useRef<MapLibreMap | null>(null);
  const [styleFailed, setStyleFailed] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState<HoveredAsset | null>(null);
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;
  const stationGeoJson = createStationGeoJson(stations, selectedStationId);
  const junctionGeoJson = createJunctionGeoJson(junctions, selectedJunctionId);
  const densityGeoJson = createTrafficDensityGeoJson(stations);
  const volumeGeoJson = createTrafficVolumeGeoJson(stations);
  const selectedStation = selectedStationId
    ? (stations.find((station) => station.id === selectedStationId) ?? null)
    : null;
  const roadFlowGeoJson = createRoadFlowGeoJson(roadContext, selectedStation);
  const trafficEventGeoJson = createTrafficEventGeoJson(trafficEvents);
  const selectedTrafficEvent = selectedTrafficEventId
    ? (trafficEvents.find((event) => event.id === selectedTrafficEventId) ??
      null)
    : null;
  const selectedTrafficEventAnchor = useMemo(
    () =>
      selectedTrafficEvent ? getTrafficEventAnchor(selectedTrafficEvent) : null,
    [selectedTrafficEvent],
  );
  const selectedFieldReport = selectedFieldReportId
    ? (fieldReports.find((report) => report.id === selectedFieldReportId) ??
      null)
    : null;

  const setMapRef = useCallback((instance: MapRef | null) => {
    subscribedMapRef.current?.off("styleimagemissing", handleMissingStyleImage);
    mapRef.current = instance;
    subscribedMapRef.current = instance?.getMap() ?? null;
    subscribedMapRef.current?.on("styleimagemissing", handleMissingStyleImage);
  }, []);

  useEffect(() => {
    const selectedAsset = selectedStationId
      ? stations.find((station) => station.id === selectedStationId)
      : junctions.find((junction) => junction.id === selectedJunctionId);

    if (!selectedAsset) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    mapRef.current?.flyTo({
      center: [selectedAsset.longitude, selectedAsset.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 12),
      pitch: visualizationMode === "volume-3d" ? 55 : 0,
      duration: reduceMotion ? 0 : 700,
      essential: false,
    });
  }, [
    junctions,
    selectedJunctionId,
    selectedStationId,
    stations,
    visualizationMode,
  ]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    mapRef.current?.easeTo({
      pitch: visualizationMode === "volume-3d" ? 55 : 0,
      duration: reduceMotion ? 0 : 500,
    });
  }, [visualizationMode]);

  useEffect(() => {
    if (!selectedTrafficEventAnchor) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    mapRef.current?.flyTo({
      center: [
        selectedTrafficEventAnchor.longitude,
        selectedTrafficEventAnchor.latitude,
      ],
      zoom: Math.max(mapRef.current.getZoom(), 11),
      duration: reduceMotion ? 0 : 700,
      essential: false,
    });
  }, [selectedTrafficEventAnchor]);
  useEffect(() => {
    if (!selectedFieldReport) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    mapRef.current?.flyTo({
      center: [
        selectedFieldReport.location.longitude,
        selectedFieldReport.location.latitude,
      ],
      zoom: Math.max(mapRef.current.getZoom(), 13),
      duration: reduceMotion ? 0 : 700,
      essential: false,
    });
  }, [selectedFieldReport]);
  const anomalyGeoJson = createAnomalyGeoJson(stations, anomalies);

  function handleMapClick(event: MapLayerMouseEvent) {
    if (fieldReportPickMode) {
      onPickFieldReportLocation?.({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      });
      return;
    }

    const feature = event.features?.[0];
    const assetId = feature?.properties?.id as string | undefined;
    const kind = feature?.properties?.kind as string | undefined;

    if (kind === "field-report" && assetId) {
      onSelectFieldReport?.(assetId);
      onSelectTrafficEvent?.(null);
      setHoveredAsset(null);
      return;
    }
    onSelectFieldReport?.(null);
    if (kind === "traffic-event" && assetId) {
      onSelectTrafficEvent?.(assetId);
      setHoveredAsset(null);
      return;
    }
    onSelectTrafficEvent?.(null);
    if (assetId && kind === "junction") {
      onSelectJunction?.(assetId);
    } else if (assetId) {
      onSelect(assetId);
    }
  }

  function handlePointerMove(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    const coordinates =
      feature?.geometry.type === "Point" ? feature.geometry.coordinates : null;

    if (!feature || !coordinates) {
      if (feature?.properties.kind === "traffic-event") {
        setHoveredAsset({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          name: String(feature.properties.title),
          category: formatTrafficEventCategory(
            String(feature.properties.category),
            String(feature.properties.status),
            String(feature.properties.language),
          ),
          detail:
            typeof feature.properties.description === "string"
              ? feature.properties.description
              : "Konum açıklaması sağlanmadı.",
        });
        return;
      }
      setHoveredAsset(null);
      return;
    }

    if (feature.properties.kind === "traffic-event") {
      setHoveredAsset({
        longitude: coordinates[0],
        latitude: coordinates[1],
        name: String(feature.properties.title),
        category: formatTrafficEventCategory(
          String(feature.properties.category),
          String(feature.properties.status),
          String(feature.properties.language),
        ),
        detail:
          typeof feature.properties.description === "string"
            ? feature.properties.description
            : "Konum açıklaması sağlanmadı.",
      });
      return;
    }

    if (feature.properties.kind === "junction") {
      setHoveredAsset({
        longitude: coordinates[0],
        latitude: coordinates[1],
        name: String(feature.properties.name),
        category: "Doğrulanmış kavşak",
        detail: `${feature.properties.sensorCount} sensör · ${feature.properties.coverage}`,
      });
      return;
    }

    setHoveredAsset({
      longitude: coordinates[0],
      latitude: coordinates[1],
      name: String(feature.properties.name),
      category: `Ölçüm istasyonu · TMS ${feature.properties.tmsNumber}`,
      detail: `Yön 1: ${formatMetric(feature.properties.directionOneSpeed as number | null, "km/sa")} · Yön 2: ${formatMetric(feature.properties.directionTwoSpeed as number | null, "km/sa")}`,
    });
  }

  return (
    <div className="relative h-full min-h-0">
      <Map
        ref={setMapRef}
        initialViewState={{
          longitude:
            selectedStation?.longitude ?? (minLongitude + maxLongitude) / 2,
          latitude:
            selectedStation?.latitude ?? (minLatitude + maxLatitude) / 2,
          zoom: selectedStation ? 12 : 9.2,
        }}
        mapStyle={`https://tiles.openfreemap.org/styles/${theme === "dark" ? "dark" : "liberty"}`}
        interactiveLayerIds={[
          "traffic-stations",
          "traffic-junctions",
          "traffic-event-points",
          "traffic-event-lines",
          "traffic-event-areas",
          FIELD_REPORT_LAYER_ID,
        ]}
        onClick={handleMapClick}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setHoveredAsset(null)}
        onError={() => setStyleFailed(true)}
        onLoad={() => setStyleFailed(false)}
        cursor={
          fieldReportPickMode ? "crosshair" : hoveredAsset ? "pointer" : "grab"
        }
        attributionControl={{ compact: true }}
        maxPitch={65}
        reuseMaps
      >
        <NavigationControl
          position="bottom-right"
          showCompass
          visualizePitch={false}
        />
        <ScaleControl position="bottom-left" unit="metric" />
        {visualizationMode === "overview" ? (
          <Source
            id="traffic-density-source"
            type="geojson"
            data={densityGeoJson}
          >
            <Layer {...trafficHeatmapLayer} />
            <Layer {...trafficDensityGlowLayer} />
          </Source>
        ) : null}
        {visualizationMode === "flow" ? (
          <Source
            id="traffic-road-flow-source"
            type="geojson"
            data={roadFlowGeoJson}
          >
            <Layer {...roadFlowCasingLayer} />
            <Layer {...roadFlowLayer} />
            <Layer {...roadFlowArrowLayer} />
          </Source>
        ) : null}
        {visualizationMode === "volume-3d" ? (
          <Source
            id="traffic-volume-source"
            type="geojson"
            data={volumeGeoJson}
          >
            <Layer {...trafficVolumeLayer} />
          </Source>
        ) : null}
        <Source
          id="traffic-events-source"
          type="geojson"
          data={trafficEventGeoJson}
        >
          <Layer {...trafficEventAreaLayer} />
          <Layer {...trafficEventLineLayer} />
          <Layer {...trafficEventPointLayer} />
        </Source>
        <FieldReportMapLayer
          reports={fieldReports}
          selectedReportId={selectedFieldReportId}
          draftLocation={fieldReportDraftLocation}
        />
        <Source
          id="traffic-stations-source"
          type="geojson"
          data={stationGeoJson}
        >
          <Layer {...stationHaloLayer} />
          <Layer {...stationLayer} />
          <Layer {...selectedStationLabelLayer} />
        </Source>
        <Source
          id="traffic-anomalies-source"
          type="geojson"
          data={anomalyGeoJson}
        >
          <Layer {...anomalyLayer} />
        </Source>
        <Source
          id="traffic-junctions-source"
          type="geojson"
          data={junctionGeoJson}
        >
          <Layer {...junctionHaloLayer} />
          <Layer {...junctionLayer} />
        </Source>
        {selectedFieldReport ? (
          <Popup
            longitude={selectedFieldReport.location.longitude}
            latitude={selectedFieldReport.location.latitude}
            offset={16}
            closeButton={false}
            closeOnClick={false}
            onClose={() => onSelectFieldReport?.(null)}
            className="traffic-event-detail-popup"
            maxWidth="none"
          >
            <FieldReportDetailCard
              report={selectedFieldReport}
              timeZone={timeZone}
              onClose={() => onSelectFieldReport?.(null)}
            />
          </Popup>
        ) : selectedTrafficEvent && selectedTrafficEventAnchor ? (
          <Popup
            longitude={selectedTrafficEventAnchor.longitude}
            latitude={selectedTrafficEventAnchor.latitude}
            offset={16}
            closeButton={false}
            closeOnClick={false}
            onClose={() => onSelectTrafficEvent?.(null)}
            className="traffic-event-detail-popup"
            maxWidth="none"
          >
            <TrafficEventDetailCard
              event={selectedTrafficEvent}
              timeZone={timeZone}
              onClose={() => onSelectTrafficEvent?.(null)}
            />
          </Popup>
        ) : hoveredAsset ? (
          <Popup
            longitude={hoveredAsset.longitude}
            latitude={hoveredAsset.latitude}
            anchor="bottom"
            offset={16}
            closeButton={false}
            closeOnClick={false}
            className="traffic-map-popup"
          >
            <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              {hoveredAsset.category}
            </p>
            <p className="mt-0.5 max-w-56 truncate text-sm font-semibold text-slate-950">
              {hoveredAsset.name}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              {hoveredAsset.detail}
            </p>
          </Popup>
        ) : null}
      </Map>
      <MapVisualizationSwitcher
        value={visualizationMode}
        onChange={onVisualizationModeChange}
      />
      <MapVisualizationLegend
        mode={visualizationMode}
        timeZone={timeZone}
        selectedStationId={selectedStationId}
        selectedStation={selectedStation}
        roadContext={roadContext}
        roadContextStatus={roadContextStatus}
      />
      {styleFailed ? (
        <p
          role="status"
          className="absolute right-3 top-3 max-w-56 rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs font-medium text-amber-900 shadow dark:border-amber-700 dark:bg-amber-950/95 dark:text-amber-100"
        >
          Harita altlığı kısmen yüklenemedi. Trafik verileri çalışmaya devam
          ediyor.
        </p>
      ) : null}
    </div>
  );
}

function formatTrafficEventCategory(
  category: string,
  status: string,
  language: string,
) {
  const categoryLabel =
    category === "ROAD_WORK" ? "Yol çalışması" : "Trafik duyurusu";
  const statusLabel =
    status === "UPCOMING"
      ? "Yaklaşan"
      : status === "ACTIVE"
        ? "Aktif"
        : "Sona ermiş";
  return `${categoryLabel} · ${statusLabel} · Kaynak dili: ${language.toUpperCase()}`;
}

function MapVisualizationLegend({
  mode,
  timeZone,
  selectedStationId,
  selectedStation,
  roadContext,
  roadContextStatus,
}: {
  mode: MapVisualizationMode;
  timeZone: string;
  selectedStationId: string | null;
  selectedStation: StationSummary | null;
  roadContext?: StationRoadContext;
  roadContextStatus: "idle" | "loading" | "error" | "ready";
}) {
  const title =
    mode === "overview"
      ? "Canlı trafik yoğunluğu"
      : mode === "volume-3d"
        ? "Göreli 3B trafik hacmi"
        : "Seçili istasyonun yol akışı";
  const description =
    mode === "overview"
      ? "Renk alanı, gerçek iki yön toplam araç/saat değerini gösterir."
      : mode === "volume-3d"
        ? "Sütun yüksekliği fiziksel değildir; istasyonlar arasındaki göreli araç/saat hacmidir."
        : !selectedStationId
          ? "Gerçek OSM yol bağlamını görmek için bir ölçüm istasyonu seçin."
          : roadContextStatus === "loading"
            ? "Gerçek OSM yol geometrisi yükleniyor…"
            : roadContextStatus === "error"
              ? "OSM yolu alınamadı; gerçek istasyon ölçümü korunuyor."
              : roadContext?.freshness === "STALE"
                ? roadContext.status === "MATCHED"
                  ? `OpenStreetMap geçici olarak yenilenemedi; ${formatRoadContextFetchedAt(roadContext.source.fetchedAt, timeZone)} tarihinde alınan son gerçek yol geometrisi gösteriliyor.`
                  : `OpenStreetMap geçici olarak yenilenemedi; ${formatRoadContextFetchedAt(roadContext.source.fetchedAt, timeZone)} tarihli son kontrolde eşleşen yol bulunmamıştı.`
                : roadContext?.status === "NO_MATCH"
                  ? "Yol referansıyla eşleşen OSM geometrisi bulunamadı."
                  : "Gerçek OSM çizgisi: kalınlık araç/saat, iç renk istasyona özgü serbest akış oranı, renkli kenar ve ok ölçüm yönüdür.";

  return (
    <div className="pointer-events-none absolute bottom-8 left-3 max-w-80 rounded-xl border border-white/80 bg-white/95 px-3 py-2.5 text-[10px] leading-4 text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300">
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-0.5">{description}</p>
      {mode !== "flow" ? (
        <div className="mt-2 flex items-center gap-2">
          <span>Düşük</span>
          <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-sky-400 via-emerald-500 via-50% to-rose-600" />
          <span>Yüksek</span>
        </div>
      ) : selectedStation && roadContext?.status === "MATCHED" ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedStation.directions.map((direction) => (
            <span
              key={direction.direction}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1 dark:bg-slate-800"
            >
              <span
                className={`size-2 rounded-full ${
                  direction.direction === 1 ? "bg-sky-600" : "bg-violet-600"
                }`}
              />
              {formatTrafficDirectionLabel(direction)}:{" "}
              {formatMetric(direction.averageSpeedKmh, "km/sa")} ·{" "}
              {formatMetric(direction.flowVehiclesPerHour, "araç/sa")}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatRoadContextFetchedAt(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
