import { operatorNoteListSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getOperatorNotes(assetId: string) {
  const response = await apiClient.get(
    "/api/operator-notes",
    operatorNoteListSchema,
    { params: { assetId } },
  );

  return response.notes;
}
