import { Suspense } from "react";

import { MonitoringWorkspace } from "@/features/traffic-workspace";

export default function MonitoringPage() {
  return (
    <Suspense
      fallback={<div className="app-loading">Harita hazırlanıyor…</div>}
    >
      <MonitoringWorkspace coverageAreaId="helsinki" />
    </Suspense>
  );
}
