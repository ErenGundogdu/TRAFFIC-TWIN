"use client";

import type {
  CoverageArea,
  JunctionSummary,
  StationSummary,
} from "@traffic-twin/contracts";
import { Layer, Map, NavigationControl, Source } from "react-map-gl/maplibre";
import type { LayerProps, MapLayerMouseEvent } from "react-map-gl/maplibre";

interface TrafficMapProps {
  bbox: CoverageArea["bbox"];
  stations: StationSummary[];
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
  junctions?: JunctionSummary[];
  selectedJunctionId?: string | null;
  onSelectJunction?: (junctionId: string) => void;
}

const stationLayer: LayerProps = {
  id: "traffic-stations",
  type: "circle",
  paint: {
    "circle-radius": ["case", ["boolean", ["get", "selected"], false], 9, 6],
    "circle-color": [
      "match",
      ["get", "freshness"],
      "FRESH",
      "#059669",
      "STALE",
      "#d97706",
      "#64748b",
    ],
    "circle-stroke-color": [
      "case",
      ["boolean", ["get", "selected"], false],
      "#0c4a6e",
      "#ffffff",
    ],
    "circle-stroke-width": [
      "case",
      ["boolean", ["get", "selected"], false],
      3,
      2,
    ],
    "circle-opacity": 0.94,
  },
};

const junctionLayer: LayerProps = {
  id: "traffic-junctions",
  type: "circle",
  paint: {
    "circle-radius": ["case", ["boolean", ["get", "selected"], false], 11, 8],
    "circle-color": [
      "match",
      ["get", "coverage"],
      "FULL",
      "#7c3aed",
      "PARTIAL",
      "#2563eb",
      "#64748b",
    ],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": [
      "case",
      ["boolean", ["get", "selected"], false],
      4,
      2,
    ],
  },
};

export function TrafficMap({
  bbox,
  stations,
  selectedStationId,
  onSelect,
  junctions = [],
  selectedJunctionId = null,
  onSelectJunction,
}: TrafficMapProps) {
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;
  const stationGeoJson = {
    type: "FeatureCollection" as const,
    features: stations.map((station) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [station.longitude, station.latitude],
      },
      properties: {
        id: station.id,
        freshness: station.freshness,
        selected: station.id === selectedStationId,
      },
    })),
  };
  const junctionGeoJson = {
    type: "FeatureCollection" as const,
    features: junctions.map((junction) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [junction.longitude, junction.latitude],
      },
      properties: {
        id: junction.id,
        kind: "junction",
        coverage: junction.coverage,
        selected: junction.id === selectedJunctionId,
      },
    })),
  };

  function handleMapClick(event: MapLayerMouseEvent) {
    const stationId = event.features?.[0]?.properties?.id as string | undefined;
    const kind = event.features?.[0]?.properties?.kind as string | undefined;

    if (stationId && kind === "junction") {
      onSelectJunction?.(stationId);
    } else if (stationId) {
      onSelect(stationId);
    }
  }

  return (
    <Map
      initialViewState={{
        longitude: (minLongitude + maxLongitude) / 2,
        latitude: (minLatitude + maxLatitude) / 2,
        zoom: 9.2,
      }}
      mapStyle="https://tiles.openfreemap.org/styles/positron"
      interactiveLayerIds={["traffic-stations", "traffic-junctions"]}
      onClick={handleMapClick}
      cursor="pointer"
      attributionControl={{ compact: true }}
      reuseMaps
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      <Source id="traffic-stations-source" type="geojson" data={stationGeoJson}>
        <Layer {...stationLayer} />
      </Source>
      <Source
        id="traffic-junctions-source"
        type="geojson"
        data={junctionGeoJson}
      >
        <Layer {...junctionLayer} />
      </Source>
    </Map>
  );
}
