"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { GestaoSadDashboard } from "../../../components/GestaoSadDashboard";

export default function GestaoSadPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <GestaoSadDashboard
        user={effectiveProfile}
        onBack={() => router.push("/")}
        onNavigate={(path) => router.push(path)}
      />
    </div>
  );
}
