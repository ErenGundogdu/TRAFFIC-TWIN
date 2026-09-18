import { randomUUID } from "node:crypto";

import {
  operatorNoteSchema,
  type CreateOperatorNote,
  type OperatorNote,
} from "@traffic-twin/contracts";
import { desc, eq } from "drizzle-orm";

import { ApplicationError } from "../../common/errors/application-error.js";
import type { Database } from "../../infrastructure/database/client.js";
import {
  operatorNotes,
  trafficAssets,
} from "../../infrastructure/database/schema.js";

export class AssetNotFoundError extends ApplicationError {
  constructor(id: string) {
    const message = `Traffic asset '${id}' was not found.`;
    super(message, {
      code: "TRAFFIC_ASSET_NOT_FOUND",
      kind: "NOT_FOUND",
      publicMessage: message,
    });
  }
}

export interface OperatorNoteRepository {
  create(input: CreateOperatorNote): Promise<OperatorNote>;
  listForAsset(assetId: string): Promise<OperatorNote[]>;
}

export class PostgresOperatorNoteRepository implements OperatorNoteRepository {
  constructor(private readonly database: Database) {}

  async create(input: CreateOperatorNote): Promise<OperatorNote> {
    const [asset] = await this.database
      .select({ coverageAreaId: trafficAssets.coverageAreaId })
      .from(trafficAssets)
      .where(eq(trafficAssets.id, input.assetId))
      .limit(1);

    if (!asset) {
      throw new AssetNotFoundError(input.assetId);
    }

    const [row] = await this.database
      .insert(operatorNotes)
      .values({
        id: randomUUID(),
        coverageAreaId: asset.coverageAreaId,
        ...input,
      })
      .returning();

    if (!row) throw new Error("Operator note could not be persisted.");

    return toOperatorNote(row);
  }

  async listForAsset(assetId: string): Promise<OperatorNote[]> {
    const rows = await this.database
      .select()
      .from(operatorNotes)
      .where(eq(operatorNotes.assetId, assetId))
      .orderBy(desc(operatorNotes.createdAt));

    return rows.map(toOperatorNote);
  }
}

function toOperatorNote(row: typeof operatorNotes.$inferSelect): OperatorNote {
  return operatorNoteSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
  });
}
