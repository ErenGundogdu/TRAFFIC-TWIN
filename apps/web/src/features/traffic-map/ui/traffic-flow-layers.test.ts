import { describe, expect, it } from "vitest";

import { roadFlowArrowLayer } from "./traffic-flow-layers";

describe("roadFlowArrowLayer", () => {
  it("uses a font stack served by the OpenFreeMap style", () => {
    expect(roadFlowArrowLayer.layout?.["text-font"]).toEqual([
      "Noto Sans Bold",
    ]);
  });
});
