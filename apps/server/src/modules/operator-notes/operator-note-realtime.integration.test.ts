import { createServer } from "node:http";

import {
  REALTIME_EVENTS,
  noteAcknowledgementSchema,
  operatorNoteSchema,
  type OperatorNote,
} from "@traffic-twin/contracts";
import { eq } from "drizzle-orm";
import { io as createClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import { operatorNotes } from "../../infrastructure/database/schema.js";
import { PostgresStationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { PostgresOperatorNoteRepository } from "./operator-note-repository.js";
import { OperatorNoteService } from "./operator-note-service.js";
import { createRealtimeServer } from "../../realtime/create-realtime-server.js";

describe("operator note realtime flow", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );
  const httpServer = createServer();
  const realtime = createRealtimeServer(
    httpServer,
    "http://localhost:3000",
    new OperatorNoteService(new PostgresOperatorNoteRepository(connection.db)),
    {
      load: async () => [
        {
          timestamp: "2026-09-02T21:00:00Z",
          values: [
            {
              assetId: "fintraffic-tms:20002",
              averageSpeedKmh: 88,
              vehicleCount: 3,
              sampleCount: 3,
            },
          ],
        },
        {
          timestamp: "2026-09-02T21:01:00Z",
          values: [
            {
              assetId: "fintraffic-tms:20002",
              averageSpeedKmh: 72,
              vehicleCount: 14,
              sampleCount: 14,
            },
          ],
        },
      ],
    },
  );
  let url: string;
  const clients: Socket[] = [];

  beforeAll(async () => {
    await new PostgresStationCatalogRepository(connection.db).upsertStations(
      "helsinki",
      [
        {
          id: "fintraffic-tms:20002",
          providerStationId: 20002,
          tmsNumber: 20002,
          name: "vt1_Espoo_Hirvisuo",
          longitude: 24.637997,
          latitude: 60.220898,
          bearing: 298,
          freshness: "FRESH",
          directions: [
            {
              direction: 1,
              label: "Yön 1",
              averageSpeedKmh: 93,
              flowVehiclesPerHour: 1488,
              measuredAt: "2026-09-04T09:03:35Z",
            },
            {
              direction: 2,
              label: "Yön 2",
              averageSpeedKmh: 103,
              flowVehiclesPerHour: 612,
              measuredAt: "2026-09-04T09:03:35Z",
            },
          ],
        },
      ],
      new Date("2026-09-04T09:03:35Z"),
    );

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string")
      throw new Error("No test port.");
    url = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    clients.forEach((client) => client.disconnect());
    await realtime.close();
    await connection.pool.end();
  });

  it("acknowledges and broadcasts the same persisted canonical note to two clients", async () => {
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

    const seenByFirst = new Promise<OperatorNote>((resolve) =>
      first.once(REALTIME_EVENTS.noteCreated, (payload) =>
        resolve(operatorNoteSchema.parse(payload)),
      ),
    );
    const seenBySecond = new Promise<OperatorNote>((resolve) =>
      second.once(REALTIME_EVENTS.noteCreated, (payload) =>
        resolve(operatorNoteSchema.parse(payload)),
      ),
    );
    const acknowledgement = new Promise((resolve) =>
      first.emit(
        REALTIME_EVENTS.noteCreate,
        {
          assetId: "fintraffic-tms:20002",
          author: "Test Operatörü",
          content: "Entegrasyon testi saha notu.",
        },
        resolve,
      ),
    );

    const [ack, firstNote, secondNote] = await Promise.all([
      acknowledgement.then((value) => noteAcknowledgementSchema.parse(value)),
      seenByFirst,
      seenBySecond,
    ]);

    expect(ack.ok).toBe(true);
    expect(firstNote).toEqual(secondNote);
    if (ack.ok) expect(ack.note).toEqual(firstNote);

    const [persisted] = await connection.db
      .select()
      .from(operatorNotes)
      .where(eq(operatorNotes.id, firstNote.id));
    expect(persisted?.content).toBe("Entegrasyon testi saha notu.");

    await connection.db
      .delete(operatorNotes)
      .where(eq(operatorNotes.id, firstNote.id));
  });

  it("acknowledges replay and emits its canonical frame", async () => {
    const client = await new Promise<Socket>((resolve) => {
      const socket = createClient(url, { reconnection: false });
      clients.push(socket);
      socket.on("connect", () => resolve(socket));
    });
    const frame = new Promise((resolve) =>
      client.once(REALTIME_EVENTS.replayFrame, resolve),
    );
    const acknowledgement = new Promise((resolve) =>
      client.emit(
        REALTIME_EVENTS.replayStart,
        {
          coverageAreaId: "helsinki",
          assetIds: ["fintraffic-tms:20002"],
          direction: 1,
          from: "2026-09-02T21:00:00Z",
          to: "2026-09-03T21:00:00Z",
          speed: 32,
        },
        resolve,
      ),
    );

    await expect(acknowledgement).resolves.toMatchObject({
      ok: true,
      frameCount: 2,
    });
    await expect(frame).resolves.toMatchObject({
      timestamp: "2026-09-02T21:00:00Z",
    });
  });

  it("seeks to the nearest canonical replay frame", async () => {
    const client = await new Promise<Socket>((resolve) => {
      const socket = createClient(url, { reconnection: false });
      clients.push(socket);
      socket.on("connect", () => resolve(socket));
    });
    const acknowledgement = new Promise((resolve) =>
      client.emit(
        REALTIME_EVENTS.replayStart,
        {
          coverageAreaId: "helsinki",
          assetIds: ["fintraffic-tms:20002"],
          direction: 1,
          from: "2026-09-02T21:00:00Z",
          to: "2026-09-03T21:00:00Z",
          speed: 1,
        },
        resolve,
      ),
    );
    await acknowledgement;
    client.emit(REALTIME_EVENTS.replayControl, { action: "pause" });

    const soughtFrame = new Promise((resolve) =>
      client.once(REALTIME_EVENTS.replayFrame, resolve),
    );
    client.emit(REALTIME_EVENTS.replayControl, {
      action: "seek",
      timestamp: "2026-09-02T21:00:40Z",
    });

    await expect(soughtFrame).resolves.toMatchObject({
      timestamp: "2026-09-02T21:01:00Z",
      values: [{ averageSpeedKmh: 72, vehicleCount: 14 }],
    });
  });
});
