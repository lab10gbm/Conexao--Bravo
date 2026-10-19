import type { Metadata, Viewport } from "next";
import React, { ReactNode } from "react";
import "../index.css";
import { Providers } from "./providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conexão Bravo - CBMERJ",
  description:
    "Sistema integrado de gestão operacional, escalas 24h, permutas e RAS para militares do CBMERJ.",
  applicationName: "Conexão Bravo",
  authors: [{ name: "CBMERJ / Costa Verde" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-bg-main)] text-[#1D1D1D] antialiased selection:bg-indigo-500 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
