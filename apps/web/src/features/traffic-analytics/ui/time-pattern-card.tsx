import type { HistoryResponse } from "@traffic-twin/contracts";

import { createTimePattern } from "../lib/time-pattern";

const dayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const hours = Array.from({ length: 24 }, (_, index) => index);

export function TimePatternCard({ history }: { history: HistoryResponse }) {
  const pattern = createTimePattern(history);
  const metricLabel =
    history.query.metric === "average-speed-kmh"
      ? "Ortalama hız"
      : "Araç hacmi";
  const unit = history.query.metric === "average-speed-kmh" ? "km/sa" : "araç";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-amber-600 uppercase dark:text-amber-300">
            Zaman deseni
          </p>
          <h2 className="mt-1 text-sm font-semibold">Gün–saat matrisi</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {metricLabel}, seçili ana istasyon · {history.timeZone}
          </p>
        </div>
        {pattern ? (
          <div className="text-right text-[10px] text-slate-500">
            <p>{pattern.populatedCellCount} dolu hücre</p>
            <p className="mt-0.5">
              {formatNumber(pattern.minimum)}–{formatNumber(pattern.maximum)}{" "}
              {unit}
            </p>
          </div>
        ) : null}
      </div>

      {!pattern ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-950">
          {history.resolution === "day"
            ? "Günlük çözünürlük saat bilgisini korumaz. Gün–saat desenini görmek için dakika veya saat çözünürlüğü seçin."
            : "Bu seçimde zaman deseni oluşturacak gerçek ölçüm bulunmuyor."}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[38px_repeat(24,minmax(22px,1fr))] gap-1">
              <span />
              {hours.map((hour) => (
                <span
                  key={hour}
                  className="text-center text-[9px] text-slate-400"
                >
                  {hour % 3 === 0 ? hour.toString().padStart(2, "0") : ""}
                </span>
              ))}
              {dayLabels.flatMap((day, dayIndex) => [
                <span
                  key={`${day}-label`}
                  className="flex items-center text-[10px] font-medium text-slate-500"
                >
                  {day}
                </span>,
                ...hours.map((hour) => {
                  const cell = pattern.cells.find(
                    (item) => item.dayIndex === dayIndex && item.hour === hour,
                  );
                  return (
                    <span
                      key={`${day}-${hour}`}
                      className="aspect-square rounded-[5px] border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      style={
                        cell
                          ? {
                              backgroundColor: `color-mix(in srgb, ${history.query.metric === "average-speed-kmh" ? "#0ea5e9" : "#7c3aed"} ${Math.round(22 + cell.intensity * 78)}%, transparent)`,
                            }
                          : undefined
                      }
                      title={
                        cell
                          ? `${day} ${hour.toString().padStart(2, "0")}:00 · ${formatNumber(cell.value)} ${unit} · ${cell.sampleCount} ölçüm dilimi`
                          : `${day} ${hour.toString().padStart(2, "0")}:00 · veri yok`
                      }
                      aria-label={
                        cell
                          ? `${day} saat ${hour}, ${formatNumber(cell.value)} ${unit}`
                          : `${day} saat ${hour}, veri yok`
                      }
                    />
                  );
                }),
              ])}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-slate-400">
              <span>Düşük</span>
              {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                <span
                  key={opacity}
                  className="size-3 rounded-[3px]"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${history.query.metric === "average-speed-kmh" ? "#0ea5e9" : "#7c3aed"} ${opacity * 100}%, transparent)`,
                  }}
                />
              ))}
              <span>Yüksek</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(
    value,
  );
}
