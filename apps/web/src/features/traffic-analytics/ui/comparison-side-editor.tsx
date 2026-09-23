import type { StationCatalogResponse } from "@traffic-twin/contracts";

import { formatTrafficDirectionLabel } from "@/shared/traffic";

import type { ComparisonSide } from "../lib/independent-comparison";

interface Props {
  label: string;
  side: ComparisonSide;
  catalog: StationCatalogResponse;
  onChange: (patch: Partial<ComparisonSide>) => void;
}

export function ComparisonSideEditor({
  label,
  side,
  catalog,
  onChange,
}: Props) {
  const station = catalog.stations.find((item) => item.id === side.assetId);
  const directionOne = station?.directions.find((item) => item.direction === 1);
  const directionTwo = station?.directions.find((item) => item.direction === 2);

  return (
    <fieldset className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <legend className="px-1 text-xs font-semibold">{label}</legend>
      <label className="block text-xs">
        İstasyon
        <select
          aria-label={`${label} istasyon`}
          value={side.assetId}
          onChange={(event) => onChange({ assetId: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
        >
          {catalog.stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name} · TMS {station.tmsNumber}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          Zaman
          <select
            aria-label={`${label} zaman`}
            value={side.period}
            onChange={(event) =>
              onChange({
                period: event.target.value as ComparisonSide["period"],
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="live">Şimdi · canlı</option>
            <option value="historical">Geçmiş dönem</option>
          </select>
        </label>
        <label className="text-xs">
          Yön
          <select
            aria-label={`${label} yön`}
            value={side.direction}
            onChange={(event) =>
              onChange({
                direction: event.target.value as ComparisonSide["direction"],
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="1">
              {directionOne
                ? formatTrafficDirectionLabel(directionOne)
                : "Yön 1 · yön bilgisi yok"}
            </option>
            <option value="2">
              {directionTwo
                ? formatTrafficDirectionLabel(directionTwo)
                : "Yön 2 · yön bilgisi yok"}
            </option>
          </select>
        </label>
      </div>
      {side.period === "historical" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            Başlangıç
            <input
              aria-label={`${label} başlangıç`}
              type="date"
              value={side.fromDate}
              onChange={(event) => onChange({ fromDate: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="text-xs">
            Bitiş
            <input
              aria-label={`${label} bitiş`}
              type="date"
              value={side.toDate}
              onChange={(event) => onChange({ toDate: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="col-span-2 text-xs">
            Çözünürlük
            <select
              aria-label={`${label} çözünürlük`}
              value={side.resolution}
              onChange={(event) =>
                onChange({
                  resolution: event.target
                    .value as ComparisonSide["resolution"],
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="auto">Otomatik</option>
              <option value="minute">Dakika</option>
              <option value="hour">Saat</option>
              <option value="day">Gün</option>
            </select>
          </label>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          En son gerçek ölçüm; veri tazeliği sonuçta denetlenir.
        </p>
      )}
    </fieldset>
  );
}
