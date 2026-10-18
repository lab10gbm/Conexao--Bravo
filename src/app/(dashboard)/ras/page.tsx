"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, Settings } from "lucide-react";
import { useSession } from "../../../contexts/SessionContext";
import { RasClientModule } from "../../../components/RasClientModule";
import { RasManagerModule } from "../../../components/RasManagerModule";

export default function RasPage() {
  const router = useRouter();
  const { effectiveProfile, obmContext } = useSession();
  const [activeTab, setActiveTab] = useState<"voluntario" | "escalante">("voluntario");

  if (!effectiveProfile) return null;

  const isManager = Boolean(effectiveProfile.isAdmin || effectiveProfile.isEscalante);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Portal Principal
        </button>

        {isManager && (
          <div className="flex items-center gap-2 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("voluntario")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "voluntario"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Award className="w-4 h-4" />
              Minhas Vagas / Candidaturas
            </button>
            <button
              onClick={() => setActiveTab("escalante")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "escalante"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Settings className="w-4 h-4" />
              Gerenciamento de Vagas (Escalante)
            </button>
          </div>
        )}
      </div>

      {isManager && activeTab === "escalante" ? (
        <RasManagerModule user={effectiveProfile} obmContext={obmContext} />
      ) : (
        <RasClientModule user={effectiveProfile} obmContext={obmContext} />
      )}
    </div>
  );
}
