import type { WorkspaceMode } from "../model/workspace-mode";

const copy: Record<Exclude<WorkspaceMode, "live">, { title: string }> = {
  analysis: {
    title: "Analiz için bir istasyon seçin",
  },
  replay: {
    title: "Replay için bir istasyon seçin",
  },
};

export function StationRequiredPanel({
  mode,
  onReturnLive,
}: {
  mode: Exclude<WorkspaceMode, "live">;
  onReturnLive: () => void;
}) {
  const { title } = copy[mode];

  return (
    <section
      aria-label={title}
      className="grid min-h-0 place-items-center overflow-y-auto border-t border-slate-200 bg-slate-100 p-6 xl:border-t-0 xl:border-l dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-sky-700 uppercase dark:text-sky-300">
          İstasyon seçilmedi
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Haritadan veya üst menüden bir istasyon seçin.
        </p>
        <button
          type="button"
          onClick={onReturnLive}
          className="mt-5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Canlıya dön
        </button>
      </div>
    </section>
  );
}
