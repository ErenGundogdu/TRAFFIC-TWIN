import { z } from "zod";

const categorySchema = z
  .enum(["all", "road-work", "traffic-announcement", "none"])
  .catch("all");
const statusSchema = z.enum(["all", "active", "upcoming"]).catch("all");
const severitySchema = z
  .enum(["all", "high", "medium", "low", "unknown"])
  .catch("all");
const querySchema = z.string().trim().max(80).catch("");

export interface TrafficEventFilters {
  query: string;
  category: z.infer<typeof categorySchema>;
  status: z.infer<typeof statusSchema>;
  severity: z.infer<typeof severitySchema>;
}

export const defaultTrafficEventFilters: TrafficEventFilters = {
  query: "",
  category: "all",
  status: "all",
  severity: "all",
};

export function parseTrafficEventFilters(
  searchParams: Pick<URLSearchParams, "get">,
): TrafficEventFilters {
  return {
    query: querySchema.parse(searchParams.get("eventQuery") ?? ""),
    category: categorySchema.parse(searchParams.get("eventCategory")),
    status: statusSchema.parse(searchParams.get("eventStatus")),
    severity: severitySchema.parse(searchParams.get("eventSeverity")),
  };
}

export function setTrafficEventFilters(
  current: URLSearchParams,
  filters: TrafficEventFilters,
) {
  const next = new URLSearchParams(current.toString());
  setOptionalParam(next, "eventQuery", filters.query.trim(), "");
  setOptionalParam(next, "eventCategory", filters.category, "all");
  setOptionalParam(next, "eventStatus", filters.status, "all");
  setOptionalParam(next, "eventSeverity", filters.severity, "all");
  next.delete("event");
  return next;
}

function setOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string,
  defaultValue: string,
) {
  if (value === defaultValue) params.delete(key);
  else params.set(key, value);
}
