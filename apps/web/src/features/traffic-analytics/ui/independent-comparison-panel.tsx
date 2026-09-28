"use client";

import type {
  HistoryAssetAvailability,
  StationCatalogResponse,
} from "@traffic-twin/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { shiftDateLabel } from "@/shared/time/zoned-date";
import { InlineQueryError } from "@/shared/ui";

import { useTrafficHistory } from "../hooks/use-traffic-history";
import {
  compareReadings,
  createComparisonHistoryQuery,
  createComparisonReading,
  getComparisonConfigurationIssue,
  independentComparisonSchema,
  isComparisonHistoryRangeValid,
  readIndependentComparison,
  type ComparisonSide,
  type IndependentComparison,
} from "../lib/independent-comparison";
import { ComparisonReadingCard } from "./comparison-reading-card";
import { ComparisonSideEditor } from "./comparison-side-editor";

interface Props {
  catalog: StationCatalogResponse;
  selectedStationId: string;
  availability: HistoryAssetAvailability[];
  today: string;
}

export function IndependentComparisonPanel(props: Props) {
  const params = useSearchParams();
  return (
    <ComparisonContent
      key={`${props.selectedStationId}:${props.today}:${params.toString()}`}
      {...props}
    />
  );
}

function ComparisonContent({
  catalog,
  selectedStationId,
  availability,
  today,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const defaultDate =
    availability.find((item) => item.assetId === selectedStationId)?.lastDate ??
    shiftDateLabel(today, -1);
  const applied = readIndependentComparison(
    new URLSearchParams(params.toString()),
    catalog,
    selectedStationId,
    defaultDate,
  );
  const [draft, setDraft] = useState<IndependentComparison>(applied);
  const [formError, setFormError] = useState<string | null>(null);

  const aHistory = useTrafficHistory(
    catalog.coverageArea.id,
    createComparisonHistoryQuery(
      applied.a,
      applied.metric,
      catalog.coverageArea.timeZone,
    ),
    applied.a.period === "historical",
  );
  const bHistory = useTrafficHistory(
    catalog.coverageArea.id,
    createComparisonHistoryQuery(
      applied.b,
      applied.metric,
      catalog.coverageArea.timeZone,
    ),
    applied.b.period === "historical",
  );
  const a = createComparisonReading(
    applied.a,
    applied.metric,
    catalog,
    aHistory.data,
  );
  const b = createComparisonReading(
    applied.b,
    applied.metric,
    catalog,
    bHistory.data,
  );
  const result = compareReadings(a, b);
  const configurationIssue = getComparisonConfigurationIssue(applied);

  function updateSide(key: "a" | "b", patch: Partial<ComparisonSide>) {
    setDraft((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }

  function apply() {
    const parsed = independentComparisonSchema.safeParse(draft);
    if (!parsed.success) {
      setFormError("İstasyon, yön ve tarih alanlarını kontrol edin.");
      return;
    }
    const issue = getComparisonConfigurationIssue(draft);
    if (issue) {
      setFormError(issue);
      return;
    }
    for (const side of [draft.a, draft.b]) {
      if (!isComparisonHistoryRangeValid(side)) {
        setFormError(
          "Geçmiş aralığın başlangıcı/bitişi veya çözünürlük sınırı geçersiz.",
        );
        return;
      }
    }
    const next = new URLSearchParams(params.toString());
    next.set("mode", "analysis");
    next.set("analysisView", "comparison");
    next.set("station", draft.a.assetId);
    next.delete("junction");
    next.set("cmpMetric", draft.metric);
    for (const [prefix, side] of [
      ["cmpA", draft.a],
      ["cmpB", draft.b],
    ] as const) {
      next.set(`${prefix}Asset`, side.assetId);
      next.set(`${prefix}Direction`, side.direction);
      next.set(`${prefix}Period`, side.period);
      next.set(`${prefix}From`, side.fromDate);
      next.set(`${prefix}To`, side.toDate);
      next.set(`${prefix}Resolution`, side.resolution);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    setFormError(null);
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">Esnek karşılaştırma</h2>
        <p className="mt-1 text-xs text-slate-500">
          İki tarafın istasyonu, yönü ve dönemi bağımsızdır. Aynı istasyonun iki
          zamanı veya iki farklı istasyon seçilebilir.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <ComparisonSideEditor
            label="A · İncelenen"
            side={draft.a}
            catalog={catalog}
            onChange={(patch) => updateSide("a", patch)}
          />
          <ComparisonSideEditor
            label="B · Referans"
            side={draft.b}
            catalog={catalog}
            onChange={(patch) => updateSide("b", patch)}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium">
            Metrik{" "}
            <select
              aria-label="Karşılaştırma metriği"
              value={draft.metric}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  metric: event.target.value as IndependentComparison["metric"],
                }))
              }
              className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="average-speed-kmh">Ortalama hız</option>
              <option value="vehicle-count">Araç hacmi / akış</option>
            </select>
          </label>
          <button
            type="button"
            onClick={apply}
            className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white dark:bg-sky-600"
          >
            Karşılaştırmayı uygula
          </button>
          {formError ? (
            <p role="alert" className="text-xs text-red-700">
              {formError}
            </p>
          ) : null}
        </div>
      </section>

      {(aHistory.isError && applied.a.period === "historical") ||
      (bHistory.isError && applied.b.period === "historical") ? (
        <InlineQueryError
          message="Geçmiş tarafın verisi alınamadı."
          onRetry={() => {
            void aHistory.refetch();
            void bHistory.refetch();
          }}
        />
      ) : null}
      {configurationIssue ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          <p className="font-semibold">Bu iki değer karşılaştırılamaz</p>
          <p className="mt-1 text-xs">{configurationIssue}</p>
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <ComparisonReadingCard
          label="A · İncelenen"
          side={applied.a}
          reading={a}
          catalog={catalog}
          loading={applied.a.period === "historical" && aHistory.isPending}
        />
        <ComparisonReadingCard
          label="B · Referans"
          side={applied.b}
          reading={b}
          catalog={catalog}
          loading={applied.b.period === "historical" && bHistory.isPending}
        />
      </div>
      <section
        aria-label="Karşılaştırma sonucu"
        className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950"
      >
        <h3 className="text-sm font-semibold">Sonuç</h3>
        <p className="mt-1 text-lg font-semibold">
          {result.difference !== null
            ? `${result.difference > 0 ? "+" : ""}${formatNumber(result.difference)} ${a.unit}`
            : result.contextualDifference !== undefined
              ? `Bağlamsal fark: ${result.contextualDifference > 0 ? "+" : ""}${formatNumber(result.contextualDifference)} ${a.unit}`
              : "Karşılaştırılamaz"}
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {result.reason}
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          Kaynak: Fintraffic TMS. Canlı hız/akış kayan 5 dk penceresi; tarihsel
          hız seçili dönemin ağırlıklı ortalaması, geçiş ise seçili dönemin
          toplamıdır. Geçmiş aralıkları kapsama alanı saat dilimine göre
          dahildir.
        </p>
      </section>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(
    value,
  );
}
