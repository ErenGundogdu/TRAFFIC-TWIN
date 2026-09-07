import { z } from "zod";

const tagsSchema = z.record(z.string(), z.string());

const overpassElementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number().int().positive(),
  center: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
    })
    .optional(),
  tags: tagsSchema.optional(),
  geometry: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
      }),
    )
    .optional(),
  members: z
    .array(
      z.object({
        type: z.enum(["node", "way", "relation"]),
        ref: z.number().int().positive(),
        role: z.string(),
      }),
    )
    .optional(),
});

export const overpassJunctionResponseSchema = z.object({
  osm3s: z.object({
    timestamp_osm_base: z.iso.datetime(),
    copyright: z.string().optional(),
  }),
  elements: z.array(overpassElementSchema),
});

export type OverpassJunctionResponse = z.infer<
  typeof overpassJunctionResponseSchema
>;

export const overpassRoadResponseSchema = overpassJunctionResponseSchema;
export type OverpassRoadResponse = z.infer<typeof overpassRoadResponseSchema>;
