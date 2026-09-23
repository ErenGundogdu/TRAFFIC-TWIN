import type { DataSource } from "@traffic-twin/contracts";

import type { RealtimeStatus } from "@/features/realtime";
import { ThemeToggle } from "@/shared/theme";
import { SegmentedControl } from "@/shared/ui";

import type { WorkspaceMode } from "../model/workspace-mode";

const workspaceModes: ReadonlyArray<{
  value: WorkspaceMode;
  label: string;
}> = [
  { value: "live", label: "Canlı" },
  { value: "analysis", label: "Analiz" },
  { value: "replay", label: "Replay" },
];

function formatSourceTime(value: string | null, timeZone: string) {
  if (!value) return "Güncelleme zamanı yok";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function realtimeLabel(status: RealtimeStatus) {
  if (status === "connected") return "Canlı bağlı";
  if (status === "connecting") return "Bağlanıyor";
  return "Canlı bağlantı kesildi";
}

export function WorkspaceHeader({
  coverageAreaName,
  timeZone,
  mode,
  onModeChange,
  realtimeStatus,
  source,
  refreshing,
  onRefresh,
}: {
  coverageAreaName: string;
  timeZone: string;
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  realtimeStatus: RealtimeStatus;
  source: DataSource;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur xl:px-5 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-950 to-sky-900 text-sm font-bold text-white shadow-sm">
          TT
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Traffic Twin</p>
          <p className="truncate text-xs text-slate-500">{coverageAreaName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <SegmentedControl
          label="Çalışma modu"
          value={mode}
          options={workspaceModes}
          onChange={onModeChange}
          size="small"
        />
        <div className="hidden items-center gap-1.5 text-[11px] text-slate-500 lg:flex">
          <span
            className={`size-2 rounded-full ${
              realtimeStatus === "connected"
                ? "bg-sky-500"
                : realtimeStatus === "connecting"
                  ? "bg-amber-400"
                  : "bg-slate-400"
            }`}
          />
          {realtimeLabel(realtimeStatus)}
        </div>
        <div className="hidden text-right md:block">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {source.status === "AVAILABLE"
              ? "Kaynak güncel"
              : "Kaynak kesintili"}
          </p>
          <p className="text-[11px] text-slate-500">
            {formatSourceTime(source.updatedAt, timeZone)} · {timeZone}
          </p>
        </div>
        <span
          className={`size-2.5 rounded-full ${
            source.status === "AVAILABLE" ? "bg-emerald-500" : "bg-amber-500"
          }`}
          aria-label={
            source.status === "AVAILABLE" ? "Kaynak güncel" : "Kaynak kesintili"
          }
        />
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {refreshing ? "Yenileniyor…" : "Yenile"}
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
