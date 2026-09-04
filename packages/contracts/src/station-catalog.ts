import { z } from "zod";

export const trafficDirectionSchema = z.object({
  direction: z.union([z.literal(1), z.literal(2)]),
  label: z.string().min(1),
  averageSpeedKmh: z.number().nonnegative().nullable(),
  flowVehiclesPerHour: z.number().nonnegative().nullable(),
  measuredAt: z.iso.datetime().nullable(),
});

export const stationFreshnessSchema = z.enum(["FRESH", "STALE", "UNAVAILABLE"]);

export const stationSummarySchema = z.object({
  id: z.string().min(1),
  providerStationId: z.number().int().positive(),
  tmsNumber: z.number().int().positive(),
  name: z.string().min(1),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  bearing: z.number().min(0).max(360).nullable(),
  freshness: stationFreshnessSchema,
  directions: z.array(trafficDirectionSchema).length(2),
});

export const coverageAreaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  timeZone: z.string().min(1),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

export const dataSourceSchema = z.object({
  id: z.literal("fintraffic-tms"),
  name: z.literal("Fintraffic Digitraffic TMS"),
  attribution: z.string().min(1),
  licenseUrl: z.url(),
  status: z.enum(["AVAILABLE", "DEGRADED"]),
  updatedAt: z.iso.datetime().nullable(),
  fetchedAt: z.iso.datetime(),
});

export const stationCatalogResponseSchema = z.object({
  coverageArea: coverageAreaSchema,
  source: dataSourceSchema,
  stations: z.array(stationSummarySchema),
});

export type TrafficDirection = z.infer<typeof trafficDirectionSchema>;
export type StationSummary = z.infer<typeof stationSummarySchema>;
export type CoverageArea = z.infer<typeof coverageAreaSchema>;
export type DataSource = z.infer<typeof dataSourceSchema>;
export type StationCatalogResponse = z.infer<
  typeof stationCatalogResponseSchema
>;
