import { describe, expect, it } from "vitest";

import {
  getOperatorNoteCategoryLabel,
  getOperatorNoteStatusLabel,
} from "./operator-note-presentation";

describe("operator note presentation", () => {
  it("provides Turkish labels for every contract value", () => {
    expect(getOperatorNoteCategoryLabel("GENERAL")).toBe("Genel not");
    expect(getOperatorNoteCategoryLabel("MAINTENANCE")).toBe("Bakım");
    expect(getOperatorNoteCategoryLabel("FAULT")).toBe("Arıza");
    expect(getOperatorNoteCategoryLabel("INSPECTION")).toBe("Kontrol");
    expect(getOperatorNoteStatusLabel("INFORMATIONAL")).toBe("Bilgi");
    expect(getOperatorNoteStatusLabel("ACTION_REQUIRED")).toBe("İşlem gerekli");
    expect(getOperatorNoteStatusLabel("RESOLVED")).toBe("Çözüldü");
  });
});
