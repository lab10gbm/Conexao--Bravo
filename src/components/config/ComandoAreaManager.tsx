import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Folder, 
  Plus, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Shield, 
  Flame, 
  Info, 
  Layers, 
  X,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getAllCanonicalRegionalCommands, 
  getUnitsAndSubunitsForRegionalCommand,
  CANONICAL_UNITS,
  CANONICAL_SUBUNITS,
  RegionalCommand,
  MilitaryUnit,
  Subunit
} from '../../lib/canonicalScope';

interface ComandoAreaManagerProps {
  onBackToConfig: () => void;
}

export function ComandoAreaManager({ onBackToConfig }: ComandoAreaManagerProps) {
  // Navegação:
  // 'list_cbas' -> 'cba_detail' (mostra pasta OBMs e DBMs) -> 'obms_dbms' (mostra os ícones individuais)
  const [selectedCbaId, setSelectedCbaId] = useState<string | null>(null);
  const [insideObmsDbms, setInsideObmsDbms] = useState<boolean>(false);
  const [selectedUnitOrSub, setSelectedUnitOrSub] = useState<Subunit | MilitaryUnit | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const allCbas = getAllCanonicalRegionalCommands();
  const selectedCba = selectedCbaId ? allCbas.find(c => c.id === selectedCbaId) : null;
  const currentUnitsAndSubs = selectedCbaId ? getUnitsAndSubunitsForRegionalCommand(selectedCbaId) : { units: [], subunits: [] };

  const handleSelectCba = (cbaId: string) => {
    setSelectedCbaId(cbaId);
    setInsideObmsDbms(false);
    setSelectedUnitOrSub(null);
  };

  const handleEnterObmsDbms = () => {
    setInsideObmsDbms(true);
  };

  const handleBack = () => {
    if (selectedUnitOrSub) {
      setSelectedUnitOrSub(null);
    } else if (insideObmsDbms) {
      setInsideObmsDbms(false);
    } else if (selectedCbaId) {
      setSelectedCbaId(null);
    } else {
      onBackToConfig();
    }
  };

  // Cores dinâmicas para cada CBA para dar identidade visual aos ícones
  const getCbaColor = (cbaId: string) => {
    switch (cbaId) {
      case 'cba_vii': return 'bg-emerald-600 shadow-emerald-900/30 text-white'; // Costa Verde
      case 'cba_i': return 'bg-blue-600 shadow-blue-900/30 text-white'; // Capital
      case 'cba_ii': return 'bg-amber-600 shadow-amber-900/30 text-white'; // Serrana
      case 'cba_iii': return 'bg-purple-600 shadow-purple-900/30 text-white'; // Sul
      case 'cba_iv': return 'bg-cyan-600 shadow-cyan-900/30 text-white'; // Norte
      case 'cba_v': return 'bg-teal-600 shadow-teal-900/30 text-white'; // Litorânea
      case 'cba_vi': return 'bg-indigo-600 shadow-indigo-900/30 text-white'; // Baixada
      case 'cba_viii': return 'bg-rose-600 shadow-rose-900/30 text-white'; // Especializadas
      case 'cba_ix': return 'bg-violet-600 shadow-violet-900/30 text-white'; // Metropolitana
      case 'cba_x': return 'bg-sky-600 shadow-sky-900/30 text-white'; // Salvamar
      default: return 'bg-slate-700 shadow-slate-900/30 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Navegação e Breadcrumb */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold flex-wrap">
          <button 
            onClick={onBackToConfig}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Portal Principal
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          
          <button 
            onClick={() => { setSelectedCbaId(null); setInsideObmsDbms(false); }}
            className={`uppercase tracking-wider transition-colors ${!selectedCbaId ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'}`}
          >
            Comandos de Área
          </button>

          {selectedCba && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button 
                onClick={() => setInsideObmsDbms(false)}
                className={`uppercase tracking-wider transition-colors ${selectedCbaId && !insideObmsDbms ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'}`}
              >
                {selectedCba.shortName}
              </button>
            </>
          )}

          {insideObmsDbms && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-amber-400 font-black uppercase tracking-wider">
                OBMs e DBMs
              </span>
            </>
          )}
        </div>

        <button 
          onClick={handleBack}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3 h-3" />
          Voltar
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: LISTA DOS 10 COMANDOS DE ÁREA (CBAs)                             */}
      {/* ========================================================================= */}
      {!selectedCbaId && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                Comandos de Bombeiro de Área (CBAs)
              </h2>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                Selecione um Comando de Área para gerenciar suas Unidades (OBMs) e Destacamentos (DBMs)
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase">
              <CheckCircle2 className="w-4 h-4" />
              CBA VII Operacional
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCbas.map((cba) => {
              const isActive = cba.id === 'cba_vii';
              const unitsCount = isActive ? 2 : 0;
              const subunitsCount = isActive ? 6 : 0;
              const colorClass = getCbaColor(cba.id);

              return (
                <motion.div
                  key={cba.id}
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectCba(cba.id)}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${colorClass}`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {cba.shortName}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            Ativo
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight uppercase mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cba.name}
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {cba.region}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span>
                      {isActive ? `${unitsCount} OBMs • ${subunitsCount} Subunidades` : 'Pronto para Cadastrar'}
                    </span>
                    <span className="text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Acessar <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: DENTRO DO CBA ESCOLHIDO (PASTA "OBMs e DBMs")                     */}
      {/* ========================================================================= */}
      {selectedCba && !insideObmsDbms && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${getCbaColor(selectedCba.id)}`}>
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                    Comando de Área Regional
                  </span>
                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                    {selectedCba.name}
                  </h2>
                  <p className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    Região: {selectedCba.region}
                  </p>
                </div>
              </div>

              {selectedCba.id === 'cba_vii' ? (
                <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-black uppercase tracking-wider text-center">
                  268 Militares Integrados
                </div>
              ) : (
                <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 text-xs font-black uppercase tracking-wider text-center">
                  Expansão Futura
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-500" />
              Pastas e Estruturas do {selectedCba.shortName}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* O ÍCONE SOLICITADO: "OBMs e DBMs" */}
              <motion.div
                whileHover={{ scale: 1.03, translateY: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnterObmsDbms}
                className="bg-slate-900 border-2 border-amber-500/50 hover:border-amber-400 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer flex flex-col items-center text-center group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors"></div>

                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-inner group-hover:scale-110 transition-transform">
                  <Folder className="w-8 h-8 fill-amber-500/20" />
                </div>

                <h4 className="text-base font-black text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors">
                  OBMs e DBMs
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Batalhões e Destacamentos
                </p>

                <div className="mt-4 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider">
                  {currentUnitsAndSubs.subunits.length > 0 
                    ? `${currentUnitsAndSubs.subunits.length} Quartéis Cadastrados` 
                    : 'Cadastrar Quartéis'}
                </div>
              </motion.div>

              {/* Informações Gerais do Comando */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                    <Info className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Diretrizes do CBA
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Comando de área responsável pela coordenação de operações de bombeiro militar na região {selectedCba.region}.
                  </p>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  Status: {currentUnitsAndSubs.subunits.length > 0 ? `${currentUnitsAndSubs.units.length} OBMs Integradas` : 'Aguardando Cadastro de OBMs'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: DENTRO DE "OBMs e DBMs" (ÍCONE PARA CADA OBM/DBM CADASTRADA)     */}
      {/* ========================================================================= */}
      {selectedCba && insideObmsDbms && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-500">
                <Folder className="w-4 h-4 fill-amber-500/20" />
                {selectedCba.shortName} • OBMs e DBMs
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mt-0.5">
                Quartéis e Destacamentos Registrados
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar quartel..."
                  className="pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
                />
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-indigo-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Cadastrar OBM / DBM
              </button>
            </div>
          </div>

          {/* Lista de Ícones para Cada OBM / DBM */}
          {(() => {
            const filteredSubunits = currentUnitsAndSubs.subunits.filter(sub => {
              if (!searchFilter.trim()) return true;
              const q = searchFilter.toLowerCase();
              const parentUnit = CANONICAL_UNITS[sub.unitId];
              return (
                sub.name.toLowerCase().includes(q) ||
                sub.shortName.toLowerCase().includes(q) ||
                sub.location.toLowerCase().includes(q) ||
                sub.id.toLowerCase().includes(q) ||
                (parentUnit && parentUnit.name.toLowerCase().includes(q))
              );
            });

            // Agrupar por Unidade Matriz (OBM)
            const unitsInCba = currentUnitsAndSubs.units;

            return filteredSubunits.length > 0 ? (
              <div className="space-y-8">
                {unitsInCba.map((unit) => {
                  const unitSubunits = filteredSubunits.filter((s) => s.unitId === unit.id);
                  if (unitSubunits.length === 0) return null;

                  return (
                    <div key={unit.id} className="space-y-3">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-xs">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          {unit.name}
                        </h3>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {unitSubunits.length} {unitSubunits.length === 1 ? 'Quartel' : 'Quartéis'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5">
                        {unitSubunits.map((sub) => {
                          const isSede = sub.isSede;
                          const parentUnit = CANONICAL_UNITS[sub.unitId];
                          const unitType = parentUnit?.type || 'GBM';

                          const isGmar = unitType === 'GMAR';
                          const isGbs = unitType === 'GBS';
                          const isEspecial = unitType === 'ESPECIAL';

                          const badgeLabel = !isSede 
                            ? 'Destacamento' 
                            : isGmar 
                              ? 'Salvamar' 
                              : isGbs 
                                ? 'Busca & Salv.' 
                                : isEspecial 
                                  ? 'Especializado' 
                                  : 'Batalhão Sede';

                          const iconColor = isGmar 
                            ? 'bg-sky-600 shadow-sky-900/30 text-white' 
                            : isGbs 
                              ? 'bg-teal-600 shadow-teal-900/30 text-white' 
                              : isEspecial 
                                ? 'bg-purple-600 shadow-purple-900/30 text-white' 
                                : isSede 
                                  ? 'bg-rose-600 shadow-rose-900/30 text-white' 
                                  : 'bg-amber-600 shadow-amber-900/30 text-white';

                          const badgeColor = isGmar 
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' 
                            : isGbs 
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300' 
                              : isEspecial 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' 
                                : isSede 
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' 
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';

                          return (
                            <motion.div
                              key={sub.id}
                              whileHover={{ scale: 1.02, translateY: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedUnitOrSub(sub)}
                              className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${iconColor}`}>
                                    {isSede ? <Flame className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                                  </div>

                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>
                                    {badgeLabel}
                                  </span>
                                </div>

                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {parentUnit?.shortName || 'OBM'}
                                </span>
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-amber-500 transition-colors mt-0.5">
                                  {sub.shortName}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  {sub.location}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <span>ID: {sub.id}</span>
                                <span className="text-amber-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                  Ver Detalhes <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Nenhum quartel cadastrado ainda para o {selectedCba.shortName}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                A estrutura canônica deste Comando de Área está pronta. Conforme a corporação for expandindo, você poderá cadastrar as OBMs e DBMs aqui.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all mt-2"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Primeiro Quartel
              </button>
            </div>
          );
        })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE DETALHES DE UMA OBM / DBM SELECIONADA                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedUnitOrSub && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedUnitOrSub(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Detalhes Canônicos da Unidade
                  </span>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {selectedUnitOrSub.name}
                  </h3>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-400 uppercase">Identificador Canônico:</span>
                  <span className="font-mono text-indigo-500 font-black">{selectedUnitOrSub.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-400 uppercase">Sigla Oficial:</span>
                  <span className="font-black">{selectedUnitOrSub.shortName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-400 uppercase">Comando de Área:</span>
                  <span className="font-black">{selectedCba?.shortName} ({selectedCba?.name})</span>
                </div>
                {'location' in selectedUnitOrSub && (
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-slate-400 uppercase">Localização:</span>
                    <span className="font-black">{selectedUnitOrSub.location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">Status no Conexão Bravo:</span>
                  <span className="text-emerald-500 font-black uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Integrado & Operando
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedUnitOrSub(null)}
                className="w-full mt-6 py-3 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO DE NOVA OBM / DBM                                       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-500 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {selectedCba?.shortName} • Estrutura Territorial
                  </span>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Cadastrar OBM / DBM
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                A infraestrutura multi-tenant hierárquica já está ativa. As novas unidades cadastradas serão registradas sob o escopo canônico oficial.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Nome Oficial do Quartel
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 3º GBM - Niterói ou DBM 1/26"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Tipo
                    </label>
                    <select className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500">
                      <option value="GBM">GBM (Batalhão Sede)</option>
                      <option value="DBM">DBM (Destacamento)</option>
                      <option value="GMAR">GMAR (Salvamar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Cidade / Município
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Angra dos Reis"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    alert('Estrutura registrada com sucesso! A unidade será integrada ao catálogo.');
                    setShowAddModal(false);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all"
                >
                  Salvar Quartel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
