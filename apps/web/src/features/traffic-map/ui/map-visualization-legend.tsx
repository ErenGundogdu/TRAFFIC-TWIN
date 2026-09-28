import type {
  StationRoadContext,
  StationSummary,
} from "@traffic-twin/contracts";

import { formatTrafficDirectionLabel } from "@/shared/traffic";

import type { MapVisualizationMode } from "../model/map-visualization-mode";

function formatMetric(value: number | null, suffix: string) {
  return value === null ? "Veri yok" : `${Math.round(value)} ${suffix}`;
}

function formatRoadContextFetchedAt(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function MapVisualizationLegend({
  mode,
  timeZone,
  selectedStationId,
  selectedStation,
  roadContext,
  roadContextStatus,
  embedded = false,
}: {
  mode: MapVisualizationMode;
  timeZone: string;
  selectedStationId: string | null;
  selectedStation: StationSummary | null;
  roadContext?: StationRoadContext;
  roadContextStatus: "idle" | "loading" | "error" | "ready";
  embedded?: boolean;
}) {
  const title =
    mode === "overview"
      ? "Canlı trafik yoğunluğu"
      : mode === "volume-3d"
        ? "Göreli 3B trafik hacmi"
        : "Seçili istasyonun yol akışı";
  const description =
    mode === "overview"
      ? "Renk alanı, gerçek iki yön toplam araç/saat değerini gösterir."
      : mode === "volume-3d"
        ? "Sütunlar göreli trafik hacmini gösterir."
        : !selectedStationId
          ? "Gerçek OSM yol bağlamını görmek için bir ölçüm istasyonu seçin."
          : roadContextStatus === "loading"
            ? "Gerçek OSM yol geometrisi yükleniyor…"
            : roadContextStatus === "error"
              ? "OSM yolu alınamadı; gerçek istasyon ölçümü korunuyor."
              : roadContext?.freshness === "STALE"
                ? roadContext.status === "MATCHED"
                  ? `OpenStreetMap geçici olarak yenilenemedi; ${formatRoadContextFetchedAt(roadContext.source.fetchedAt, timeZone)} tarihinde alınan son gerçek yol geometrisi gösteriliyor.`
                  : `OpenStreetMap geçici olarak yenilenemedi; ${formatRoadContextFetchedAt(roadContext.source.fetchedAt, timeZone)} tarihli son kontrolde eşleşen yol bulunmamıştı.`
                : roadContext?.status === "NO_MATCH"
                  ? "Yol referansıyla eşleşen OSM geometrisi bulunamadı."
                  : "Kalınlık trafik hacmini, renk hız oranını gösterir.";

  return (
    <div
      className={`pointer-events-none max-w-80 rounded-xl border border-white/80 bg-white/95 px-3 py-2.5 text-[10px] leading-4 text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 ${
        embedded ? "relative" : "absolute bottom-8 left-3"
      }`}
    >
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-0.5">{description}</p>
      {mode !== "flow" ? (
        <div className="mt-2 flex items-center gap-2">
          <span>Düşük</span>
          <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-sky-400 via-emerald-500 via-50% to-rose-600" />
          <span>Yüksek</span>
        </div>
      ) : selectedStation && roadContext?.status === "MATCHED" ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedStation.directions.map((direction) => (
            <span
              key={direction.direction}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1 dark:bg-slate-800"
            >
              <span
                className={`size-2 rounded-full ${
                  direction.direction === 1 ? "bg-sky-600" : "bg-violet-600"
                }`}
              />
              {formatTrafficDirectionLabel(direction)}:{" "}
              {formatMetric(direction.averageSpeedKmh, "km/sa")} ·{" "}
              {formatMetric(direction.flowVehiclesPerHour, "araç/sa")}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
