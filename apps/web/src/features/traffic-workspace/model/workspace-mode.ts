export type WorkspaceMode = "live" | "analysis" | "replay";

export function parseWorkspaceMode(value: string | null): WorkspaceMode {
  return value === "analysis" || value === "replay" ? value : "live";
}

export function setWorkspaceMode(
  current: URLSearchParams,
  mode: WorkspaceMode,
) {
  const next = new URLSearchParams(current.toString());
  if (mode !== "live") {
    next.set("mode", mode);
  } else {
    next.delete("mode");
  }
  return next;
}
