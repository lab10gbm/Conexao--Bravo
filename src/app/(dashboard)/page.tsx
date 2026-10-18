"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../contexts/SessionContext";
import { HomePortal } from "../../components/HomePortal";

export default function HomePage() {
  const router = useRouter();
  const { effectiveProfile } = useSession();

  if (!effectiveProfile) return null;

  const handleLaunchModule = (id: string) => {
    switch (id) {
      case "escalante-gerenciar":
        router.push("/escalante");
        break;
      case "permutas":
        router.push("/permutas");
        break;
      case "ras":
        router.push("/ras");
        break;
      case "efetivo":
        router.push("/efetivo");
        break;
      case "refeitorio":
        router.push("/refeitorio");
        break;
      default:
        router.push(`/${id}`);
        break;
    }
  };

  return (
    <div className="w-full">
      <HomePortal
        user={effectiveProfile}
        isAdminRaw={Boolean(effectiveProfile.isAdmin)}
        isEscalanteRaw={Boolean(effectiveProfile.isEscalante)}
        onLaunchModule={handleLaunchModule}
      />
    </div>
  );
}
