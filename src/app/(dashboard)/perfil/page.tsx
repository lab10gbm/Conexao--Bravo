"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { ProfileUpdate } from "../../../components/ProfileUpdate";

export default function PerfilPage() {
  const router = useRouter();
  const { effectiveProfile, setProfile } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full">
      <ProfileUpdate
        user={effectiveProfile}
        onUpdate={(updated) => {
          setProfile(updated);
          if (typeof window !== "undefined") {
            localStorage.setItem("militar_profile", JSON.stringify(updated));
          }
        }}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
