import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MapVisualizationSwitcher } from "./map-visualization-switcher";

describe("MapVisualizationSwitcher", () => {
  it("exposes the selected map mode accessibly", () => {
    const onChange = vi.fn();
    render(<MapVisualizationSwitcher value="overview" onChange={onChange} />);

    expect(
      screen.getByRole("button", { name: "Isı haritası" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "3B hacim" }));
    expect(onChange).toHaveBeenCalledWith("volume-3d");
  });
});
