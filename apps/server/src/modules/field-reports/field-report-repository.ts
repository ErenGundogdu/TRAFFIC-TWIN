import { randomUUID } from "node:crypto";

import {
  fieldReportSchema,
  type CreateFieldReport,
  type FieldReport,
} from "@traffic-twin/contracts";
import { desc, eq, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import { fieldReports } from "../../infrastructure/database/schema.js";

export interface FieldReportRepository {
  create(input: CreateFieldReport, observedAt: Date): Promise<FieldReport>;
  listCoverage(coverageAreaId: string): Promise<FieldReport[]>;
}

export class PostgresFieldReportRepository implements FieldReportRepository {
  constructor(private readonly database: Database) {}

  async create(
    input: CreateFieldReport,
    observedAt: Date,
  ): Promise<FieldReport> {
    const [row] = await this.database
      .insert(fieldReports)
      .values({
        id: randomUUID(),
        coverageAreaId: input.coverageAreaId,
        author: input.author,
        category: input.category,
        severity: input.severity,
        description: input.description,
        location: sql`ST_SetSRID(ST_MakePoint(${input.location.longitude}, ${input.location.latitude}), 4326)`,
        observedAt,
      })
      .returning();

    if (!row) throw new Error("Field report could not be persisted.");
    return toFieldReport(row);
  }

  async listCoverage(coverageAreaId: string): Promise<FieldReport[]> {
    const rows = await this.database
      .select()
      .from(fieldReports)
      .where(eq(fieldReports.coverageAreaId, coverageAreaId))
      .orderBy(desc(fieldReports.createdAt));

    return rows.map(toFieldReport);
  }
}

function toFieldReport(row: typeof fieldReports.$inferSelect): FieldReport {
  return fieldReportSchema.parse({
    ...row,
    location: {
      longitude: row.location.x,
      latitude: row.location.y,
    },
    observedAt: row.observedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });
}
