"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { GestaoEfetivoModeracaoModule } from "../../../components/GestaoEfetivoModeracaoModule";

export default function GestaoEfetivoModeracaoPage() {
  const router = useRouter();
  const { effectiveProfile, obmContext, escalanteModeActive } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <GestaoEfetivoModeracaoModule
        user={effectiveProfile}
        obmContext={obmContext}
        isEscalanteContext={escalanteModeActive}
        onBack={() => router.push("/efetivo")}
      />
    </div>
  );
}
