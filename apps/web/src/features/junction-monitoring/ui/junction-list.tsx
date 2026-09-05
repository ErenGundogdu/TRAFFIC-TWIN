import type { JunctionSummary } from "@traffic-twin/contracts";

interface JunctionListProps {
  junctions: JunctionSummary[];
  selectedJunctionId: string | null;
  onSelect: (junctionId: string) => void;
}

const coverageLabels = {
  FULL: "Tam kapsama",
  PARTIAL: "Kısmi",
  INSUFFICIENT: "Yetersiz",
} as const;

export function JunctionList({
  junctions,
  selectedJunctionId,
  onSelect,
}: JunctionListProps) {
  return (
    <section className="border-b border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2 px-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Doğrulanmış kavşaklar
        </h2>
        <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
          {junctions.length}
        </span>
      </div>
      {junctions.length === 0 ? (
        <p className="px-2 pt-2 text-xs leading-5 text-slate-500">
          Bu kapsama alanında henüz eşleştirilmiş kavşak yok.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {junctions.map((junction) => (
            <li key={junction.id}>
              <button
                type="button"
                onClick={() => onSelect(junction.id)}
                aria-pressed={junction.id === selectedJunctionId}
                className={`w-full rounded-xl border px-3 py-2 text-left ${
                  junction.id === selectedJunctionId
                    ? "border-violet-300 bg-violet-50"
                    : "border-transparent hover:border-slate-200"
                }`}
              >
                <span className="block text-sm font-medium text-slate-900">
                  {junction.name}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {coverageLabels[junction.coverage]} ·{" "}
                  {junction.sensors.length} sensör
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
