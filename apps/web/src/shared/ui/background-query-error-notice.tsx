"use client";

type BackgroundQueryErrorNoticeProps = {
  onDismiss: () => void;
};

export function BackgroundQueryErrorNotice({
  onDismiss,
}: BackgroundQueryErrorNoticeProps) {
  return (
    <aside
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 max-w-sm rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-xl dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      role="status"
    >
      <p className="font-semibold">Güncel veriler yenilenemedi</p>
      <p className="mt-1 text-xs leading-5">
        Son başarıyla alınan veriler gösterilmeye devam ediyor. Bağlantı yeniden
        kurulduğunda görünüm otomatik güncellenecek.
      </p>
      <button
        className="mt-2 text-xs font-semibold underline underline-offset-2"
        onClick={onDismiss}
        type="button"
      >
        Bildirimi kapat
      </button>
    </aside>
  );
}
