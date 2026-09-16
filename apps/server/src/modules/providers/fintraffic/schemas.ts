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

const sensorConstantValueSchema = z.object({
  name: z.string().min(1),
  value: z.number().int(),
  validFrom: z.string().regex(/^\d{2}-\d{2}$/),
  validTo: z.string().regex(/^\d{2}-\d{2}$/),
});

const stationSensorConstantsSchema = z.object({
  id: z.number().int().positive(),
  dataUpdatedTime: z.iso.datetime().optional(),
  sensorConstantValues: z.array(sensorConstantValueSchema),
});

export const stationSensorConstantsCollectionSchema = z.object({
  dataUpdatedTime: z.iso.datetime(),
  stations: z.array(stationSensorConstantsSchema).default([]),
});

export type FintrafficStationCollection = z.infer<
  typeof stationFeatureCollectionSchema
>;
export type FintrafficStationDataCollection = z.infer<
  typeof stationDataCollectionSchema
>;
export type FintrafficStationFeature = z.infer<typeof stationFeatureSchema>;
export type FintrafficStationData = z.infer<typeof stationDataSchema>;
export type FintrafficStationSensorConstantsCollection = z.infer<
  typeof stationSensorConstantsCollectionSchema
>;
