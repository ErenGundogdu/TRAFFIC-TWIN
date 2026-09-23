import type { LayerProps } from "react-map-gl/maplibre";

export const trafficHeatmapLayer: LayerProps = {
  id: "traffic-density-heatmap",
  type: "heatmap",
  filter: ["==", ["get", "hasFlow"], true],
  maxzoom: 14,
  paint: {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "totalFlowVehiclesPerHour"],
      0,
      0,
      3_000,
      1,
    ],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 1, 13, 2.6],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 24, 13, 72],
    "heatmap-opacity": 0.86,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(14,165,233,0)",
      0.2,
      "#38bdf8",
      0.45,
      "#22c55e",
      0.7,
      "#f59e0b",
      1,
      "#e11d48",
    ],
  },
};

export const trafficDensityGlowLayer: LayerProps = {
  id: "traffic-density-glow",
  type: "circle",
  filter: ["==", ["get", "hasFlow"], true],
  paint: {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "totalFlowVehiclesPerHour"],
      0,
      16,
      3_000,
      38,
    ],
    "circle-color": [
      "step",
      ["get", "totalFlowVehiclesPerHour"],
      "#38bdf8",
      700,
      "#22c55e",
      1_400,
      "#f59e0b",
      2_200,
      "#e11d48",
    ],
    "circle-opacity": 0.2,
    "circle-blur": 0.65,
  },
};

export const roadFlowCasingLayer: LayerProps = {
  id: "traffic-road-flow-casing",
  type: "line",
  paint: {
    "line-color": [
      "match",
      ["get", "direction"],
      1,
      "#0284c7",
      2,
      "#7c3aed",
      "#64748b",
    ],
    "line-opacity": 0.95,
    "line-width": [
      "interpolate",
      ["linear"],
      ["get", "flowVehiclesPerHour"],
      0,
      7,
      2_000,
      14,
    ],
  },
};

export const roadFlowLayer: LayerProps = {
  id: "traffic-road-flow",
  type: "line",
  paint: {
    "line-color": [
      "match",
      ["get", "trafficFlowStatus"],
      "FREE_FLOW",
      "#10b981",
      "PLATOONING",
      "#84cc16",
      "SLOW",
      "#f59e0b",
      "QUEUING",
      "#f97316",
      "STATIONARY",
      "#e11d48",
      "#64748b",
    ],
    "line-opacity": 0.92,
    "line-width": [
      "interpolate",
      ["linear"],
      ["get", "flowVehiclesPerHour"],
      0,
      4,
      2_000,
      11,
    ],
  },
};

export const roadFlowArrowLayer = {
  id: "traffic-road-flow-arrows",
  type: "symbol",
  filter: ["!=", ["get", "direction"], 0],
  layout: {
    "symbol-placement": "line",
    "symbol-spacing": 90,
    "text-field": ["concat", ["get", "directionLabel"], "  ▶"],
    "text-size": 12,
    "text-font": ["Noto Sans Bold"],
    "text-rotation-alignment": "map",
    "text-keep-upright": false,
  },
  paint: {
    "text-color": [
      "match",
      ["get", "direction"],
      1,
      "#0284c7",
      2,
      "#7c3aed",
      "#475569",
    ],
    "text-halo-color": "#ffffff",
    "text-halo-width": 2,
  },
} satisfies LayerProps;

export const trafficVolumeLayer: LayerProps = {
  id: "traffic-volume-columns",
  type: "fill-extrusion",
  paint: {
    "fill-extrusion-height": ["get", "heightMeters"],
    // Animates column height when the source refreshes (live poll or
    // realtime update) instead of snapping instantly to the new value.
    "fill-extrusion-height-transition": { duration: 800, delay: 0 },
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.84,
    "fill-extrusion-color": [
      "interpolate",
      ["linear"],
      ["get", "relativeFlowPercent"],
      0,
      "#38bdf8",
      25,
      "#22c55e",
      50,
      "#f59e0b",
      75,
      "#e11d48",
    ],
    "fill-extrusion-color-transition": { duration: 800, delay: 0 },
  },
};
