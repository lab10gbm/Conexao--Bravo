"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { RefeitorioModule } from "../../../components/RefeitorioModule";

export default function RefeitorioPage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <RefeitorioModule
        user={effectiveProfile}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
