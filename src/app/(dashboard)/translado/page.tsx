"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { TransladoModule } from "../../../features/translado/TransladoModule";

export default function TransladoPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <TransladoModule
        user={effectiveProfile}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
