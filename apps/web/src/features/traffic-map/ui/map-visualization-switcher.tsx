import type { MapVisualizationMode } from "../model/map-visualization-mode";

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
    <div
      role="group"
      aria-label="Harita görünümü"
      className="absolute top-4 right-4 z-10 flex rounded-xl border border-white/70 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={value === mode.value}
          onClick={() => onChange(mode.value)}
          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            value === mode.value
              ? "bg-slate-950 text-white dark:bg-sky-700"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
