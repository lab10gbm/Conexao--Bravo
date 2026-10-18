"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { ComunicanteDashboard } from "../../../components/ComunicanteDashboard";

export default function ComunicacaoPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <ComunicanteDashboard
        user={effectiveProfile}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
