import { z } from "zod";

const coordinatesSchema = z.tuple([z.number(), z.number()]).rest(z.number());

const stationFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.number().int().positive(),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: coordinatesSchema,
  }),
  properties: z.object({
    id: z.number().int().positive(),
    tmsNumber: z.number().int().positive(),
    name: z.string().min(1),
    bearing: z.number().min(0).max(360).nullable(),
    collectionStatus: z.enum(["GATHERING", "REMOVED_TEMPORARILY"]),
    dataUpdatedTime: z.iso.datetime(),
    state: z.string().nullable().optional(),
  }),
});

export const stationFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  dataUpdatedTime: z.iso.datetime(),
  features: z.array(stationFeatureSchema),
});

const sensorValueSchema = z.object({
  id: z.number().int().positive(),
  stationId: z.number().int().positive().optional(),
  name: z.string().min(1),
  shortName: z.string().optional(),
  measuredTime: z.iso.datetime(),
  unit: z.string(),
  value: z.number().finite(),
  timeWindowStart: z.iso.datetime().nullable().optional(),
  timeWindowEnd: z.iso.datetime().nullable().optional(),
});

const stationDataSchema = z.object({
  id: z.number().int().positive(),
  tmsNumber: z.number().int().positive(),
  dataUpdatedTime: z.iso.datetime(),
  sensorValues: z.array(sensorValueSchema),
});

export const stationDataCollectionSchema = z.object({
  dataUpdatedTime: z.iso.datetime(),
  stations: z.array(stationDataSchema),
});

export type FintrafficStationCollection = z.infer<
  typeof stationFeatureCollectionSchema
>;
export type FintrafficStationDataCollection = z.infer<
  typeof stationDataCollectionSchema
>;
export type FintrafficStationFeature = z.infer<typeof stationFeatureSchema>;
export type FintrafficStationData = z.infer<typeof stationDataSchema>;
