"use client";

import type { CoverageArea, StationSummary } from "@traffic-twin/contracts";
import { Layer, Map, NavigationControl, Source } from "react-map-gl/maplibre";
import type { LayerProps, MapLayerMouseEvent } from "react-map-gl/maplibre";

interface TrafficMapProps {
  bbox: CoverageArea["bbox"];
  stations: StationSummary[];
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
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

export function TrafficMap({
  bbox,
  stations,
  selectedStationId,
  onSelect,
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

  function handleMapClick(event: MapLayerMouseEvent) {
    const stationId = event.features?.[0]?.properties?.id as string | undefined;

    if (stationId) {
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
      interactiveLayerIds={["traffic-stations"]}
      onClick={handleMapClick}
      cursor="pointer"
      attributionControl={{ compact: true }}
      reuseMaps
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      <Source id="traffic-stations-source" type="geojson" data={stationGeoJson}>
        <Layer {...stationLayer} />
      </Source>
    </Map>
  );
}
