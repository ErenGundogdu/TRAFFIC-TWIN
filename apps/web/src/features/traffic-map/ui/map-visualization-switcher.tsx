import type { MapVisualizationMode } from "../model/map-visualization-mode";
import { SegmentedControl } from "@/shared/ui";

const modes: Array<{ value: MapVisualizationMode; label: string }> = [
  { value: "overview", label: "Isı haritası" },
  { value: "flow", label: "Yol akışı" },
  { value: "volume-3d", label: "3B hacim" },
];

export function MapVisualizationSwitcher({
  value,
  onChange,
}: {
  value: MapVisualizationMode;
  onChange: (value: MapVisualizationMode) => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-10 rounded-xl bg-white/90 shadow-lg backdrop-blur dark:bg-slate-900/90">
      <SegmentedControl
        label="Harita görünümü"
        value={value}
        options={modes}
        onChange={onChange}
        size="small"
      />
    </div>
  );
}
