import type {
  HistoryResponse,
  StationCatalogResponse,
} from "@traffic-twin/contracts";

const reasonLabels = {
  SOURCE_GAP: "Kaynak raporunda ölçüm yok",
  SOURCE_ERROR: "Kaynak raporu hata verdi",
  NOT_IMPORTED: "Henüz içeri alınmadı",
  UNVERIFIED: "Dakikalık kapsam doğrulanamadı",
} as const;

export function AnalysisCoveragePanel({
  history,
  stations,
}: {
  history: HistoryResponse;
  stations: StationCatalogResponse["stations"];
}) {
  const details = history.coverage.missingDetails;
  if (details.length === 0) return null;

  const names = new Map(stations.map((station) => [station.id, station.name]));
  const counts = Object.entries(reasonLabels).map(([reason, label]) => ({
    reason,
    label,
    count: details.filter((item) => item.reason === reason).length,
  }));

  return (
    <section
      aria-label="Eksik veri kapsamı"
      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <p className="font-semibold">Seçili metrik ve yönde eksik günler var</p>
      <p className="mt-1 text-amber-800 dark:text-amber-200">
        Kaynak raporu işlenmiş günler ile henüz içeri alınmamış günler ayrı
        gösterilir. Eksik ölçümler grafikte doldurulmaz.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {counts
          .filter((item) => item.count > 0)
          .map((item) => (
            <span
              key={item.reason}
              className="rounded-full bg-white px-2.5 py-1 dark:bg-slate-900"
            >
              {item.label}: {item.count}
            </span>
          ))}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer font-medium">
          İstasyon ve tarih ayrıntılarını göster
        </summary>
        <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
          {details.map((item) => (
            <li key={`${item.assetId}:${item.date}`}>
              {names.get(item.assetId) ?? item.assetId} · {item.date} ·{" "}
              {reasonLabels[item.reason]}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
