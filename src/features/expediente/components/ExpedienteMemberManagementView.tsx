import React from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { UserProfile } from '../../../types';
import { ExpedienteData } from '../types';
import { parseRank, sortAllBySeniority } from '../../../lib/rankUtils';
import { formatMilitaryName, cleanUndefined } from '../../../lib/utils';
import { safeSaveDocRef } from '../../../lib/apiClient';
import { setDoc, updateDoc, deleteField } from 'firebase/firestore';

interface ExpedienteMemberManagementViewProps {
  militars: UserProfile[];
  expedienteUsers: UserProfile[];
  data: ExpedienteData;
  setData: React.Dispatch<React.SetStateAction<ExpedienteData>>;
  memberSearchTerm: string;
  setMemberSearchTerm: (s: string) => void;
  addMemberRg: string;
  setAddMemberRg: (s: string) => void;
  showMemberDropdown: boolean;
  setShowMemberDropdown: (b: boolean) => void;
  handleAddToExpediente: () => Promise<void>;
  handleRemoveFromExpediente: (rg: string) => void;
  getRegime: (rg: string) => string;
  getExpQuota: (rg: string) => number;
  getReqAmount: (rg: string) => number;
  getSector: (rg: string) => string;
  globalDocRef: any;
  monthDocRef: any;
  workRegimes: string[];
}

export function ExpedienteMemberManagementView({
  militars,
  expedienteUsers,
  data,
  setData,
  memberSearchTerm,
  setMemberSearchTerm,
  addMemberRg,
  setAddMemberRg,
  showMemberDropdown,
  setShowMemberDropdown,
  handleAddToExpediente,
  handleRemoveFromExpediente,
  getRegime,
  getExpQuota,
  getReqAmount,
  getSector,
  globalDocRef,
  monthDocRef,
  workRegimes
}: ExpedienteMemberManagementViewProps) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-x-auto no-scrollbar relative flex flex-col">
      <div className="p-4 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-wrap sticky left-0 w-full min-w-max">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full max-w-[800px]">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none whitespace-nowrap">
            Novo Membro:
          </span>
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={memberSearchTerm}
              onChange={(e) => {
                setMemberSearchTerm(e.target.value);
                setAddMemberRg('');
                setShowMemberDropdown(true);
              }}
              onFocus={() => setShowMemberDropdown(true)}
              onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
              placeholder="Digite NOME ou RG para buscar..."
              className="w-full text-[10px] font-bold p-2 px-3 border-2 border-slate-200 rounded-lg bg-white text-slate-700 hover:border-indigo-300 focus:border-indigo-500 outline-none transition-colors"
            />
            {showMemberDropdown && (
              <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {militars
                  .filter(m => !expedienteUsers.find(eu => (eu.rg || eu.uid) === (m.uid || m.rg)))
                  .filter(m => 
                    memberSearchTerm.length === 0 || 
                    m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                    m.warName?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                    m.rg?.includes(memberSearchTerm)
                  )
                  .sort(sortAllBySeniority)
                  .map((m, i) => (
                    <button
                      key={(m.uid || m.rg || `m-${i}`)}
                      type="button"
                      onClick={() => {
                        setAddMemberRg(m.uid || m.rg || '');
                        setMemberSearchTerm(`${parseRank(m.rank)} ${formatMilitaryName(m.warName || m.name?.split(' ')[0] || '')} - ${m.rg}`);
                        setShowMemberDropdown(false);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs text-slate-700 cursor-pointer"
                    >
                      <div className="font-bold">{parseRank(m.rank)} {formatMilitaryName(m.warName || m.name?.split(' ')[0] || '')} {m.obm ? `- ${m.obm}` : ''}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">RG: {m.rg}</div>
                    </button>
                  ))}
                {militars
                  .filter(m => !expedienteUsers.find(eu => (eu.rg || eu.uid) === (m.uid || m.rg)))
                  .filter(m => 
                    memberSearchTerm.length > 0 && (
                      m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                      m.warName?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                      m.rg?.includes(memberSearchTerm)
                    )
                  ).length === 0 && memberSearchTerm.length > 0 && (
                    <div className="p-3 text-xs text-slate-500 text-center italic">Nenhum militar encontrado</div>
                  )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddToExpediente}
            disabled={!addMemberRg}
            className="w-full sm:w-auto bg-indigo-600 text-white p-2 px-4 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>
      <div className="sm:hidden mb-1 flex items-center gap-1.5 px-3 py-1 bg-slate-50 border-b border-slate-100 sticky left-0">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Deslize para configurar →</span>
      </div>
      <table className="w-full text-left border-collapse min-w-[850px] sm:min-w-[980px]">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <th className="py-3 px-4">Militar</th>
            <th className="py-3 px-4 w-64 border-l-2 border-slate-200">Regime de Trabalho</th>
            <th className="py-3 px-4 w-28 border-l-2 border-slate-200 text-center" title="Quantidade semanal de serviços expedientes">
              <div className="flex flex-col items-center">
                <span>Expediente</span>
                <span className="text-[8px] text-indigo-600 font-bold normal-case">(Serv/Exp)</span>
              </div>
            </th>
            <th className="py-3 px-4 w-28 border-l-2 border-slate-200 text-center" title="Quantidade mensal de Serviços 24h">
              <div className="flex flex-col items-center">
                <span>Dias/Mês</span>
                <span className="text-[8px] text-indigo-600 font-bold normal-case">(S. 24h)</span>
              </div>
            </th>
            <th className="py-3 px-4 w-48 border-l-2 border-slate-200">Setor / Seção</th>
            <th className="py-3 px-4 w-12 border-l-2 border-slate-200 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {expedienteUsers.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                Nenhum militar do expediente encontrado.
              </td>
            </tr>
          )}
          {expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').map((u) => {
            const rg = u.rg || u.uid || '';
            const reqAmount = getReqAmount(rg);
            const expQuotaAmount = data.expQuotas?.[rg] !== undefined ? data.expQuotas[rg] : getExpQuota(rg);
            const sector = getSector(rg);
            const currentRegime = getRegime(rg);

            return (
              <tr key={rg} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800">
                      {formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RG: {rg}</span>
                  </div>
                </td>
                <td className="py-3 px-4 border-l-2 border-slate-50">
                  <div className="flex flex-col gap-2">
                    <select 
                      value={(() => {
                        if (!currentRegime) return "";
                        if (workRegimes.includes(currentRegime)) return currentRegime;
                        if (/3\s*exped.*(?:2\s*serv|serv)/i.test(currentRegime)) return "3 Exped. e 2 serv. 24h";
                        if (/4\s*exped.*1\s*serv/i.test(currentRegime)) return "4 Exped. e 1 serv. 24h";
                        if (/1\s*exped.*3\s*serv/i.test(currentRegime)) return "1 Exped. e 3 Serv. 24h (Militar com Redução de Carga Horária)";
                        if (/readaptado/i.test(currentRegime)) return "4 Expedientes (Militar Readaptado)";
                        if (/redu[çc][ãa]o/i.test(currentRegime)) return "2 e 1/2 Expedientes (Militar com Redução de Carga Horária)";
                        return "Outro";
                      })()}
                      onChange={async (e) => {
                        const val = e.target.value;
                        let r = val;
                        if (val === "Outro") r = "";
                        
                        let autoReq = 0;
                        if (/1\s*exped.*3\s*serv/i.test(val)) autoReq = 3;
                        else if (/3\s*exped.*(?:2\s*serv|serv)/i.test(val)) autoReq = 2;
                        else if (/4\s*exped.*1\s*serv/i.test(val)) autoReq = 1;
                        else if (/readaptado|redu[çc][ãa]o/i.test(val)) autoReq = 0;
                        else if (val === "Outro") autoReq = reqAmount;

                        let autoExp = 0;
                        const matchExp = val.match(/(\d+)\s*Exped/i);
                        if (matchExp) autoExp = parseInt(matchExp[1], 10);
                        else if (/readaptado/i.test(val)) autoExp = 4;
                        else if (/redu[çc][ãa]o/i.test(val)) autoExp = 2;
                        else if (val === "Outro") autoExp = expQuotaAmount;

                        setData(prev => ({
                          ...prev,
                          regimes: { ...prev.regimes, [rg]: r },
                          requirements: { ...prev.requirements, [rg]: autoReq },
                          expQuotas: { ...(prev.expQuotas || {}), [rg]: autoExp }
                        }));

                        const newGlobal: any = {
                          regimes: { [rg]: r },
                          requirements: { [rg]: autoReq },
                          expQuotas: { [rg]: autoExp },
                          userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                        };

                        if (r === "") {
                          updateDoc(globalDocRef, { [`regimes.${rg}`]: deleteField() }).catch(console.error);
                          delete newGlobal.regimes;
                        }
                        
                        await safeSaveDocRef(globalDocRef, cleanUndefined(newGlobal), true);
                        await safeSaveDocRef(monthDocRef, cleanUndefined({ requirements: { [rg]: autoReq } }), true);
                      }}
                      className="w-full text-[10px] font-bold p-1.5 border-2 border-slate-200 rounded-md bg-white text-slate-700 hover:border-indigo-300 focus:border-indigo-500 outline-none transition-colors"
                    >
                      <option value="">Selecione o Regime...</option>
                      {workRegimes.map(r => <option key={r} value={r}>{r}</option>)}
                      <option value="Outro">Personalizado / Outro</option>
                    </select>
                    
                    {(!workRegimes.includes(currentRegime) && currentRegime !== "") || (currentRegime === "" && !workRegimes.includes("")) ? (
                      <input 
                        type="text"
                        placeholder="Digite o regime personalizado..."
                        defaultValue={currentRegime}
                        key={`regime-${currentRegime}`}
                        onBlur={async (e) => {
                          const r = e.target.value;
                          if (r === currentRegime) return;
                          setData(prev => ({
                            ...prev,
                            regimes: { ...prev.regimes, [rg]: r }
                          }));
                          const newGlobal: any = {
                            regimes: { [rg]: r },
                            userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                          };
                          await safeSaveDocRef(globalDocRef, cleanUndefined(newGlobal), true);
                        }}
                        className="w-full text-[9px] font-bold p-1 px-2 border border-indigo-100 rounded bg-indigo-50/30 text-indigo-900 focus:border-indigo-300 outline-none"
                      />
                    ) : null}
                  </div>
                </td>
                <td className="py-3 px-4 border-l-2 border-slate-50 text-center">
                  <input 
                    type="number"
                    min="0"
                    max="7"
                    defaultValue={expQuotaAmount}
                    key={`exp-${expQuotaAmount}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onBlur={async (e) => {
                      const quota = parseInt(e.target.value);
                      const val = isNaN(quota) ? 0 : Math.max(0, Math.min(7, quota));
                      if (val === expQuotaAmount) return;
                      setData(prev => ({
                        ...prev,
                        expQuotas: { ...(prev.expQuotas || {}), [rg]: val }
                      }));
                      const newGlobal: any = {
                        expQuotas: { [rg]: val },
                        userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                      };
                      if (val <= 0) {
                        updateDoc(globalDocRef, { [`expQuotas.${rg}`]: deleteField() }).catch(console.error);
                        delete newGlobal.expQuotas;
                      }
                      await safeSaveDocRef(globalDocRef, cleanUndefined(newGlobal), true);
                    }}
                    className="w-16 p-2 text-center text-sm border-2 border-indigo-200 rounded-md bg-white font-black text-indigo-900 hover:border-indigo-400 focus:border-indigo-500 outline-none transition-colors mx-auto block"
                    title="Quantidade semanal de serviços expedientes (EXP/Sem)"
                  />
                </td>
                <td className="py-3 px-4 border-l-2 border-slate-50 text-center">
                  <input 
                    type="number"
                    min="0"
                    defaultValue={reqAmount}
                    key={`req-${reqAmount}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onBlur={async (e) => {
                      const req = parseInt(e.target.value) || 0;
                      if (req === reqAmount) return;
                      setData(prev => ({
                        ...prev,
                        requirements: { ...prev.requirements, [rg]: req }
                      }));
                      const newGlobal: any = {
                        requirements: { [rg]: req },
                        userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                      };
                      if (req <= 0) {
                        updateDoc(globalDocRef, { [`requirements.${rg}`]: deleteField() }).catch(console.error);
                        delete newGlobal.requirements;
                      }
                      await safeSaveDocRef(globalDocRef, cleanUndefined(newGlobal), true);
                      await safeSaveDocRef(monthDocRef, cleanUndefined({ requirements: { [rg]: req } }), true);
                    }}
                    className="w-16 p-2 text-center text-sm border-2 border-indigo-200 rounded-md bg-white font-black text-indigo-900 hover:border-indigo-400 focus:border-indigo-500 outline-none transition-colors mx-auto block"
                    title="Quantidade mensal de Serviços 24h (S. 24h)"
                  />
                </td>
                <td className="py-3 px-4 border-l-2 border-slate-50">
                  <input 
                    type="text"
                    placeholder="Ex: SOp, SAd, DGP..."
                    defaultValue={sector}
                    key={`sec-${sector}`}
                    onBlur={async (e) => {
                      const s = e.target.value;
                      if (s === sector) return;
                      const newGlobal: any = {
                        userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                      };
                      if (!s) {
                        updateDoc(globalDocRef, { [`sectors.${rg}`]: deleteField() }).catch(console.error);
                      } else {
                        newGlobal.sectors = { [rg]: s };
                      }
                      await safeSaveDocRef(globalDocRef, cleanUndefined(newGlobal), true);
                    }}
                    className="w-full text-sm p-2 border-2 border-slate-200 rounded-md bg-white font-bold text-slate-700 hover:border-slate-300 focus:border-slate-500 outline-none transition-colors"
                  />
                </td>
                <td className="py-3 px-4 border-l-2 border-slate-50 text-center">
                  <button 
                    type="button"
                    onClick={() => handleRemoveFromExpediente(u.uid || rg)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors mx-auto block cursor-pointer"
                    title="Remover do Expediente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
