"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSession } from "../../../contexts/SessionContext";
import { EscalaEspelhoModule } from "../../../components/EscalaEspelhoModule";

export default function EscalantePage() {
  const router = useRouter();
  const { effectiveProfile, obmContext } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Portal Principal
        </button>
      </div>

      <EscalaEspelhoModule user={effectiveProfile} obmContext={obmContext} />
    </div>
  );
}
