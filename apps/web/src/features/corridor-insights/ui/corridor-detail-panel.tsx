import type { CorridorSummary, StationSummary } from "@traffic-twin/contracts";

const freshnessDot = {
  FRESH: "bg-emerald-500",
  STALE: "bg-amber-500",
  OUTDATED: "bg-rose-500",
  UNAVAILABLE: "bg-slate-400",
} as const;

export function CorridorDetailPanel({
  corridor,
  stations,
  onSelectStation,
}: {
  corridor: CorridorSummary;
  stations: StationSummary[];
  onSelectStation: (stationId: string) => void;
}) {
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const members = corridor.stationIds
    .map((stationId) => stationById.get(stationId))
    .filter((station): station is StationSummary => station !== undefined);
  const freshCount = members.filter(
    (station) => station.freshness === "FRESH",
  ).length;

  return (
    <aside className="h-full overflow-y-auto p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-amber-700 uppercase dark:text-amber-400">
        Koridor
      </p>
      <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">
        Yol {corridor.roadRef} koridoru
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {members.length} doğrulanmış istasyon · {freshCount} güncel
      </p>

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Koridordaki istasyonlar
        </h3>
        <ul className="mt-2 space-y-2">
          {members.map((station) => (
            <li key={station.id}>
              <button
                type="button"
                onClick={() => onSelectStation(station.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-amber-300 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-700 dark:hover:bg-amber-950"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {station.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    TMS {station.tmsNumber}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span
                    className={`size-2 rounded-full ${freshnessDot[station.freshness]}`}
                    aria-hidden="true"
                  />
                  İncele →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 border-t border-slate-200 pt-5 text-xs dark:border-slate-800">
        <details className="text-[11px] text-slate-400">
          <summary className="cursor-pointer font-medium text-slate-500">
            Eşleştirme ayrıntısı
          </summary>
          <p className="mt-1 leading-4">
            Aynı doğrulanmış OSM yol referansına ({corridor.roadRef}) sahip, en
            az 3 istasyon bir araya getirildi.
          </p>
        </details>
      </div>
    </aside>
  );
}
