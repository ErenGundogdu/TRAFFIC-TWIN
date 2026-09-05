import type { StationSummary } from "@traffic-twin/contracts";

interface StationListProps {
  stations: StationSummary[];
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
}

const freshnessLabels = {
  FRESH: "Güncel",
  STALE: "Gecikmiş",
  UNAVAILABLE: "Veri yok",
} as const;

export function StationList({
  stations,
  selectedStationId,
  onSelect,
}: StationListProps) {
  return (
    <section
      className="flex min-h-0 flex-col"
      aria-labelledby="station-list-title"
    >
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="station-list-title"
            className="font-semibold text-slate-900 dark:text-slate-100"
          >
            Ölçüm istasyonları
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {stations.length}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Harita veya listeden bir istasyon seçin.
        </p>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {stations.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-300 p-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Bu kapsama alanında izlenebilir ölçüm istasyonu bulunamadı.
          </li>
        ) : null}
        {stations.map((station) => {
          const selected = station.id === selectedStationId;

          return (
            <li key={station.id}>
              <button
                type="button"
                onClick={() => onSelect(station.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selected
                    ? "border-sky-300 bg-sky-50 shadow-sm dark:border-sky-700 dark:bg-sky-950"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                }`}
                aria-pressed={selected}
              >
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {station.name}
                </span>
                <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>TMS {station.tmsNumber}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        station.freshness === "FRESH"
                          ? "bg-emerald-500"
                          : station.freshness === "STALE"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                      }`}
                      aria-hidden="true"
                    />
                    {freshnessLabels[station.freshness]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
