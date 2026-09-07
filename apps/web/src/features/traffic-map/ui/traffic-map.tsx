"use client";

import type {
  AnomalyEvaluation,
  CoverageArea,
  JunctionSummary,
  StationRoadContext,
  StationSummary,
} from "@traffic-twin/contracts";
import { useEffect, useRef, useState } from "react";
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

import {
  createAnomalyGeoJson,
  createJunctionGeoJson,
  createStationGeoJson,
} from "../lib/traffic-map-data";
import {
  createRoadFlowGeoJson,
  createTrafficDensityGeoJson,
  createTrafficVolumeGeoJson,
} from "../lib/traffic-flow-data";
import type { MapVisualizationMode } from "../model/map-visualization-mode";
import { MapVisualizationSwitcher } from "./map-visualization-switcher";
import {
  roadFlowArrowLayer,
  roadFlowCasingLayer,
  roadFlowLayer,
  trafficHeatmapLayer,
  trafficVolumeLayer,
} from "./traffic-flow-layers";
import {
  anomalyLayer,
  junctionHaloLayer,
  junctionLayer,
  selectedStationLabelLayer,
  stationHaloLayer,
  stationLayer,
} from "./traffic-map-layers";

interface TrafficMapProps {
  bbox: CoverageArea["bbox"];
  stations: StationSummary[];
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
  junctions?: JunctionSummary[];
  selectedJunctionId?: string | null;
  onSelectJunction?: (junctionId: string) => void;
  anomalies?: AnomalyEvaluation[];
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

export function TrafficMap({
  bbox,
  stations,
  selectedStationId,
  onSelect,
  junctions = [],
  selectedJunctionId = null,
  onSelectJunction,
  anomalies = [],
  roadContext,
  roadContextStatus = "idle",
  visualizationMode,
  onVisualizationModeChange,
}: TrafficMapProps) {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef>(null);
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
  const anomalyGeoJson = createAnomalyGeoJson(stations, anomalies);

  function handleMapClick(event: MapLayerMouseEvent) {
    const stationId = event.features?.[0]?.properties?.id as string | undefined;
    const kind = event.features?.[0]?.properties?.kind as string | undefined;

    if (stationId && kind === "junction") {
      onSelectJunction?.(stationId);
    } else if (stationId) {
      onSelect(stationId);
    }
  }

  function handlePointerMove(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    const coordinates =
      feature?.geometry.type === "Point" ? feature.geometry.coordinates : null;

    if (!feature || !coordinates) {
      setHoveredAsset(null);
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
        ref={mapRef}
        initialViewState={{
          longitude:
            selectedStation?.longitude ?? (minLongitude + maxLongitude) / 2,
          latitude:
            selectedStation?.latitude ?? (minLatitude + maxLatitude) / 2,
          zoom: selectedStation ? 12 : 9.2,
        }}
        mapStyle={`https://tiles.openfreemap.org/styles/${theme === "dark" ? "dark" : "liberty"}`}
        interactiveLayerIds={["traffic-stations", "traffic-junctions"]}
        onClick={handleMapClick}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setHoveredAsset(null)}
        onError={() => setStyleFailed(true)}
        onLoad={() => setStyleFailed(false)}
        cursor={hoveredAsset ? "pointer" : "grab"}
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
        {hoveredAsset ? (
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
      <div className="pointer-events-none absolute bottom-8 left-3 max-w-72 rounded-lg border border-white/70 bg-white/90 px-2.5 py-2 text-[10px] leading-4 text-slate-600 shadow backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
        {visualizationMode === "overview"
          ? "Isı yoğunluğu, istasyonlardaki gerçek iki yön toplam araç/saat değerini gösterir."
          : visualizationMode === "volume-3d"
            ? "Sütun yüksekliği fiziksel yükseklik değildir; görünür istasyonlar arasındaki göreli araç/saat hacmidir."
            : !selectedStationId
              ? "Gerçek OSM yol bağlamını görmek için bir ölçüm istasyonu seçin."
              : roadContextStatus === "loading"
                ? "Seçili istasyonun gerçek OSM yol geometrisi yükleniyor…"
                : roadContextStatus === "error"
                  ? "OSM yol bağlamı alınamadı; istasyon ölçümleri çalışmaya devam ediyor."
                  : roadContext?.status === "NO_MATCH"
                    ? "Seçili istasyon için yol referansıyla eşleşen OSM geometrisi bulunamadı."
                    : "Çizgi gerçek OSM yol geometrisidir; kalınlık araç/saat, renk hız, ok Fintraffic yönüdür."}
      </div>
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
