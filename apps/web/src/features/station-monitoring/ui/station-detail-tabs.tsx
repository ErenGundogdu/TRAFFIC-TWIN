import {
  stationDetailViews,
  type StationDetailView,
} from "../model/station-detail-view";

export function StationDetailTabs({
  value,
  onChange,
}: {
  value: StationDetailView;
  onChange: (view: StationDetailView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="İstasyon detay bölümleri"
      className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
    >
      {stationDetailViews.map((view) => (
        <button
          key={view.value}
          id={`station-detail-tab-${view.value}`}
          type="button"
          role="tab"
          aria-selected={value === view.value}
          aria-controls={`station-detail-panel-${view.value}`}
          onClick={() => onChange(view.value)}
          className={`min-w-0 rounded-lg px-1.5 py-2 text-[11px] font-semibold transition ${
            value === view.value
              ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
