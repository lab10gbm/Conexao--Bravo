"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { MedidasModule } from "../../../components/MedidasModule";

export default function MedidasPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <MedidasModule
        user={effectiveProfile}
        onBack={() => router.push("/painel-militar")}
      />
    </div>
  );
}
