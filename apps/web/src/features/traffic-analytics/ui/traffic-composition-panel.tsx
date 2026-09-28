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
      className="mt-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h5 className="text-xs font-semibold">Araç ve şerit dağılımı</h5>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Ham geçiş kayıtlarından hesaplanan gerçek kompozisyon
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          {formatInteger(composition.classifiedVehicleCount)} sınıflandırılmış
          {composition.classificationCoveragePercent === null
            ? ""
            : ` · ${formatShare(composition.classificationCoveragePercent)} kapsam`}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <CompositionList
          title="Araç sınıfları"
          tone="sky"
          items={[
            ...leadingClasses.map((item) => ({
              key: `class-${item.key}`,
              label: getVehicleClassPresentation(item.key).label,
              value: formatShare(item.sharePercent),
              sharePercent: item.sharePercent,
              detail: `Sınıf ${item.key} · ${formatInteger(item.vehicleCount)} araç · ${formatSpeed(item.averageSpeedKmh)}`,
              description: getVehicleClassPresentation(item.key).description,
            })),
            ...(otherClasses
              ? [
                  {
                    key: "class-other",
                    label: `Diğer sınıflar (${otherClasses.count})`,
                    value: formatShare(otherClasses.sharePercent),
                    sharePercent: otherClasses.sharePercent,
                    detail: `${formatInteger(otherClasses.vehicleCount)} araç`,
                  },
                ]
              : []),
          ]}
        />
        <CompositionList
          title="Şerit kullanımı"
          tone="violet"
          items={[
            ...leadingLanes.map((item) => ({
              key: `lane-${item.key}`,
              label: `Şerit ${item.key}`,
              value: formatShare(item.sharePercent),
              sharePercent: item.sharePercent,
              detail: `${formatInteger(item.vehicleCount)} araç · ${formatSpeed(item.averageSpeedKmh)}`,
            })),
            ...(otherLanes
              ? [
                  {
                    key: "lane-other",
                    label: `Diğer şeritler (${otherLanes.count})`,
                    value: formatShare(otherLanes.sharePercent),
                    sharePercent: otherLanes.sharePercent,
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
            tone="amber"
            items={leadingLaneClasses.map((item) => ({
              key: `lane-class-${item.lane}-${item.vehicleClass}`,
              label: `Şerit ${item.lane} · ${getVehicleClassPresentation(item.vehicleClass).label}`,
              value: formatShare(item.sharePercent),
              sharePercent: item.sharePercent,
              detail: `${formatInteger(item.vehicleCount)} araç · ${formatSpeed(item.averageSpeedKmh)}`,
              description: getVehicleClassPresentation(item.vehicleClass)
                .description,
            }))}
          />
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            Ağır/lojistik araç göstergesi
          </span>
          <span className="shrink-0 text-sm font-bold text-violet-700 tabular-nums dark:text-violet-300">
            {formatShare(composition.freightProxy.sharePercent)} ·{" "}
            {formatInteger(composition.freightProxy.vehicleCount)} araç
          </span>
        </div>
        <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
          Sınıf 2, 4, 5 ve 9 toplamıdır; ithalat veya ihracat miktarı değildir.
        </p>
      </div>
    </section>
  );
}

function CompositionList({
  title,
  items,
  tone,
}: {
  title: string;
  tone: "sky" | "violet" | "amber";
  items: Array<{
    key: string;
    label: string;
    value: string;
    sharePercent: number | null;
    detail: string;
    description?: string;
  }>;
}) {
  const colors = DISTRIBUTION_COLORS[tone];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="px-3 pt-3">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </p>
        <div
          role="img"
          aria-label={`${title} dağılımı`}
          className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          {items.map((item, index) =>
            item.sharePercent === null ? null : (
              <span
                key={item.key}
                className={colors[index % colors.length]}
                style={{
                  width: `${Math.min(100, Math.max(0, item.sharePercent))}%`,
                }}
                title={`${item.label}: ${item.value}`}
              />
            ),
          )}
        </div>
      </div>
      <ul className="mt-2 divide-y divide-slate-100 px-3 dark:divide-slate-800">
        {items.map((item, index) => (
          <li key={item.key} className="py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span
                  aria-hidden="true"
                  className={`mt-1 size-2 shrink-0 rounded-full ${colors[index % colors.length]}`}
                />
                <p
                  className="min-w-0 text-[11px] font-medium leading-4"
                  title={item.description}
                >
                  {item.label}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-900 tabular-nums dark:text-white">
                {item.value}
              </span>
            </div>
            <p
              className="mt-0.5 pl-4 text-[9px] leading-4 text-slate-500"
              title={item.detail}
            >
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DISTRIBUTION_COLORS = {
  sky: [
    "bg-sky-600",
    "bg-sky-500",
    "bg-cyan-400",
    "bg-sky-300",
    "bg-slate-300",
  ],
  violet: [
    "bg-violet-600",
    "bg-violet-500",
    "bg-fuchsia-400",
    "bg-violet-300",
    "bg-slate-300",
  ],
  amber: [
    "bg-amber-600",
    "bg-orange-500",
    "bg-amber-400",
    "bg-orange-300",
    "bg-slate-300",
  ],
} as const;

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
