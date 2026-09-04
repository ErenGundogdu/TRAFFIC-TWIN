import {
  createOperatorNoteSchema,
  type CreateOperatorNote,
} from "@traffic-twin/contracts";

import type { OperatorNoteRepository } from "./operator-note-repository.js";

export class OperatorNoteService {
  constructor(private readonly repository: OperatorNoteRepository) {}

  create(input: CreateOperatorNote) {
    return this.repository.create(createOperatorNoteSchema.parse(input));
  }

  listForAsset(assetId: string) {
    return this.repository.listForAsset(assetId);
  }
}
