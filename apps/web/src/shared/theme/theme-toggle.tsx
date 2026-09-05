"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`${nextTheme === "dark" ? "Koyu" : "Açık"} temaya geç`}
      title={`${nextTheme === "dark" ? "Koyu" : "Açık"} temaya geç`}
      className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-base text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
    </button>
  );
}
