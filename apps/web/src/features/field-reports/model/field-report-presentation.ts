import type {
  FieldReportCategory,
  FieldReportSeverity,
  FieldReportStatus,
} from "@traffic-twin/contracts";

export const fieldReportCategoryOptions: ReadonlyArray<{
  value: FieldReportCategory;
  label: string;
}> = [
  { value: "ACCIDENT", label: "Kaza" },
  { value: "CONGESTION", label: "Trafik yoğunluğu" },
  { value: "ROAD_HAZARD", label: "Yol tehlikesi" },
  { value: "ROAD_DAMAGE", label: "Yol hasarı" },
  { value: "SIGNAL_FAILURE", label: "Sinyalizasyon arızası" },
  { value: "SENSOR_ISSUE", label: "Sensör sorunu" },
  { value: "OTHER", label: "Diğer" },
];

export const fieldReportSeverityOptions: ReadonlyArray<{
  value: FieldReportSeverity;
  label: string;
}> = [
  { value: "LOW", label: "Düşük" },
  { value: "MEDIUM", label: "Orta" },
  { value: "HIGH", label: "Yüksek" },
];

const statusLabels: Record<FieldReportStatus, string> = {
  PENDING_REVIEW: "Onay bekliyor",
  VERIFIED: "Doğrulandı",
  REJECTED: "Reddedildi",
  RESOLVED: "Çözüldü",
};

export function getFieldReportCategoryLabel(category: FieldReportCategory) {
  return (
    fieldReportCategoryOptions.find((option) => option.value === category)
      ?.label ?? category
  );
}

export function getFieldReportSeverityLabel(severity: FieldReportSeverity) {
  return (
    fieldReportSeverityOptions.find((option) => option.value === severity)
      ?.label ?? severity
  );
}

export function getFieldReportStatusLabel(status: FieldReportStatus) {
  return statusLabels[status];
}
