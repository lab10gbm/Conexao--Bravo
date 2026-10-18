"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { DgpSyncModule } from "../../../components/DgpSyncModule";

export default function DgpSyncPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <DgpSyncModule
        user={effectiveProfile}
        onBack={() => router.push("/gestao-sad")}
      />
    </div>
  );
}
