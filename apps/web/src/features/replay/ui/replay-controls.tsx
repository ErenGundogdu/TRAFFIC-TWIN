"use client";

import type {
  HistoryQuery,
  HistoryResponse,
  ReplaySpeed,
} from "@traffic-twin/contracts";
import { useState } from "react";

import type { ReplayController } from "../hooks/use-replay";
import { getReplayAvailability } from "../lib/replay-availability";
import { ReplayTimeline } from "./replay-timeline";

interface ReplayControlsProps {
  coverageAreaId: string;
  history: HistoryResponse;
  query: HistoryQuery;
  replay: ReplayController;
  seriesLabels: Record<string, string>;
}

export function ReplayControls({
  coverageAreaId,
  history,
  query,
  replay,
  seriesLabels,
}: ReplayControlsProps) {
  const [speed, setSpeed] = useState<ReplaySpeed>(8);
  const timestamps = history.series
    .flatMap((series) => series.points.map((point) => point.timestamp))
    .sort();
  const start = timestamps[0] ?? null;
  const end = timestamps.at(-1) ?? null;
  const availability = getReplayAvailability({ ...history, query });

  return (
    <section
      aria-label="Replay kontrolleri"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
          Oynatma
        </span>
        <button
          type="button"
          disabled={!availability.available || replay.status === "loading"}
          title={availability.available ? undefined : availability.message}
          onClick={() =>
            replay.start({
              coverageAreaId,
              assetIds: query.assetIds,
              direction: query.direction,
              from: query.from,
              to: query.to,
              speed,
              resolution: availability.resolution ?? "minute",
            })
          }
          className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          {replay.status === "loading" ? "Hazırlanıyor…" : "Baştan oynat"}
        </button>

        {replay.status === "playing" ? (
          <ControlButton onClick={() => replay.control({ action: "pause" })}>
            Duraklat
          </ControlButton>
        ) : replay.status === "paused" ? (
          <ControlButton onClick={() => replay.control({ action: "resume" })}>
            Sürdür
          </ControlButton>
        ) : null}

        {replay.status !== "idle" ? (
          <ControlButton onClick={() => replay.control({ action: "stop" })}>
            Durdur
          </ControlButton>
        ) : null}

        <select
          value={speed}
          onChange={(event) => {
            const nextSpeed = Number(event.target.value) as ReplaySpeed;
            setSpeed(nextSpeed);
            replay.setSpeed(nextSpeed);
          }}
          aria-label="Replay hızı"
          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
        >
          {[1, 2, 4, 8, 16, 32].map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-slate-500">
          {query.assetIds.length} istasyon · Yön {query.direction} ·{" "}
          {frameLabel(replay, history.timeZone)}
        </span>
      </div>

      {!availability.available ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {availability.message}
        </p>
      ) : null}

      {replay.status === "error" && replay.errorMessage ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          {replay.errorMessage}
        </p>
      ) : null}

      {availability.available && start && end ? (
        <ReplayTimeline
          start={start}
          end={end}
          current={replay.frame?.timestamp}
          timeZone={history.timeZone}
          resolution={availability.resolution ?? "minute"}
          disabled={
            replay.status === "idle" ||
            replay.status === "loading" ||
            replay.status === "error"
          }
          onSeek={replay.seek}
        />
      ) : null}

      {replay.frame ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {replay.frame.values.map((value) => (
            <article
              key={value.assetId}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950"
            >
              <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                {seriesLabels[value.assetId] ?? value.assetId}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {value.averageSpeedKmh.toFixed(1)} km/sa
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {value.vehicleCount}{" "}
                {availability.resolution === "hour" ? "araç/sa" : "araç/dk"} ·
                gerçek replay karesi
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ControlButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function frameLabel(replay: ReplayController, timeZone: string) {
  if (replay.frame) {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date(replay.frame.timestamp));
  }
  if (replay.status === "error") return "Replay başlatılamadı";
  if (replay.status === "ended") return "Replay tamamlandı";
  if (replay.status === "loading") return "Kareler hazırlanıyor";
  if (replay.frameCount > 0) return `${replay.frameCount} gerçek kare`;
  return "Henüz başlatılmadı";
}
