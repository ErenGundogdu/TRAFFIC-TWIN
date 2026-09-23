interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
}

export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
  size = "medium",
}: {
  label: string;
  value: Value;
  options: ReadonlyArray<SegmentedControlOption<Value>>;
  onChange: (value: Value) => void;
  size?: "small" | "medium";
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-100/90 p-1 dark:border-slate-700 dark:bg-slate-800/90"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg font-semibold transition-colors ${
            size === "small" ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
          } ${
            value === option.value
              ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300"
              : "text-slate-600 hover:bg-white/60 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
