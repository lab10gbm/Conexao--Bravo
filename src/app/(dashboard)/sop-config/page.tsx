"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { SopConfigModule } from "../../../components/SopConfigModule";

export default function SopConfigPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <SopConfigModule
        user={effectiveProfile}
        onBack={() => router.push("/sop-medidas")}
      />
    </div>
  );
}
