import type {
  CorridorDirectionInsight,
  CorridorInsightResponse,
} from "@traffic-twin/contracts";

import { formatTrafficDirectionLabel } from "@/shared/traffic";
import { InlineQueryError } from "@/shared/ui";

interface Props {
  insight: CorridorInsightResponse | undefined;
  status: "loading" | "error" | "ready";
  onRetry: () => void;
  onSelectStation: (assetId: string) => void;
}

const STATUS_PRESENTATION = {
  BALANCED: {
    label: "Benzer akış",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  },
  LOCAL_SLOWDOWN: {
    label: "Yerel yavaşlama işareti",
    className:
      "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
  },
  WIDESPREAD_SLOWDOWN: {
    label: "Koridor boyunca yavaşlama",
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  },
  PEER_SLOWDOWN: {
    label: "Yakın kesimde yavaşlama",
    className:
      "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100",
  },
  INSUFFICIENT_DATA: {
    label: "Yetersiz karşılaştırma",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
} as const;

export function CorridorInsightPanel({
  insight,
  status,
  onRetry,
  onSelectStation,
}: Props) {
  return (
    <section aria-labelledby="corridor-insight-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-sky-700 uppercase dark:text-sky-300">
            Canlı yol bağlamı
          </p>
          <h3
            id="corridor-insight-title"
            className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Koridor etkisi
          </h3>
        </div>
        {insight?.roadRef ? (
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
            Yol {insight.roadRef}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        Aynı yol ve yöndeki yakın istasyonlarla karşılaştırılır.
      </p>

      {status === "loading" ? (
        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Koridor ölçümleri karşılaştırılıyor…
        </p>
      ) : status === "error" ? (
        <InlineQueryError
          className="mt-3"
          message="Koridor karşılaştırması alınamadı."
          onRetry={onRetry}
        />
      ) : !insight || insight.roadContextStatus !== "MATCHED" ? (
        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Bu istasyon için doğrulanmış yol eşleşmesi bulunmadığından koridor
          yorumu yapılmadı.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {insight.directions.map((direction) => (
            <DirectionCard
              key={direction.direction}
              insight={direction}
              onSelectStation={onSelectStation}
            />
          ))}
          <p className="text-[10px] leading-4 text-slate-500">
            Eşzamanlı hız karşılaştırmasıdır; neden göstermez.
          </p>
          {insight.roadContextFreshness === "STALE" ? (
            <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
              Yol eşleşmesi son doğrulanmış kayıttan gösteriliyor.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function DirectionCard({
  insight,
  onSelectStation,
}: {
  insight: CorridorDirectionInsight;
  onSelectStation: (assetId: string) => void;
}) {
  const presentation = STATUS_PRESENTATION[insight.status];
  const directionLabel = insight.selected?.heading
    ? formatTrafficDirectionLabel({
        direction: insight.direction,
        heading: insight.selected.heading,
      })
    : `Yön ${insight.direction}`;

  return (
    <article className={`rounded-xl border p-3 ${presentation.className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{directionLabel}</span>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-semibold dark:bg-black/20">
          {presentation.label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5">{explain(insight)}</p>

      {insight.selected ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white/65 p-2.5 text-[11px] dark:bg-black/15">
          <Metric
            label="Bu nokta"
            value={`%${format(insight.selected.speedPercentOfFreeFlow)}`}
            detail={`${format(insight.selected.averageSpeedKmh)} km/sa`}
          />
          <Metric
            label="Yakın istasyon medyanı"
            value={
              insight.peerMedianSpeedPercentOfFreeFlow === null
                ? "—"
                : `%${format(insight.peerMedianSpeedPercentOfFreeFlow)}`
            }
            detail={`${insight.peers.length} karşılaştırılabilir istasyon`}
          />
        </div>
      ) : null}

      {insight.peers.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {insight.peers.map((peer) => (
            <button
              key={peer.assetId}
              type="button"
              onClick={() => onSelectStation(peer.assetId)}
              className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/65 px-2.5 py-2 text-left text-[11px] transition hover:bg-white dark:bg-black/15 dark:hover:bg-black/25"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {peer.name} · TMS {peer.tmsNumber}
                </span>
                <span className="text-[10px] opacity-70">
                  {formatDistance(peer.distanceMeters)} ·{" "}
                  {format(peer.flowVehiclesPerHour)} araç/sa
                </span>
              </span>
              <span className="shrink-0 font-semibold">
                %{format(peer.speedPercentOfFreeFlow)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <p className="opacity-70">{label}</p>
      <p className="mt-0.5 text-base font-semibold">{value}</p>
      <p className="mt-0.5 text-[10px] opacity-70">{detail}</p>
    </div>
  );
}

function explain(insight: CorridorDirectionInsight) {
  if (insight.status === "INSUFFICIENT_DATA") {
    return "En az iki güncel ve yönü uyumlu komşu istasyon bulunamadı; yorum üretilmedi.";
  }
  const difference = insight.selectedDifferencePercentagePoints ?? 0;
  const magnitude = format(Math.abs(difference));
  if (insight.status === "LOCAL_SLOWDOWN") {
    return `Bu noktadaki hız oranı yakın istasyon medyanından ${magnitude} yüzde puan düşük. Etki şu anda yerel görünüyor.`;
  }
  if (insight.status === "WIDESPREAD_SLOWDOWN") {
    return "Seçili noktada ve yakın istasyonların çoğunda hız serbest akışın belirgin altında. Yavaşlama koridor boyunca yayılıyor olabilir.";
  }
  if (insight.status === "PEER_SLOWDOWN") {
    return `Bu nokta yakın istasyon medyanından ${magnitude} yüzde puan daha akıcı; yavaşlama koridorun diğer bölümünde yoğunlaşıyor.`;
  }
  return `Bu nokta ile yakın istasyonlar arasında belirgin bir hız ayrışması yok (${magnitude} yüzde puan fark).`;
}

function format(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatDistance(value: number) {
  return value < 1_000
    ? `${Math.round(value)} m`
    : `${format(value / 1_000)} km`;
}
