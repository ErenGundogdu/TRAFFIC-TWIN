import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHistoryImportJob } from "./create-history-import-job";
import { getHistoryImportJob } from "./get-history-import-job";
import { getHistoryImportPlan } from "./get-history-import-plan";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/shared/api/api-client", () => ({
  apiClient: apiMocks,
}));

describe("history import API", () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
  });

  it("requests a manifest plan with encoded identifiers and dates", () => {
    getHistoryImportPlan("helsinki region", {
      assetId: "fintraffic-tms:20002",
      from: "2026-09-01",
      to: "2026-09-03",
    });

    expect(apiMocks.get).toHaveBeenCalledWith(
      "/api/coverage-areas/helsinki%20region/history-import-plan?assetId=fintraffic-tms%3A20002&from=2026-09-01&to=2026-09-03",
      expect.anything(),
    );
  });

  it("creates and reads a history import job through the canonical routes", () => {
    const command = {
      assetId: "fintraffic-tms:20002",
      from: "2026-09-01",
      to: "2026-09-03",
    };

    createHistoryImportJob("helsinki", command);
    getHistoryImportJob("helsinki", "job/1");

    expect(apiMocks.post).toHaveBeenCalledWith(
      "/api/coverage-areas/helsinki/history-import-jobs",
      command,
      expect.anything(),
    );
    expect(apiMocks.get).toHaveBeenCalledWith(
      "/api/coverage-areas/helsinki/history-import-jobs/job%2F1",
      expect.anything(),
    );
  });
});
