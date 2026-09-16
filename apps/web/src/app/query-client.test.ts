import { describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "./query-client";

describe("createAppQueryClient", () => {
  it("leaves initial query failures to their contextual error UI", async () => {
    const onBackgroundError = vi.fn();
    const queryClient = createAppQueryClient({
      onBackgroundError,
      onQuerySuccess: vi.fn(),
    });

    await expect(
      queryClient.fetchQuery({
        queryKey: ["initial-failure"],
        queryFn: () => Promise.reject(new Error("unavailable")),
        retry: false,
      }),
    ).rejects.toThrow("unavailable");

    expect(onBackgroundError).not.toHaveBeenCalled();
  });

  it("reports a failed refresh when previously loaded data remains", async () => {
    const onBackgroundError = vi.fn();
    const onQuerySuccess = vi.fn();
    const queryClient = createAppQueryClient({
      onBackgroundError,
      onQuerySuccess,
    });
    const queryKey = ["background-failure"];

    await queryClient.fetchQuery({
      queryKey,
      queryFn: () => Promise.resolve({ status: "available" }),
    });

    await expect(
      queryClient.fetchQuery({
        queryKey,
        queryFn: () => Promise.reject(new Error("refresh failed")),
        retry: false,
        staleTime: 0,
      }),
    ).rejects.toThrow("refresh failed");

    expect(onBackgroundError).toHaveBeenCalledOnce();
    expect(onBackgroundError).toHaveBeenCalledWith(
      expect.stringContaining("background-failure"),
    );
    expect(onQuerySuccess).toHaveBeenCalled();
  });
});
