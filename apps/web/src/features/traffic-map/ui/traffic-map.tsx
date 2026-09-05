"use client";

import type {
  AnomalyEvaluation,
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
  anomalies?: AnomalyEvaluation[];
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

const anomalyLayer: LayerProps = {
  id: "traffic-anomalies",
  type: "circle",
  paint: {
    "circle-radius": 12,
    "circle-color": "rgba(0,0,0,0)",
    "circle-stroke-width": 3,
    "circle-stroke-color": [
      "match",
      ["get", "status"],
      "ACTIVE",
      "#e11d48",
      "#f59e0b",
    ],
    "circle-opacity": 0.95,
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
  anomalies = [],
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
  const anomalyStatusByAsset = new globalThis.Map<
    string,
    "ACTIVE" | "CANDIDATE"
  >();
  for (const anomaly of anomalies) {
    if (anomaly.status === "ACTIVE") {
      anomalyStatusByAsset.set(anomaly.assetId, "ACTIVE");
    } else if (
      anomaly.status === "CANDIDATE" &&
      anomalyStatusByAsset.get(anomaly.assetId) !== "ACTIVE"
    ) {
      anomalyStatusByAsset.set(anomaly.assetId, "CANDIDATE");
    }
  }
  const anomalyGeoJson = {
    type: "FeatureCollection" as const,
    features: stations.flatMap((station) => {
      const status = anomalyStatusByAsset.get(station.id);
      return status
        ? [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [station.longitude, station.latitude],
              },
              properties: { assetId: station.id, status },
            },
          ]
        : [];
    }),
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
        <Layer {...junctionLayer} />
      </Source>
    </Map>
  );
}
