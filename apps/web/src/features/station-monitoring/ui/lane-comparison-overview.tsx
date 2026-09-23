import type { LaneComparison } from "../model/lane-imbalance";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value);

export function LaneComparisonOverview({
  comparisons,
  timeZone,
  onInspect,
}: {
  comparisons: LaneComparison[];
  timeZone: string;
  onInspect: () => void;
}) {
  const hasNotableDifference = comparisons.some(
    (comparison) => comparison.isNotable,
  );
  const notableCount = comparisons.filter(
    (comparison) => comparison.isNotable,
  ).length;

  return (
    <section
      aria-labelledby="lane-comparison-title"
      className={`overflow-hidden rounded-[20px] border shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] ${
        hasNotableDifference
          ? "border-amber-200 bg-white dark:border-amber-900 dark:bg-slate-900"
          : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div
        className={`flex items-start gap-3 px-4 py-4 ${
          hasNotableDifference
            ? "bg-amber-50 dark:bg-amber-950/35"
            : "bg-emerald-50/70 dark:bg-emerald-950/25"
        }`}
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full text-base font-bold ${
            hasNotableDifference
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
          }`}
          aria-hidden="true"
        >
          {hasNotableDifference ? "!" : "✓"}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="lane-comparison-title"
            className="text-sm font-semibold text-slate-950 dark:text-white"
          >
            {hasNotableDifference
              ? `${notableCount} şerit diğerlerinden yavaş`
              : "Şerit hızları dengeli görünüyor"}
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-slate-600 dark:text-slate-300">
            {hasNotableDifference
              ? "Aynı yöndeki şeritlerin anlık hızları arasında belirgin fark var."
              : "Aynı yöndeki şeritlerde belirgin bir anlık hız farkı bulunmuyor."}
          </p>
        </div>
      </div>

      {!hasNotableDifference && comparisons.length > 0 ? (
        <p className="px-4 pt-3 text-[10px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
          Yönlere göre en yakın fark
        </p>
      ) : null}
      <ul className="divide-y divide-slate-100 px-4 dark:divide-slate-800">
        {comparisons.map((comparison) => {
          const peerLabel = comparison.peerLanes
            .map((lane) => `Şerit ${lane}`)
            .join(", ");
          const measuredAt = new Intl.DateTimeFormat("tr-TR", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone,
          }).format(new Date(comparison.measuredAt));

          return (
            <li
              key={`${comparison.direction}-${comparison.lane}`}
              className="py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Yön {comparison.direction} · Şerit {comparison.lane}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {comparison.isNotable
                      ? `Komşularından yaklaşık %${comparison.slowerPercent} daha yavaş`
                      : `Komşularına göre en çok ayrışan şerit bu — %${comparison.slowerPercent} fark, dikkat çekici eşiğin altında`}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {peerLabel} ile karşılaştırıldı · {measuredAt}
                  </p>
                </div>
                {comparison.isNotable ? (
                  <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                    −%{comparison.slowerPercent}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-center text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    %{comparison.slowerPercent}
                    <span className="block text-[9px] text-slate-400">
                      eşik altı
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-950">
                  <span className="block text-slate-400">Bu şerit</span>
                  <strong className="mt-0.5 block text-xs text-slate-800 dark:text-slate-200">
                    {formatNumber(comparison.speedKmh)} km/sa
                  </strong>
                  <span className="text-slate-500">
                    {formatNumber(comparison.flowVehiclesPerHour)} araç/sa
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-950">
                  <span className="block text-slate-400">Diğer şeritler</span>
                  <strong className="mt-0.5 block text-xs text-slate-800 dark:text-slate-200">
                    {formatNumber(comparison.referenceSpeedKmh)} km/sa
                  </strong>
                  <span className="text-slate-500">
                    {formatNumber(comparison.referenceFlowVehiclesPerHour)}{" "}
                    araç/sa
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-[10px] leading-4 text-slate-500 dark:text-slate-400">
          {hasNotableDifference
            ? "Farkın nedeni doğrulanmadı; olası engel veya kısmi kapanma için inceleyin."
            : "Belirgin hız farkı yok. Geçiş oranı bağlam içindir; şeritler normalde eşit kullanılmak zorunda değildir."}
        </p>
        <button
          type="button"
          onClick={onInspect}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-sky-300"
        >
          Şeritleri incele <span aria-hidden="true">↓</span>
        </button>
      </div>
    </section>
  );
}
