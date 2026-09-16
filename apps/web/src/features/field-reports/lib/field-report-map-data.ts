import type { FieldReport, FieldReportLocation } from "@traffic-twin/contracts";

export function createFieldReportGeoJson(
  reports: FieldReport[],
  selectedReportId: string | null,
) {
  return {
    type: "FeatureCollection" as const,
    features: reports
      .filter(
        (report) =>
          report.status !== "REJECTED" && report.status !== "RESOLVED",
      )
      .map((report) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [report.location.longitude, report.location.latitude],
        },
        properties: {
          id: report.id,
          kind: "field-report",
          category: report.category,
          severity: report.severity,
          status: report.status,
          selected: report.id === selectedReportId,
        },
      })),
  };
}

export function createFieldReportDraftGeoJson(
  location: FieldReportLocation | null,
) {
  return {
    type: "FeatureCollection" as const,
    features: location
      ? [
          {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [location.longitude, location.latitude],
            },
            properties: { kind: "field-report-draft" },
          },
        ]
      : [],
  };
}
