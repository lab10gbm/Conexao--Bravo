"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { PermutaModule } from "../../../components/PermutaModule";
import { PermutaBoard } from "../../../components/PermutaBoard";
import { RequestPermuta } from "../../../components/RequestPermuta";
import { ArrowLeft, Table, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function PermutasPage() {
  const router = useRouter();
  const {
    effectiveProfile,
    obmContext,
    isOfficerMode,
    adminModeActive,
    setAdminModeActive,
  } = useSession();

  const [isPermutaModalOpen, setIsPermutaModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonthView, setSelectedMonthView] = useState<number | null>(null);

  if (!effectiveProfile) return null;

  const handleDateClick = (date?: Date) => {
    setSelectedDate(date || new Date());
    setIsPermutaModalOpen(true);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {selectedMonthView === null ? (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col"
          >
            {/* Quick jump to full board */}
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSelectedMonthView(-1)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 font-black text-[10px] uppercase tracking-widest transition-all shadow-2xs cursor-pointer"
              >
                <Table className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ver Quadro Geral Completo (Tabela) &rarr;</span>
              </button>
            </div>

            <PermutaModule
              user={effectiveProfile}
              obmContext={obmContext}
              isOfficerMode={isOfficerMode}
              adminModeActive={adminModeActive}
              onToggleAdminMode={() => setAdminModeActive((prev) => !prev)}
              onDateClick={handleDateClick}
              onMonthSelect={(month) => setSelectedMonthView(month)}
              onBackToPortal={() => router.push("/")}
            />
          </motion.div>
        ) : (
          <motion.div
            key="board-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[60vh] flex flex-col"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedMonthView(null)}
                className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Voltar ao Calendário de Escalas</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMonthView(selectedMonthView === -1 ? new Date().getMonth() : -1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedMonthView === -1 ? "Filtrar Mês Atual" : "Ver Todos os Meses"}</span>
                </button>
              </div>
            </div>

            <section id="requests-board" className="flex-1">
              <PermutaBoard
                user={effectiveProfile}
                obmContext={obmContext}
                selectedMonth={selectedMonthView === -1 ? null : selectedMonthView}
                onMonthSelect={(m) => setSelectedMonthView(m)}
                onBack={() => setSelectedMonthView(null)}
                adminMode={adminModeActive || Boolean(effectiveProfile.isAdmin) || Boolean(effectiveProfile.isEscalante)}
              />
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <RequestPermuta
        isOpen={isPermutaModalOpen}
        setIsOpen={setIsPermutaModalOpen}
        user={effectiveProfile}
        obmContext={obmContext}
        initialDate={selectedDate}
      />
    </div>
  );
}

