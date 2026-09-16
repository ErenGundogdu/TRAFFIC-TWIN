import { z } from "zod";

import { trafficEventSchema } from "./traffic-event.js";

export const trafficEventContextRelationSchema = z.enum([
  "SAME_ROAD_NEARBY",
  "NEARBY",
]);

export const trafficEventContextMatchSchema = z.object({
  event: trafficEventSchema,
  relation: trafficEventContextRelationSchema,
  distanceMeters: z.number().int().nonnegative(),
  roadMatch: z.boolean(),
  matchedRoadNumber: z.number().int().positive().nullable(),
});

export const stationTrafficEventContextResponseSchema = z.object({
  station: z.object({
    assetId: z.string().min(1),
    roadRef: z.string().min(1).nullable(),
  }),
  evaluatedAt: z.iso.datetime(),
  policy: z.object({
    version: z.literal("station-event-context-v1"),
    nearbyMaxDistanceMeters: z.number().int().positive(),
    sameRoadMaxDistanceMeters: z.number().int().positive(),
    maximumResults: z.number().int().positive(),
  }),
  matches: z.array(trafficEventContextMatchSchema),
});

export type TrafficEventContextRelation = z.infer<
  typeof trafficEventContextRelationSchema
>;
export type TrafficEventContextMatch = z.infer<
  typeof trafficEventContextMatchSchema
>;
export type StationTrafficEventContextResponse = z.infer<
  typeof stationTrafficEventContextResponseSchema
>;
