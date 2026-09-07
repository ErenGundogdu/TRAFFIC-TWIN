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
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.7, 13, 1.8],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 13, 42],
    "heatmap-opacity": 0.72,
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

export const roadFlowCasingLayer: LayerProps = {
  id: "traffic-road-flow-casing",
  type: "line",
  paint: {
    "line-color": "#ffffff",
    "line-opacity": 0.9,
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
      "case",
      ["==", ["get", "hasMeasurement"], false],
      "#64748b",
      ["step", ["get", "speedKmh"], "#e11d48", 45, "#f59e0b", 70, "#10b981"],
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

export const roadFlowArrowLayer: LayerProps = {
  id: "traffic-road-flow-arrows",
  type: "symbol",
  filter: ["!=", ["get", "direction"], 0],
  layout: {
    "symbol-placement": "line",
    "symbol-spacing": 90,
    "text-field": "▶",
    "text-size": 13,
    "text-rotation-alignment": "map",
    "text-keep-upright": false,
  },
  paint: {
    "text-color": "#ffffff",
    "text-halo-color": "#0f172a",
    "text-halo-width": 1,
  },
};

export const trafficVolumeLayer: LayerProps = {
  id: "traffic-volume-columns",
  type: "fill-extrusion",
  paint: {
    "fill-extrusion-height": ["get", "heightMeters"],
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.84,
    "fill-extrusion-color": [
      "step",
      ["get", "relativeFlowPercent"],
      "#38bdf8",
      25,
      "#22c55e",
      50,
      "#f59e0b",
      75,
      "#e11d48",
    ],
  },
};
