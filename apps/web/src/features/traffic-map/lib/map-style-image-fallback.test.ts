import { describe, expect, it, vi } from "vitest";

import { provideTransparentStyleImageFallback } from "./map-style-image-fallback";

describe("provideTransparentStyleImageFallback", () => {
  it("registers a transparent pixel for an unavailable base-map sprite", () => {
    const registry = {
      hasImage: vi.fn(() => false),
      addImage: vi.fn(),
    };

    expect(
      provideTransparentStyleImageFallback(registry, "sports_centre"),
    ).toBe(true);
    expect(registry.addImage).toHaveBeenCalledWith("sports_centre", {
      width: 1,
      height: 1,
      data: new Uint8Array([0, 0, 0, 0]),
    });
  });

  it("keeps an image already provided by the style sprite", () => {
    const registry = {
      hasImage: vi.fn(() => true),
      addImage: vi.fn(),
    };

    expect(provideTransparentStyleImageFallback(registry, "airport")).toBe(
      false,
    );
    expect(registry.addImage).not.toHaveBeenCalled();
  });
});
