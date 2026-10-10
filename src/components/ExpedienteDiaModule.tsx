import React, { useState, useMemo } from 'react';
import { BriefcaseBusiness, Tag, Layers } from 'lucide-react';
import { cn, normalizeRg } from '../lib/utils';
import { RankInsignia } from './RankInsignia';
import { parseRank, sortAllBySeniority } from '../lib/rankUtils';

export interface ExpedienteDiaModuleProps {
  obmContext: string;
  selectedDate: string;
  expedienteMilitars: any[];
  militars?: any[];
  loading?: boolean;
}

export function ExpedienteDiaModule({
  selectedDate,
  expedienteMilitars = [],
  militars = [],
  loading = false,
}: ExpedienteDiaModuleProps) {
  const formattedDate = selectedDate ? selectedDate.split('-').reverse().join('/') : '';
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');

  // Normaliza e resolve dados completos dos militares de expediente
  const enrichedList = useMemo(() => {
    const list = expedienteMilitars.map((item: any) => {
      const cleanRg = normalizeRg(item.rg);
      const mil =
        item.militar ||
        (militars || []).find((m: any) => normalizeRg(m.rg) === cleanRg);
      const rankStr = item.rank || mil?.rank || '';
      const is24h = !!item.is24h;
      const displayName =
        item.warName || mil?.warName || item.name || mil?.name || 'Militar';
      const sector = (item.sector || mil?.setor || 'Expediente Geral').trim().toUpperCase();

      return {
        rg: item.rg,
        cleanRg,
        rank: rankStr,
        warName: displayName,
        displayName,
        sector,
        is24h,
        original: item,
        militar: mil,
      };
    });

    // Ordenação por antiguidade / posto e graduação
    return list.sort((a, b) => {
      return sortAllBySeniority(a.militar || a, b.militar || b);
    });
  }, [expedienteMilitars, militars]);

  // Lista única de setores para tags de filtro rápido
  const sectorsList = useMemo(() => {
    const set = new Set<string>();
    enrichedList.forEach((m) => {
      if (m.sector) set.add(m.sector);
    });
    return Array.from(set).sort();
  }, [enrichedList]);

  // Filtragem por setor se selecionado
  const filteredList = useMemo(() => {
    if (selectedSector === 'TODOS') return enrichedList;
    return enrichedList.filter((m) => m.sector === selectedSector);
  }, [enrichedList, selectedSector]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6">
      {/* CABEÇALHO DA SEÇÃO */}
      <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/70 border-sky-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0 shadow-sm border border-sky-200/60">
            <BriefcaseBusiness className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black uppercase tracking-widest text-sky-900">
                Militares de Expediente no Dia (Atuais)
              </h3>
              {formattedDate && (
                <span className="text-[10px] font-bold text-sky-700 bg-sky-100/90 border border-sky-200 px-2.5 py-0.5 rounded-full font-mono">
                  {formattedDate}
                </span>
              )}
            </div>
            <p className="text-[10px] text-sky-600 font-bold tracking-tight">
              Escalação de expediente administrativo e serviço semanal sincronizada em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
              enrichedList.length > 0
                ? "bg-sky-100 text-sky-800 border border-sky-200"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            )}
          >
            {enrichedList.length} {enrichedList.length === 1 ? 'Militar' : 'Militares'}
          </span>
        </div>
      </div>

      {/* BARRA DE TAGS DE SETORES (SE HOUVER MAIS DE UM SETOR) */}
      {sectorsList.length > 1 && (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/70 flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1.5">
            <Tag className="w-3 h-3 text-slate-400" />
            <span>Filtrar Setor:</span>
          </div>
          <button
            onClick={() => setSelectedSector('TODOS')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer border",
              selectedSector === 'TODOS'
                ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            Todos ({enrichedList.length})
          </button>
          {sectorsList.map((sec) => {
            const count = enrichedList.filter((m) => m.sector === sec).length;
            const isSelected = selectedSector === sec;
            return (
              <button
                key={sec}
                onClick={() => setSelectedSector(isSelected ? 'TODOS' : sec)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                  isSelected
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                )}
              >
                {sec} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* CORPO: MILITARES LADO A LADO (SEM COLUNAS DE TABELA) */}
      <div className="p-4 sm:p-5 bg-slate-50/40">
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">
            Carregando militares do expediente...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <BriefcaseBusiness className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {selectedSector === 'TODOS'
                ? `Nenhum militar de expediente escalado para esta data (${formattedDate})`
                : `Nenhum militar do setor "${selectedSector}" escalado nesta data.`}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredList.map((item) => {
              return (
                <div
                  key={item.rg}
                  className={cn(
                    "bg-white border rounded-2xl p-3 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-2.5",
                    item.is24h
                      ? "border-amber-200/90 hover:border-amber-300 bg-gradient-to-b from-white to-amber-50/20"
                      : "border-slate-200/90 hover:border-sky-300"
                  )}
                >
                  {/* IDENTIFICAÇÃO DO MILITAR (APRESENTAÇÃO EXATA COM INSÍGNIA, POSTO/GRAD, GUERRA E RG) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="shrink-0">
                        <RankInsignia rankStr={item.rank} className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 uppercase text-xs tracking-tight truncate leading-tight">
                          {parseRank(item.rank)} {item.displayName}
                        </div>
                        <div className="font-mono text-[9px] text-slate-400 font-bold mt-0.5 leading-none">
                          {item.rg}
                        </div>
                      </div>
                    </div>
                    {item.is24h && (
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                        title="Serviço 24 Horas"
                      >
                        24H
                      </span>
                    )}
                  </div>

                  {/* SETOR COMO TAG */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200/80 truncate max-w-full">
                      {item.sector}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
