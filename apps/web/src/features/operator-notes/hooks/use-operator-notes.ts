import { useQuery } from "@tanstack/react-query";

import { getOperatorNotes } from "../api/get-operator-notes";

export const operatorNotesQueryKey = (assetId: string) => [
  "operator-notes",
  assetId,
];

export function useOperatorNotes(assetId: string) {
  return useQuery({
    queryKey: operatorNotesQueryKey(assetId),
    queryFn: () => getOperatorNotes(assetId),
    enabled: assetId.length > 0,
  });
}
