"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/shared/ui";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Application rendering failed", error);
  }, [error]);

  return (
    <html lang="tr">
      <body>
        <ErrorFallback
          description="Uygulama kabuğu şu anda oluşturulamıyor. Canlı trafik verileri etkilenmedi; uygulamayı yeniden başlatmayı deneyebilirsiniz."
          onRetry={reset}
          referenceCode={error.digest}
          title="Traffic Twin açılamadı"
        />
      </body>
    </html>
  );
}
