import {
  apiErrorResponseSchema,
  historyImportJobResponseSchema,
  historyImportPlanResponseSchema,
} from "@traffic-twin/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./create-app.js";
import { parseEnv } from "../config/env.js";
import { OperatorNoteService } from "../modules/operator-notes/operator-note-service.js";
import { HistoryImportPlanningService } from "../modules/ingestion/history-import-planning-service.js";
import { HistoryImportJobService } from "../modules/ingestion/history-import-job-service.js";

describe("GET /health", () => {
  it("reports that the HTTP application is healthy", async () => {
    const response = await request(
      createApp(parseEnv({ NODE_ENV: "test" })),
    ).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
  });
});

describe("API error boundary", () => {
  it("returns one typed and traceable validation error shape", async () => {
    const operatorNoteService = new OperatorNoteService({
      create: async () => {
        throw new Error("Not used in this test.");
      },
      listForAsset: async () => [],
    });
    const response = await request(
      createApp(parseEnv({ NODE_ENV: "test" }), { operatorNoteService }),
    ).get("/api/operator-notes?assetId=%20");
    const body = apiErrorResponseSchema.parse(response.body);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: {
        code: "INVALID_REQUEST",
        message: "İstek doğrulanamadı.",
        requestId: response.headers["x-request-id"],
        details: [
          {
            code: "too_small",
            path: ["assetId"],
          },
        ],
      },
    });
    expect(Date.parse(body.error.timestamp)).not.toBeNaN();
  });
});

describe("GET /api/coverage-areas/:coverageAreaId/history-import-plan", () => {
  it("returns a typed plan derived from the persisted manifest", async () => {
    const historyImportPlanningService = new HistoryImportPlanningService(
      {
        findCoverageArea: async () => ({
          id: "helsinki",
          name: "Helsinki metropol bölgesi",
          timeZone: "Europe/Helsinki",
          bbox: [24.5, 60.1, 25.25, 60.45],
        }),
        listStations: async () => [
          {
            id: "fintraffic-tms:20002",
            providerStationId: 20002,
            tmsNumber: 20002,
            name: "vt1_Espoo_Hirvisuo",
            longitude: 24.637997,
            latitude: 60.220898,
            bearing: 298,
          },
        ],
      },
      { listArtifactsForAssetDateRange: async () => [] },
    );
    const response = await request(
      createApp(parseEnv({ NODE_ENV: "test" }), {
        historyImportPlanningService,
      }),
    ).get(
      "/api/coverage-areas/helsinki/history-import-plan" +
        "?assetId=fintraffic-tms%3A20002&from=2026-09-01&to=2026-09-02",
    );
    const body = historyImportPlanResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({ missingDayCount: 2 });
    expect(body.days.map((day) => day.sourceDate)).toEqual([
      "2026-09-01",
      "2026-09-02",
    ]);
  });
});

describe("history import job API", () => {
  it("accepts a typed job and exposes its canonical progress", async () => {
    const jobId = "c69f5f1c-0a39-42ec-a290-d435bfa00001";
    const persistedJob = {
      id: jobId,
      coverageAreaId: "helsinki",
      assetId: "fintraffic-tms:20002",
      assetName: "vt1_Espoo_Hirvisuo",
      tmsNumber: 20002,
      fromDate: "2026-09-01",
      toDate: "2026-09-02",
      requestedDayCount: 2,
      targetDayCount: 2,
      sourceDates: ["2026-09-01", "2026-09-02"],
      completedDayCount: 0,
      successfulDayCount: 0,
      failedDayCount: 0,
      skippedDayCount: 0,
      currentSourceDate: null,
      status: "QUEUED" as const,
      createdAt: new Date("2026-09-03T08:00:00Z"),
      startedAt: null,
      completedAt: null,
      updatedAt: new Date("2026-09-03T08:00:00Z"),
    };
    const planningService = new HistoryImportPlanningService(
      {
        findCoverageArea: async () => ({
          id: "helsinki",
          name: "Helsinki metropol bölgesi",
          timeZone: "Europe/Helsinki",
          bbox: [24.5, 60.1, 25.25, 60.45],
        }),
        listStations: async () => [
          {
            id: persistedJob.assetId,
            providerStationId: persistedJob.tmsNumber,
            tmsNumber: persistedJob.tmsNumber,
            name: persistedJob.assetName,
            longitude: 24.637997,
            latitude: 60.220898,
            bearing: 298,
          },
        ],
      },
      { listArtifactsForAssetDateRange: async () => [] },
    );
    const historyImportJobService = new HistoryImportJobService(
      planningService,
      {
        create: async () => persistedJob,
        findById: async () => persistedJob,
      },
      undefined,
      () => jobId,
    );
    const app = createApp(parseEnv({ NODE_ENV: "test" }), {
      historyImportPlanningService: planningService,
      historyImportJobService,
    });

    const createResponse = await request(app)
      .post("/api/coverage-areas/helsinki/history-import-jobs")
      .send({
        assetId: persistedJob.assetId,
        from: persistedJob.fromDate,
        to: persistedJob.toDate,
      });
    const getResponse = await request(app).get(
      `/api/coverage-areas/helsinki/history-import-jobs/${jobId}`,
    );

    expect(createResponse.status).toBe(202);
    expect(
      historyImportJobResponseSchema.parse(createResponse.body).job.id,
    ).toBe(jobId);
    expect(getResponse.status).toBe(200);
    expect(
      historyImportJobResponseSchema.parse(getResponse.body).job.status,
    ).toBe("QUEUED");
  });
});
