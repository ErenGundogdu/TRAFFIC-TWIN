"use client";

type InlineQueryErrorProps = {
  className?: string;
  message: string;
  onRetry?: () => void;
};

export function InlineQueryError({
  className,
  message,
  onRetry,
}: InlineQueryErrorProps) {
  const classes = [
    "rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button
          className="mt-1 font-semibold underline underline-offset-2"
          onClick={onRetry}
          type="button"
        >
          Tekrar dene
        </button>
      ) : null}
    </div>
  );
}
