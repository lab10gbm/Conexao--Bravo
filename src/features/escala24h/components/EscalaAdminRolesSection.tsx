import React, { useState } from 'react';
import { 
  Printer, Shield, BriefcaseBusiness, AlertCircle, CheckCircle2, 
  Eye, EyeOff, Shuffle, Activity 
} from 'lucide-react';
import { cn, formatMilitaryName } from '../../../lib/utils';
import { normalizeFnName } from '../lib/escalaCalculos';

export interface EscalaAdminRolesSectionProps {
  dynamicRequirements: any[];
  selectedFunctions: Record<string, string[]>;
  estudoTecnico: any;
  onToggleAdminRoleVisibility: (roleName: string) => void;
  onSetAllAdminRolesVisibility: (visible: boolean) => void;
  onOpenSorteioAdmin: () => void;
  militars: any[];
}

export function EscalaAdminRolesSection({
  dynamicRequirements,
  selectedFunctions,
  estudoTecnico,
  onToggleAdminRoleVisibility,
  onSetAllAdminRolesVisibility,
  onOpenSorteioAdmin,
  militars,
}: EscalaAdminRolesSectionProps) {
  const [adminTwoBlockMode, setAdminTwoBlockMode] = useState<'categories' | 'status' | 'table_analytics'>('categories');

  const adminReqs = dynamicRequirements.filter(f => f.category === 'admin');
  const activeAdminCount = adminReqs.filter(f => f.active !== false).length;
  const hasAnyVisibleAdmin = activeAdminCount > 0;

  const adminFunctions = adminReqs
    .map(f => {
      const currentCount = Object.values(selectedFunctions).flat().filter((v) => normalizeFnName(v) === normalizeFnName(f.name)).length;
      const isActive = f.active !== false;
      const isOk = !isActive || currentCount >= f.req;
      return { ...f, currentCount, isActive, isOk };
    })
    .filter(f => (f.baseReq ?? f.req) > 0 || f.currentCount > 0)
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.isOk === b.isOk) return 0;
      return a.isOk ? 1 : -1;
    });

  const group1Names = ['ADJUNTO', 'SGT DIA', 'CMT GUARDA', 'CB GUARDA', 'CB DIA', 'SENTINELA', 'ESCALANTE'].map(normalizeFnName);
  const group1List = adminFunctions.filter(f => group1Names.includes(normalizeFnName(f.name)));
  const group2List = adminFunctions.filter(f => !group1Names.includes(normalizeFnName(f.name)));

  const defList = adminFunctions.filter(f => f.isActive && !f.isOk);
  const okList = adminFunctions.filter(f => f.isActive && f.isOk);
  const inactiveList = adminFunctions.filter(f => !f.isActive);

  const renderAdminTable = (items: typeof adminFunctions) => (
    <div className="overflow-x-auto flex-1">
      <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white">
        <thead className="bg-slate-100/90 text-slate-700 text-[10px] border-b border-slate-200">
          <tr>
            <th className="py-1.5 px-3 font-black">Função</th>
            <th className="py-1.5 px-2 w-14 text-center font-black">Atual</th>
            <th className="py-1.5 px-2 w-16 text-center font-black">Nec.</th>
            <th className="py-1.5 px-2 w-20 text-center font-black">Status</th>
            <th className="py-1.5 px-2 w-28 text-center font-black" title="Ativa ou desativa a função no Sistema, Sorteio e Gerar Escala">Sistema / Sorteio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(funcao => {
            const currentCount = funcao.currentCount;
            const isActive = funcao.isActive;
            const isOk = funcao.isOk;
            return (
              <tr
                key={funcao.name}
                className={cn(
                  "transition-colors",
                  isActive ? "hover:bg-slate-50" : "bg-slate-50/70 opacity-65 hover:opacity-90"
                )}
              >
                <td className="py-1.5 px-3 tracking-tighter text-slate-800 text-[10.5px] font-black">
                  <span className={cn(!isActive && "line-through decoration-slate-300 text-slate-500")}>
                    {funcao.name}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-center">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-black inline-block min-w-[20px]",
                      currentCount > funcao.req
                        ? "bg-red-100 text-red-700 border border-red-300"
                        : currentCount > 0
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-400"
                    )}
                    title={currentCount > funcao.req ? `Limite excedido: ${currentCount} selecionados para ${funcao.req} vaga(s)` : undefined}
                  >
                    {currentCount}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-center text-slate-500 font-black text-[10.5px]">
                  {isActive ? (
                    funcao.req
                  ) : (
                    <span className="text-slate-400" title={`Necessidade padrão quando ativa: ${funcao.baseReq ?? 1}`}>
                      0 <span className="text-[8.5px] font-bold">({funcao.baseReq ?? 1})</span>
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center">
                  {!isActive ? (
                    <span
                      className="text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-black inline-flex items-center justify-center gap-0.5 text-[8.5px]"
                      title="Função desativada manualmente — não gera déficit nem entra no sorteio"
                    >
                      INATIVA
                    </span>
                  ) : isOk ? (
                    <span className="text-emerald-500 font-black inline-flex items-center justify-center gap-0.5 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" /> OK
                    </span>
                  ) : (
                    <span className="text-rose-500 font-black inline-flex items-center justify-center gap-0.5 text-[10px]">
                      <AlertCircle className="w-3 h-3 stroke-[3]" /> DEF
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleAdminRoleVisibility(funcao.name)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer border shadow-2xs",
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700"
                    )}
                    title={
                      isActive
                        ? `Função ${funcao.name} ativa — clique para desativar no sistema, sorteio e escala impressa`
                        : `Função ${funcao.name} inativa — clique para reativar`
                    }
                  >
                    {isActive ? (
                      <>
                        <Eye className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Ativa</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                        <span>Inativa</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Nenhuma função administrativa neste bloco
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-visible relative z-20">
      <div className="bg-slate-800 text-white rounded-t-2xl border-b border-slate-700 py-2 px-3.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Printer className="w-3.5 h-3.5 text-slate-300" />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white">
            Funções Administrativas
          </h3>
          <span className="text-[9px] font-bold text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Prontidão Administrativa (2 Blocos)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Resumo Global Administrativo */}
          <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-700 px-2 py-0.5 rounded-lg text-[9.5px]">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Global:</span>
            <span className={cn("font-black", estudoTecnico?.efetivoAdministrativo?.chance > 0 ? "text-rose-400" : "text-emerald-400")}>
              {estudoTecnico?.efetivoAdministrativo?.chance || 0}% Vazio
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-bold">Lacunas: {estudoTecnico?.efetivoAdministrativo?.deficit || 0}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-bold">Nec: {estudoTecnico?.efetivoAdministrativo?.req || 0}</span>
          </div>

          {/* Seletor de Modo dos 2 Blocos */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setAdminTwoBlockMode('categories')}
              className={cn(
                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                adminTwoBlockMode === 'categories'
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Dividir em 2 blocos por grupos (Gestão/Guarda e Apoio/Logística)"
            >
              2 Grupos
            </button>
            <button
              type="button"
              onClick={() => setAdminTwoBlockMode('status')}
              className={cn(
                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                adminTwoBlockMode === 'status'
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Dividir em 2 blocos por situação (Déficit e Regulares)"
            >
              Por Status
            </button>
            <button
              type="button"
              onClick={() => setAdminTwoBlockMode('table_analytics')}
              className={cn(
                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                adminTwoBlockMode === 'table_analytics'
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="2 blocos: Tabela completa + Diagnóstico do Administrativo"
            >
              Tabela + Diagnóstico
            </button>
          </div>

          {/* Botão Ativar/Desativar Todas no Sistema & Sorteio */}
          <button
            type="button"
            onClick={() => onSetAllAdminRolesVisibility(!hasAnyVisibleAdmin)}
            className={cn(
              "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border shadow-2xs",
              hasAnyVisibleAdmin
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30"
            )}
            title="Ativar ou desativar todas as funções administrativas no Sistema, Sorteio e Gerar Escala"
          >
            {hasAnyVisibleAdmin ? (
              <>
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>Sistema / Sorteio: Ativas ({activeAdminCount}/{adminReqs.length})</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-rose-400" />
                <span>Sistema / Sorteio: Inativas</span>
              </>
            )}
          </button>

          {/* Atalho direto para Sortear Funções Administrativas */}
          <button
            type="button"
            onClick={onOpenSorteioAdmin}
            className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white border border-orange-400/40 shadow-2xs"
            title="Abrir janela de sorteio de funções administrativas"
          >
            <Shuffle className="w-2.5 h-2.5" />
            <span>Sortear Admin.</span>
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-slate-50 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 w-full items-start">
          {adminTwoBlockMode === 'categories' && (
            <>
              {/* BLOCO 1: GESTÃO & GUARDA */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col h-full">
                <div className="bg-[#1e293b] text-white py-2 px-3 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider">Supervisão, Comando & Guarda</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-300 bg-slate-700/60 px-1.5 py-0.5 rounded">
                      {group1List.length} Funções
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {group1List.filter(f => f.isActive && f.isOk).length} OK
                    </span>
                    {group1List.filter(f => f.isActive && !f.isOk).length > 0 && (
                      <span className="text-[9px] font-black text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                        {group1List.filter(f => f.isActive && !f.isOk).length} DEF
                      </span>
                    )}
                    {group1List.filter(f => !f.isActive).length > 0 && (
                      <span className="text-[9px] font-bold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
                        {group1List.filter(f => !f.isActive).length} INAT
                      </span>
                    )}
                  </div>
                </div>
                {renderAdminTable(group1List)}
              </div>

              {/* BLOCO 2: APOIO & LOGÍSTICA */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col h-full">
                <div className="bg-[#1e293b] text-white py-2 px-3 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <BriefcaseBusiness className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider">Apoio Operacional, Rancho & Logística</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-300 bg-slate-700/60 px-1.5 py-0.5 rounded">
                      {group2List.length} Funções
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {group2List.filter(f => f.isActive && f.isOk).length} OK
                    </span>
                    {group2List.filter(f => f.isActive && !f.isOk).length > 0 && (
                      <span className="text-[9px] font-black text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                        {group2List.filter(f => f.isActive && !f.isOk).length} DEF
                      </span>
                    )}
                    {group2List.filter(f => !f.isActive).length > 0 && (
                      <span className="text-[9px] font-bold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
                        {group2List.filter(f => !f.isActive).length} INAT
                      </span>
                    )}
                  </div>
                </div>
                {renderAdminTable(group2List)}
              </div>
            </>
          )}

          {adminTwoBlockMode === 'status' && (
            <>
              {/* BLOCO 1: FUNÇÕES EM DÉFICIT */}
              <div className="bg-white rounded-xl border border-rose-200 overflow-hidden shadow-2xs flex flex-col h-full">
                <div className="bg-rose-950 text-white py-2 px-3 flex items-center justify-between border-b border-rose-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider">Funções Ativas com Déficit (Necessitam Militar)</span>
                  </div>
                  <span className="text-[9px] font-black text-rose-200 bg-rose-800/80 px-2 py-0.5 rounded border border-rose-700">
                    {defList.length} Funções com Lacuna
                  </span>
                </div>
                {renderAdminTable(defList)}
              </div>

              {/* BLOCO 2: FUNÇÕES REGULARES E INATIVAS */}
              <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs flex flex-col h-full">
                <div className="bg-emerald-950 text-white py-2 px-3 flex items-center justify-between border-b border-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider">Funções Regularizadas & Inativas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-emerald-200 bg-emerald-800/80 px-2 py-0.5 rounded border border-emerald-700">
                      {okList.length} Cobertas
                    </span>
                    {inactiveList.length > 0 && (
                      <span className="text-[9px] font-bold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        {inactiveList.length} Inativas
                      </span>
                    )}
                  </div>
                </div>
                {renderAdminTable([...okList, ...inactiveList])}
              </div>
            </>
          )}

          {adminTwoBlockMode === 'table_analytics' && (
            <>
              {/* BLOCO 1: TABELA GERAL */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col h-full">
                <div className="bg-[#1e293b] text-white py-2 px-3 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider">Tabela de Funções Administrativas</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded">
                    {adminFunctions.filter(f => f.isActive).length} Ativas / {adminFunctions.length} Total
                  </span>
                </div>
                {renderAdminTable(adminFunctions)}
              </div>

              {/* BLOCO 2: DIAGNÓSTICO E INTELIGÊNCIA ADMINISTRATIVA */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col h-full">
                <div className="bg-slate-800 text-white py-2 px-3 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider">Diagnóstico & Gestão do Administrativo</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded">
                    Resumo OBM
                  </span>
                </div>

                <div className="p-3 space-y-3 flex-1 bg-white">
                  {/* Medidor de Déficit */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Global Administrativo (Funções Ativas)</span>
                      <span className={cn("text-[10.5px] font-black", estudoTecnico?.efetivoAdministrativo?.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                        {estudoTecnico?.efetivoAdministrativo?.chance || 0}% Vazio
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", estudoTecnico?.efetivoAdministrativo?.chance > 0 ? "bg-rose-500" : "bg-emerald-500")}
                        style={{ width: `${estudoTecnico?.efetivoAdministrativo?.chance || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-500 font-bold">
                      <span>Lacunas: {estudoTecnico?.efetivoAdministrativo?.deficit || 0}</span>
                      <span>Necessidade Ativa: {estudoTecnico?.efetivoAdministrativo?.req || 0}</span>
                    </div>
                  </div>

                  {/* Balanço de Regularidade */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-center">
                      <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Regularizadas</span>
                      <span className="text-lg font-black text-emerald-800">{okList.length}</span>
                      <span className="text-[8.5px] text-emerald-600 block">ativas OK</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg text-center">
                      <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider block">Em Déficit</span>
                      <span className="text-lg font-black text-rose-800">{defList.length}</span>
                      <span className="text-[8.5px] text-rose-600 block">ativas s/ militar</span>
                    </div>
                    <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-center">
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">Inativas</span>
                      <span className="text-lg font-black text-slate-700">{inactiveList.length}</span>
                      <span className="text-[8.5px] text-slate-500 block">desativadas</span>
                    </div>
                  </div>

                  {/* Militares Escalados no Administrativo */}
                  <div>
                    <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-widest block mb-1.5">
                      Militares Escalados no Administrativo ({militars.filter(m => {
                        const fns = selectedFunctions[m.rg] || [];
                        return fns.some(fn => adminFunctions.some(af => normalizeFnName(af.name) === normalizeFnName(fn)));
                      }).length})
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                      {militars
                        .filter(m => {
                          const fns = selectedFunctions[m.rg] || [];
                          return fns.some(fn => adminFunctions.some(af => normalizeFnName(af.name) === normalizeFnName(fn)));
                        })
                        .map(m => {
                          const fns = selectedFunctions[m.rg] || [];
                          const adminFns = fns.filter(fn => adminFunctions.some(af => normalizeFnName(af.name) === normalizeFnName(fn)));
                          return (
                            <div
                              key={m.rg}
                              className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-800 text-[9.5px] px-2 py-0.5 rounded font-bold"
                            >
                              <span>{m.warName?.toUpperCase() || formatMilitaryName(m.name || "")}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-indigo-700 font-black">{adminFns.join(', ')}</span>
                            </div>
                          );
                        })}
                      {militars.filter(m => {
                        const fns = selectedFunctions[m.rg] || [];
                        return fns.some(fn => adminFunctions.some(af => normalizeFnName(af.name) === normalizeFnName(fn)));
                      }).length === 0 && (
                        <span className="text-[9.5px] text-slate-400 italic">
                          Nenhum militar alocado em função administrativa nesta escala ainda.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
