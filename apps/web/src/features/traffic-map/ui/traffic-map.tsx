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
  GeoJSONSource,
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
import { TrafficEventDetailCard } from "@/features/traffic-events";
import {
  FieldReportDetailCard,
  FieldReportMapLayer,
} from "@/features/field-reports";

import {
  createAnomalyGeoJson,
  createJunctionGeoJson,
  createStationGeoJson,
  createTrafficEventAnchorGeoJson,
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
import { MapVisualizationLegend } from "./map-visualization-legend";
import {
  JunctionMapMarkers,
  StationMapMarkers,
  TrafficEventMapMarkers,
} from "./traffic-map-markers";
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
  eventClusterCountLayer,
  eventClusterLayer,
  junctionClusterCountLayer,
  junctionClusterLayer,
  stationClusterCountLayer,
  stationClusterLayer,
  stationOverviewLayer,
  trafficEventAreaLayer,
  trafficEventLineLayer,
  trafficEventPointLayer,
} from "./traffic-map-layers";

interface TrafficMapProps {
  bbox: CoverageArea["bbox"];
  timeZone: CoverageArea["timeZone"];
  stations: StationSummary[];
  selectedStationId: string | null;
  highlightedStationIds?: ReadonlySet<string>;
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
  showLegend?: boolean;
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

const EMPTY_STATION_ID_SET: ReadonlySet<string> = new Set();

export function TrafficMap({
  bbox,
  timeZone,
  stations,
  selectedStationId,
  highlightedStationIds = EMPTY_STATION_ID_SET,
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
  showLegend = true,
}: TrafficMapProps) {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const subscribedMapRef = useRef<MapLibreMap | null>(null);
  const stationsRef = useRef(stations);
  useEffect(() => {
    stationsRef.current = stations;
  }, [stations]);
  const [styleFailed, setStyleFailed] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState<HoveredAsset | null>(null);
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;
  const stationGeoJson = createStationGeoJson(
    stations,
    selectedStationId,
    anomalies,
    highlightedStationIds,
  );
  const densityGeoJson = createTrafficDensityGeoJson(stations);
  const volumeGeoJson = createTrafficVolumeGeoJson(stations);
  const junctionGeoJson = createJunctionGeoJson(junctions, selectedJunctionId);
  const selectedStation = selectedStationId
    ? (stations.find((station) => station.id === selectedStationId) ?? null)
    : null;
  const [currentZoom, setCurrentZoom] = useState(selectedStation ? 12 : 9.2);
  const roadFlowGeoJson = createRoadFlowGeoJson(roadContext, selectedStation);
  const trafficEventGeoJson = createTrafficEventGeoJson(trafficEvents);
  const trafficEventAnchorGeoJson =
    createTrafficEventAnchorGeoJson(trafficEvents);
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
    // A selected station/junction already owns the camera (see above); only
    // steer the map to fit a corridor when nothing more specific is picked.
    if (selectedStationId || selectedJunctionId) return;
    if (!mapLoaded || highlightedStationIds.size === 0) return;

    // Reads the latest stations via a ref (not a dependency) so this only
    // re-fits when the *selection* changes — not on every live data poll,
    // which would otherwise fight any zoom the user did in the meantime.
    const highlighted = stationsRef.current.filter((station) =>
      highlightedStationIds.has(station.id),
    );
    if (highlighted.length < 2) return;

    const longitudes = highlighted.map((station) => station.longitude);
    const latitudes = highlighted.map((station) => station.latitude);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    mapRef.current?.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      {
        padding: 96,
        duration: reduceMotion ? 0 : 700,
        essential: false,
      },
    );
  }, [highlightedStationIds, mapLoaded, selectedJunctionId, selectedStationId]);

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
  const anomalyGeoJson = createAnomalyGeoJson(
    stations,
    anomalies,
    selectedStationId,
  );

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

    if (
      feature?.properties?.cluster &&
      feature.geometry.type === "Point" &&
      typeof feature.properties.cluster_id === "number" &&
      feature.source
    ) {
      expandCluster(
        feature.source,
        feature.properties.cluster_id,
        feature.geometry.coordinates as [number, number],
      );
      return;
    }

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

  function expandCluster(
    sourceId: string,
    clusterId: number,
    coordinates: [number, number],
  ) {
    const source = subscribedMapRef.current?.getSource(sourceId) as
      GeoJSONSource | undefined;
    if (!source) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    source
      .getClusterExpansionZoom(clusterId)
      .then((zoom) => {
        mapRef.current?.easeTo({
          center: coordinates,
          zoom,
          duration: reduceMotion ? 0 : 500,
        });
      })
      .catch(() => {
        // Zoom seviyesi alınamazsa harita mevcut konumda kalır.
      });
  }

  function handlePointerMove(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    const coordinates =
      feature?.geometry.type === "Point" ? feature.geometry.coordinates : null;

    if (feature?.properties.cluster && coordinates) {
      const count = feature.properties.point_count;
      const clusterLabel = clusterHoverLabel(feature.layer?.id);
      const activeAnomalyCount = Number(
        feature.properties.activeAnomalyCount ?? 0,
      );
      const candidateAnomalyCount = Number(
        feature.properties.candidateAnomalyCount ?? 0,
      );
      const anomalyDetail =
        feature.layer?.id === "traffic-station-clusters" &&
        (activeAnomalyCount > 0 || candidateAnomalyCount > 0)
          ? ` ${activeAnomalyCount} aktif, ${candidateAnomalyCount} aday anomali işareti içeriyor.`
          : "";
      setHoveredAsset({
        longitude: coordinates[0],
        latitude: coordinates[1],
        name: `${count} ${clusterLabel.unit}`,
        category: clusterLabel.category,
        detail: `Ayrı ayrı görmek için tıklayın veya yakınlaştırın.${anomalyDetail}`,
      });
      return;
    }

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
        mapStyle={`https://tiles.openfreemap.org/styles/${theme === "dark" ? "dark" : "bright"}`}
        interactiveLayerIds={[
          "traffic-station-overview",
          "traffic-station-clusters",
          "traffic-junction-clusters",
          "traffic-event-clusters",
          "traffic-event-lines",
          "traffic-event-areas",
        ]}
        onClick={handleMapClick}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setHoveredAsset(null)}
        onZoomEnd={(event) => setCurrentZoom(event.viewState.zoom)}
        // maplibre-gl can fire these synchronously while another <Layer>
        // is still mounting/committing; queueMicrotask defers the state
        // update past that commit so React doesn't warn about updating
        // TrafficMap mid-render.
        onError={() => {
          // MapLibre also reports isolated tile, sprite and custom-layer
          // failures here. Once the map has loaded, those errors do not mean
          // the basemap is unavailable and must not leave a permanent banner.
          if (!mapLoaded) {
            queueMicrotask(() => setStyleFailed(true));
          }
        }}
        onLoad={() =>
          queueMicrotask(() => {
            setStyleFailed(false);
            setMapLoaded(true);
          })
        }
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
        <Source
          id="traffic-event-cluster-source"
          type="geojson"
          data={trafficEventAnchorGeoJson}
          cluster
          clusterMaxZoom={13}
          clusterRadius={50}
        >
          <Layer {...eventClusterLayer} />
          <Layer {...eventClusterCountLayer} />
        </Source>
        {currentZoom >= 13 || selectedTrafficEventId ? (
          <TrafficEventMapMarkers
            events={trafficEvents}
            selectedEventId={selectedTrafficEventId}
            onSelect={onSelectTrafficEvent}
            onHover={setHoveredAsset}
          />
        ) : null}
        <FieldReportMapLayer
          reports={fieldReports}
          selectedReportId={selectedFieldReportId}
          draftLocation={fieldReportDraftLocation}
          onSelect={onSelectFieldReport}
        />
        <Source
          id="traffic-station-overview-source"
          type="geojson"
          data={stationGeoJson}
          cluster
          clusterMaxZoom={10}
          clusterRadius={44}
          clusterProperties={{
            activeAnomalyCount: [
              "+",
              ["case", ["==", ["get", "anomalyStatus"], "ACTIVE"], 1, 0],
            ],
            candidateAnomalyCount: [
              "+",
              ["case", ["==", ["get", "anomalyStatus"], "CANDIDATE"], 1, 0],
            ],
          }}
        >
          <Layer {...stationClusterLayer} />
          <Layer {...stationClusterCountLayer} />
          <Layer {...stationOverviewLayer} />
        </Source>
        {currentZoom >= 10.5 ? (
          <StationMapMarkers
            stations={stations}
            selectedStationId={selectedStationId}
            highlightedStationIds={highlightedStationIds}
            onSelect={onSelect}
            onHover={setHoveredAsset}
            showDirection
          />
        ) : null}
        <Source
          id="traffic-anomalies-source"
          type="geojson"
          data={anomalyGeoJson}
        >
          <Layer {...anomalyLayer} />
        </Source>
        <Source
          id="traffic-junction-overview-source"
          type="geojson"
          data={junctionGeoJson}
          cluster
          clusterMaxZoom={10}
          clusterRadius={50}
        >
          <Layer {...junctionClusterLayer} />
          <Layer {...junctionClusterCountLayer} />
        </Source>
        {currentZoom >= 10.5 || selectedJunctionId ? (
          <JunctionMapMarkers
            junctions={junctions}
            selectedJunctionId={selectedJunctionId}
            onSelect={onSelectJunction}
            onHover={setHoveredAsset}
          />
        ) : null}
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
      {showLegend ? (
        <MapVisualizationLegend
          mode={visualizationMode}
          timeZone={timeZone}
          selectedStationId={selectedStationId}
          selectedStation={selectedStation}
          roadContext={roadContext}
          roadContextStatus={roadContextStatus}
        />
      ) : null}
      {styleFailed ? (
        <p
          role="status"
          className="absolute right-3 bottom-40 z-10 max-w-56 rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs font-medium text-amber-900 shadow dark:border-amber-700 dark:bg-amber-950/95 dark:text-amber-100"
        >
          Harita altlığı kısmen yüklenemedi. Trafik verileri çalışmaya devam
          ediyor.
        </p>
      ) : null}
    </div>
  );
}

function clusterHoverLabel(layerId: string | undefined) {
  if (layerId === "traffic-junction-clusters") {
    return { unit: "kavşak", category: "Yakın kavşak grubu" };
  }
  if (layerId === "traffic-event-clusters") {
    return { unit: "yol olayı", category: "Yakın yol olayı grubu" };
  }
  return { unit: "istasyon", category: "Yakın istasyon grubu" };
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
