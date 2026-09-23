import type { JunctionSummary } from "@traffic-twin/contracts";

const coverageContent = {
  FULL: {
    label: "Tam kapsama",
    description: "Bilinen yol referansları en az iki sensörle eşleşiyor.",
  },
  PARTIAL: {
    label: "Kısmi kapsama",
    description: "Kavşağın bilinen yollarının yalnızca bir bölümü ölçülüyor.",
  },
  INSUFFICIENT: {
    label: "Yetersiz veri",
    description: "Kavşak için yalnızca bir doğrulanmış sensör eşleşmesi var.",
  },
} as const;

export function JunctionDetailPanel({
  junction,
}: {
  junction: JunctionSummary;
}) {
  const coverage = coverageContent[junction.coverage];

  return (
    <aside className="h-full overflow-y-auto p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-violet-700 uppercase">
        OSM’den türetilmiş kavşak
      </p>
      <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">
        {junction.name}
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        OSM relation/{junction.osmRelationId}
      </p>

      <section className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
        <h3 className="text-sm font-semibold text-violet-950 dark:text-violet-100">
          {coverage.label}
        </h3>
        <p className="mt-1 text-xs leading-5 text-violet-800 dark:text-violet-200">
          {coverage.description}
        </p>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Bağlı fiziksel sensörler
        </h3>
        <ul className="mt-2 space-y-2">
          {junction.sensors.map((sensor) => (
            <li
              key={sensor.assetId}
              className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {sensor.name}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Yol {sensor.roadRef} · {sensor.distanceMeters} m · Güven:{" "}
                {sensor.confidence === "HIGH" ? "yüksek" : "orta"}
                {sensor.bearingDifferenceDegrees === null
                  ? " · Yön bilgisi yok"
                  : ` · Yön farkı ${sensor.bearingDifferenceDegrees}°`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 border-t border-slate-200 pt-5 text-xs dark:border-slate-800">
        <dl>
          <dt className="text-slate-500">Yol referansları</dt>
          <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
            {junction.roadRefs.join(", ") || "Bilinmiyor"}
          </dd>
        </dl>
        <details className="mt-3 text-[11px] text-slate-400">
          <summary className="cursor-pointer font-medium text-slate-500">
            Eşleştirme ayrıntısı
          </summary>
          <p className="mt-1 leading-4">
            OSM yol referansı, mesafe ve yön açısına göre eşleştirildi ·
            Politika {junction.policyVersion}
          </p>
        </details>
      </div>
    </aside>
  );
}
