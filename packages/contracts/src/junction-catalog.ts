import { z } from "zod";

import { coverageAreaSchema } from "./station-catalog.js";

export const junctionCoverageSchema = z.enum([
  "FULL",
  "PARTIAL",
  "INSUFFICIENT",
]);
export const junctionMatchConfidenceSchema = z.enum(["HIGH", "MEDIUM"]);

export const junctionSensorMatchSchema = z.object({
  assetId: z.string().min(1),
  name: z.string().min(1),
  roadRef: z.string().min(1),
  distanceMeters: z.number().nonnegative(),
  bearingDifferenceDegrees: z.number().min(0).max(90).nullable(),
  confidence: junctionMatchConfidenceSchema,
});

export const junctionSummarySchema = z.object({
  id: z.string().min(1),
  osmRelationId: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  roadRefs: z.array(z.string().min(1)),
  coverage: junctionCoverageSchema,
  policyVersion: z.string().min(1),
  sourceUpdatedAt: z.iso.datetime(),
  sensors: z.array(junctionSensorMatchSchema),
});

export const junctionDataSourceSchema = z.object({
  id: z.literal("openstreetmap"),
  name: z.literal("OpenStreetMap"),
  attribution: z.string().min(1),
  licenseUrl: z.url(),
  fetchedAt: z.iso.datetime().nullable(),
});

export const junctionCatalogResponseSchema = z.object({
  coverageArea: coverageAreaSchema,
  source: junctionDataSourceSchema,
  junctions: z.array(junctionSummarySchema),
});

export type JunctionCoverage = z.infer<typeof junctionCoverageSchema>;
export type JunctionMatchConfidence = z.infer<
  typeof junctionMatchConfidenceSchema
>;
export type JunctionSensorMatch = z.infer<typeof junctionSensorMatchSchema>;
export type JunctionSummary = z.infer<typeof junctionSummarySchema>;
export type JunctionCatalogResponse = z.infer<
  typeof junctionCatalogResponseSchema
>;
