import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StationRequiredPanel } from "./station-required-panel";

afterEach(cleanup);

describe("StationRequiredPanel", () => {
  it("asks for a station instead of choosing one, per mode", () => {
    const { rerender } = render(
      <StationRequiredPanel mode="analysis" onReturnLive={vi.fn()} />,
    );
    expect(
      screen.getByRole("heading", { name: "Analiz için bir istasyon seçin" }),
    ).toBeInTheDocument();

    rerender(<StationRequiredPanel mode="replay" onReturnLive={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Replay için bir istasyon seçin" }),
    ).toBeInTheDocument();
  });

  it("lets the user go back to the live view", () => {
    const onReturnLive = vi.fn();
    render(<StationRequiredPanel mode="replay" onReturnLive={onReturnLive} />);

    fireEvent.click(screen.getByRole("button", { name: "Canlıya dön" }));

    expect(onReturnLive).toHaveBeenCalledOnce();
  });
});
