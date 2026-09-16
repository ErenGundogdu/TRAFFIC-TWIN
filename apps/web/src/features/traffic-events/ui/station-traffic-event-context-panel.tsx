import type { StationTrafficEventContextResponse } from "@traffic-twin/contracts";

import {
  formatTrafficEventDate,
  formatTrafficEventSeverity,
} from "../lib/traffic-event-formatters";

interface StationTrafficEventContextPanelProps {
  context?: StationTrafficEventContextResponse;
  timeZone: string;
  status: "loading" | "error" | "ready";
  onRetry: () => void;
  onSelectEvent: (eventId: string) => void;
}

export function StationTrafficEventContextPanel({
  context,
  timeZone,
  status,
  onRetry,
  onSelectEvent,
}: StationTrafficEventContextPanelProps) {
  return (
    <section className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-orange-700 uppercase dark:text-orange-300">
        Operasyon bağlamı
      </p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Yakındaki yol olayları
          </h3>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Yakınlık ve yol eşleşmesi nedensellik anlamına gelmez.
          </p>
        </div>
        {context ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {context.matches.length} eşleşme
          </span>
        ) : null}
      </div>

      {status === "loading" ? (
        <p className="mt-3 text-xs text-slate-500">Yol bağlamı aranıyor…</p>
      ) : status === "error" ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          <p>Yakındaki olaylar alınamadı.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 font-semibold underline"
          >
            Tekrar dene
          </button>
        </div>
      ) : !context || context.matches.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Politika mesafelerinde aktif veya yaklaşan gerçek yol olayı bulunmadı.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {context.matches.map((match) => (
            <li key={match.event.id}>
              <button
                type="button"
                onClick={() => onSelectEvent(match.event.id)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-orange-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-orange-700"
              >
                <span className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-semibold text-orange-700 dark:text-orange-300">
                    {match.relation === "SAME_ROAD_NEARBY"
                      ? `Aynı yol · Yol ${match.matchedRoadNumber}`
                      : "Yakın çevre"}
                  </span>
                  <span className="text-slate-500">
                    {formatDistance(match.distanceMeters)}
                  </span>
                </span>
                <span className="mt-1 block line-clamp-2 text-xs font-semibold leading-4 text-slate-800 dark:text-slate-200">
                  {match.event.title}
                </span>
                <span className="mt-1.5 block text-[10px] text-slate-500">
                  {match.event.status === "ACTIVE" ? "Aktif" : "Yaklaşan"} ·{" "}
                  {formatTrafficEventSeverity(match.event.severity)} ·{" "}
                  {formatTrafficEventDate(match.event.startsAt, timeZone)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {context ? (
        <p className="mt-2 text-[9px] text-slate-400">
          Politika: {context.policy.version} · Aynı yol en çok{" "}
          {formatDistance(context.policy.sameRoadMaxDistanceMeters)} · Yakın
          çevre {formatDistance(context.policy.nearbyMaxDistanceMeters)}
        </p>
      ) : null}
    </section>
  );
}

function formatDistance(distanceMeters: number) {
  return distanceMeters < 1_000
    ? `${distanceMeters.toLocaleString("tr-TR")} m`
    : `${(distanceMeters / 1_000).toLocaleString("tr-TR", {
        maximumFractionDigits: 1,
      })} km`;
}
