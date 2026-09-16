import type { TrafficFlowInsight } from "@traffic-twin/contracts";

const POLICY_VERSION = "fintraffic-flow-v1" as const;

interface TrafficFlowInputs {
  averageSpeedKmh: number | null;
  flowVehiclesPerHour: number | null;
  freeFlowSpeedKmh: number | null;
  maximumFlowVehiclesPerHour: number | null;
  reportedSpeedPercent?: number | null;
  reportedFlowPercent?: number | null;
}

function percentage(value: number | null, reference: number | null) {
  if (value === null || reference === null || reference <= 0) return null;
  return Math.round((value / reference) * 1_000) / 10;
}

function classifySpeedPercentage(value: number | null) {
  if (value === null) return "INSUFFICIENT_DATA" as const;
  if (value < 10) return "STATIONARY" as const;
  if (value < 25) return "QUEUING" as const;
  if (value < 75) return "SLOW" as const;
  if (value < 90) return "PLATOONING" as const;
  return "FREE_FLOW" as const;
}

export function classifyTrafficFlow(
  inputs: TrafficFlowInputs,
): TrafficFlowInsight {
  const speedPercentOfFreeFlow =
    inputs.reportedSpeedPercent ??
    percentage(inputs.averageSpeedKmh, inputs.freeFlowSpeedKmh);
  const flowPercentOfCapacity =
    inputs.reportedFlowPercent ??
    percentage(inputs.flowVehiclesPerHour, inputs.maximumFlowVehiclesPerHour);

  return {
    status: classifySpeedPercentage(speedPercentOfFreeFlow),
    speedPercentOfFreeFlow,
    flowPercentOfCapacity,
    freeFlowSpeedKmh: inputs.freeFlowSpeedKmh,
    maximumFlowVehiclesPerHour: inputs.maximumFlowVehiclesPerHour,
    policyVersion: POLICY_VERSION,
  };
}
