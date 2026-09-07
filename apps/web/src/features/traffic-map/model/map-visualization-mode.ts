export const mapVisualizationModes = ["overview", "flow", "volume-3d"] as const;
export type MapVisualizationMode = (typeof mapVisualizationModes)[number];
