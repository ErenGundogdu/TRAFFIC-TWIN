import type { Metadata } from "next";
import type { ReactNode } from "react";

import "maplibre-gl/dist/maplibre-gl.css";

import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Traffic Twin",
  description: "Trafik İzleme ve Analiz Platformu",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
