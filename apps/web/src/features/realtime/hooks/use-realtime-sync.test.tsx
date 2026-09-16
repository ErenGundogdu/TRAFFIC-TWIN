import type {
  FieldReport,
  StationCatalogResponse,
} from "@traffic-twin/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const socket = vi.hoisted(() => {
  const listeners = new Map<string, (payload?: unknown) => void>();
  return {
    listeners,
    connected: true,
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      listeners.set(event, handler);
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    timeout: vi.fn(),
  };
});

vi.mock("socket.io-client", () => ({ io: () => socket }));

import { useRealtimeSync } from "./use-realtime-sync";

const initialCatalog: StationCatalogResponse = {
  coverageArea: {
    id: "helsinki",
    name: "Helsinki",
    timeZone: "Europe/Helsinki",
    bbox: [24.5, 60.1, 25.25, 60.45],
  },
  source: {
    id: "fintraffic-tms",
    name: "Fintraffic Digitraffic TMS",
    attribution: "Fintraffic",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    status: "AVAILABLE",
    updatedAt: "2026-09-04T09:00:00Z",
    fetchedAt: "2026-09-04T09:00:01Z",
  },
  stations: [],
};

describe("useRealtimeSync", () => {
  beforeEach(() => {
    socket.listeners.clear();
    vi.clearAllMocks();
  });

  it("reconciles on connect and applies a validated live batch", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["station-catalog", "helsinki"], initialCatalog);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRealtimeSync("helsinki"), {
      wrapper,
    });

    await act(async () => socket.listeners.get("connect")?.());
    expect(result.current.status).toBe("connected");
    expect(socket.emit).toHaveBeenCalledWith("coverage:subscribe", {
      coverageAreaId: "helsinki",
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["station-catalog", "helsinki"],
    });

    act(() =>
      socket.listeners.get("traffic:batch")?.({
        coverageAreaId: "helsinki",
        sourceUpdatedAt: "2026-09-04T09:01:00Z",
        emittedAt: "2026-09-04T09:01:01Z",
        stations: [],
      }),
    );

    expect(
      queryClient.getQueryData<StationCatalogResponse>([
        "station-catalog",
        "helsinki",
      ])?.source.updatedAt,
    ).toBe("2026-09-04T09:01:00Z");

    act(() =>
      socket.listeners.get("field-report:created")?.({
        id: "087b305a-829a-48fa-a94a-3394d59ca68a",
        coverageAreaId: "helsinki",
        source: "OPERATOR",
        author: "Eren",
        category: "ACCIDENT",
        severity: "HIGH",
        status: "PENDING_REVIEW",
        description: "Sağ şerit kapalı.",
        location: { longitude: 24.94, latitude: 60.17 },
        observedAt: "2026-09-15T08:00:00.000Z",
        createdAt: "2026-09-15T08:00:00.000Z",
      }),
    );

    expect(
      queryClient.getQueryData<FieldReport[]>(["field-reports", "helsinki"]),
    ).toHaveLength(1);
  });
});
