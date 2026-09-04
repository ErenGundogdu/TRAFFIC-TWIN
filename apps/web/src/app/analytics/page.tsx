import { Suspense } from "react";

import { AnalyticsWorkspace } from "@/features/traffic-analytics";

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={<main className="app-loading">Analiz yükleniyor…</main>}
    >
      <AnalyticsWorkspace coverageAreaId="helsinki" />
    </Suspense>
  );
}
