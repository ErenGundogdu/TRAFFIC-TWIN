import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InlineQueryError } from "./inline-query-error";

afterEach(cleanup);

describe("InlineQueryError", () => {
  it("shows a contextual message and retries on request", () => {
    const onRetry = vi.fn();

    render(
      <InlineQueryError message="Geçmiş verisi alınamadı." onRetry={onRetry} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Geçmiş verisi alınamadı.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not offer retry when no recovery action is available", () => {
    render(<InlineQueryError message="Veri kaynağı kullanılamıyor." />);

    expect(
      screen.queryByRole("button", { name: "Tekrar dene" }),
    ).not.toBeInTheDocument();
  });
});
