import { z } from "zod";

export const roadCoordinateSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

export const roadSegmentSchema = z.object({
  id: z.string().min(1),
  osmWayId: z.string().min(1),
  name: z.string().min(1).nullable(),
  roadRef: z.string().min(1).nullable(),
  highwayClass: z.string().min(1),
  direction: z.union([z.literal(1), z.literal(2)]).nullable(),
  distanceMeters: z.number().nonnegative(),
  coordinates: z.array(roadCoordinateSchema).min(2),
});

export const stationRoadContextSchema = z.object({
  assetId: z.string().min(1),
  status: z.enum(["MATCHED", "NO_MATCH"]),
  freshness: z.enum(["FRESH", "STALE"]),
  roadRef: z.string().min(1).nullable(),
  matchingPolicy: z.literal("osm-ref-nearest-bearing-v1"),
  source: z.object({
    id: z.literal("openstreetmap"),
    attribution: z.string().min(1),
    licenseUrl: z.url(),
    updatedAt: z.iso.datetime(),
    fetchedAt: z.iso.datetime(),
  }),
  segments: z.array(roadSegmentSchema),
});

export type RoadSegment = z.infer<typeof roadSegmentSchema>;
export type StationRoadContext = z.infer<typeof stationRoadContextSchema>;
