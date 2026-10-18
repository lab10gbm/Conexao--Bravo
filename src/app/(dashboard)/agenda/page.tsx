"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { AgendaPessoal } from "../../../components/AgendaPessoal";

export default function AgendaPage() {
  const router = useRouter();
  const { effectiveProfile, obmContext } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <AgendaPessoal
        user={effectiveProfile}
        obmContext={obmContext}
        standalone={true}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
