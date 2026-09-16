import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FieldReportComposer } from "./field-report-composer";

describe("FieldReportComposer", () => {
  it("submits the selected map location without allowing a status choice", async () => {
    const createReport = vi.fn().mockResolvedValue({
      ok: true,
      report: {
        id: "087b305a-829a-48fa-a94a-3394d59ca68a",
        coverageAreaId: "helsinki",
        source: "OPERATOR",
        author: "Eren",
        category: "ACCIDENT",
        severity: "HIGH",
        status: "PENDING_REVIEW",
        description: "Sağ şerit kapalı.",
        location: { longitude: 24.94, latitude: 60.17 },
        observedAt: "2026-09-15T08:00:00.000Z",
        createdAt: "2026-09-15T08:00:00.000Z",
      },
    });
    const onCreated = vi.fn();

    render(
      <FieldReportComposer
        coverageAreaId="helsinki"
        active
        location={{ longitude: 24.94, latitude: 60.17 }}
        realtimeConnected
        catalogStatus="ready"
        createReport={createReport}
        onStart={vi.fn()}
        onCancel={vi.fn()}
        onCreated={onCreated}
        onRetryCatalog={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Kategori"), {
      target: { value: "ACCIDENT" },
    });
    fireEvent.change(screen.getByLabelText("Önem"), {
      target: { value: "HIGH" },
    });
    fireEvent.change(screen.getByLabelText("Operatör"), {
      target: { value: "Eren" },
    });
    fireEvent.change(screen.getByLabelText("Açıklama"), {
      target: { value: "Sağ şerit kapalı." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Bildirimi kaydet" }));

    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith({
        coverageAreaId: "helsinki",
        author: "Eren",
        category: "ACCIDENT",
        severity: "HIGH",
        description: "Sağ şerit kapalı.",
        location: { longitude: 24.94, latitude: 60.17 },
      }),
    );
    expect(screen.queryByLabelText("Durum")).not.toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledWith(
      "087b305a-829a-48fa-a94a-3394d59ca68a",
    );
  });
});
