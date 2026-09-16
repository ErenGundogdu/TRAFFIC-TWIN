"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  createFieldReportSchema,
  type CreateFieldReport,
  type FieldReportAcknowledgement,
  type FieldReportLocation,
} from "@traffic-twin/contracts";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import {
  fieldReportCategoryOptions,
  fieldReportSeverityOptions,
} from "../model/field-report-presentation";

interface FieldReportComposerProps {
  coverageAreaId: string;
  active: boolean;
  location: FieldReportLocation | null;
  realtimeConnected: boolean;
  catalogStatus: "loading" | "error" | "ready";
  createReport: (
    input: CreateFieldReport,
  ) => Promise<FieldReportAcknowledgement>;
  onStart: () => void;
  onCancel: () => void;
  onCreated: (reportId: string) => void;
  onRetryCatalog: () => void;
}

export function FieldReportComposer({
  coverageAreaId,
  active,
  location,
  realtimeConnected,
  catalogStatus,
  createReport,
  onStart,
  onCancel,
  onCreated,
  onRetryCatalog,
}: FieldReportComposerProps) {
  const form = useForm<CreateFieldReport>({
    resolver: zodResolver(createFieldReportSchema),
    defaultValues: {
      coverageAreaId,
      author: "",
      category: "CONGESTION",
      severity: "MEDIUM",
      description: "",
      location: { longitude: 0, latitude: 0 },
    },
  });

  useEffect(() => {
    if (location) form.setValue("location", location, { shouldValidate: true });
  }, [form, location]);

  if (!active) {
    return (
      <div className="absolute bottom-24 left-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xl hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          + Saha bildirimi ekle
        </button>
        {catalogStatus === "error" ? (
          <button
            type="button"
            onClick={onRetryCatalog}
            className="rounded-xl border border-rose-200 bg-white/95 px-3 py-2 text-[11px] font-semibold text-rose-700 shadow dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300"
          >
            Bildirim katmanı alınamadı · Yeniden dene
          </button>
        ) : catalogStatus === "loading" ? (
          <span className="rounded-xl bg-white/95 px-3 py-2 text-[11px] text-slate-500 shadow dark:bg-slate-900/95">
            Bildirimler yükleniyor…
          </span>
        ) : null}
      </div>
    );
  }

  if (!location) {
    return (
      <section className="absolute bottom-24 left-3 z-20 w-72 rounded-2xl border border-amber-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-amber-800 dark:bg-slate-900/95">
        <p className="text-[10px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
          Saha bildirimi
        </p>
        <p className="mt-1 text-sm font-semibold">Haritada konum seçin</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Bildirimin bulunduğu noktaya tıklayın. Normal harita seçimleri bu araç
          kapanana kadar duraklatılır.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 text-xs font-semibold text-slate-600 underline underline-offset-2 dark:text-slate-300"
        >
          İptal et
        </button>
      </section>
    );
  }

  const selectedLocation = location;

  async function submit(input: CreateFieldReport) {
    const acknowledgement = await createReport({
      ...input,
      coverageAreaId,
      location: selectedLocation,
    });
    if (!acknowledgement.ok) {
      form.setError("root", { message: acknowledgement.error.message });
      return;
    }

    form.reset({
      coverageAreaId,
      author: input.author,
      category: input.category,
      severity: input.severity,
      description: "",
      location: selectedLocation,
    });
    onCreated(acknowledgement.report.id);
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="absolute bottom-4 left-3 z-30 w-[min(340px,calc(100%-1.5rem))] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
            Operatör kaynağı · Onay bekleyecek
          </p>
          <h3 className="mt-1 text-sm font-semibold">Saha bildirimi oluştur</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Saha bildirimini iptal et"
          className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 dark:border-slate-700"
        >
          ×
        </button>
      </div>

      <input type="hidden" {...form.register("coverageAreaId")} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Kategori
          <select
            {...form.register("category")}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
          >
            {fieldReportCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Önem
          <select
            {...form.register("severity")}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
          >
            {fieldReportSeverityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
        Operatör
        <input
          {...form.register("author")}
          placeholder="Adınız"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
        />
        <span className="mt-1 block text-[10px] text-rose-600">
          {form.formState.errors.author?.message}
        </span>
      </label>
      <label className="mt-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
        Açıklama
        <textarea
          {...form.register("description")}
          rows={3}
          placeholder="Gözlemlediğiniz durumu yazın…"
          className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
        />
        <span className="mt-1 block text-[10px] text-rose-600">
          {form.formState.errors.description?.message}
        </span>
      </label>
      {form.formState.errors.root?.message ? (
        <p className="mt-2 text-xs text-rose-600">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={!realtimeConnected || form.formState.isSubmitting}
          className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-sky-700"
        >
          {!realtimeConnected
            ? "Bağlantı bekleniyor"
            : form.formState.isSubmitting
              ? "Kaydediliyor…"
              : "Bildirimi kaydet"}
        </button>
      </div>
    </form>
  );
}
