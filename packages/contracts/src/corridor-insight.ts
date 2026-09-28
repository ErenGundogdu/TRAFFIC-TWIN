import { z } from "zod";

import { trafficDirectionHeadingSchema } from "./station-catalog.js";

export const corridorSummarySchema = z.object({
  id: z.string().min(1),
  roadRef: z.string().min(1),
  stationIds: z.array(z.string().min(1)).min(3),
});

export const corridorCatalogResponseSchema = z.object({
  coverageAreaId: z.string().min(1),
  generatedAt: z.iso.datetime(),
  policyVersion: z.literal("verified-road-corridor-catalog-v1"),
  minimumStationCount: z.literal(3),
  corridors: z.array(corridorSummarySchema),
  source: z.object({
    roadNetwork: z.literal("OpenStreetMap"),
    traffic: z.literal("Fintraffic TMS"),
  }),
});

export const corridorInsightStatusSchema = z.enum([
  "BALANCED",
  "LOCAL_SLOWDOWN",
  "WIDESPREAD_SLOWDOWN",
  "PEER_SLOWDOWN",
  "INSUFFICIENT_DATA",
]);

export const corridorStationReadingSchema = z.object({
  assetId: z.string().min(1),
  name: z.string().min(1),
  tmsNumber: z.number().int().positive(),
  direction: z.union([z.literal(1), z.literal(2)]),
  heading: trafficDirectionHeadingSchema.nullable(),
  distanceMeters: z.number().nonnegative(),
  averageSpeedKmh: z.number().nonnegative(),
  speedPercentOfFreeFlow: z.number().nonnegative(),
  flowVehiclesPerHour: z.number().nonnegative().nullable(),
  measuredAt: z.iso.datetime(),
});

export const corridorDirectionInsightSchema = z.object({
  direction: z.union([z.literal(1), z.literal(2)]),
  status: corridorInsightStatusSchema,
  selected: corridorStationReadingSchema.nullable(),
  peers: z.array(corridorStationReadingSchema),
  peerMedianSpeedPercentOfFreeFlow: z.number().nonnegative().nullable(),
  selectedDifferencePercentagePoints: z.number().nullable(),
});

export const corridorInsightResponseSchema = z.object({
  assetId: z.string().min(1),
  roadRef: z.string().min(1).nullable(),
  roadContextStatus: z.enum(["MATCHED", "NO_MATCH"]),
  roadContextFreshness: z.enum(["FRESH", "STALE"]),
  generatedAt: z.iso.datetime(),
  policyVersion: z.literal("verified-road-live-corridor-v1"),
  directions: z.array(corridorDirectionInsightSchema).length(2),
  source: z.object({
    roadNetwork: z.literal("OpenStreetMap"),
    traffic: z.literal("Fintraffic TMS"),
  }),
});

export type CorridorInsightStatus = z.infer<typeof corridorInsightStatusSchema>;
export type CorridorSummary = z.infer<typeof corridorSummarySchema>;
export type CorridorCatalogResponse = z.infer<
  typeof corridorCatalogResponseSchema
>;
export type CorridorStationReading = z.infer<
  typeof corridorStationReadingSchema
>;
export type CorridorDirectionInsight = z.infer<
  typeof corridorDirectionInsightSchema
>;
export type CorridorInsightResponse = z.infer<
  typeof corridorInsightResponseSchema
>;
