import { z } from "zod";

import { stationSummarySchema } from "./station-catalog.js";

export const REALTIME_EVENTS = {
  coverageSubscribe: "coverage:subscribe",
  trafficBatch: "traffic:batch",
  noteCreate: "operator-note:create",
  noteCreated: "operator-note:created",
} as const;

export const trafficBatchSchema = z.object({
  coverageAreaId: z.string().min(1),
  sourceUpdatedAt: z.iso.datetime(),
  emittedAt: z.iso.datetime(),
  stations: z.array(stationSummarySchema),
});

export const createOperatorNoteSchema = z.object({
  assetId: z.string().min(1),
  author: z.string().trim().min(2).max(80),
  content: z.string().trim().min(3).max(1_000),
});

export const operatorNoteSchema = createOperatorNoteSchema.extend({
  id: z.uuid(),
  coverageAreaId: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const coverageSubscriptionSchema = z.object({
  coverageAreaId: z.string().min(1),
});

export const noteAcknowledgementSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), note: operatorNoteSchema }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.string().min(1), message: z.string().min(1) }),
  }),
]);

export const operatorNoteListSchema = z.object({
  notes: z.array(operatorNoteSchema),
});

export type TrafficBatch = z.infer<typeof trafficBatchSchema>;
export type CreateOperatorNote = z.infer<typeof createOperatorNoteSchema>;
export type OperatorNote = z.infer<typeof operatorNoteSchema>;
export type NoteAcknowledgement = z.infer<typeof noteAcknowledgementSchema>;
