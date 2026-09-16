import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OperatorNotesPanel } from "./operator-notes-panel";

vi.mock("../hooks/use-operator-notes", () => ({
  useOperatorNotes: () => ({
    data: [],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe("OperatorNotesPanel", () => {
  it("submits the selected operational category and status", async () => {
    const createNote = vi.fn().mockResolvedValue({
      ok: true,
      note: {
        id: "087b305a-829a-48fa-a94a-3394d59ca68a",
        coverageAreaId: "helsinki",
        assetId: "fintraffic-tms:20002",
        author: "Eren",
        category: "FAULT",
        status: "ACTION_REQUIRED",
        content: "Yön 2 ölçümü kontrol edilmeli.",
        createdAt: "2026-09-15T08:00:00.000Z",
      },
    });

    render(
      <OperatorNotesPanel
        assetId="fintraffic-tms:20002"
        timeZone="Europe/Helsinki"
        createNote={createNote}
        realtimeConnected
      />,
    );

    fireEvent.change(screen.getByLabelText("Kategori"), {
      target: { value: "FAULT" },
    });
    fireEvent.change(screen.getByLabelText("Durum"), {
      target: { value: "ACTION_REQUIRED" },
    });
    fireEvent.change(screen.getByLabelText("Operatör"), {
      target: { value: "Eren" },
    });
    fireEvent.change(screen.getByLabelText("Not"), {
      target: { value: "Yön 2 ölçümü kontrol edilmeli." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Notu kaydet" }));

    await waitFor(() =>
      expect(createNote).toHaveBeenCalledWith({
        assetId: "fintraffic-tms:20002",
        author: "Eren",
        category: "FAULT",
        status: "ACTION_REQUIRED",
        content: "Yön 2 ölçümü kontrol edilmeli.",
      }),
    );
  });
});
