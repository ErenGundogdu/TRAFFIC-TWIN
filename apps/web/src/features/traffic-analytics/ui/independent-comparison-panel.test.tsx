import type { StationCatalogResponse } from "@traffic-twin/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IndependentComparisonPanel } from "./independent-comparison-panel";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(
    "mode=analysis&analysisView=comparison&cmpMetric=average-speed-kmh&cmpAAsset=a&cmpADirection=1&cmpAPeriod=historical&cmpAFrom=2026-08-01&cmpATo=2026-08-31&cmpAResolution=day&cmpBAsset=a&cmpBDirection=1&cmpBPeriod=historical&cmpBFrom=2026-07-01&cmpBTo=2026-07-31&cmpBResolution=day",
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/monitoring",
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.params,
}));

vi.mock("../hooks/use-traffic-history", () => ({
  useTrafficHistory: () => ({
    data: undefined,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  navigation.replace.mockClear();
});

const trafficFlow = {
  status: "INSUFFICIENT_DATA" as const,
  speedPercentOfFreeFlow: null,
  flowPercentOfCapacity: null,
  freeFlowSpeedKmh: null,
  maximumFlowVehiclesPerHour: null,
  policyVersion: "fintraffic-flow-v1" as const,
};

const catalog = {
  coverageArea: {
    id: "helsinki",
    name: "Helsinki",
    timeZone: "Europe/Helsinki",
    bbox: [24, 60, 25, 61],
  },
  source: {
    id: "fintraffic-tms",
    name: "Fintraffic Digitraffic TMS",
    attribution: "Fintraffic",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    status: "AVAILABLE",
    updatedAt: null,
    fetchedAt: "2026-09-22T17:00:00.000Z",
  },
  stations: [
    {
      id: "a",
      providerStationId: 5,
      tmsNumber: 5,
      name: "İstasyon A",
      longitude: 24.5,
      latitude: 60.5,
      bearing: 335,
      freshness: "FRESH",
      directions: [
        {
          direction: 1,
          heading: {
            degrees: 335,
            compassPoint: "NW",
            determination: "PROVIDER_REPORTED",
          },
          averageSpeedKmh: 90,
          flowVehiclesPerHour: 600,
          measuredAt: "2026-09-22T17:00:00.000Z",
          trafficFlow,
        },
        {
          direction: 2,
          heading: {
            degrees: 155,
            compassPoint: "SE",
            determination: "DERIVED_OPPOSITE",
          },
          averageSpeedKmh: 92,
          flowVehiclesPerHour: 500,
          measuredAt: "2026-09-22T17:00:00.000Z",
          trafficFlow,
        },
      ],
      lanes: [],
    },
  ],
} satisfies StationCatalogResponse;

describe("IndependentComparisonPanel", () => {
  it("applies edited dates to the shareable URL", () => {
    render(
      <IndependentComparisonPanel
        catalog={catalog}
        selectedStationId="a"
        availability={[]}
        today="2026-09-22"
      />,
    );

    fireEvent.change(screen.getByLabelText("B · Referans başlangıç"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByLabelText("B · Referans bitiş"), {
      target: { value: "2026-06-30" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Karşılaştırmayı uygula" }),
    );

    expect(navigation.replace).toHaveBeenCalledOnce();
    const target = navigation.replace.mock.calls[0]?.[0] as string;
    expect(target).toContain("cmpBFrom=2026-06-01");
    expect(target).toContain("cmpBTo=2026-06-30");
  });

  it("shows the physical heading in selectors and result cards", () => {
    render(
      <IndependentComparisonPanel
        catalog={catalog}
        selectedStationId="a"
        availability={[]}
        today="2026-09-22"
      />,
    );

    expect(
      screen.getAllByRole("option", {
        name: "Yön 1 · Kuzeybatı (335°)",
      }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("heading", {
        name: "İstasyon A · Yön 1 · Kuzeybatı (335°)",
      }),
    ).toHaveLength(2);
  });
});
