import { useQuery } from "@tanstack/react-query";

import { getOperatorNotes } from "../api/get-operator-notes";
import { operatorNotesQueryKey } from "../model/operator-notes-query-key";

export function useOperatorNotes(assetId: string) {
  return useQuery({
    queryKey: operatorNotesQueryKey(assetId),
    queryFn: () => getOperatorNotes(assetId),
    enabled: assetId.length > 0,
  });
}
