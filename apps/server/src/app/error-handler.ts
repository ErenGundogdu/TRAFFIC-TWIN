import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { sendApiError } from "../common/http/send-api-error.js";
import {
  HistoryAssetNotFoundError,
  HistoryCoverageAreaNotFoundError,
} from "../modules/analytics/history-service.js";
import { CoverageAreaNotFoundError } from "../modules/asset-catalog/station-catalog-service.js";
import {
  FieldReportCoverageNotFoundError,
  FieldReportOutsideCoverageError,
} from "../modules/field-reports/field-report-service.js";
import { AssetNotFoundError } from "../modules/operator-notes/operator-note-repository.js";
import { FintrafficResponseError } from "../modules/providers/fintraffic/client.js";
import {
  HistoryImportAssetNotFoundError,
  HistoryImportCoverageNotFoundError,
} from "../modules/ingestion/history-import-planning-service.js";
import {
  HistoryImportJobConflictError,
  HistoryImportJobNotFoundError,
  HistoryImportNothingToDoError,
} from "../modules/ingestion/history-import-job-service.js";
import { OverpassResponseError } from "../modules/providers/openstreetmap/client.js";
import { RoadContextNotFoundError } from "../modules/road-context/road-context-service.js";
import { TrafficEventContextNotFoundError } from "../modules/traffic-events/traffic-event-context-service.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  void _next;

  if (error instanceof CoverageAreaNotFoundError) {
    sendApiError(response, {
      status: 404,
      code: "COVERAGE_AREA_NOT_FOUND",
      message: error.message,
    });
    return;
  }

  if (
    error instanceof HistoryCoverageAreaNotFoundError ||
    error instanceof HistoryAssetNotFoundError ||
    error instanceof HistoryImportCoverageNotFoundError ||
    error instanceof HistoryImportAssetNotFoundError
  ) {
    sendApiError(response, {
      status: 404,
      code: "HISTORY_SCOPE_NOT_FOUND",
      message: error.message,
    });
    return;
  }

  if (error instanceof HistoryImportJobNotFoundError) {
    sendApiError(response, {
      status: 404,
      code: "HISTORY_IMPORT_JOB_NOT_FOUND",
      message: error.message,
    });
    return;
  }

  if (
    error instanceof HistoryImportJobConflictError ||
    error instanceof HistoryImportNothingToDoError
  ) {
    sendApiError(response, {
      status: 409,
      code:
        error instanceof HistoryImportJobConflictError
          ? "HISTORY_IMPORT_JOB_CONFLICT"
          : "HISTORY_IMPORT_NOTHING_TO_DO",
      message: error.message,
    });
    return;
  }

  if (error instanceof FintrafficResponseError) {
    sendApiError(response, {
      status: 502,
      code: "FINTRAFFIC_UNAVAILABLE",
      message: "Fintraffic verisi şu anda alınamıyor.",
    });
    return;
  }

  if (error instanceof OverpassResponseError) {
    console.error("OpenStreetMap Overpass request failed.", {
      upstreamStatus: error.status,
      message: error.message,
      cause: error.cause,
    });
    sendApiError(response, {
      status: 502,
      code: "OPENSTREETMAP_UNAVAILABLE",
      message: "OpenStreetMap yol bağlamı şu anda alınamıyor.",
    });
    return;
  }

  if (error instanceof RoadContextNotFoundError) {
    sendApiError(response, {
      status: 404,
      code: "ROAD_CONTEXT_SCOPE_NOT_FOUND",
      message: "İstasyon veya kapsama alanı bulunamadı.",
    });
    return;
  }

  if (error instanceof TrafficEventContextNotFoundError) {
    sendApiError(response, {
      status: 404,
      code: "TRAFFIC_EVENT_CONTEXT_SCOPE_NOT_FOUND",
      message: "İstasyon veya kapsama alanı bulunamadı.",
    });
    return;
  }

  if (error instanceof FieldReportCoverageNotFoundError) {
    sendApiError(response, {
      status: 404,
      code: "FIELD_REPORT_COVERAGE_NOT_FOUND",
      message: "Saha bildirimi kapsama alanı bulunamadı.",
    });
    return;
  }

  if (error instanceof FieldReportOutsideCoverageError) {
    sendApiError(response, {
      status: 400,
      code: "FIELD_REPORT_OUTSIDE_COVERAGE",
      message: "Seçilen konum kapsama alanının dışında.",
    });
    return;
  }

  if (error instanceof AssetNotFoundError) {
    sendApiError(response, {
      status: 404,
      code: "TRAFFIC_ASSET_NOT_FOUND",
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError) {
    sendApiError(response, {
      status: 400,
      code: "INVALID_REQUEST",
      message: "İstek doğrulanamadı.",
      details: error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.map((segment) =>
          typeof segment === "symbol"
            ? (segment.description ?? "symbol")
            : segment,
        ),
      })),
    });
    return;
  }

  console.error(error);
  sendApiError(response, {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Beklenmeyen bir sunucu hatası oluştu.",
  });
};
