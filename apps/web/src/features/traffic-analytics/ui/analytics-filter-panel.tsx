import type {
  HistoryAssetAvailability,
  StationCatalogResponse,
} from "@traffic-twin/contracts";
import type { ReactNode } from "react";
import type { UseFormRegisterReturn, UseFormReturn } from "react-hook-form";

import { formatTrafficDirectionLabel } from "@/shared/traffic";

import {
  inclusiveDayCount,
  type AnalyticsFilterValues,
} from "../lib/analytics-filters";
import { formatStationDirectionLabel } from "../lib/direction-series-labels";
import { findAssetAvailability } from "../lib/history-availability";
import { HistoryImportControl } from "./history-import-control";

interface AnalyticsFilterPanelProps {
  catalog: StationCatalogResponse;
  selectedStationId: string;
  availability: HistoryAssetAvailability[];
  availabilityStatus: "loading" | "error" | "ready";
  sharedDates: string[];
  firstSharedDate: string | null;
  lastSharedDate: string | null;
  ignoredParameters: string[];
  form: UseFormReturn<AnalyticsFilterValues>;
  values: AnalyticsFilterValues;
  onSubmit: (values: AnalyticsFilterValues) => void;
  onApplyRange: (days: number) => void;
  onOpenLatest: () => void;
  onReturnLive: () => void;
}

const filterParameterLabels: Record<string, string> = {
  compare: "karşılaştırma istasyonu",
  direction: "yön",
  from: "başlangıç tarihi",
  metric: "metrik",
  resolution: "çözünürlük",
  to: "bitiş tarihi",
};

export function AnalyticsFilterPanel({
  catalog,
  selectedStationId,
  availability,
  availabilityStatus,
  sharedDates,
  firstSharedDate,
  lastSharedDate,
  ignoredParameters,
  form,
  values,
  onSubmit,
  onApplyRange,
  onOpenLatest,
  onReturnLive,
}: AnalyticsFilterPanelProps) {
  const selectedStation = catalog.stations.find(
    (station) => station.id === selectedStationId,
  );
  const comparisonStation = catalog.stations.find(
    (station) => station.id === values.compareAssetId,
  );
  const selectedAvailability = findAssetAvailability(
    availability,
    selectedStationId,
  );
  const availableStationIds = new Set(availability.map((item) => item.assetId));
  const directionNumber = Number(values.direction) as 1 | 2;

  return (
    <aside className="h-fit overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] 2xl:sticky 2xl:top-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="bg-slate-950 px-4 py-4 text-white dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-sky-300 uppercase">
              Seçili istasyon
            </p>
            <h2 className="mt-1 truncate text-base font-semibold tracking-tight">
              {selectedStation?.name ?? selectedStationId}
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              {availabilityLabel(availabilityStatus, selectedAvailability)}
            </p>
          </div>
          <button
            type="button"
            onClick={onReturnLive}
            className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/15"
          >
            Canlıya dön
          </button>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Hızlı dönem
        </p>
        <div
          className="mt-2 grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-950"
          aria-label="Hazır tarih aralıkları"
        >
          {[
            [1, "Son gün"],
            [30, "Son ay"],
            [365, "Son yıl"],
          ].map(([days, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => onApplyRange(Number(days))}
              disabled={
                availabilityStatus === "ready" && sharedDates.length === 0
              }
              className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {label}
            </button>
          ))}
        </div>

        {availabilityStatus === "ready" ? (
          <AvailabilityCard
            sharedDates={sharedDates}
            comparisonEnabled={Boolean(values.compareAssetId)}
            lastSharedDate={lastSharedDate}
            onOpenLatest={onOpenLatest}
          />
        ) : null}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800"
        >
          {ignoredParameters.length > 0 ? (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              Paylaşılan bağlantıdaki geçersiz filtreler uygulanmadı:{" "}
              {ignoredParameters
                .map((parameter) => filterParameterLabels[parameter])
                .join(", ")}
              .
            </p>
          ) : null}

          <fieldset>
            <legend className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Karşılaştırma
            </legend>
            <div className="mt-2">
              <FilterSelect
                label="İkinci istasyon"
                registration={form.register("compareAssetId")}
              >
                <option value="">Karşılaştırma yok</option>
                {[...catalog.stations]
                  .filter((station) => station.id !== selectedStationId)
                  .sort(
                    (left, right) =>
                      Number(availableStationIds.has(right.id)) -
                      Number(availableStationIds.has(left.id)),
                  )
                  .map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                      {availableStationIds.has(station.id)
                        ? ` · ${findAssetAvailability(availability, station.id)!.availableDayCount} gün geçmiş`
                        : " · geçmiş yok"}
                    </option>
                  ))}
              </FilterSelect>
            </div>
          </fieldset>

          <fieldset className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <legend className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Ölçüm
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <FilterSelect
                label="Metrik"
                registration={form.register("metric")}
              >
                <option value="average-speed-kmh">Ortalama hız</option>
                <option value="vehicle-count">Araç sayısı</option>
              </FilterSelect>
              <FilterSelect
                label="Yön"
                registration={form.register("direction")}
              >
                {selectedStation?.directions.map((direction) => (
                  <option key={direction.direction} value={direction.direction}>
                    {formatTrafficDirectionLabel(direction)}
                  </option>
                )) ?? (
                  <>
                    <option value="1">Yön 1</option>
                    <option value="2">Yön 2</option>
                  </>
                )}
              </FilterSelect>
            </div>
          </fieldset>

          {comparisonStation && selectedStation ? (
            <details className="rounded-xl bg-sky-50 px-3 py-2 text-[11px] leading-4 text-sky-800 dark:bg-sky-950 dark:text-sky-200">
              <summary className="cursor-pointer font-semibold">
                Karşılaştırılan yönleri göster
              </summary>
              <span className="mt-2 block">
                {formatStationDirectionLabel(selectedStation, directionNumber)}
              </span>
              <span className="block">
                {formatStationDirectionLabel(
                  comparisonStation,
                  directionNumber,
                )}
              </span>
              <span className="mt-1 block text-sky-600 dark:text-sky-400">
                Yön numarası her istasyonun kendi doğrultusudur.
              </span>
            </details>
          ) : null}

          <fieldset className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <legend className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Dönem ve ayrıntı
            </legend>
            <div className="mt-2">
              <FilterSelect
                label="Çözünürlük"
                registration={form.register("resolution")}
              >
                <option value="auto">Otomatik</option>
                <option value="minute">Dakika</option>
                <option value="hour">Saat</option>
                <option value="day">Gün</option>
              </FilterSelect>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <FilterInput
                label="Başlangıç (dahil)"
                registration={form.register("fromDate")}
                min={firstSharedDate ?? undefined}
                max={lastSharedDate ?? undefined}
                error={form.formState.errors.fromDate?.message}
              />
              <FilterInput
                label="Bitiş (dahil)"
                registration={form.register("toDate")}
                min={firstSharedDate ?? undefined}
                max={lastSharedDate ?? undefined}
                error={form.formState.errors.toDate?.message}
              />
            </div>
          </fieldset>

          <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
              Şerit ve araç sınıfı verisi
            </summary>
            <div className="mt-2">
              {inclusiveDayCount(values.fromDate, values.toDate) <= 370 ? (
                <HistoryImportControl
                  key={`${selectedStationId}:${values.fromDate}:${values.toDate}`}
                  coverageAreaId={catalog.coverageArea.id}
                  assetId={selectedStationId}
                  from={values.fromDate}
                  to={values.toDate}
                />
              ) : (
                <p className="leading-5">
                  Uzun dönem resmî saatlik/günlük özetlerle analiz edilir.
                  Ayrıntılı şerit ve araç sınıfı aktarımı en çok 370 günlük
                  seçimde açılır.
                </p>
              )}
            </div>
          </details>

          <button className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-600">
            Analizi uygula
          </button>
        </form>
      </div>
    </aside>
  );
}

function AvailabilityCard({
  sharedDates,
  comparisonEnabled,
  lastSharedDate,
  onOpenLatest,
}: {
  sharedDates: string[];
  comparisonEnabled: boolean;
  lastSharedDate: string | null;
  onOpenLatest: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/40">
      {sharedDates.length > 0 ? (
        <>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {sharedDates.length} {comparisonEnabled ? "ortak " : ""}verili gün
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              En son: {formatDate(lastSharedDate!)}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLatest}
            className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200"
          >
            Son günü aç
          </button>
        </>
      ) : (
        <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
          {comparisonEnabled
            ? "Seçilen iki istasyonun ortak geçmiş günü bulunmuyor."
            : "Bu istasyon için geçmiş veri bulunmuyor."}
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  registration,
  children,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      {label}
      <select
        {...registration}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-sky-950"
      >
        {children}
      </select>
    </label>
  );
}

function FilterInput({
  label,
  registration,
  min,
  max,
  error,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  min?: string;
  max?: string;
  error?: string;
}) {
  const errorId = `${registration.name}-error`;

  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      {label}
      <input
        type="date"
        min={min}
        max={max}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...registration}
        className={`mt-1 w-full rounded-lg border bg-white px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-100 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-sky-950 ${
          error
            ? "border-rose-400 dark:border-rose-700"
            : "border-slate-200 focus:border-sky-400 dark:border-slate-700"
        }`}
      />
      {error ? (
        <span id={errorId} className="mt-1 block text-[11px] text-rose-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function availabilityLabel(
  status: AnalyticsFilterPanelProps["availabilityStatus"],
  availability: HistoryAssetAvailability | null,
) {
  if (status === "loading") return "Geçmiş veri tarihleri kontrol ediliyor…";
  if (status === "error") return "Geçmiş bilgisi şu anda alınamadı.";
  if (!availability) return "Bu istasyon için geçmiş veri içeri alınmamış.";
  return `${availability.availableDayCount} verili gün · ${formatDate(availability.firstDate)}–${formatDate(availability.lastDate)}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
