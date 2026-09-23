import { z } from "zod";

export const trafficCompositionCellSchema = z.object({
  vehicleCount: z.number().int().nonnegative(),
  speedTotalKmh: z.number().nonnegative(),
});

export const trafficCompositionBreakdownSchema = z.record(
  z.string().min(1),
  trafficCompositionCellSchema,
);

export const trafficCompositionDimensionSchema = z.object({
  key: z.number().int().positive(),
  vehicleCount: z.number().int().nonnegative(),
  sharePercent: z.number().min(0).max(100).nullable(),
  averageSpeedKmh: z.number().nonnegative().nullable(),
});

export const laneVehicleClassCompositionSchema = z.object({
  lane: z.number().int().positive(),
  vehicleClass: z.number().int().positive(),
  vehicleCount: z.number().int().nonnegative(),
  sharePercent: z.number().min(0).max(100).nullable(),
  averageSpeedKmh: z.number().nonnegative().nullable(),
});

export const trafficCompositionSummarySchema = z.object({
  classifiedVehicleCount: z.number().int().nonnegative(),
  classificationCoveragePercent: z.number().min(0).max(100).nullable(),
  vehicleClasses: z.array(trafficCompositionDimensionSchema),
  lanes: z.array(trafficCompositionDimensionSchema),
  laneVehicleClasses: z.array(laneVehicleClassCompositionSchema),
  freightProxy: z.object({
    vehicleCount: z.number().int().nonnegative(),
    sharePercent: z.number().min(0).max(100).nullable(),
    policyVersion: z.literal("fintraffic-freight-proxy-v1"),
  }),
});

export type TrafficCompositionCell = z.infer<
  typeof trafficCompositionCellSchema
>;
export type TrafficCompositionBreakdown = z.infer<
  typeof trafficCompositionBreakdownSchema
>;
export type TrafficCompositionDimension = z.infer<
  typeof trafficCompositionDimensionSchema
>;
export type TrafficCompositionSummary = z.infer<
  typeof trafficCompositionSummarySchema
>;
