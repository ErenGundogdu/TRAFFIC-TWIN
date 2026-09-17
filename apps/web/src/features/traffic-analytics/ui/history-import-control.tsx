"use client";

import type { HistoryImportJobStatus } from "@traffic-twin/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/api-error";

import { useCreateHistoryImportJob } from "../hooks/use-create-history-import-job";
import { useHistoryImportJob } from "../hooks/use-history-import-job";
import { useHistoryImportPlan } from "../hooks/use-history-import-plan";

interface HistoryImportControlProps {
  coverageAreaId: string;
  assetId: string;
  from: string;
  to: string;
}

const TERMINAL_STATUSES = new Set<HistoryImportJobStatus>([
  "COMPLETED",
  "PARTIAL_FAILURE",
  "FAILED",
]);

const STATUS_LABELS: Record<HistoryImportJobStatus, string> = {
  QUEUED: "Sırada",
  RUNNING: "İçeri alınıyor",
  COMPLETED: "Tamamlandı",
  PARTIAL_FAILURE: "Kısmen tamamlandı",
  FAILED: "Başarısız",
};

export function HistoryImportControl({
  coverageAreaId,
  assetId,
  from,
  to,
}: HistoryImportControlProps) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const invalidatedJobId = useRef<string | null>(null);
  const plan = useHistoryImportPlan(coverageAreaId, { assetId, from, to });
  const createJob = useCreateHistoryImportJob(coverageAreaId);
  const job = useHistoryImportJob(coverageAreaId, jobId);
  const importableDayCount = plan.data
    ? plan.data.summary.missingDayCount +
      plan.data.summary.failedDayCount +
      plan.data.summary.pendingProcessingDayCount
    : 0;
  const jobStatus = job.data?.job.status;
  const canRetry =
    job.data !== undefined &&
    TERMINAL_STATUSES.has(job.data.job.status) &&
    (job.data.job.status === "FAILED" ||
      job.data.job.progress.failedDayCount > 0);

  const queueJob = () => {
    createJob.mutate(
      { assetId, from, to },
      {
        onSuccess: (response) => setJobId(response.job.id),
      },
    );
  };

  useEffect(() => {
    if (
      !jobId ||
      !jobStatus ||
      !TERMINAL_STATUSES.has(jobStatus) ||
      invalidatedJobId.current === jobId
    ) {
      return;
    }

    invalidatedJobId.current = jobId;
    void queryClient.invalidateQueries({
      queryKey: ["history-import-plan", coverageAreaId, assetId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["traffic-history-availability", coverageAreaId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["traffic-history", coverageAreaId],
    });
  }, [assetId, coverageAreaId, jobId, jobStatus, queryClient]);

  const error = createJob.error ?? plan.error ?? job.error;

  return (
    <section
      aria-label="Geçmiş veri kapsamı"
      className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Geçmiş veri kapsamı
          </p>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            {plan.isPending
              ? "Artifact manifesti kontrol ediliyor…"
              : plan.data
                ? `${plan.data.range.requestedDayCount} günün ${plan.data.summary.availableDayCount} günü hazır.`
                : "Kapsam planı alınamadı."}
          </p>
        </div>
        {plan.data && importableDayCount > 0 && !jobId ? (
          <button
            type="button"
            disabled={createJob.isPending}
            onClick={queueJob}
            className="shrink-0 rounded-lg bg-sky-700 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {createJob.isPending
              ? "Sıraya alınıyor…"
              : `${importableDayCount} günü getir`}
          </button>
        ) : null}
      </div>

      {plan.data ? (
        <p className="mt-2 text-[10px] text-slate-500">
          Eksik {plan.data.summary.missingDayCount} · Başarısız{" "}
          {plan.data.summary.failedDayCount} · Geçerli verisiz{" "}
          {plan.data.summary.noValidDataDayCount} · Henüz yayımlanmamış{" "}
          {plan.data.summary.notYetAvailableDayCount}
        </p>
      ) : null}

      {job.data ? (
        <div className="mt-2 rounded-lg bg-white px-2.5 py-2 text-[11px] dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              {STATUS_LABELS[job.data.job.status]}
            </span>
            <span className="text-slate-500">
              {job.data.job.progress.completedDayCount}/
              {job.data.job.range.targetDayCount} gün
            </span>
          </div>
          {job.data.job.progress.currentSourceDate ? (
            <p className="mt-1 text-slate-500">
              İşlenen gün: {job.data.job.progress.currentSourceDate}
            </p>
          ) : null}
          {TERMINAL_STATUSES.has(job.data.job.status) ? (
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-slate-500">
                Başarılı {job.data.job.progress.successfulDayCount} · Atlanan{" "}
                {job.data.job.progress.skippedDayCount} · Başarısız{" "}
                {job.data.job.progress.failedDayCount}
              </p>
              {canRetry ? (
                <button
                  type="button"
                  disabled={createJob.isPending}
                  onClick={queueJob}
                  className="shrink-0 font-semibold text-sky-700 disabled:opacity-50 dark:text-sky-300"
                >
                  Yeniden dene
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-2 text-[11px] text-rose-700 dark:text-rose-300"
        >
          {error instanceof ApiError
            ? error.message
            : "Geçmiş veri işlemi şu anda tamamlanamadı."}
        </p>
      ) : null}
    </section>
  );
}
