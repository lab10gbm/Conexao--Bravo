"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { OficiaisDashboard } from "../../../components/OficiaisDashboard";

export default function OficiaisMedicosPage() {
  const router = useRouter();
  const { effectiveProfile, obmContext, setObmContext, availableObms } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <OficiaisDashboard
        user={effectiveProfile}
        obmContext={obmContext}
        setObmContext={setObmContext}
        availableObms={availableObms}
        onBack={() => router.push("/")}
        initialApp="oficiais-medicos"
      />
    </div>
  );
}
