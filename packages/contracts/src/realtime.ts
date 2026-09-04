import { z } from "zod";

import { stationSummarySchema } from "./station-catalog.js";

export const REALTIME_EVENTS = {
  coverageSubscribe: "coverage:subscribe",
  trafficBatch: "traffic:batch",
  noteCreate: "operator-note:create",
  noteCreated: "operator-note:created",
  replayStart: "replay:start",
  replayControl: "replay:control",
  replayFrame: "replay:frame",
  replayEnded: "replay:ended",
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

export const replaySpeedSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(4),
  z.literal(8),
  z.literal(16),
  z.literal(32),
]);

export const replayStartSchema = z
  .object({
    coverageAreaId: z.string().min(1),
    assetIds: z.array(z.string().min(1)).min(1).max(2),
    direction: z.union([z.literal(1), z.literal(2)]),
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    speed: replaySpeedSchema,
  })
  .refine(
    (value) =>
      new Date(value.from) < new Date(value.to) &&
      new Date(value.to).getTime() - new Date(value.from).getTime() <=
        2 * 86_400_000,
    { message: "Replay aralığı en fazla iki gün olabilir.", path: ["to"] },
  );

export const replayControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("stop") }),
  z.object({ action: z.literal("set-speed"), speed: replaySpeedSchema }),
]);

export const replayFrameSchema = z.object({
  timestamp: z.iso.datetime(),
  values: z.array(
    z.object({
      assetId: z.string().min(1),
      averageSpeedKmh: z.number().nonnegative(),
      vehicleCount: z.number().int().nonnegative(),
      sampleCount: z.number().int().nonnegative(),
    }),
  ),
});

export const replayStartAcknowledgementSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), frameCount: z.number().int().nonnegative() }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export type TrafficBatch = z.infer<typeof trafficBatchSchema>;
export type CreateOperatorNote = z.infer<typeof createOperatorNoteSchema>;
export type OperatorNote = z.infer<typeof operatorNoteSchema>;
export type NoteAcknowledgement = z.infer<typeof noteAcknowledgementSchema>;
export type ReplaySpeed = z.infer<typeof replaySpeedSchema>;
export type ReplayStart = z.infer<typeof replayStartSchema>;
export type ReplayControl = z.infer<typeof replayControlSchema>;
export type ReplayFrame = z.infer<typeof replayFrameSchema>;
export type ReplayStartAcknowledgement = z.infer<
  typeof replayStartAcknowledgementSchema
>;
