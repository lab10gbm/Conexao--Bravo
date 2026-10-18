"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { PatrimonyModule } from "../../../features/patrimonio/PatrimonyModule";

export default function PatrimonioPage() {
  const router = useRouter();
  const {
    effectiveProfile,
    adminModeActive,
    setAdminModeActive,
    obmContext,
  } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <PatrimonyModule
        user={effectiveProfile}
        adminModeActive={adminModeActive}
        onToggleAdminMode={() => setAdminModeActive((prev) => !prev)}
        obmContext={obmContext}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
