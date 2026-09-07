import type {
  HistorySummary,
  ResolvedHistoryResolution,
} from "@traffic-twin/contracts";

interface HistorySummaryPanelProps {
  summaries: HistorySummary[];
  resolution: ResolvedHistoryResolution;
  timeZone: string;
}

const resolutionLabels: Record<ResolvedHistoryResolution, string> = {
  minute: "dakika",
  hour: "saat",
  day: "gün",
};

export function HistorySummaryPanel({
  summaries,
  resolution,
  timeZone,
}: HistorySummaryPanelProps) {
  const bucketLabel = resolutionLabels[resolution];

  return (
    <section aria-labelledby="history-summary-title" className="mt-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="history-summary-title" className="text-sm font-semibold">
            Dönem özeti
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Seçilen yöndeki gerçek {bucketLabel} agregalarından sunucuda
            hesaplandı.
          </p>
        </div>
        <span className="text-[10px] text-slate-400">{timeZone}</span>
      </div>

      <div className="mt-2 grid gap-2 2xl:grid-cols-2">
        {summaries.map((summary) => (
          <article
            key={summary.assetId}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-xs font-semibold">
                  {summary.assetName}
                </h4>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Yön {summary.direction} · {summary.bucketCount} {bucketLabel}
                  {summary.bucketCount === 1 ? " dilimi" : " dilimi"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                  summary.bucketCount > 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {summary.bucketCount > 0 ? "Hesaplandı" : "Yetersiz veri"}
              </span>
            </div>

            {summary.bucketCount > 0 ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
                  <MetricCard
                    label="Ağırlıklı ortalama hız"
                    value={formatSpeed(summary.averageSpeedKmh)}
                    detail={`Medyan ${formatSpeed(summary.medianSpeedKmh)}`}
                  />
                  <MetricCard
                    label="Toplam geçiş"
                    value={`${formatInteger(summary.totalVehicleCount)} araç`}
                    detail={`${bucketLabel} başına ${formatNumber(summary.averageVehicleCountPerBucket)}`}
                  />
                  <MetricCard
                    label="En yoğun dilim"
                    value={
                      summary.peakVehicleCount === null
                        ? "Yetersiz veri"
                        : `${formatInteger(summary.peakVehicleCount)} araç`
                    }
                    detail={formatMoment(
                      summary.peakVehicleAt,
                      timeZone,
                      resolution,
                    )}
                  />
                  <MetricCard
                    label="En düşük hız"
                    value={formatSpeed(summary.minimumSpeedKmh)}
                    detail={formatMoment(
                      summary.minimumSpeedAt,
                      timeZone,
                      resolution,
                    )}
                  />
                  <MetricCard
                    label="Hız aralığı"
                    value={`${formatNumber(summary.minimumSpeedKmh)}–${formatNumber(summary.maximumSpeedKmh)}`}
                    detail="km/sa · dilim ortalamaları"
                  />
                  <MetricCard
                    label="Yön dağılımı"
                    value={`${formatPercent(summary.directionDistribution.directionOnePercent)} / ${formatPercent(summary.directionDistribution.directionTwoPercent)}`}
                    detail={`Y1 ${formatInteger(summary.directionDistribution.directionOneVehicleCount)} · Y2 ${formatInteger(summary.directionDistribution.directionTwoVehicleCount)}`}
                  />
                </div>

                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[11px] leading-5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {buildObservation(summary, timeZone, resolution)}
                </p>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  Veri temeli: {formatInteger(summary.sampleCount)} geçerli
                  örnek. Ortalama hız örnek sayısıyla ağırlıklandırılır; medyan,
                  zaman dilimi ortalamalarının medyanıdır.
                </p>
              </>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-xs leading-5 text-slate-500 dark:border-slate-700">
                Bu istasyon, yön ve tarih aralığı için özet hesaplayacak gerçek
                ölçüm bulunmuyor.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-slate-400" title={detail}>
        {detail}
      </p>
    </div>
  );
}

function buildObservation(
  summary: HistorySummary,
  timeZone: string,
  resolution: ResolvedHistoryResolution,
) {
  if (
    summary.peakVehicleCount === null ||
    summary.peakVehicleAt === null ||
    summary.minimumSpeedKmh === null ||
    summary.minimumSpeedAt === null
  ) {
    return "Dönem gözlemi oluşturmak için yeterli veri yok.";
  }

  const speedAtPeak =
    summary.speedAtPeakVehicleCountKmh === null
      ? "hız bilgisi yok"
      : `ölçülen hız ${formatSpeed(summary.speedAtPeakVehicleCountKmh)}`;
  return `En yoğun dilim ${formatMoment(summary.peakVehicleAt, timeZone, resolution)}: ${formatInteger(summary.peakVehicleCount)} araç ve ${speedAtPeak}. En düşük dilim ortalaması ${formatMoment(summary.minimumSpeedAt, timeZone, resolution)} zamanında ${formatSpeed(summary.minimumSpeedKmh)}.`;
}

function formatMoment(
  value: string | null,
  timeZone: string,
  resolution: ResolvedHistoryResolution,
) {
  if (!value) return "Zaman bilgisi yok";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    ...(resolution === "day" ? {} : { timeStyle: "short" as const }),
    timeZone,
  }).format(new Date(value));
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatNumber(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(
        value,
      );
}

function formatSpeed(value: number | null) {
  return value === null ? "Yetersiz veri" : `${formatNumber(value)} km/sa`;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `%${formatNumber(value)}`;
}
