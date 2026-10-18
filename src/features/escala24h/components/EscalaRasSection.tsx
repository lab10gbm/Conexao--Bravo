import React, { useRef, useEffect } from 'react';
import { BriefcaseBusiness, Download, Check, Trash2 } from 'lucide-react';

export interface EscalaRasSectionProps {
  rasDuration: 12 | 24;
  setRasDuration: (d: 12 | 24) => void;
  addRasMilitarSearch: string;
  setAddRasMilitarSearch: (s: string) => void;
  showAddRasMenu: boolean;
  setShowAddRasMenu: (show: boolean) => void;
  addRasMenuOptions: any[];
  onAddMilitarToRas: (militar: any) => void;
  onFetchRas: () => void;
  onAddAllRas: () => void;
  visibleRasApplications: any[];
  baseRoster: any[];
  onAddSingleRas: (app: any) => void;
  onRemoveRasMilitar: (app: any) => void;
}

export function EscalaRasSection({
  rasDuration,
  setRasDuration,
  addRasMilitarSearch,
  setAddRasMilitarSearch,
  showAddRasMenu,
  setShowAddRasMenu,
  addRasMenuOptions,
  onAddMilitarToRas,
  onFetchRas,
  onAddAllRas,
  visibleRasApplications,
  baseRoster,
  onAddSingleRas,
  onRemoveRasMilitar,
}: EscalaRasSectionProps) {
  const addRasMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addRasMenuRef.current && !addRasMenuRef.current.contains(e.target as Node)) {
        setShowAddRasMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowAddRasMenu]);

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-visible relative z-40">
      <div className="bg-amber-50 rounded-t-2xl border-b border-amber-100 py-2 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-[11px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-2 shrink-0">
          <BriefcaseBusiness className="w-3.5 h-3.5 text-amber-600" />
          RAS (Regime Adicional de Serviço)
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={rasDuration}
              onChange={(e) => setRasDuration(Number(e.target.value) as 12 | 24)}
              className="bg-white border border-amber-200 rounded px-2 py-1 text-[11px] text-amber-900 font-bold outline-none cursor-pointer"
              title="Horas do RAS"
            >
              <option value={12}>12h</option>
              <option value={24}>24h</option>
            </select>
            <div className="relative w-full sm:w-48 z-20" ref={addRasMenuRef}>
              <input
                type="text"
                placeholder="Adicionar militar ao RAS..."
                value={addRasMilitarSearch}
                onChange={(e) => {
                  setAddRasMilitarSearch(e.target.value);
                  setShowAddRasMenu(true);
                }}
                onFocus={() => setShowAddRasMenu(true)}
                className="w-full text-[11px] bg-white border border-amber-200 rounded px-2.5 py-1 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 placeholder:text-slate-400 text-slate-800 font-bold"
              />
              {showAddRasMenu && addRasMilitarSearch.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-xl max-h-48 overflow-y-auto">
                  {addRasMenuOptions.map((m) => (
                    <button
                      key={m.rg}
                      type="button"
                      onClick={() => onAddMilitarToRas(m)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer"
                    >
                      <div className="font-bold text-slate-800">{m.rank} {m.warName || m.name}</div>
                      <div className="text-[10px] text-slate-500">{m.rg}</div>
                    </button>
                  ))}
                  {addRasMenuOptions.length === 0 && (
                    <div className="p-2 text-center text-slate-500 text-xs">Nenhum militar encontrado.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onFetchRas}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest text-[9.5px] px-2.5 py-1 rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Buscar
            </button>
            {visibleRasApplications.length > 0 && (
              <button
                type="button"
                onClick={onAddAllRas}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[9.5px] px-2.5 py-1 rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Incluir Todos
              </button>
            )}
          </div>
        </div>
      </div>
      
      {visibleRasApplications.length > 0 && (
        <div className="p-2.5 sm:p-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-1.5 font-black text-slate-500 uppercase tracking-widest text-[10px]">Militar</th>
                <th className="p-1.5 font-black text-slate-500 uppercase tracking-widest text-center text-[10px]">Status</th>
                <th className="p-1.5 font-black text-slate-500 uppercase tracking-widest text-center w-32 text-[10px]">Ação</th>
              </tr>
            </thead>
            <tbody>
              {visibleRasApplications.map((app) => {
                const isInScale = baseRoster.some(br => br.rg === app.militarRg);
                return (
                  <tr key={app.id || app.militarRg} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-1.5 font-bold text-slate-800 text-[11px]">
                      {app.militarRank} {app.militarWarName || app.militarName} <span className="text-slate-400 font-normal">({app.militarRg})</span>
                    </td>
                    <td className="p-1.5 text-center">
                      {isInScale ? (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-widest inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          Na Escala
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-widest">
                          Aguardando
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!isInScale && (
                          <button
                            type="button"
                            onClick={() => onAddSingleRas(app)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded text-[9.5px] uppercase tracking-widest transition-colors flex-1 cursor-pointer"
                          >
                            Incluir
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRasMilitar(app);
                          }}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                          title="Excluir militar do RAS e da listagem de efetivo"
                          aria-label={`Excluir ${app.militarWarName || app.militarName || app.militarRg} do RAS e da escala`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
