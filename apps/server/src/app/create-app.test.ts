import {
  apiErrorResponseSchema,
  historyImportPlanResponseSchema,
} from "@traffic-twin/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./create-app.js";
import { parseEnv } from "../config/env.js";
import { OperatorNoteService } from "../modules/operator-notes/operator-note-service.js";
import { HistoryImportPlanningService } from "../modules/ingestion/history-import-planning-service.js";

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
