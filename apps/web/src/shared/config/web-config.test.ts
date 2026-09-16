import { describe, expect, it } from "vitest";

import { parseWebConfig } from "./web-config";

describe("parseWebConfig", () => {
  it("uses the local backend when the public URL is not configured", () => {
    expect(parseWebConfig({})).toEqual({
      backendUrl: "http://localhost:4000",
    });
  });

  it("validates and normalizes the configured backend URL", () => {
    expect(
      parseWebConfig({ NEXT_PUBLIC_API_URL: "https://traffic.example.com/" }),
    ).toEqual({ backendUrl: "https://traffic.example.com" });
  });

  it.each(["not-a-url", "ws://traffic.example.com", ""])(
    "rejects an invalid public backend URL: %s",
    (backendUrl) => {
      expect(() =>
        parseWebConfig({ NEXT_PUBLIC_API_URL: backendUrl }),
      ).toThrow();
    },
  );
});
