import { z } from "zod";

import { stationSummarySchema } from "./station-catalog.js";
import { apiErrorDescriptorSchema } from "./api-error.js";
import type {
  CreateFieldReport,
  FieldReport,
  FieldReportAcknowledgement,
} from "./field-report.js";

export const REALTIME_EVENTS = {
  coverageSubscribe: "coverage:subscribe",
  trafficBatch: "traffic:batch",
  noteCreate: "operator-note:create",
  noteCreated: "operator-note:created",
  fieldReportCreate: "field-report:create",
  fieldReportCreated: "field-report:created",
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

export const operatorNoteCategorySchema = z.enum([
  "GENERAL",
  "MAINTENANCE",
  "FAULT",
  "INSPECTION",
]);

export const operatorNoteStatusSchema = z.enum([
  "INFORMATIONAL",
  "ACTION_REQUIRED",
  "RESOLVED",
]);

export const createOperatorNoteSchema = z.object({
  assetId: z.string().min(1),
  author: z.string().trim().min(2).max(80),
  category: operatorNoteCategorySchema,
  status: operatorNoteStatusSchema,
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
    error: apiErrorDescriptorSchema,
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

export const replayResolutionSchema = z.enum(["minute", "hour"]);

// Minute frames come only from the narrow raw-CSV pilot, where a long
// playback would mean tens of thousands of frames for little real benefit.
// Hour frames draw on the broad bulk statistics import, so a whole month is
// still a modest frame count and a genuinely useful playback range.
export const REPLAY_MAXIMUM_RANGE_DAYS: Record<ReplayResolution, number> = {
  minute: 2,
  hour: 30,
};

export const replayStartSchema = z
  .object({
    coverageAreaId: z.string().min(1),
    assetIds: z.array(z.string().min(1)).min(1).max(2),
    direction: z.union([z.literal(1), z.literal(2)]),
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    speed: replaySpeedSchema,
    resolution: replayResolutionSchema.default("minute"),
  })
  .refine((value) => new Date(value.from) < new Date(value.to), {
    message: "Başlangıç zamanı bitişten önce olmalıdır.",
    path: ["to"],
  })
  .refine(
    (value) =>
      new Date(value.to).getTime() - new Date(value.from).getTime() <=
      REPLAY_MAXIMUM_RANGE_DAYS[value.resolution] * 86_400_000,
    {
      message: "Seçilen çözünürlük için replay aralığı sınırı aşıldı.",
      path: ["to"],
    },
  );

export const replayControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("stop") }),
  z.object({ action: z.literal("set-speed"), speed: replaySpeedSchema }),
  z.object({ action: z.literal("seek"), timestamp: z.iso.datetime() }),
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
    error: apiErrorDescriptorSchema,
  }),
]);

export type TrafficBatch = z.infer<typeof trafficBatchSchema>;
export type CreateOperatorNote = z.infer<typeof createOperatorNoteSchema>;
export type OperatorNote = z.infer<typeof operatorNoteSchema>;
export type OperatorNoteCategory = z.infer<typeof operatorNoteCategorySchema>;
export type OperatorNoteStatus = z.infer<typeof operatorNoteStatusSchema>;
export type NoteAcknowledgement = z.infer<typeof noteAcknowledgementSchema>;
export type ReplaySpeed = z.infer<typeof replaySpeedSchema>;
export type ReplayResolution = z.infer<typeof replayResolutionSchema>;
export type ReplayStart = z.infer<typeof replayStartSchema>;
export type ReplayControl = z.infer<typeof replayControlSchema>;
export type ReplayFrame = z.infer<typeof replayFrameSchema>;
export type ReplayStartAcknowledgement = z.infer<
  typeof replayStartAcknowledgementSchema
>;

export interface ServerToClientEvents {
  "field-report:created": (report: FieldReport) => void;
  "operator-note:created": (note: OperatorNote) => void;
  "replay:ended": () => void;
  "replay:frame": (frame: ReplayFrame) => void;
  "traffic:batch": (batch: TrafficBatch) => void;
}

export interface ClientToServerEvents {
  "coverage:subscribe": (subscription: CoverageSubscription) => void;
  "field-report:create": (
    command: CreateFieldReport,
    acknowledge: (response: FieldReportAcknowledgement) => void,
  ) => void;
  "operator-note:create": (
    command: CreateOperatorNote,
    acknowledge: (response: NoteAcknowledgement) => void,
  ) => void;
  "replay:control": (command: ReplayControl) => void;
  "replay:start": (
    command: ReplayStart,
    acknowledge: (response: ReplayStartAcknowledgement) => void,
  ) => void;
}

export type CoverageSubscription = z.infer<typeof coverageSubscriptionSchema>;
