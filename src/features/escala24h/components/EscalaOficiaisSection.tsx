import React, { useState } from 'react';
import { 
  Shield, CheckCircle2, ChevronDown, Eye, EyeOff, ExternalLink, 
  Award, Edit3, Plus, Anchor, Stethoscope 
} from 'lucide-react';
import { RankInsignia } from '../../../components/RankInsignia';
import { parseRank } from '../../../lib/rankUtils';
import { cn } from '../../../lib/utils';
import { OfficerVisibility } from '../types';

export interface EscalaOficiaisSectionProps {
  obmContext: string;
  loadingOfficerScale: boolean;
  loadingNauticoScale: boolean;
  loadingMedicoScale: boolean;
  isOfficerSectionExpanded: boolean;
  setIsOfficerSectionExpanded: (val: boolean) => void;
  officerVisibility: OfficerVisibility;
  onToggleOfficerVisibility: (key: 'showSection' | 'showOficialDia' | 'showOficialNautica' | 'showOficialMedico') => void;
  oficialDiaValue?: string;
  sobreavisoValue?: string;
  matchedOficialDia?: any;
  availableOfficers: any[];
  onSaveOficialDia: (name: string) => Promise<void>;
  savingOficialDia: boolean;
  nauticoOficialValue?: string;
  nauticoSobreavisoValue?: string;
  matchedNauticoOficial?: any;
  availableNauticoOfficers: any[];
  onSaveNauticoOficial: (name: string) => Promise<void>;
  savingNautico: boolean;
  medicoOficialValue?: string;
  medicoSobreavisoValue?: string;
  matchedMedicoOficial?: any;
  availableMedicalOfficers: any[];
  onSaveMedicoOficial: (name: string) => Promise<void>;
  savingMedico: boolean;
  onNavigate?: (path: string) => void;
}

export function EscalaOficiaisSection({
  obmContext,
  loadingOfficerScale,
  loadingNauticoScale,
  loadingMedicoScale,
  isOfficerSectionExpanded,
  setIsOfficerSectionExpanded,
  officerVisibility,
  onToggleOfficerVisibility,
  oficialDiaValue,
  sobreavisoValue,
  matchedOficialDia,
  availableOfficers,
  onSaveOficialDia,
  savingOficialDia,
  nauticoOficialValue,
  nauticoSobreavisoValue,
  matchedNauticoOficial,
  availableNauticoOfficers,
  onSaveNauticoOficial,
  savingNautico,
  medicoOficialValue,
  medicoSobreavisoValue,
  matchedMedicoOficial,
  availableMedicalOfficers,
  onSaveMedicoOficial,
  savingMedico,
  onNavigate,
}: EscalaOficiaisSectionProps) {
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const [isEditingOficialDia, setIsEditingOficialDia] = useState(false);
  const [selectedOfficerInput, setSelectedOfficerInput] = useState('');

  const [isEditingNautico, setIsEditingNautico] = useState(false);
  const [selectedNauticoInput, setSelectedNauticoInput] = useState('');

  const [isEditingMedico, setIsEditingMedico] = useState(false);
  const [selectedMedicoInput, setSelectedMedicoInput] = useState('');

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden relative">
      {/* Header Compacto da Seção */}
      <div className="bg-slate-900 border-b border-slate-800 py-1.5 px-3 sm:px-3.5 flex flex-wrap items-center justify-between gap-2 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <Shield className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-white truncate">
              Oficiais de Dia & Serviços Operacionais (24h)
            </h3>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              Sincronizado
            </span>
            {(loadingOfficerScale || loadingNauticoScale || loadingMedicoScale) && (
              <span className="text-[8.5px] font-bold text-amber-400 animate-pulse uppercase tracking-widest shrink-0">
                Atualizando...
              </span>
            )}
            {!isOfficerSectionExpanded && (
              <span className="text-[9px] text-slate-400 font-mono hidden md:inline truncate max-w-xs xl:max-w-md">
                • {oficialDiaValue ? `Of. Dia: ${oficialDiaValue}` : 'Sem Of. Dia'} | {nauticoOficialValue ? `Náut: ${nauticoOficialValue}` : 'Sem Náut.'} | {medicoOficialValue ? `Méd: ${medicoOficialValue}` : 'Sem Méd.'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleOfficerVisibility('showSection')}
            className={cn(
              "px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border shadow-2xs",
              officerVisibility.showSection !== false && (officerVisibility.showOficialDia || officerVisibility.showOficialNautica || officerVisibility.showOficialMedico)
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
            )}
            title="Ativar ou desativar o aparecimento de todos os oficiais no arquivo Gerar Escala"
          >
            {officerVisibility.showSection !== false && (officerVisibility.showOficialDia || officerVisibility.showOficialNautica || officerVisibility.showOficialMedico) ? (
              <>
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>Gerar Escala: Ativo</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-rose-400" />
                <span>Gerar Escala: Desativado</span>
              </>
            )}
          </button>

          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono hidden sm:inline">
            OBM: <strong className="text-white">{obmContext || "10º GBM"}</strong>
          </span>

          {/* Botão de Expandir / Recolher */}
          <button
            type="button"
            onClick={() => setIsOfficerSectionExpanded(!isOfficerSectionExpanded)}
            className="p-1 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer"
            title={isOfficerSectionExpanded ? "Recolher painel de oficiais" : "Expandir painel de oficiais"}
          >
            <span>{isOfficerSectionExpanded ? "Recolher" : "Expandir"}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !isOfficerSectionExpanded && "-rotate-90")} />
          </button>
        </div>
      </div>

      {/* Conteúdo Compacto dos 3 Cards Operacionais */}
      {isOfficerSectionExpanded && (
        <div className="p-2 bg-slate-50/40">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            
            {/* CARD 1: SERVIÇO & GRD (OFICIAL DE DIA) */}
            <div className="rounded-xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-2xs hover:border-amber-300 transition-colors">
              <div className="p-2 px-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 leading-tight">
                      Oficial de Dia
                    </h4>
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-amber-800 leading-none block">
                      Serviço & GRD (CMT OP)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleOfficerVisibility('showOficialDia')}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all cursor-pointer border",
                      officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                    )}
                    title={officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false ? "Função ativa no Gerar Escala" : "Função desativada no Gerar Escala"}
                  >
                    {officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false ? (
                      <>
                        <Eye className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Ativo</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                        <span>Oculto</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/servicos-grd')}
                    className="p-1 hover:bg-white rounded text-slate-500 hover:text-amber-700 transition-colors text-[8px] font-black uppercase flex items-center gap-0.5 border border-transparent hover:border-amber-200 cursor-pointer"
                    title="Acessar módulo de Serviços & GRD"
                  >
                    <ExternalLink className="w-2.5 h-2.5 text-amber-600" />
                  </button>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                {isEditingOficialDia ? (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-2 flex flex-col gap-1.5 shadow-2xs">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700">
                      Definir Oficial de Dia
                    </span>
                    <select
                      value={selectedOfficerInput}
                      onChange={(e) => setSelectedOfficerInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-amber-500"
                    >
                      <option value="">-- Selecione um Oficial --</option>
                      {availableOfficers.map((mil) => {
                        const optName = `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
                        return (
                          <option key={mil.rg} value={optName}>
                            {optName} (RG: {mil.rg})
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="text"
                      placeholder="Ou digite o nome..."
                      value={selectedOfficerInput}
                      onChange={(e) => setSelectedOfficerInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-amber-500"
                    />
                    <div className="flex justify-end gap-1 pt-0.5">
                      {oficialDiaValue && (
                        <button
                          type="button"
                          onClick={() => {
                            onSaveOficialDia('').then(() => setIsEditingOficialDia(false));
                          }}
                          disabled={savingOficialDia}
                          className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[8.5px] font-black uppercase cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingOficialDia(false)}
                        disabled={savingOficialDia}
                        className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[8.5px] font-black uppercase cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSaveOficialDia(selectedOfficerInput).then(() => setIsEditingOficialDia(false));
                        }}
                        disabled={savingOficialDia || !selectedOfficerInput.trim()}
                        className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[8.5px] font-black uppercase shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {savingOficialDia ? "..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : oficialDiaValue ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-amber-400/30 flex items-center justify-center text-white shrink-0 shadow-2xs">
                          {matchedOficialDia?.rank ? (
                            <RankInsignia rankStr={matchedOficialDia.rank} />
                          ) : (
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight">
                            {matchedOficialDia ? `${parseRank(matchedOficialDia.rank)} ${matchedOficialDia.warName || matchedOficialDia.name}` : oficialDiaValue}
                          </h5>
                          <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-slate-500 leading-none mt-0.5">
                            {matchedOficialDia?.rg && <span>RG: <strong>{matchedOficialDia.rg}</strong></span>}
                            {matchedOficialDia?.cel && <span>Tel: <strong>{matchedOficialDia.cel}</strong></span>}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingOficialDia(true);
                          setSelectedOfficerInput(oficialDiaValue || '');
                        }}
                        className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar
                      </button>
                    </div>

                    {sobreavisoValue && (
                      <div className="bg-amber-50/80 border border-amber-200/60 rounded p-1 px-2 text-[8px] font-bold text-amber-900 uppercase flex items-center justify-between leading-none">
                        <span>Sobreaviso 2 / GRD 2:</span>
                        <strong className="truncate max-w-[140px]">{sobreavisoValue}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Nenhum Oficial de Dia
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingOficialDia(true);
                        setSelectedOfficerInput('');
                      }}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[8.5px] tracking-wider rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" /> Definir
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: NÚCLEO NÁUTICO */}
            <div className="rounded-xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-2xs hover:border-cyan-300 transition-colors">
              <div className="p-2 px-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-cyan-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Anchor className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 leading-tight">
                      Oficial Náutico
                    </h4>
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-cyan-800 leading-none block">
                      Núcleo Náutico (Embarcação)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleOfficerVisibility('showOficialNautica')}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all cursor-pointer border",
                      officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                    )}
                    title={officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false ? "Função ativa no Gerar Escala" : "Função desativada no Gerar Escala"}
                  >
                    {officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false ? (
                      <>
                        <Eye className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Ativo</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                        <span>Oculto</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/nucleo-nautico')}
                    className="p-1 hover:bg-white rounded text-slate-500 hover:text-cyan-700 transition-colors text-[8px] font-black uppercase flex items-center gap-0.5 border border-transparent hover:border-cyan-200 cursor-pointer"
                    title="Acessar módulo Núcleo Náutico"
                  >
                    <ExternalLink className="w-2.5 h-2.5 text-cyan-600" />
                  </button>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                {isEditingNautico ? (
                  <div className="bg-cyan-50/50 border border-cyan-200 rounded-lg p-2 flex flex-col gap-1.5 shadow-2xs">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700">
                      Definir Oficial Náutico
                    </span>
                    <select
                      value={selectedNauticoInput}
                      onChange={(e) => setSelectedNauticoInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-cyan-500"
                    >
                      <option value="">-- Selecione um Oficial --</option>
                      {availableNauticoOfficers.map((mil) => {
                        const optName = `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
                        return (
                          <option key={mil.rg} value={optName}>
                            {optName} (RG: {mil.rg})
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="text"
                      placeholder="Ou digite o nome..."
                      value={selectedNauticoInput}
                      onChange={(e) => setSelectedNauticoInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-cyan-500"
                    />
                    <div className="flex justify-end gap-1 pt-0.5">
                      {nauticoOficialValue && (
                        <button
                          type="button"
                          onClick={() => {
                            onSaveNauticoOficial('').then(() => setIsEditingNautico(false));
                          }}
                          disabled={savingNautico}
                          className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[8.5px] font-black uppercase cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingNautico(false)}
                        disabled={savingNautico}
                        className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[8.5px] font-black uppercase cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSaveNauticoOficial(selectedNauticoInput).then(() => setIsEditingNautico(false));
                        }}
                        disabled={savingNautico || !selectedNauticoInput.trim()}
                        className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[8.5px] font-black uppercase shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {savingNautico ? "..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : nauticoOficialValue ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-cyan-400/30 flex items-center justify-center text-white shrink-0 shadow-2xs">
                          {matchedNauticoOficial?.rank ? (
                            <RankInsignia rankStr={matchedNauticoOficial.rank} />
                          ) : (
                            <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight">
                            {matchedNauticoOficial ? `${parseRank(matchedNauticoOficial.rank)} ${matchedNauticoOficial.warName || matchedNauticoOficial.name}` : nauticoOficialValue}
                          </h5>
                          <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-slate-500 leading-none mt-0.5">
                            {matchedNauticoOficial?.rg && <span>RG: <strong>{matchedNauticoOficial.rg}</strong></span>}
                            {matchedNauticoOficial?.cel && <span>Tel: <strong>{matchedNauticoOficial.cel}</strong></span>}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingNautico(true);
                          setSelectedNauticoInput(nauticoOficialValue || '');
                        }}
                        className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar
                      </button>
                    </div>

                    {nauticoSobreavisoValue && (
                      <div className="bg-cyan-50/80 border border-cyan-200/60 rounded p-1 px-2 text-[8px] font-bold text-cyan-900 uppercase flex items-center justify-between leading-none">
                        <span>Apoio / Sobreaviso:</span>
                        <strong className="truncate max-w-[140px]">{nauticoSobreavisoValue}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Nenhum Oficial Náutico
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingNautico(true);
                        setSelectedNauticoInput('');
                      }}
                      className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black uppercase text-[8.5px] tracking-wider rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" /> Definir
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 3: OFICIAIS MÉDICOS */}
            <div className="rounded-xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-2xs hover:border-rose-300 transition-colors">
              <div className="p-2 px-3 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Stethoscope className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 leading-tight">
                      Oficial Médico
                    </h4>
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-rose-800 leading-none block">
                      Oficiais Médicos (Saúde)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleOfficerVisibility('showOficialMedico')}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all cursor-pointer border",
                      officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                    )}
                    title={officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false ? "Função ativa no Gerar Escala" : "Função desativada no Gerar Escala"}
                  >
                    {officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false ? (
                      <>
                        <Eye className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Ativo</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                        <span>Oculto</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/oficiais-medicos')}
                    className="p-1 hover:bg-white rounded text-slate-500 hover:text-rose-700 transition-colors text-[8px] font-black uppercase flex items-center gap-0.5 border border-transparent hover:border-rose-200 cursor-pointer"
                    title="Acessar módulo Oficiais Médicos"
                  >
                    <ExternalLink className="w-2.5 h-2.5 text-rose-600" />
                  </button>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                {isEditingMedico ? (
                  <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-2 flex flex-col gap-1.5 shadow-2xs">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700">
                      Definir Oficial Médico
                    </span>
                    <select
                      value={selectedMedicoInput}
                      onChange={(e) => setSelectedMedicoInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-rose-500"
                    >
                      <option value="">-- Selecione um Médico --</option>
                      {availableMedicalOfficers.map((mil) => {
                        const optName = `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
                        return (
                          <option key={mil.rg} value={optName}>
                            {optName} (RG: {mil.rg})
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="text"
                      placeholder="Ou digite o nome..."
                      value={selectedMedicoInput}
                      onChange={(e) => setSelectedMedicoInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-rose-500"
                    />
                    <div className="flex justify-end gap-1 pt-0.5">
                      {medicoOficialValue && (
                        <button
                          type="button"
                          onClick={() => {
                            onSaveMedicoOficial('').then(() => setIsEditingMedico(false));
                          }}
                          disabled={savingMedico}
                          className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[8.5px] font-black uppercase cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingMedico(false)}
                        disabled={savingMedico}
                        className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[8.5px] font-black uppercase cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSaveMedicoOficial(selectedMedicoInput).then(() => setIsEditingMedico(false));
                        }}
                        disabled={savingMedico || !selectedMedicoInput.trim()}
                        className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8.5px] font-black uppercase shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {savingMedico ? "..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : medicoOficialValue ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-rose-400/30 flex items-center justify-center text-white shrink-0 shadow-2xs">
                          {matchedMedicoOficial?.rank ? (
                            <RankInsignia rankStr={matchedMedicoOficial.rank} />
                          ) : (
                            <Stethoscope className="w-3.5 h-3.5 text-rose-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight">
                            {matchedMedicoOficial ? `${parseRank(matchedMedicoOficial.rank)} ${matchedMedicoOficial.warName || matchedMedicoOficial.name}` : medicoOficialValue}
                          </h5>
                          <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-slate-500 leading-none mt-0.5">
                            {matchedMedicoOficial?.rg && <span>RG: <strong>{matchedMedicoOficial.rg}</strong></span>}
                            {matchedMedicoOficial?.cel && <span>Tel: <strong>{matchedMedicoOficial.cel}</strong></span>}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingMedico(true);
                          setSelectedMedicoInput(medicoOficialValue || '');
                        }}
                        className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar
                      </button>
                    </div>

                    {medicoSobreavisoValue && (
                      <div className="bg-rose-50/80 border border-rose-200/60 rounded p-1 px-2 text-[8px] font-bold text-rose-900 uppercase flex items-center justify-between leading-none">
                        <span>Apoio / Sobreaviso:</span>
                        <strong className="truncate max-w-[140px]">{medicoSobreavisoValue}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Nenhum Oficial Médico
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingMedico(true);
                        setSelectedMedicoInput('');
                      }}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[8.5px] tracking-wider rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" /> Definir
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Barra de Status Compacta do Gerar Escala */}
          <div className="mt-2 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-slate-700 font-black">
                <Shield className="w-3 h-3 text-indigo-600" />
                No Gerar Escala:
              </span>
              <span className={cn("px-1.5 py-0.5 rounded text-[7.5px] font-black transition-colors", officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500 line-through")}>
                Oficial de Dia: {officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false ? "Ativo" : "Oculto"}
              </span>
              <span className={cn("px-1.5 py-0.5 rounded text-[7.5px] font-black transition-colors", officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500 line-through")}>
                Náutica: {officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false ? "Ativo" : "Oculto"}
              </span>
              <span className={cn("px-1.5 py-0.5 rounded text-[7.5px] font-black transition-colors", officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500 line-through")}>
                Médico: {officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false ? "Ativo" : "Oculto"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onToggleOfficerVisibility('showSection');
              }}
              className="text-[8.5px] font-black uppercase text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              {officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false && officerVisibility.showOficialNautica !== false && officerVisibility.showOficialMedico !== false
                ? "Desativar todos no Gerar Escala"
                : "Ativar todos no Gerar Escala"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
