import type { TrafficDirection } from "@traffic-twin/contracts";

import { formatTrafficDirectionLabel } from "@/shared/traffic";

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
  if (!value) return "Ölçüm yok";
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

export function StationDirectionCard({
  direction,
  timeZone,
}: {
  direction: TrafficDirection;
  timeZone: string;
}) {
  const status = flowStatusPresentation[direction.trafficFlow.status];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatTrafficDirectionLabel(direction)}
          </h3>
          <p className="mt-1 text-[10px] text-slate-400">5 dk. kayan pencere</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-sky-50 p-3 dark:bg-sky-950">
          <dt className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
            Ortalama hız
          </dt>
          <dd className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            {formatMetric(direction.averageSpeedKmh, "km/sa")}
          </dd>
        </div>
        <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-950">
          <dt className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
            Geçiş oranı
          </dt>
          <dd className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            {formatMetric(direction.flowVehiclesPerHour, "araç/sa")}
          </dd>
          <p className="mt-1 text-[9px] leading-3.5 text-violet-600 dark:text-violet-300">
            5 dk. temposunun saatlik karşılığı
          </p>
        </div>
      </dl>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
        <div>
          <dt className="text-slate-500">Serbest akışa göre hız</dt>
          <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
            {formatPercentage(direction.trafficFlow.speedPercentOfFreeFlow)}
          </dd>
          <p className="mt-0.5 text-[9px] text-slate-400">
            Referans:{" "}
            {formatMetric(direction.trafficFlow.freeFlowSpeedKmh, "km/sa")}
          </p>
        </div>
        <div>
          <dt className="text-slate-500">Kapasite kullanımı</dt>
          <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
            {formatPercentage(direction.trafficFlow.flowPercentOfCapacity)}
          </dd>
          <p className="mt-0.5 text-[9px] text-slate-400">
            Referans:{" "}
            {formatMetric(
              direction.trafficFlow.maximumFlowVehiclesPerHour,
              "araç/sa",
            )}
          </p>
        </div>
      </dl>
      <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-500 dark:border-slate-800">
        Ölçüm: {formatMeasurementTime(direction.measuredAt, timeZone)} ·{" "}
        {timeZone}
      </p>
    </section>
  );
}
