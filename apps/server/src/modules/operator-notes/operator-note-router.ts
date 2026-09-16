import { Router } from "express";
import { z } from "zod";

import {
  identifierSchema,
  parseRequestQuery,
} from "../../common/http/request-validation.js";
import type { OperatorNoteService } from "./operator-note-service.js";

const querySchema = z.object({ assetId: identifierSchema });

export function createOperatorNoteRouter(
  service: OperatorNoteService,
): ReturnType<typeof Router> {
  const router = Router();

  router.get("/", async (request, response, next) => {
    try {
      const { assetId } = parseRequestQuery(request, querySchema);
      response.json({ notes: await service.listForAsset(assetId) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
