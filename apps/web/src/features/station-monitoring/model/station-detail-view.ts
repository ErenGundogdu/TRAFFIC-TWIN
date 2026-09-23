export type StationDetailView = "overview" | "context" | "insights" | "notes";

export const stationDetailViews: ReadonlyArray<{
  value: StationDetailView;
  label: string;
}> = [
  { value: "overview", label: "Şimdi" },
  { value: "context", label: "Bağlam" },
  { value: "insights", label: "İçgörü" },
  { value: "notes", label: "Notlar" },
];
