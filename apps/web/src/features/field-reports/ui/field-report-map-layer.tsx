import type { FieldReport, FieldReportLocation } from "@traffic-twin/contracts";
import { Layer, Source } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";

import {
  createFieldReportDraftGeoJson,
  createFieldReportGeoJson,
} from "../lib/field-report-map-data";

export const FIELD_REPORT_LAYER_ID = "field-report-points";

const fieldReportLayer: LayerProps = {
  id: FIELD_REPORT_LAYER_ID,
  type: "circle",
  paint: {
    "circle-radius": ["case", ["boolean", ["get", "selected"], false], 11, 8],
    "circle-color": [
      "match",
      ["get", "status"],
      "VERIFIED",
      "#2563eb",
      "#f59e0b",
    ],
    "circle-stroke-color": [
      "case",
      ["boolean", ["get", "selected"], false],
      "#0f172a",
      "#ffffff",
    ],
    "circle-stroke-width": [
      "case",
      ["boolean", ["get", "selected"], false],
      4,
      2,
    ],
  },
};

const draftLayer: LayerProps = {
  id: "field-report-draft-point",
  type: "circle",
  paint: {
    "circle-radius": 12,
    "circle-color": "#ffffff",
    "circle-stroke-color": "#e11d48",
    "circle-stroke-width": 4,
  },
};

export function FieldReportMapLayer({
  reports,
  selectedReportId,
  draftLocation,
}: {
  reports: FieldReport[];
  selectedReportId: string | null;
  draftLocation: FieldReportLocation | null;
}) {
  return (
    <>
      <Source
        id="field-reports-source"
        type="geojson"
        data={createFieldReportGeoJson(reports, selectedReportId)}
      >
        <Layer {...fieldReportLayer} />
      </Source>
      <Source
        id="field-report-draft-source"
        type="geojson"
        data={createFieldReportDraftGeoJson(draftLocation)}
      >
        <Layer {...draftLayer} />
      </Source>
    </>
  );
}
