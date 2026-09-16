import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BackgroundQueryErrorNotice } from "./background-query-error-notice";

describe("BackgroundQueryErrorNotice", () => {
  it("explains retained data and can be dismissed", () => {
    const onDismiss = vi.fn();

    render(<BackgroundQueryErrorNotice onDismiss={onDismiss} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Son başarıyla alınan veriler gösterilmeye devam ediyor.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Bildirimi kapat" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
