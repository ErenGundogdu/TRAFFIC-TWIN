import type { StationSummary } from "@traffic-twin/contracts";
import type { ReactNode } from "react";

import { formatTrafficDirectionLabel } from "@/shared/traffic";

interface StationDetailPanelProps {
  station: StationSummary | null;
  timeZone: string;
  footer?: ReactNode;
}

const freshnessLabels = {
  FRESH: "Güncel",
  STALE: "Gecikmeli",
  OUTDATED: "Eski veri",
  UNAVAILABLE: "Veri yok",
} as const;

const flowStatusPresentation = {
  FREE_FLOW: {
    label: "Akıcı",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  PLATOONING: {
    label: "Yoğun akış",
    className: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200",
  },
  SLOW: {
    label: "Yavaş",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
  QUEUING: {
    label: "Kuyruklanma",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  },
  STATIONARY: {
    label: "Durma noktasında",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  },
  INSUFFICIENT_DATA: {
    label: "Yetersiz veri",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
} as const;

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

function formatPercentage(value: number | null) {
  return value === null ? "Hesaplanamadı" : `%${value.toLocaleString("tr-TR")}`;
}

export function StationDetailPanel({
  station,
  timeZone,
  footer,
}: StationDetailPanelProps) {
  if (!station) {
    return (
      <aside className="flex h-full items-center justify-center p-7 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-xl">
            ↖
          </span>
          <h2 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">
            İstasyon seçilmedi
          </h2>
          <p className="mt-2 max-w-56 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Gerçek hız ve geçiş oranını incelemek için haritadaki bir noktayı
            seçin.
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
            className="mt-2 break-words text-lg font-semibold text-slate-950 dark:text-slate-50"
          >
            {station.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            TMS {station.tmsNumber} · Fintraffic
          </p>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span
            className={`size-2.5 rounded-full ${
              station.freshness === "FRESH"
                ? "bg-emerald-500"
                : station.freshness === "STALE"
                  ? "bg-amber-500"
                  : station.freshness === "OUTDATED"
                    ? "bg-rose-500"
                    : "bg-slate-400"
            }`}
            aria-hidden="true"
          />
          {freshnessLabels[station.freshness]}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {station.directions.map((direction) => (
          <section
            key={direction.direction}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatTrafficDirectionLabel(direction)}
              </h3>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${flowStatusPresentation[direction.trafficFlow.status].className}`}
                >
                  {flowStatusPresentation[direction.trafficFlow.status].label}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  5 dk. kayan pencere
                </span>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-sky-50 p-3 dark:bg-sky-950">
                <dt className="text-[11px] font-medium text-sky-700">
                  Ortalama hız
                </dt>
                <dd className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
                  {formatMetric(direction.averageSpeedKmh, "km/sa")}
                </dd>
              </div>
              <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-950">
                <dt className="text-[11px] font-medium text-violet-700">
                  Geçiş oranı
                </dt>
                <dd className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
                  {formatMetric(direction.flowVehiclesPerHour, "araç/sa")}
                </dd>
                <p className="mt-1 text-[10px] leading-4 text-violet-600 dark:text-violet-300">
                  Son 5 dk. temposunun saatlik karşılığı
                </p>
              </div>
            </dl>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
              <div>
                <dt className="text-slate-500">Serbest akışa göre hız</dt>
                <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                  {formatPercentage(
                    direction.trafficFlow.speedPercentOfFreeFlow,
                  )}
                </dd>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Referans:{" "}
                  {formatMetric(
                    direction.trafficFlow.freeFlowSpeedKmh,
                    "km/sa",
                  )}
                </p>
              </div>
              <div>
                <dt className="text-slate-500">Kapasite kullanımı</dt>
                <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                  {formatPercentage(
                    direction.trafficFlow.flowPercentOfCapacity,
                  )}
                </dd>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Referans:{" "}
                  {formatMetric(
                    direction.trafficFlow.maximumFlowVehiclesPerHour,
                    "araç/sa",
                  )}
                </p>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              Ölçüm: {formatMeasurementTime(direction.measuredAt, timeZone)} ·{" "}
              {timeZone}
            </p>
          </section>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-200 pt-5 text-xs dark:border-slate-800">
        <div>
          <dt className="text-slate-500">Enlem</dt>
          <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
            {station.latitude.toFixed(6)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Boylam</dt>
          <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
            {station.longitude.toFixed(6)}
          </dd>
        </div>
      </dl>
      {footer}
    </aside>
  );
}
