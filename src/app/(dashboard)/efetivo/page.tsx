"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { EfetivoPanel } from "../../../components/EfetivoPanel";

export default function EfetivoPage() {
  const router = useRouter();
  const { effectiveProfile, obmContext } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <EfetivoPanel
        user={effectiveProfile}
        obmContext={obmContext}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
