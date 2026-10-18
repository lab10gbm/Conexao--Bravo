"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { ConfiguracoesModule } from "../../../components/ConfiguracoesModule";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <ConfiguracoesModule onBack={() => router.push("/")} />
    </div>
  );
}
