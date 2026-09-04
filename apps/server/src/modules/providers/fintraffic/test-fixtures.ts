import { readFileSync } from "node:fs";

export function readFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"),
  ) as unknown;
}
