import { describe, expect, it } from "vitest";

import { formatTrafficDirectionLabel } from "./traffic-direction-label";

describe("formatTrafficDirectionLabel", () => {
  it("formats long and compact direction identities", () => {
    const direction = {
      direction: 1 as const,
      heading: {
        degrees: 298,
        compassPoint: "NW" as const,
        determination: "PROVIDER_REPORTED" as const,
      },
    };

    expect(formatTrafficDirectionLabel(direction)).toBe(
      "Yön 1 · Kuzeybatı (298°)",
    );
    expect(formatTrafficDirectionLabel(direction, "short")).toBe("Yön 1 · KB");
  });

  it("does not invent an identity when heading data is missing", () => {
    expect(
      formatTrafficDirectionLabel({
        direction: 2,
        heading: null,
      }),
    ).toBe("Yön 2 · yön bilgisi yok");
  });
});
