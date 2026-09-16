import type { TrafficEvent } from "@traffic-twin/contracts";
import { desc, eq } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  trafficEvents,
  trafficEventSyncs,
} from "../../infrastructure/database/schema.js";

interface ReplaceTrafficEventsInput {
  events: TrafficEvent[];
  sourceUpdatedAt: string | null;
  fetchedAt: string;
}

export interface TrafficEventRepository {
  replaceCoverage(
    coverageAreaId: string,
    input: ReplaceTrafficEventsInput,
  ): Promise<void>;
  listCoverage(coverageAreaId: string): Promise<{
    events: TrafficEvent[];
    sourceUpdatedAt: string | null;
    fetchedAt: string | null;
  }>;
}

export class PostgresTrafficEventRepository implements TrafficEventRepository {
  constructor(private readonly database: Database) {}

  async replaceCoverage(
    coverageAreaId: string,
    input: ReplaceTrafficEventsInput,
  ) {
    await this.database.transaction(async (transaction) => {
      await transaction
        .insert(trafficEventSyncs)
        .values({
          coverageAreaId,
          sourceUpdatedAt: input.sourceUpdatedAt
            ? new Date(input.sourceUpdatedAt)
            : null,
          fetchedAt: new Date(input.fetchedAt),
        })
        .onConflictDoUpdate({
          target: trafficEventSyncs.coverageAreaId,
          set: {
            sourceUpdatedAt: input.sourceUpdatedAt
              ? new Date(input.sourceUpdatedAt)
              : null,
            fetchedAt: new Date(input.fetchedAt),
          },
        });

      await transaction
        .delete(trafficEvents)
        .where(eq(trafficEvents.coverageAreaId, coverageAreaId));

      if (input.events.length === 0) return;
      await transaction.insert(trafficEvents).values(
        input.events.map((event) => ({
          ...event,
          coverageAreaId,
          releaseTime: new Date(event.releaseTime),
          versionTime: new Date(event.versionTime),
          startsAt: event.startsAt ? new Date(event.startsAt) : null,
          endsAt: event.endsAt ? new Date(event.endsAt) : null,
          updatedAt: new Date(),
        })),
      );
    });
  }

  async listCoverage(coverageAreaId: string) {
    const [rows, syncRows] = await Promise.all([
      this.database
        .select()
        .from(trafficEvents)
        .where(eq(trafficEvents.coverageAreaId, coverageAreaId))
        .orderBy(desc(trafficEvents.versionTime)),
      this.database
        .select()
        .from(trafficEventSyncs)
        .where(eq(trafficEventSyncs.coverageAreaId, coverageAreaId))
        .limit(1),
    ]);
    const sync = syncRows[0];

    return {
      events: rows.map(toTrafficEvent),
      sourceUpdatedAt: sync?.sourceUpdatedAt?.toISOString() ?? null,
      fetchedAt: sync?.fetchedAt.toISOString() ?? null,
    };
  }
}

export function toTrafficEvent(
  row: typeof trafficEvents.$inferSelect,
): TrafficEvent {
  return {
    id: row.id,
    providerEventId: row.providerEventId,
    category: row.category,
    status: row.status,
    severity: row.severity,
    title: row.title,
    description: row.description,
    comment: row.comment,
    effects: row.effects,
    direction: row.direction,
    directionDescription: row.directionDescription,
    sender: row.sender,
    language: row.language,
    geometry: row.geometry,
    roadNumbers: row.roadNumbers,
    releaseTime: row.releaseTime.toISOString(),
    versionTime: row.versionTime.toISOString(),
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
  };
}
