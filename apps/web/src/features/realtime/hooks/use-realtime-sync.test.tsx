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

const station: StationCatalogResponse["stations"][number] = {
  id: "fintraffic-tms:23005",
  providerStationId: 23005,
  tmsNumber: 5,
  name: "vt3_Klaukkalantie",
  longitude: 24.808791,
  latitude: 60.354656,
  bearing: 335,
  freshness: "FRESH",
  directions: [1, 2].map((direction) => ({
    direction: direction as 1 | 2,
    heading: null,
    averageSpeedKmh: 90,
    flowVehiclesPerHour: 900,
    measuredAt: "2026-09-04T09:00:00Z",
    trafficFlow: {
      status: "INSUFFICIENT_DATA",
      speedPercentOfFreeFlow: null,
      flowPercentOfCapacity: null,
      freeFlowSpeedKmh: null,
      maximumFlowVehiclesPerHour: null,
      policyVersion: "fintraffic-flow-v1",
    },
  })),
  lanes: [
    {
      lane: 1,
      direction: 1,
      directionEvidence: "OBSERVED_PASSAGES",
      averageSpeedKmh: 90,
      flowVehiclesPerHour: 480,
      flowWindow: "ROLLING_5_MINUTES",
      measuredAt: "2026-09-04T09:00:00Z",
    },
    {
      lane: 2,
      direction: 1,
      directionEvidence: "OBSERVED_PASSAGES",
      averageSpeedKmh: 88,
      flowVehiclesPerHour: 420,
      flowWindow: "ROLLING_5_MINUTES",
      measuredAt: "2026-09-04T09:00:00Z",
    },
  ],
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

  it("keeps REST-verified lane directions when a live batch has no direction evidence", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["station-catalog", "helsinki"], {
      ...initialCatalog,
      stations: [station],
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    renderHook(() => useRealtimeSync("helsinki"), { wrapper });

    act(() =>
      socket.listeners.get("traffic:batch")?.({
        coverageAreaId: "helsinki",
        sourceUpdatedAt: "2026-09-04T09:01:00Z",
        emittedAt: "2026-09-04T09:01:01Z",
        stations: [
          {
            ...station,
            lanes: [
              { ...station.lanes[0], direction: null, averageSpeedKmh: 45 },
              { ...station.lanes[1], direction: null, averageSpeedKmh: 90 },
            ],
          },
        ],
      }),
    );

    const lanes = queryClient.getQueryData<StationCatalogResponse>([
      "station-catalog",
      "helsinki",
    ])?.stations[0]?.lanes;
    expect(lanes?.map((lane) => lane.direction)).toEqual([1, 1]);
    expect(lanes?.map((lane) => lane.averageSpeedKmh)).toEqual([45, 90]);
  });
});
