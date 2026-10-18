"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSession } from "../../../contexts/SessionContext";
import { GrdModule } from "../../../components/GrdModule";

export default function GrdPage() {
  const router = useRouter();
  const { effectiveProfile, obmContext, setObmContext, availableObms } = useSession();

  if (!effectiveProfile) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="mb-2">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Portal Principal
        </button>
      </div>

      <GrdModule
        user={effectiveProfile}
        obmContext={obmContext}
        setObmContext={setObmContext}
        availableObms={availableObms}
      />
    </div>
  );
}
