"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { PainelMilitarDashboard } from "../../../components/PainelMilitarDashboard";

export default function PainelMilitarPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <PainelMilitarDashboard
        user={effectiveProfile}
        onBack={() => router.push("/")}
        onNavigate={(path) => router.push(path)}
      />
    </div>
  );
}
