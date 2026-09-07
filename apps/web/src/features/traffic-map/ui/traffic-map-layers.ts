import type { LayerProps } from "react-map-gl/maplibre";

export const stationLayer: LayerProps = {
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

export const stationHaloLayer: LayerProps = {
  id: "traffic-station-halos",
  type: "circle",
  paint: {
    "circle-radius": ["case", ["boolean", ["get", "selected"], false], 17, 11],
    "circle-color": [
      "match",
      ["get", "freshness"],
      "FRESH",
      "#10b981",
      "STALE",
      "#f59e0b",
      "#94a3b8",
    ],
    "circle-opacity": [
      "case",
      ["boolean", ["get", "selected"], false],
      0.32,
      0.14,
    ],
    "circle-blur": 0.35,
  },
};

export const selectedStationLabelLayer: LayerProps = {
  id: "selected-station-label",
  type: "symbol",
  filter: ["==", ["get", "selected"], true],
  layout: {
    "text-field": ["get", "shortLabel"],
    "text-size": 11,
    "text-font": ["Noto Sans Regular"],
    "text-offset": [0, 1.7],
    "text-anchor": "top",
    "text-allow-overlap": true,
  },
  paint: {
    "text-color": "#0f172a",
    "text-halo-color": "#ffffff",
    "text-halo-width": 2,
  },
};

export const junctionLayer: LayerProps = {
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

export const junctionHaloLayer: LayerProps = {
  id: "traffic-junction-halos",
  type: "circle",
  paint: {
    "circle-radius": ["case", ["boolean", ["get", "selected"], false], 19, 14],
    "circle-color": [
      "match",
      ["get", "coverage"],
      "FULL",
      "#7c3aed",
      "PARTIAL",
      "#2563eb",
      "#64748b",
    ],
    "circle-opacity": 0.18,
    "circle-blur": 0.25,
  },
};

export const anomalyLayer: LayerProps = {
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
