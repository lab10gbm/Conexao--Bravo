"use client";

import React, { ReactNode } from "react";
import { ConfigProvider } from "../contexts/ConfigContext";
import { MilitarProvider } from "../contexts/MilitarContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { SessionProvider } from "../contexts/SessionContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <MilitarProvider>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </MilitarProvider>
    </ConfigProvider>
  );
}
