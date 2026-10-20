"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { GestaoOficiaisMedicosModule } from "../../../components/GestaoOficiaisMedicosModule";

export default function OficiaisMedicosPage() {
  const router = useRouter();
  const { effectiveProfile, obmContext, setObmContext, availableObms } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <GestaoOficiaisMedicosModule
        user={effectiveProfile}
        obmContext={obmContext}
        setObmContext={setObmContext}
        availableObms={availableObms}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
