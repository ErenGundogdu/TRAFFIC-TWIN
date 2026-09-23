import type { FieldReport, FieldReportLocation } from "@traffic-twin/contracts";
import { Marker } from "react-map-gl/maplibre";

import { TrafficAssetIcon } from "@/shared/ui";

const severityClassNames = {
  LOW: "bg-amber-400",
  MEDIUM: "bg-orange-500",
  HIGH: "bg-rose-600",
} as const;

export function FieldReportMapLayer({
  reports,
  selectedReportId,
  draftLocation,
  onSelect,
}: {
  reports: FieldReport[];
  selectedReportId: string | null;
  draftLocation: FieldReportLocation | null;
  onSelect?: (reportId: string | null) => void;
}) {
  return (
    <>
      {reports
        .filter(
          (report) =>
            report.status !== "REJECTED" && report.status !== "RESOLVED",
        )
        .map((report) => {
          const selected = report.id === selectedReportId;
          return (
            <Marker
              key={report.id}
              longitude={report.location.longitude}
              latitude={report.location.latitude}
              anchor="bottom"
            >
              <button
                type="button"
                aria-label={`${report.category} saha bildirimi, ${report.severity} önem`}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect?.(report.id);
                }}
                className={`traffic-map-marker relative grid size-9 place-items-center rounded-t-xl rounded-br-xl border-2 border-white text-white shadow-xl transition hover:-translate-y-0.5 hover:scale-110 ${
                  report.status === "VERIFIED"
                    ? "bg-blue-600"
                    : severityClassNames[report.severity]
                } ${selected ? "-translate-y-0.5 scale-110 ring-4 ring-slate-950/25" : ""}`}
              >
                <TrafficAssetIcon kind="field-report" className="size-5" />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-white bg-inherit"
                />
              </button>
            </Marker>
          );
        })}
      {draftLocation ? (
        <Marker
          longitude={draftLocation.longitude}
          latitude={draftLocation.latitude}
          anchor="bottom"
        >
          <span className="grid size-11 animate-pulse place-items-center rounded-full border-4 border-rose-500 bg-white text-rose-600 shadow-2xl dark:bg-slate-900">
            <TrafficAssetIcon kind="field-report" className="size-5" />
          </span>
        </Marker>
      ) : null}
    </>
  );
}
