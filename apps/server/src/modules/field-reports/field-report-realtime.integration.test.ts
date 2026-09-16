import { createServer } from "node:http";

import {
  REALTIME_EVENTS,
  fieldReportAcknowledgementSchema,
  fieldReportSchema,
  type FieldReport,
} from "@traffic-twin/contracts";
import { eq } from "drizzle-orm";
import { io as createClient, type Socket } from "socket.io-client";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import { fieldReports } from "../../infrastructure/database/schema.js";
import { PostgresStationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { PostgresOperatorNoteRepository } from "../operator-notes/operator-note-repository.js";
import { OperatorNoteService } from "../operator-notes/operator-note-service.js";
import { createRealtimeServer } from "../../realtime/create-realtime-server.js";
import { PostgresFieldReportRepository } from "./field-report-repository.js";
import { FieldReportService } from "./field-report-service.js";

describe("field report realtime flow", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );
  const stationRepository = new PostgresStationCatalogRepository(connection.db);
  const reportService = new FieldReportService(
    stationRepository,
    new PostgresFieldReportRepository(connection.db),
    () => new Date("2026-09-15T08:00:00.000Z"),
  );
  const httpServer = createServer();
  const realtime = createRealtimeServer(
    httpServer,
    "http://localhost:3000",
    new OperatorNoteService(new PostgresOperatorNoteRepository(connection.db)),
    { load: async () => [] },
    reportService,
  );
  const clients: Socket[] = [];
  let createdReportId: string | null = null;

  afterAll(async () => {
    clients.forEach((client) => client.disconnect());
    if (createdReportId) {
      await connection.db
        .delete(fieldReports)
        .where(eq(fieldReports.id, createdReportId));
    }
    await realtime.close();
    await connection.pool.end();
  });

  it("persists and broadcasts the same pending canonical report", async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string")
      throw new Error("No test port.");
    const url = `http://127.0.0.1:${address.port}`;

    const connect = () =>
      new Promise<Socket>((resolve) => {
        const client = createClient(url, { reconnection: false });
        clients.push(client);
        client.on("connect", () => {
          client.emit(REALTIME_EVENTS.coverageSubscribe, {
            coverageAreaId: "helsinki",
          });
          resolve(client);
        });
      });
    const [first, second] = await Promise.all([connect(), connect()]);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const firstReceived = new Promise<FieldReport>((resolve) =>
      first.once(REALTIME_EVENTS.fieldReportCreated, (payload) =>
        resolve(fieldReportSchema.parse(payload)),
      ),
    );
    const secondReceived = new Promise<FieldReport>((resolve) =>
      second.once(REALTIME_EVENTS.fieldReportCreated, (payload) =>
        resolve(fieldReportSchema.parse(payload)),
      ),
    );
    const acknowledgement = new Promise((resolve) =>
      first.emit(
        REALTIME_EVENTS.fieldReportCreate,
        {
          coverageAreaId: "helsinki",
          author: "Test Operatörü",
          category: "ACCIDENT",
          severity: "HIGH",
          description: "Sağ şerit kapalı.",
          location: { longitude: 24.94, latitude: 60.17 },
        },
        resolve,
      ),
    );

    const [ack, firstReport, secondReport] = await Promise.all([
      acknowledgement.then((value) =>
        fieldReportAcknowledgementSchema.parse(value),
      ),
      firstReceived,
      secondReceived,
    ]);
    createdReportId = firstReport.id;

    expect(firstReport).toEqual(secondReport);
    expect(firstReport).toMatchObject({
      source: "OPERATOR",
      status: "PENDING_REVIEW",
      location: { longitude: 24.94, latitude: 60.17 },
    });
    if (ack.ok) expect(ack.report).toEqual(firstReport);

    const [persisted] = await connection.db
      .select()
      .from(fieldReports)
      .where(eq(fieldReports.id, firstReport.id));
    expect(persisted?.status).toBe("PENDING_REVIEW");
    expect(persisted?.location).toEqual({ x: 24.94, y: 60.17 });
  });
});
