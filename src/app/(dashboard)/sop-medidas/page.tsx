"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { SopMedidasModule } from "../../../components/SopMedidasModule";

export default function SopMedidasPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <SopMedidasModule
        user={effectiveProfile}
        militars={[]}
        onBack={() => router.push("/efetivo")}
        onNavigate={(path) => router.push(path)}
      />
    </div>
  );
}
