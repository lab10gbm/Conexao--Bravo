import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Clock, 
  X, 
  RotateCcw, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';
import { RankInsignia } from './RankInsignia';
import { formatRankAbbr } from '../lib/rankUtils';
import { cn, normalizeRg } from '../lib/utils';

export interface SentinelasSectionProps {
  obmContext?: string;
  selectedDate: string;
  baseRoster: any[];
  militars: any[];
  sentinelaRgs: (string | null)[];
  onSentinelaChange: (newSentinelaRgs: (string | null)[]) => void;
  identifiedAlaStr?: string;
  readonly?: boolean;
}

const TURN_SCHEDULES = [
  { posto: 'GUARDA NORTE', turno: '1º TURNO', horario: '06:00 às 08:00 / 14:00 às 16:00 / 22:00 às 00:00' },
  { posto: 'GUARDA NORTE', turno: '2º TURNO', horario: '08:00 às 10:00 / 16:00 às 18:00 / 00:00 às 02:00' },
  { posto: 'GUARDA NORTE', turno: '3º TURNO', horario: '10:00 às 12:00 / 18:00 às 20:00 / 02:00 às 04:00' },
  { posto: 'GUARDA NORTE', turno: '4º TURNO', horario: '12:00 às 14:00 / 20:00 às 22:00 / 04:00 às 06:00' },
  { posto: 'GUARDA SUL', turno: '1º TURNO SUL', horario: '06:00 às 07:30 / 12:00 às 13:30' },
  { posto: 'GUARDA SUL', turno: '2º TURNO SUL', horario: '07:30 às 09:00 / 13:30 às 15:00' },
  { posto: 'GUARDA SUL', turno: '3º TURNO SUL', horario: '09:00 às 10:30 / 15:00 às 16:30' },
  { posto: 'GUARDA SUL', turno: '4º TURNO SUL', horario: '10:30 às 12:00 / 16:30 às 18:00' },
];

export function SentinelasSection({
  obmContext,
  selectedDate,
  baseRoster = [],
  militars = [],
  sentinelaRgs = [null, null, null, null],
  onSentinelaChange,
  identifiedAlaStr,
  readonly = false
}: SentinelasSectionProps) {
  // Se houver algum militar na Guarda Sul (índices 4 a 7), inicializa com 8 vagas; caso contrário, 4
  const [showGuardaSul, setShowGuardaSul] = useState<boolean>(() => {
    return Array.isArray(sentinelaRgs) && sentinelaRgs.length > 4 && sentinelaRgs.slice(4).some(Boolean);
  });

  const slotsCount = showGuardaSul ? 8 : 4;

  // Garante que a lista tenha pelo menos slotsCount elementos
  const currentList = useMemo(() => {
    const list = [...(sentinelaRgs || [])];
    while (list.length < slotsCount) {
      list.push(null);
    }
    return list;
  }, [sentinelaRgs, slotsCount]);

  const filledCount = useMemo(() => {
    return currentList.slice(0, slotsCount).filter(Boolean).length;
  }, [currentList, slotsCount]);

  // Lista de militares da ala para seleção
  const availableCandidates = useMemo(() => {
    const candidates = baseRoster.map(m => {
      const full = militars.find((x: any) => normalizeRg(x.rg) === normalizeRg(m.rg)) || m;
      return {
        rg: m.rg || '',
        name: full.name || m.name || '',
        warName: full.warName || m.warName || m.name || '',
        rank: full.rank || m.rank || '',
        sentinela: !!(full.sentinela || full.ativoSentinela || m.sentinela || m.ativoSentinela)
      };
    });

    return candidates.sort((a, b) => {
      // Prioriza quem tem qualificação de sentinela habilitada
      if (a.sentinela && !b.sentinela) return -1;
      if (!a.sentinela && b.sentinela) return 1;
      return (a.warName || a.name).localeCompare(b.warName || b.name);
    });
  }, [baseRoster, militars]);

  const handleSelectSlot = (slotIdx: number, newRg: string) => {
    if (readonly) return;
    const next = [...currentList];
    next[slotIdx] = newRg ? newRg : null;
    onSentinelaChange(next);
  };

  const handleClearSlot = (slotIdx: number) => {
    if (readonly) return;
    const next = [...currentList];
    next[slotIdx] = null;
    onSentinelaChange(next);
  };

  const handleClearAll = () => {
    if (readonly) return;
    if (confirm("Deseja realmente limpar todos os sentinelas escalados para esta data?")) {
      onSentinelaChange(showGuardaSul ? Array(8).fill(null) : Array(4).fill(null));
    }
  };

  const handleToggleGuardaSul = () => {
    if (showGuardaSul) {
      // Se desativar Guarda Sul, pergunta se há alguém preenchido
      const hasSulFilled = currentList.slice(4).some(Boolean);
      if (hasSulFilled && !confirm("Existem militares cadastrados na Guarda Sul. Ocultar removerá os postos do Sul. Continuar?")) {
        return;
      }
      setShowGuardaSul(false);
      onSentinelaChange(currentList.slice(0, 4));
    } else {
      setShowGuardaSul(true);
      const next = [...currentList];
      while (next.length < 8) next.push(null);
      onSentinelaChange(next);
    }
  };

  const formattedDate = selectedDate ? selectedDate.split('-').reverse().join('/') : '';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6">
      {/* Header com gradiente sutil */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Escala de Sentinelas da Guarda
              </h3>
              {identifiedAlaStr && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {identifiedAlaStr}
                </span>
              )}
              {obmContext && (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block">
                  {obmContext}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Cadastro e designação dos turnos de sentinela. Os militares aqui escalados aparecerão na impressão da escala.
            </p>
          </div>
        </div>

        {/* Botões de Ação do Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleGuardaSul}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs border cursor-pointer",
              showGuardaSul 
                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" 
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
            title={showGuardaSul ? "Ocultar postos da Guarda Sul (manter apenas 4)" : "Ativar postos da Guarda Sul (total de 8 postos)"}
          >
            {showGuardaSul ? <Minus className="w-3.5 h-3.5 text-blue-600" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
            <span>{showGuardaSul ? 'Guarda Sul Ativa (8 Vagas)' : '+ Guarda Sul (8 Vagas)'}</span>
          </button>

          {filledCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all shadow-2xs cursor-pointer"
              title="Limpar todos os sentinelas"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>Limpar</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200/80 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-700">
            <span className={filledCount === slotsCount ? "text-emerald-600" : "text-amber-600"}>
              {filledCount}/{slotsCount}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">Vagas</span>
          </div>
        </div>
      </div>

      {/* Grid de Turnos */}
      <div className="p-4 sm:p-5 bg-slate-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: slotsCount }).map((_, idx) => {
            const rg = currentList[idx];
            const schedule = TURN_SCHEDULES[idx] || {
              posto: idx >= 4 ? 'GUARDA SUL' : 'GUARDA NORTE',
              turno: `${idx + 1}º TURNO`,
              horario: 'Horário do serviço'
            };

            const assignedMilitar = rg
              ? (militars.find(m => normalizeRg(m.rg) === normalizeRg(rg)) ||
                 baseRoster.find(m => normalizeRg(m.rg) === normalizeRg(rg)))
              : null;

            const isSul = idx >= 4;

            return (
              <div 
                key={idx}
                className={cn(
                  "bg-white rounded-2xl border transition-all flex flex-col justify-between p-3.5 shadow-2xs relative group",
                  assignedMilitar 
                    ? "border-blue-300 ring-1 ring-blue-100 bg-gradient-to-b from-white to-blue-50/20" 
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                        isSul ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      )}>
                        {schedule.turno}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 tracking-wider">
                        {schedule.posto}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[9.5px] font-medium text-slate-500 mt-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{schedule.horario}</span>
                    </div>
                  </div>

                  {assignedMilitar && !readonly && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Desocupar esta vaga"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Conteúdo do Militar */}
                {assignedMilitar ? (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl mt-1">
                    <div className="shrink-0">
                      <RankInsignia rankStr={assignedMilitar.rank} className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                          {formatRankAbbr(assignedMilitar.rank)}
                        </span>
                        <span className="text-xs font-black uppercase tracking-tight text-slate-800 truncate">
                          {assignedMilitar.warName || assignedMilitar.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 font-semibold">
                        RG: {assignedMilitar.rg}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">
                    <select
                      value=""
                      disabled={readonly}
                      onChange={(e) => handleSelectSlot(idx, e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 hover:bg-slate-100/80 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="" disabled>
                        + Selecionar militar da ala...
                      </option>
                      {availableCandidates.map(cand => {
                        const isAlreadyAssignedInAnotherSlot = currentList.includes(cand.rg) && currentList[idx] !== cand.rg;
                        return (
                          <option 
                            key={cand.rg} 
                            value={cand.rg}
                            className={isAlreadyAssignedInAnotherSlot ? "text-slate-400 italic" : "text-slate-800"}
                          >
                            {formatRankAbbr(cand.rank)} {cand.warName || cand.name} (RG: {cand.rg})
                            {cand.sentinela ? ' ★' : ''}
                            {isAlreadyAssignedInAnotherSlot ? ' [Já em outro turno]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Informações de Rodapé da Seção */}
        <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2 text-[10.5px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            <span>Militares com <strong>★</strong> possuem qualificação de Sentinela ativa no cadastro.</span>
          </div>
          <div className="flex items-center gap-1 font-bold text-slate-600">
            <span>Sincronização com o Gerar Escala ativa</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
