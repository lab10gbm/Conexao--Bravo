import React, { useState, useEffect } from "react";
import { parseRank } from "../lib/rankUtils";
import { Check } from "lucide-react";
import { useMilitars } from "../contexts/MilitarContext";
import { db } from "../lib/firebase";
import { doc, onSnapshot, setDoc, collection, query } from "firebase/firestore";
import { cleanUndefined } from "../lib/utils";

const patrimonioData: any[] = [];

interface PatrimonyConfigPanelProps {
  onBack: () => void;
}

export function PatrimonyConfigPanel({ onBack }: PatrimonyConfigPanelProps) {
  const { militars } = useMilitars();
  const [globalConfig, setGlobalConfig] = useState<any>({});
  const [sectionsConfig, setSectionsConfig] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let unsubGlobal = () => {};
    let unsubAll = () => {};

    if (db) {
      unsubGlobal = onSnapshot(doc(db, "patrimonioConfig", "global"), (snap) => {
        if (snap.exists()) setGlobalConfig(snap.data());
      });
      
      unsubAll = onSnapshot(collection(db, "patrimonioConfig"), (snap) => {
        const data: Record<string, any> = {};
        snap.forEach(d => {
          if (d.id !== 'global') {
            data[d.id] = d.data();
          }
        });
        setSectionsConfig(data);
      });
    }

    return () => { unsubGlobal(); unsubAll(); };
  }, []);

  const handleGlobalChange = (field: string, value: string) => {
    setGlobalConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (sectionId: string, field: string, value: string) => {
    setSectionsConfig((prev: any) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [field]: value }
    }));
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      if (db) {
        await setDoc(doc(db, "patrimonioConfig", "global"), cleanUndefined(globalConfig), { merge: true });
        
        const batchPromises = Object.entries(sectionsConfig).map(([id, data]) => 
          setDoc(doc(db, "patrimonioConfig", id), cleanUndefined(data), { merge: true })
        );
        await Promise.all(batchPromises);
      }
      onBack();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-3xl overflow-hidden border border-slate-200">
      <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
         <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configuração Estrutural de Setores</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Definir os responsáveis pela carga e listagens</p>
         </div>
         <div className="flex items-center gap-3">
           <button onClick={onBack} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors">Cancelar</button>
           <button onClick={saveAll} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white hover:bg-cyan-700 rounded-lg text-sm font-bold transition-colors shadow-sm">
              <Check className="w-4 h-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
           </button>
         </div>
      </div>
      
      <div className="p-6 overflow-y-auto space-y-8 flex-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {/* Global Config */}
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
          <h4 className="font-black uppercase tracking-tight text-slate-800 mb-4 border-b border-slate-100 pb-2">Comando e Patrimônio (Fixo para toda a Unidade)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
               <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Comandante da Unidade</label>
               <select value={globalConfig.comandanteId || ""} onChange={(e) => handleGlobalChange('comandanteId', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500 transition-colors">
                 <option value="">Padrão (CEL Escarani)</option>
                 {militars.map(m => <option key={`cmd-${m.rg}`} value={m.rg}>{parseRank(m.rank)} {m.warName || m.name}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Responsável por Bens Patrimoniais</label>
               <select value={globalConfig.patrimonioId || ""} onChange={(e) => handleGlobalChange('patrimonioId', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500 transition-colors">
                 <option value="">Padrão (SGT Douglas)</option>
                 {militars.map(m => <option key={`pat-${m.rg}`} value={m.rg}>{parseRank(m.rank)} {m.warName || m.name}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Auxiliar de Patrimônio (Opcional)</label>
               <select value={globalConfig.auxPatrimonioId || ""} onChange={(e) => handleGlobalChange('auxPatrimonioId', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500 transition-colors">
                 <option value="">Nenhum</option>
                 {militars.map(m => <option key={`auxpat-${m.rg}`} value={m.rg}>{parseRank(m.rank)} {m.warName || m.name}</option>)}
               </select>
             </div>
          </div>
        </div>

        {/* Sectors Config */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-12">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h4 className="font-black uppercase tracking-tight text-slate-800">Responsáveis por Setor</h4>
            <p className="text-xs text-slate-500 font-medium mt-1">Configure o militar responsável e seu auxiliar para cada carga do quartel.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {patrimonioData.map(section => {
              const secConf = sectionsConfig[section.id] || {};
              return (
                <div key={section.id} className="p-6 hover:bg-slate-50/80 transition-colors grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-4">
                     <span className="font-bold text-slate-700 block text-lg">{section.nome}</span>
                     <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">{section.itens.length} itens Registrados</span>
                  </div>
                  <div className="md:col-span-4">
                     <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Responsável pelo Setor</label>
                     <select value={secConf.responsavelId || ""} onChange={(e) => handleSectionChange(section.id, 'responsavelId', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500 transition-colors shadow-sm">
                       <option value="">Selecione...</option>
                       {militars.map(m => <option key={`resp-${section.id}-${m.rg}`} value={m.rg}>{parseRank(m.rank)} {m.warName || m.name}</option>)}
                     </select>
                  </div>
                  <div className="md:col-span-4">
                     <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Auxiliar do Setor</label>
                     <select value={secConf.auxSetorId || ""} onChange={(e) => handleSectionChange(section.id, 'auxSetorId', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500 transition-colors shadow-sm">
                       <option value="">Selecione...</option>
                       {militars.map(m => <option key={`aux-${section.id}-${m.rg}`} value={m.rg}>{parseRank(m.rank)} {m.warName || m.name}</option>)}
                     </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
