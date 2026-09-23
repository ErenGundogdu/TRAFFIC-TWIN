import type {
  TrafficCompositionDimension,
  TrafficCompositionSummary,
} from "@traffic-twin/contracts";

import { getVehicleClassPresentation } from "../lib/vehicle-class-presentation";

function withRemainder<T extends TrafficCompositionDimension>(
  sorted: T[],
  limit: number,
) {
  const leading = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  if (rest.length === 0) {
    return { leading, remainder: null };
  }

  const vehicleCount = rest.reduce(
    (total, item) => total + item.vehicleCount,
    0,
  );
  const sharePercent = rest.some((item) => item.sharePercent === null)
    ? null
    : rest.reduce((total, item) => total + item.sharePercent!, 0);
  return {
    leading,
    remainder: { count: rest.length, vehicleCount, sharePercent },
  };
}

interface TrafficCompositionPanelProps {
  composition: TrafficCompositionSummary;
}

export function TrafficCompositionPanel({
  composition,
}: TrafficCompositionPanelProps) {
  if (composition.classifiedVehicleCount === 0) return null;

  const { leading: leadingClasses, remainder: otherClasses } = withRemainder(
    [...composition.vehicleClasses].sort(
      (left, right) => right.vehicleCount - left.vehicleCount,
    ),
    5,
  );
  const { leading: leadingLanes, remainder: otherLanes } = withRemainder(
    [...composition.lanes].sort(
      (left, right) => right.vehicleCount - left.vehicleCount,
    ),
    4,
  );
  const leadingLaneClasses = [...composition.laneVehicleClasses]
    .sort((left, right) => right.vehicleCount - left.vehicleCount)
    .slice(0, 4);

  return (
    <section
      aria-label="Araç ve şerit dağılımı"
      className="mt-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h5 className="text-[11px] font-semibold">Araç ve şerit dağılımı</h5>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Ham geçiş kayıtlarından hesaplanan gerçek kompozisyon
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          {formatInteger(composition.classifiedVehicleCount)} sınıflandırılmış
          {composition.classificationCoveragePercent === null
            ? ""
            : ` · ${formatShare(composition.classificationCoveragePercent)} kapsam`}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <CompositionList
          title="Araç sınıfları"
          items={[
            ...leadingClasses.map((item) => ({
              key: `class-${item.key}`,
              label: getVehicleClassPresentation(item.key).label,
              value: formatShare(item.sharePercent),
              detail: `Sınıf ${item.key} · ${formatInteger(item.vehicleCount)} araç · ${formatSpeed(item.averageSpeedKmh)}`,
              description: getVehicleClassPresentation(item.key).description,
            })),
            ...(otherClasses
              ? [
                  {
                    key: "class-other",
                    label: `Diğer sınıflar (${otherClasses.count})`,
                    value: formatShare(otherClasses.sharePercent),
                    detail: `${formatInteger(otherClasses.vehicleCount)} araç`,
                  },
                ]
              : []),
          ]}
        />
        <CompositionList
          title="Şerit kullanımı"
          items={[
            ...leadingLanes.map((item) => ({
              key: `lane-${item.key}`,
              label: `Şerit ${item.key}`,
              value: formatShare(item.sharePercent),
              detail: `${formatInteger(item.vehicleCount)} araç · ${formatSpeed(item.averageSpeedKmh)}`,
            })),
            ...(otherLanes
              ? [
                  {
                    key: "lane-other",
                    label: `Diğer şeritler (${otherLanes.count})`,
                    value: formatShare(otherLanes.sharePercent),
                    detail: `${formatInteger(otherLanes.vehicleCount)} araç`,
                  },
                ]
              : []),
          ]}
        />
      </div>

      {leadingLaneClasses.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <CompositionList
            title="Öne çıkan şerit × araç eşleşmeleri"
            items={leadingLaneClasses.map((item) => ({
              key: `lane-class-${item.lane}-${item.vehicleClass}`,
              label: `Şerit ${item.lane} · ${getVehicleClassPresentation(item.vehicleClass).label}`,
              value: formatShare(item.sharePercent),
              detail: `${formatInteger(item.vehicleCount)} araç · ${formatSpeed(item.averageSpeedKmh)}`,
              description: getVehicleClassPresentation(item.vehicleClass)
                .description,
            }))}
          />
        </div>
      ) : null}

      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Ağır/lojistik araç göstergesi:{" "}
        {formatShare(composition.freightProxy.sharePercent)}
        {" · "}
        {formatInteger(composition.freightProxy.vehicleCount)} araç. Bu değer
        sınıf 2, 4, 5 ve 9 toplamıdır; ithalat veya ihracat miktarı değildir.
      </div>
    </section>
  );
}

function CompositionList({
  title,
  items,
}: {
  title: string;
  items: Array<{
    key: string;
    label: string;
    value: string;
    detail: string;
    description?: string;
  }>;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-500">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium" title={item.description}>
                {item.label}
              </p>
              <p
                className="truncate text-[9px] text-slate-400"
                title={item.detail}
              >
                {item.detail}
              </p>
            </div>
            <span className="text-[11px] font-semibold">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatShare(value: number | null) {
  return value === null ? "—" : `%${formatNumber(value)}`;
}

function formatSpeed(value: number | null) {
  return value === null ? "hız yok" : `${formatNumber(value)} km/sa`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(
    value,
  );
}
