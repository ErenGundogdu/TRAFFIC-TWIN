import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ErrorFallback } from "./error-fallback";

describe("ErrorFallback", () => {
  it("offers recovery without exposing technical error details", () => {
    const onRetry = vi.fn();

    render(
      <ErrorFallback
        description="Çalışma alanı şu anda görüntülenemiyor."
        onRetry={onRetry}
        referenceCode="reference-123"
        title="Çalışma alanı açılamadı"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Çalışma alanı açılamadı",
    );
    expect(screen.getByText("reference-123")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Canlı izlemeye dön" }),
    ).toHaveAttribute("href", "/monitoring");

    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
