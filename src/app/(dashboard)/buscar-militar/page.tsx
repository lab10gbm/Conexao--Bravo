"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { BuscarMilitarModule } from "../../../components/BuscarMilitarModule";

export default function BuscarMilitarPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <BuscarMilitarModule
        viewer={effectiveProfile}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
