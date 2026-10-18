"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { EstudoTecnicoGuarnicoesModule } from "../../../components/EstudoTecnicoGuarnicoesModule";

export default function EstudoTecnicoGuarnicoesPage() {
  const router = useRouter();
  const { obmContext } = useSession();

  return (
    <div className="w-full">
      <EstudoTecnicoGuarnicoesModule
        obmContext={obmContext}
        onBack={() => router.push("/")}
        onNavigate={(path) => router.push(path)}
      />
    </div>
  );
}
