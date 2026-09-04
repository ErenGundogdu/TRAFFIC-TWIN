import type { StationSummary } from "@traffic-twin/contracts";

interface StationDetailPanelProps {
  station: StationSummary | null;
  timeZone: string;
}

function formatMeasurementTime(value: string | null, timeZone: string) {
  if (!value) {
    return "Ölçüm yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone,
  }).format(new Date(value));
}

function formatMetric(value: number | null, unit: string) {
  return value === null
    ? "Veri yok"
    : `${value.toLocaleString("tr-TR")} ${unit}`;
}

export function StationDetailPanel({
  station,
  timeZone,
}: StationDetailPanelProps) {
  if (!station) {
    return (
      <aside className="flex h-full items-center justify-center p-7 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-xl">
            ↖
          </span>
          <h2 className="mt-4 font-semibold text-slate-900">
            İstasyon seçilmedi
          </h2>
          <p className="mt-2 max-w-56 text-sm leading-6 text-slate-500">
            Gerçek hız ve hacim ölçümlerini incelemek için haritadaki bir
            noktayı seçin.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="h-full overflow-y-auto p-5"
      aria-labelledby="station-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-sky-700 uppercase">
            Sensör istasyonu
          </p>
          <h2
            id="station-title"
            className="mt-2 break-words text-lg font-semibold text-slate-950"
          >
            {station.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            TMS {station.tmsNumber} · Fintraffic
          </p>
        </div>
        <span
          className={`mt-1 size-3 shrink-0 rounded-full ${
            station.freshness === "FRESH"
              ? "bg-emerald-500"
              : station.freshness === "STALE"
                ? "bg-amber-500"
                : "bg-slate-400"
          }`}
          title={station.freshness}
        />
      </div>

      <div className="mt-5 space-y-3">
        {station.directions.map((direction) => (
          <section
            key={direction.direction}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-800">
                {direction.label}
              </h3>
              <span className="text-[11px] font-medium text-slate-400">
                Son 5 dk · kayan
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-sky-50 p-3">
                <dt className="text-[11px] font-medium text-sky-700">
                  Ortalama hız
                </dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">
                  {formatMetric(direction.averageSpeedKmh, "km/sa")}
                </dd>
              </div>
              <div className="rounded-xl bg-violet-50 p-3">
                <dt className="text-[11px] font-medium text-violet-700">
                  Trafik hacmi
                </dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">
                  {formatMetric(direction.flowVehiclesPerHour, "araç/sa")}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              Ölçüm: {formatMeasurementTime(direction.measuredAt, timeZone)} ·{" "}
              {timeZone}
            </p>
          </section>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-200 pt-5 text-xs">
        <div>
          <dt className="text-slate-500">Enlem</dt>
          <dd className="mt-1 font-medium text-slate-800">
            {station.latitude.toFixed(6)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Boylam</dt>
          <dd className="mt-1 font-medium text-slate-800">
            {station.longitude.toFixed(6)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
