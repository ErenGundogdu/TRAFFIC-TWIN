import type {
  OperatorNoteCategory,
  OperatorNoteStatus,
} from "@traffic-twin/contracts";

export const operatorNoteCategoryOptions: ReadonlyArray<{
  value: OperatorNoteCategory;
  label: string;
}> = [
  { value: "GENERAL", label: "Genel not" },
  { value: "MAINTENANCE", label: "Bakım" },
  { value: "FAULT", label: "Arıza" },
  { value: "INSPECTION", label: "Kontrol" },
];

export const operatorNoteStatusOptions: ReadonlyArray<{
  value: OperatorNoteStatus;
  label: string;
}> = [
  { value: "INFORMATIONAL", label: "Bilgi" },
  { value: "ACTION_REQUIRED", label: "İşlem gerekli" },
  { value: "RESOLVED", label: "Çözüldü" },
];

export function getOperatorNoteCategoryLabel(category: OperatorNoteCategory) {
  return (
    operatorNoteCategoryOptions.find((option) => option.value === category)
      ?.label ?? category
  );
}

export function getOperatorNoteStatusLabel(status: OperatorNoteStatus) {
  return (
    operatorNoteStatusOptions.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function getOperatorNoteStatusClassName(status: OperatorNoteStatus) {
  if (status === "ACTION_REQUIRED") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
  if (status === "RESOLVED") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}
