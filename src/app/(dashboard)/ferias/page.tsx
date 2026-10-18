"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { VacationModule } from "../../../components/VacationModule";

export default function FeriasPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <VacationModule
        user={effectiveProfile}
        onBackToPortal={() => router.push("/")}
      />
    </div>
  );
}
