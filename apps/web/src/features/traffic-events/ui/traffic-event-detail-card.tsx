import type { TrafficEvent } from "@traffic-twin/contracts";

import {
  formatTrafficEventDate,
  formatTrafficEventDirection,
  formatTrafficEventSeverity,
} from "../lib/traffic-event-formatters";

interface TrafficEventDetailCardProps {
  event: TrafficEvent;
  timeZone: string;
  onClose: () => void;
}

const statusLabels: Record<TrafficEvent["status"], string> = {
  ACTIVE: "Aktif",
  UPCOMING: "Yaklaşan",
  ENDED: "Sona ermiş",
};

export function TrafficEventDetailCard({
  event,
  timeZone,
  onClose,
}: TrafficEventDetailCardProps) {
  const categoryLabel =
    event.category === "ROAD_WORK" ? "Yol çalışması" : "Trafik duyurusu";
  const roadLabel =
    event.roadNumbers.length > 0
      ? event.roadNumbers.map((road) => `Yol ${road}`).join(", ")
      : "Yol numarası sağlanmadı";

  return (
    <article className="relative max-h-[min(42vh,320px)] w-[min(390px,calc(100vw-48px))] overflow-y-auto pr-1 text-slate-700 dark:text-slate-200">
      <button
        type="button"
        onClick={onClose}
        aria-label="Olay ayrıntısını kapat"
        className="absolute top-0 right-1 grid size-7 place-items-center rounded-lg text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        ×
      </button>
      <header className="border-b border-slate-200 pb-3 pr-5 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase">
          <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {categoryLabel}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            {statusLabels[event.status]}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Kaynak dili: {event.language.toUpperCase()}
          </span>
        </div>
        <h2 className="mt-2 text-base leading-5 font-semibold text-slate-950 dark:text-white">
          {event.title}
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {roadLabel} ·{" "}
          {formatTrafficEventDirection(
            event.direction,
            event.directionDescription,
          )}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-200 py-3 text-xs dark:border-slate-700">
        <DetailTerm
          label="Başlangıç"
          value={formatTrafficEventDate(event.startsAt, timeZone)}
        />
        <DetailTerm
          label="Tahmini bitiş"
          value={formatTrafficEventDate(event.endsAt, timeZone)}
        />
        <DetailTerm
          label="Etki düzeyi"
          value={formatTrafficEventSeverity(event.severity)}
        />
        <DetailTerm label="Saat dilimi" value={timeZone} />
      </dl>

      {event.effects.length > 0 ? (
        <section className="border-b border-slate-200 py-3 dark:border-slate-700">
          <h3 className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Bildirilen etkiler · {event.language.toUpperCase()}
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {event.effects.map((effect) => (
              <li
                key={effect}
                className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
              >
                {effect}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {event.description ? (
        <TextSection title="Etkilenen konum" value={event.description} />
      ) : null}
      {event.comment ? (
        <TextSection title="Olay açıklaması" value={event.comment} />
      ) : null}

      <footer className="pt-3 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
        <p>Kaynak: {event.sender ?? "Fintraffic Digitraffic"}</p>
        <p>
          Son güncelleme: {formatTrafficEventDate(event.versionTime, timeZone)}
        </p>
      </footer>
    </article>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

function TextSection({ title, value }: { title: string; value: string }) {
  return (
    <section className="border-b border-slate-200 py-3 last:border-b-0 dark:border-slate-700">
      <h3 className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {title}
      </h3>
      <p className="mt-1.5 whitespace-pre-line text-xs leading-5">{value}</p>
    </section>
  );
}
