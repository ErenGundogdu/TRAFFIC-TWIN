export type WorkspaceMode = "live" | "analysis";

export function parseWorkspaceMode(value: string | null): WorkspaceMode {
  return value === "analysis" ? "analysis" : "live";
}

export function setWorkspaceMode(
  current: URLSearchParams,
  mode: WorkspaceMode,
) {
  const next = new URLSearchParams(current.toString());
  if (mode === "analysis") {
    next.set("mode", "analysis");
  } else {
    next.delete("mode");
  }
  return next;
}
