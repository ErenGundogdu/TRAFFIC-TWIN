import { describe, expect, it } from "vitest";

import { parseEnv } from "./env.js";

describe("parseEnv", () => {
  it("returns safe local defaults", () => {
    const env = parseEnv({});

    expect(env.PORT).toBe(4_000);
    expect(env.CLIENT_ORIGIN).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");
    expect(env.DATABASE_URL).toBe(
      "postgresql://traffic_twin:traffic_twin@localhost:55432/traffic_twin",
    );
  });

  it("rejects an invalid port", () => {
    expect(() => parseEnv({ PORT: "70000" })).toThrow();
  });
});
