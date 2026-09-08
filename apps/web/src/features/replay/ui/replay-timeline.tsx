"use client";

interface ReplayTimelineProps {
  start: string;
  end: string;
  current?: string;
  timeZone: string;
  disabled: boolean;
  onSeek: (timestamp: string) => void;
}

const MINUTE_MS = 60_000;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatTimestamp(timestamp: number, timeZone: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(timestamp));
}

export function ReplayTimeline({
  start,
  end,
  current,
  timeZone,
  disabled,
  onSeek,
}: ReplayTimelineProps) {
  const minimum = new Date(start).getTime();
  const maximum = new Date(end).getTime();
  const selectedTimestamp = clamp(
    current ? new Date(current).getTime() : minimum,
    minimum,
    maximum,
  );

  function seek(timestamp: number) {
    const next = clamp(timestamp, minimum, maximum);
    onSeek(new Date(next).toISOString());
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">Replay zaman çizelgesi</p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            İmleç en yakın gerçek ölçüm dakikasına gider.
          </p>
        </div>
        <time className="text-xs font-semibold text-sky-700 dark:text-sky-300">
          {formatTimestamp(selectedTimestamp, timeZone)}
        </time>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || selectedTimestamp <= minimum}
          onClick={() => seek(selectedTimestamp - MINUTE_MS)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-slate-700"
          aria-label="Bir dakika geri git"
        >
          −1 dk
        </button>
        <input
          type="range"
          min={minimum}
          max={maximum}
          step={MINUTE_MS}
          value={selectedTimestamp}
          disabled={disabled || minimum === maximum}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Replay zamanı"
          className="min-w-32 flex-1 accent-sky-700 disabled:opacity-40"
        />
        <button
          type="button"
          disabled={disabled || selectedTimestamp >= maximum}
          onClick={() => seek(selectedTimestamp + MINUTE_MS)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-slate-700"
          aria-label="Bir dakika ileri git"
        >
          +1 dk
        </button>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{formatTimestamp(minimum, timeZone)}</span>
        <span>{formatTimestamp(maximum, timeZone)}</span>
      </div>
    </div>
  );
}
