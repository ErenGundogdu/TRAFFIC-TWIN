import { operatorNoteListSchema } from "@traffic-twin/contracts";

import { httpClient } from "@/shared/api/http-client";

export async function getOperatorNotes(assetId: string) {
  const response = await httpClient.get("/api/operator-notes", {
    params: { assetId },
  });

  return operatorNoteListSchema.parse(response.data).notes;
}
