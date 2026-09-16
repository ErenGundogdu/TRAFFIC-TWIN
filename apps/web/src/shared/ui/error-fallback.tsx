"use client";

type ErrorFallbackProps = {
  description: string;
  onRetry: () => void;
  referenceCode?: string;
  title: string;
};

export function ErrorFallback({
  description,
  onRetry,
  referenceCode,
  title,
}: ErrorFallbackProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section
        aria-labelledby="error-title"
        className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900 dark:bg-slate-900"
        role="alert"
      >
        <p className="text-xs font-semibold tracking-[0.16em] text-rose-700 uppercase dark:text-rose-300">
          Beklenmeyen hata
        </p>
        <h1 id="error-title" className="mt-2 text-2xl font-semibold">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>

        {referenceCode ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Hata referansı: <span className="font-mono">{referenceCode}</span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            onClick={onRetry}
            type="button"
          >
            Tekrar dene
          </button>
          <a
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            href="/monitoring"
          >
            Canlı izlemeye dön
          </a>
        </div>
      </section>
    </main>
  );
}
