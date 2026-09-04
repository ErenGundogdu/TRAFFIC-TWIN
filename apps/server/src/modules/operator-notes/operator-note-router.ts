import { Router } from "express";
import { z } from "zod";

import type { OperatorNoteService } from "./operator-note-service.js";

const querySchema = z.object({ assetId: z.string().min(1) });

export function createOperatorNoteRouter(
  service: OperatorNoteService,
): ReturnType<typeof Router> {
  const router = Router();

  router.get("/", async (request, response, next) => {
    try {
      const { assetId } = querySchema.parse(request.query);
      response.json({ notes: await service.listForAsset(assetId) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
