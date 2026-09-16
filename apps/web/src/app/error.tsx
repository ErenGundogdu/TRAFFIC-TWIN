"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/shared/ui";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error("Route rendering failed", error);
  }, [error]);

  return (
    <ErrorFallback
      description="Çalışma alanı şu anda görüntülenemiyor. Canlı veriler değiştirilmedi; sayfayı yeniden oluşturmayı deneyebilirsiniz."
      onRetry={reset}
      referenceCode={error.digest}
      title="Çalışma alanı açılamadı"
    />
  );
}
