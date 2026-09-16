import type { FieldReport } from "@traffic-twin/contracts";

import {
  getFieldReportCategoryLabel,
  getFieldReportSeverityLabel,
  getFieldReportStatusLabel,
} from "../model/field-report-presentation";

export function FieldReportDetailCard({
  report,
  timeZone,
  onClose,
}: {
  report: FieldReport;
  timeZone: string;
  onClose: () => void;
}) {
  return (
    <article className="w-72 rounded-2xl bg-white p-4 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
            Operatör saha bildirimi
          </p>
          <h3 className="mt-1 text-sm font-semibold">
            {getFieldReportCategoryLabel(report.category)}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Saha bildirimini kapat"
          className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 dark:border-slate-700"
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {report.description}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="text-slate-400">Durum</dt>
          <dd className="font-medium">
            {getFieldReportStatusLabel(report.status)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Önem</dt>
          <dd className="font-medium">
            {getFieldReportSeverityLabel(report.severity)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Operatör</dt>
          <dd className="font-medium">{report.author}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Bildirim zamanı</dt>
          <dd className="font-medium">
            {new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone,
            }).format(new Date(report.observedAt))}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[10px] text-slate-400">
        {report.location.latitude.toFixed(5)},{" "}
        {report.location.longitude.toFixed(5)} · Kaynak: Operatör
      </p>
    </article>
  );
}
