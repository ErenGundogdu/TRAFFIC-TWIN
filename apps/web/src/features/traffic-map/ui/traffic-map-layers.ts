import type { LayerProps } from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";

function stationFreshnessColor(): ExpressionSpecification {
  return [
    "match",
    ["get", "freshness"],
    "FRESH",
    "#059669",
    "STALE",
    "#f59e0b",
    "OUTDATED",
    "#e11d48",
    "#64748b",
  ];
}

export const stationOverviewLayer: LayerProps = {
  id: "traffic-station-overview",
  type: "circle",
  maxzoom: 10.5,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 3.5, 10, 6],
    "circle-color": stationFreshnessColor(),
    "circle-stroke-color": [
      "match",
      ["get", "anomalyStatus"],
      "ACTIVE",
      "#e11d48",
      "CANDIDATE",
      "#f59e0b",
      "#ffffff",
    ],
    "circle-stroke-width": [
      "case",
      ["==", ["get", "anomalyStatus"], "NONE"],
      1.5,
      3,
    ],
    "circle-opacity": 0.94,
  },
};

export const stationClusterLayer: LayerProps = {
  id: "traffic-station-clusters",
  type: "circle",
  maxzoom: 10.5,
  filter: ["has", "point_count"],
  paint: {
    "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 15, 22],
    "circle-color": [
      "case",
      [">", ["get", "activeAnomalyCount"], 0],
      "#9f1239",
      [">", ["get", "candidateAnomalyCount"], 0],
      "#b45309",
      "#334155",
    ],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-opacity": 0.9,
  },
};

export const stationClusterCountLayer: LayerProps = {
  id: "traffic-station-cluster-counts",
  type: "symbol",
  maxzoom: 10.5,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
    "text-font": ["Noto Sans Bold"],
  },
  paint: {
    "text-color": "#ffffff",
  },
};

export const junctionClusterLayer: LayerProps = {
  id: "traffic-junction-clusters",
  type: "circle",
  maxzoom: 10.5,
  filter: ["has", "point_count"],
  paint: {
    "circle-radius": ["step", ["get", "point_count"], 13, 5, 17, 15, 21],
    "circle-color": "#4c1d95",
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-opacity": 0.9,
  },
};

export const junctionClusterCountLayer: LayerProps = {
  id: "traffic-junction-cluster-counts",
  type: "symbol",
  maxzoom: 10.5,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
    "text-font": ["Noto Sans Bold"],
  },
  paint: {
    "text-color": "#ffffff",
  },
};

export const eventClusterLayer: LayerProps = {
  id: "traffic-event-clusters",
  type: "circle",
  maxzoom: 13,
  filter: ["has", "point_count"],
  paint: {
    "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 15, 22],
    "circle-color": "#7c2d12",
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-opacity": 0.92,
  },
};

export const eventClusterCountLayer: LayerProps = {
  id: "traffic-event-cluster-counts",
  type: "symbol",
  maxzoom: 13,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
    "text-font": ["Noto Sans Bold"],
  },
  paint: {
    "text-color": "#ffffff",
  },
};

export const anomalyLayer: LayerProps = {
  id: "traffic-anomalies",
  type: "circle",
  minzoom: 10.5,
  paint: {
    "circle-radius": ["case", ["get", "selected"], 27, 20],
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

function trafficEventColor(): ExpressionSpecification {
  return ["match", ["get", "category"], "ROAD_WORK", "#f97316", "#e11d48"];
}

export const trafficEventAreaLayer: LayerProps = {
  id: "traffic-event-areas",
  type: "fill",
  filter: [
    "any",
    ["==", ["geometry-type"], "Polygon"],
    ["==", ["geometry-type"], "MultiPolygon"],
  ],
  paint: {
    "fill-color": trafficEventColor(),
    "fill-opacity": ["case", ["==", ["get", "status"], "UPCOMING"], 0.18, 0.3],
    "fill-outline-color": trafficEventColor(),
  },
};

export const trafficEventLineLayer: LayerProps = {
  id: "traffic-event-lines",
  type: "line",
  filter: [
    "any",
    ["==", ["geometry-type"], "LineString"],
    ["==", ["geometry-type"], "MultiLineString"],
  ],
  paint: {
    "line-color": trafficEventColor(),
    "line-width": ["interpolate", ["linear"], ["zoom"], 7, 2, 13, 6],
    "line-opacity": ["case", ["==", ["get", "status"], "UPCOMING"], 0.55, 0.9],
  },
};

export const trafficEventPointLayer: LayerProps = {
  id: "traffic-event-points",
  type: "circle",
  filter: ["==", ["geometry-type"], "Point"],
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 10, 13, 15],
    "circle-color": trafficEventColor(),
    "circle-opacity": [
      "case",
      ["==", ["get", "status"], "UPCOMING"],
      0.08,
      0.13,
    ],
    "circle-stroke-color": trafficEventColor(),
    "circle-stroke-opacity": 0.3,
    "circle-stroke-width": 1,
  },
};
