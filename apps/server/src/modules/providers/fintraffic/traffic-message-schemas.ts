import { trafficEventGeometrySchema } from "@traffic-twin/contracts";
import { z } from "zod";

const roadAddressPointSchema = z.object({
  roadAddress: z
    .object({ road: z.number().int().positive().optional() })
    .optional(),
});

const locationDetailsSchema = z
  .object({
    roadAddressLocation: z
      .object({
        primaryPoint: roadAddressPointSchema.optional(),
        secondaryPoint: roadAddressPointSchema.optional(),
        direction: z.string().optional(),
        directionDescription: z.string().min(1).optional(),
      })
      .optional(),
  })
  .optional();

const timeAndDurationSchema = z
  .object({
    startTime: z.iso.datetime().optional(),
    endTime: z.iso.datetime().optional(),
  })
  .optional();

const announcementSchema = z.object({
  language: z.string().min(2),
  title: z.string().min(1),
  location: z.object({ description: z.string().min(1).optional() }).optional(),
  locationDetails: locationDetailsSchema,
  features: z.array(z.object({ name: z.string().min(1) })).default([]),
  roadWorkPhases: z
    .array(
      z.object({
        severity: z.string().optional(),
        timeAndDuration: timeAndDurationSchema,
      }),
    )
    .default([]),
  comment: z.string().optional(),
  sender: z.string().min(1).optional(),
  timeAndDuration: timeAndDurationSchema,
});

export const trafficMessageFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  dataUpdatedTime: z.iso.datetime(),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: trafficEventGeometrySchema.nullable(),
      properties: z.object({
        situationId: z.string().min(1),
        situationType: z.string().min(1),
        trafficAnnouncementType: z.string().nullish(),
        version: z.number().int().positive(),
        releaseTime: z.iso.datetime(),
        versionTime: z.iso.datetime(),
        announcements: z.array(announcementSchema).min(1),
      }),
    }),
  ),
});

export type FintrafficTrafficMessageCollection = z.infer<
  typeof trafficMessageFeatureCollectionSchema
>;
