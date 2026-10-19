"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { ComandoAreaManager } from "../../../components/config/ComandoAreaManager";

export default function ComandoAreaPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <ComandoAreaManager onBackToConfig={() => router.push("/")} />
    </div>
  );
}
