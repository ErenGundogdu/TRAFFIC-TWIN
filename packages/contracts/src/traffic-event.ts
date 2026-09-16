import { z } from "zod";

import { coverageAreaSchema } from "./station-catalog.js";

const positionSchema = z.tuple([z.number(), z.number()]);
const lineStringCoordinatesSchema = z.array(positionSchema).min(2);
const polygonCoordinatesSchema = z.array(lineStringCoordinatesSchema).min(1);

export const trafficEventGeometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Point"), coordinates: positionSchema }),
  z.object({
    type: z.literal("LineString"),
    coordinates: lineStringCoordinatesSchema,
  }),
  z.object({
    type: z.literal("MultiLineString"),
    coordinates: z.array(lineStringCoordinatesSchema).min(1),
  }),
  z.object({
    type: z.literal("Polygon"),
    coordinates: polygonCoordinatesSchema,
  }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(polygonCoordinatesSchema).min(1),
  }),
]);

export const trafficEventCategorySchema = z.enum([
  "TRAFFIC_ANNOUNCEMENT",
  "ROAD_WORK",
]);
export const trafficEventStatusSchema = z.enum(["UPCOMING", "ACTIVE", "ENDED"]);
export const trafficEventSeveritySchema = z.enum([
  "UNKNOWN",
  "LOW",
  "MEDIUM",
  "HIGH",
]);
export const trafficEventDirectionSchema = z.enum([
  "BOTH",
  "POSITIVE",
  "NEGATIVE",
  "UNKNOWN",
]);

export const trafficEventSchema = z.object({
  id: z.string().min(1),
  providerEventId: z.string().min(1),
  category: trafficEventCategorySchema,
  status: trafficEventStatusSchema,
  severity: trafficEventSeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1).nullable(),
  comment: z.string().min(1).nullable(),
  effects: z.array(z.string().min(1)),
  direction: trafficEventDirectionSchema,
  directionDescription: z.string().min(1).nullable(),
  sender: z.string().min(1).nullable(),
  language: z.string().min(2),
  geometry: trafficEventGeometrySchema,
  roadNumbers: z.array(z.number().int().positive()),
  releaseTime: z.iso.datetime(),
  versionTime: z.iso.datetime(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
});

export const trafficEventCatalogResponseSchema = z.object({
  coverageArea: coverageAreaSchema,
  source: z.object({
    id: z.literal("fintraffic-traffic-message"),
    name: z.literal("Fintraffic Digitraffic Traffic Messages"),
    attribution: z.string().min(1),
    licenseUrl: z.url(),
    sourceUpdatedAt: z.iso.datetime().nullable(),
    fetchedAt: z.iso.datetime().nullable(),
    freshness: z.enum(["FRESH", "STALE", "UNAVAILABLE"]),
  }),
  events: z.array(trafficEventSchema),
});

export type TrafficEventGeometry = z.infer<typeof trafficEventGeometrySchema>;
export type TrafficEventCategory = z.infer<typeof trafficEventCategorySchema>;
export type TrafficEventStatus = z.infer<typeof trafficEventStatusSchema>;
export type TrafficEventSeverity = z.infer<typeof trafficEventSeveritySchema>;
export type TrafficEventDirection = z.infer<typeof trafficEventDirectionSchema>;
export type TrafficEvent = z.infer<typeof trafficEventSchema>;
export type TrafficEventCatalogResponse = z.infer<
  typeof trafficEventCatalogResponseSchema
>;
