import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HistoryImportControl } from "./history-import-control";

const hookMocks = vi.hoisted(() => ({
  usePlan: vi.fn(),
  useCreateJob: vi.fn(),
  useJob: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("../hooks/use-history-import-plan", () => ({
  useHistoryImportPlan: hookMocks.usePlan,
}));
vi.mock("../hooks/use-create-history-import-job", () => ({
  useCreateHistoryImportJob: hookMocks.useCreateJob,
}));
vi.mock("../hooks/use-history-import-job", () => ({
  useHistoryImportJob: hookMocks.useJob,
}));

const plan = {
  coverageAreaId: "helsinki",
  timeZone: "Europe/Helsinki",
  asset: {
    id: "fintraffic-tms:20002",
    name: "vt1_Espoo_Hirvisuo",
    tmsNumber: 20002,
  },
  range: {
    from: "2026-09-01",
    to: "2026-09-04",
    requestedDayCount: 4,
  },
  summary: {
    availableDayCount: 1,
    missingDayCount: 2,
    failedDayCount: 0,
    pendingProcessingDayCount: 0,
    noValidDataDayCount: 0,
    notYetAvailableDayCount: 1,
  },
  days: [],
};

function TestProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

describe("HistoryImportControl", () => {
  afterEach(cleanup);

  beforeEach(() => {
    hookMocks.mutate.mockReset();
    hookMocks.usePlan.mockReturnValue({
      data: plan,
      error: null,
      isPending: false,
    });
    hookMocks.useCreateJob.mockReturnValue({
      mutate: hookMocks.mutate,
      error: null,
      isPending: false,
    });
    hookMocks.useJob.mockReturnValue({ data: undefined, error: null });
  });

  it("queues only the days classified as importable", () => {
    render(
      <HistoryImportControl
        coverageAreaId="helsinki"
        assetId="fintraffic-tms:20002"
        from="2026-09-01"
        to="2026-09-04"
      />,
      { wrapper: TestProvider },
    );

    expect(screen.getByText("4 günün 1 günü hazır.")).toBeInTheDocument();
    expect(screen.getByText(/Henüz yayımlanmamış 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2 günü getir" }));

    expect(hookMocks.mutate).toHaveBeenCalledWith(
      {
        assetId: "fintraffic-tms:20002",
        from: "2026-09-01",
        to: "2026-09-04",
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("does not offer an import when all missing days are unpublished", () => {
    hookMocks.usePlan.mockReturnValue({
      data: {
        ...plan,
        summary: {
          ...plan.summary,
          missingDayCount: 0,
          notYetAvailableDayCount: 3,
        },
      },
      error: null,
      isPending: false,
    });

    render(
      <HistoryImportControl
        coverageAreaId="helsinki"
        assetId="fintraffic-tms:20002"
        from="2026-09-01"
        to="2026-09-04"
      />,
      { wrapper: TestProvider },
    );

    expect(screen.queryByRole("button", { name: /günü getir/ })).toBeNull();
  });
});
