import type { Metadata } from "next";
import type { ReactNode } from "react";

import "maplibre-gl/dist/maplibre-gl.css";

import { themeInitializationScript } from "@/shared/theme/theme-script";

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
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
