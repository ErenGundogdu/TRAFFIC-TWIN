import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

describe("SegmentedControl", () => {
  it("exposes the selected option and returns typed values", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Çalışma modu"
        value="live"
        options={[
          { value: "live", label: "Canlı" },
          { value: "analysis", label: "Analiz" },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Canlı" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Analiz" }));
    expect(onChange).toHaveBeenCalledWith("analysis");
  });
});
