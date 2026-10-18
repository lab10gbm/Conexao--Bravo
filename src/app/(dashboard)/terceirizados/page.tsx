"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { TerceirizadosModule } from "../../../components/TerceirizadosModule";

export default function TerceirizadosPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <TerceirizadosModule
        user={effectiveProfile}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
