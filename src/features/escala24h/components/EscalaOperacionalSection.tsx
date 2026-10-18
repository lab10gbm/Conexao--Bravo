import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, Shuffle, Shield, Eye, EyeOff, CheckCircle2, 
  Activity, ArrowRight, TrendingDown 
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { normalizeFnName } from '../lib/escalaCalculos';

export interface EscalaOperacionalSectionProps {
  dynamicRequirements: any[];
  selectedFunctions: Record<string, string[]>;
  estudoTecnico: any;
  onToggleOperationalRole: (roleName: string) => void;
  onSetAllOperationalRoles: (active: boolean) => void;
  onOpenSorteioViaturas: () => void;
}

export function EscalaOperacionalSection({
  dynamicRequirements,
  selectedFunctions,
  estudoTecnico,
  onToggleOperationalRole,
  onSetAllOperationalRoles,
  onOpenSorteioViaturas,
}: EscalaOperacionalSectionProps) {
  const navigate = useNavigate();

  const opFunctions = dynamicRequirements
    .filter(f => f.category !== 'admin')
    .map(f => {
      const currentCount = Object.values(selectedFunctions).flat().filter((v) => normalizeFnName(v) === normalizeFnName(f.name)).length;
      const isActive = f.active !== false && f.req > 0;
      const isOk = !isActive || currentCount >= f.req;
      return { ...f, currentCount, isActive, isOk };
    })
    .filter(f => (f.baseReq ?? f.req) > 0 || f.currentCount > 0)
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.isOk === b.isOk) return 0;
      return a.isOk ? 1 : -1;
    });

  const activeOpCount = opFunctions.filter(f => f.isActive).length;
  const hasAnyActiveOp = activeOpCount > 0;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-visible relative z-20">
      <div className="bg-amber-50 rounded-t-2xl border-b border-amber-100 py-2 px-3.5 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-[11px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          Prontidão Operacional (Quant_Militares1)
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9.5px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
            Sincronizado com Distribuição de Viaturas
          </span>
          <button
            type="button"
            onClick={onOpenSorteioViaturas}
            className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border border-amber-400/40 shadow-2xs"
            title="Abrir janela de sorteio de funções de viatura (baseada nas viaturas e vagas ativas)"
          >
            <Shuffle className="w-2.5 h-2.5" />
            <span>Sortear Viaturas</span>
          </button>
        </div>
      </div>
      <div className="p-3 sm:p-4 bg-slate-50 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-7xl mx-auto items-start">
            
          {/* OPERACIONAIS (VERTICAL) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                Funções Operacionais
                <span className="text-[9px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                  {activeOpCount}/{opFunctions.length} Ativas
                </span>
              </h4>
              <button
                type="button"
                onClick={() => onSetAllOperationalRoles(!hasAnyActiveOp)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border",
                  hasAnyActiveOp
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                )}
                title="Marcar ou desmarcar todas as funções nas viaturas ativas"
              >
                {hasAnyActiveOp ? (
                  <>
                    <Eye className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Viaturas Ativas: Todas Marcadas</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                    <span>Reativar Vagas nas Viaturas</span>
                  </>
                )}
              </button>
            </div>
            <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-2xs">
              <thead className="bg-[#1e293b] text-white text-[10px]">
                <tr>
                  <th className="py-1.5 px-3 border-b border-slate-700">Função / Viaturas</th>
                  <th className="py-1.5 px-2 border-b border-slate-700 w-14 text-center">Atual</th>
                  <th className="py-1.5 px-2 border-b border-slate-700 w-16 text-center">Nec.</th>
                  <th className="py-1.5 px-2 border-b border-slate-700 w-20 text-center">Status</th>
                  <th className="py-1.5 px-2 border-b border-slate-700 w-24 text-center" title="Ativa ou desativa a função diretamente na Distribuição de Viaturas e no Sorteio">Viatura / Sorteio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opFunctions.map((funcao) => {
                  const currentCount = funcao.currentCount;
                  const isActive = funcao.isActive;
                  const isOk = funcao.isOk;
                  const activeVtrSet = new Set(funcao.vtrsActive || []);
                  const allVtrs = funcao.vtrsAll || [];
                  return (
                    <tr
                      key={funcao.name}
                      className={cn(
                        "transition-colors",
                        isActive ? "hover:bg-slate-50" : "bg-slate-50/70 opacity-65 hover:opacity-95"
                      )}
                    >
                      <td className="py-1.5 px-3 tracking-tighter text-slate-800 text-[10.5px]">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("font-black", !isActive && "line-through decoration-slate-300 text-slate-500")}>
                            {funcao.name}
                          </span>
                          {allVtrs.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {allVtrs.map(vtrName => {
                                const vtrIsContributing = activeVtrSet.has(vtrName);
                                return (
                                  <span
                                    key={vtrName}
                                    className={cn(
                                      "text-[8px] font-black px-1 py-0.2 rounded border",
                                      vtrIsContributing
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-slate-100 text-slate-400 border-slate-200"
                                    )}
                                    title={vtrIsContributing ? `Vaga ativa na viatura ${vtrName}` : `Vaga desmarcada ou viatura ${vtrName} inativa`}
                                  >
                                    {vtrName}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
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
                      <td className="py-1.5 px-2 text-center text-slate-500 font-black">
                        {isActive ? (
                          <>
                            {funcao.req}
                            {funcao.baseReq && funcao.baseReq > funcao.req && (
                              <span className="text-[8.5px] text-slate-400 font-bold ml-0.5" title={`Capacidade máxima na frota: ${funcao.baseReq}`}>
                                /{funcao.baseReq}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400" title={`Capacidade na frota quando ativa: ${funcao.baseReq ?? 1}`}>
                            0 <span className="text-[8.5px] font-bold">({funcao.baseReq ?? 1})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {!isActive ? (
                          <span
                            className="text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-black inline-flex items-center justify-center gap-0.5 text-[8.5px]"
                            title="Função desativada nas viaturas — não gera déficit nem entra no sorteio"
                          >
                            INATIVA
                          </span>
                        ) : isOk ? (
                          <span className="text-emerald-500 font-black flex items-center justify-center gap-0.5 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" /> OK
                          </span>
                        ) : (
                          <span className="text-rose-500 font-black flex items-center justify-center gap-0.5 text-[10px]">
                            <AlertCircle className="w-3 h-3 stroke-[3]" /> DEF
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleOperationalRole(funcao.name)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer border shadow-2xs",
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700"
                          )}
                          title={
                            isActive
                              ? `Função ${funcao.name} ativa nas viaturas (${(funcao.vtrsActive || []).join(', ')}) — clique para desmarcar na distribuição de viaturas`
                              : `Função ${funcao.name} inativa — clique para ativar nas viaturas (${(funcao.vtrsAll || []).join(', ')})`
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
              </tbody>
            </table>
          </div>

          {/* ESTUDO TÉCNICO / PREVISÃO ALGORÍTMICA (VERTICAL) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                Previsão Algorítmica
              </h4>
              <button 
                type="button"
                onClick={() => navigate('/estudo-tecnico-guarnicoes')}
                className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[9.5px] font-bold tracking-wider transition-colors cursor-pointer"
              >
                Estudo Plurianual <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs flex flex-col h-full">
              <div className="py-2 px-3 bg-slate-800 text-white flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  Risco de Déficit
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-700/50">
                  PREVISÃO
                </span>
              </div>
              <div className="p-3 space-y-2.5 flex-1">
                {/* Efetivo Global */}
                <div>
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Efetivo Global (Total)</span>
                    <span className={cn("text-[10px] font-black", estudoTecnico?.efetivo?.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {estudoTecnico?.efetivo?.chance || 0}% Vazio
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico?.efetivo?.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico?.efetivo?.chance || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                    <span>Lacunas: {estudoTecnico?.efetivo?.deficit || 0}</span>
                    <span>Nec: {estudoTecnico?.efetivo?.req || 0}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[9.5px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-0.5 mb-1">Funções Operacionais</span>
                </div>
                
                {/* Efetivo Operacional */}
                <div>
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Global Operacional</span>
                    <span className={cn("text-[10px] font-black", estudoTecnico?.efetivoOperacional?.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {estudoTecnico?.efetivoOperacional?.chance || 0}% Vazio
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico?.efetivoOperacional?.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico?.efetivoOperacional?.chance || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                    <span>Lacunas: {estudoTecnico?.efetivoOperacional?.deficit || 0}</span>
                    <span>Nec: {estudoTecnico?.efetivoOperacional?.req || 0}</span>
                  </div>
                </div>
                
                {/* Condutores */}
                <div>
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Condutores</span>
                    <span className={cn("text-[10px] font-black", estudoTecnico?.condutores?.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {estudoTecnico?.condutores?.chance || 0}% Vazio
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico?.condutores?.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico?.condutores?.chance || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                    <span>Lacunas: {estudoTecnico?.condutores?.deficit || 0}</span>
                    <span>Nec: {estudoTecnico?.condutores?.req || 0}</span>
                  </div>
                </div>

                {estudoTecnico?.condutores_maritimos?.req > 0 && (
                  <div>
                    <div className="flex justify-between items-end mb-0.5">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Mestres (Marítimo)</span>
                      <span className={cn("text-[10px] font-black", estudoTecnico.condutores_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                        {estudoTecnico.condutores_maritimos.chance}% Vazio
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.condutores_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.condutores_maritimos.chance}%` }} />
                    </div>
                    <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                      <span>Lacunas: {estudoTecnico.condutores_maritimos.deficit}</span>
                      <span>Nec: {estudoTecnico.condutores_maritimos.req}</span>
                    </div>
                  </div>
                )}

                {/* Chefes */}
                <div>
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Chefes de Guarnição</span>
                    <span className={cn("text-[10px] font-black", estudoTecnico?.chefes?.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {estudoTecnico?.chefes?.chance || 0}% Vazio
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico?.chefes?.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico?.chefes?.chance || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                    <span>Lacunas: {estudoTecnico?.chefes?.deficit || 0}</span>
                    <span>Nec: {estudoTecnico?.chefes?.req || 0}</span>
                  </div>
                </div>

                {estudoTecnico?.chefes_maritimos?.req > 0 && (
                  <div>
                    <div className="flex justify-between items-end mb-0.5">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Chefes (Marítimo)</span>
                      <span className={cn("text-[10px] font-black", estudoTecnico.chefes_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                        {estudoTecnico.chefes_maritimos.chance}% Vazio
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.chefes_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.chefes_maritimos.chance}%` }} />
                    </div>
                    <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                      <span>Lacunas: {estudoTecnico.chefes_maritimos.deficit}</span>
                      <span>Nec: {estudoTecnico.chefes_maritimos.req}</span>
                    </div>
                  </div>
                )}

                {/* Auxiliares */}
                <div>
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Auxiliares / Geral</span>
                    <span className={cn("text-[10px] font-black", estudoTecnico?.auxiliares?.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {estudoTecnico?.auxiliares?.chance || 0}% Vazio
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico?.auxiliares?.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico?.auxiliares?.chance || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                    <span>Lacunas: {estudoTecnico?.auxiliares?.deficit || 0}</span>
                    <span>Nec: {estudoTecnico?.auxiliares?.req || 0}</span>
                  </div>
                </div>

                {estudoTecnico?.auxiliares_maritimos?.req > 0 && (
                  <div>
                    <div className="flex justify-between items-end mb-0.5">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Marinheiros (Marítimo)</span>
                      <span className={cn("text-[10px] font-black", estudoTecnico.auxiliares_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                        {estudoTecnico.auxiliares_maritimos.chance}% Vazio
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.auxiliares_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.auxiliares_maritimos.chance}%` }} />
                    </div>
                    <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                      <span>Lacunas: {estudoTecnico.auxiliares_maritimos.deficit}</span>
                      <span>Nec: {estudoTecnico.auxiliares_maritimos.req}</span>
                    </div>
                  </div>
                )}

                <div className="pt-1.5">
                  <span className="text-[9.5px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-0.5 mb-1">Funções Administrativas</span>
                </div>

                {/* Efetivo Administrativo */}
                <div>
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Global Administrativo</span>
                    <span className={cn("text-[10px] font-black", estudoTecnico?.efetivoAdministrativo?.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {estudoTecnico?.efetivoAdministrativo?.chance || 0}% Vazio
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico?.efetivoAdministrativo?.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico?.efetivoAdministrativo?.chance || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5 text-[8.5px] text-slate-400 font-bold">
                    <span>Lacunas: {estudoTecnico?.efetivoAdministrativo?.deficit || 0}</span>
                    <span>Nec: {estudoTecnico?.efetivoAdministrativo?.req || 0}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
