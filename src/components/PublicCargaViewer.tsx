import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
export interface PatrimonioItem {
  id: string;
  descricao?: string;
  quantidade?: number;
  [key: string]: any;
}
export interface PatrimonioSection {
  nome?: string;
  title?: string;
  itens?: PatrimonioItem[];
  items?: PatrimonioItem[];
  id?: string;
  [key: string]: any;
}
const patrimonioData: PatrimonioSection[] = [];
import { Package, ShieldCheck, CheckCircle2, PackageSearch } from "lucide-react";

interface PublicCargaViewerProps {
  sectionId: string;
}

export const PublicCargaViewer: React.FC<PublicCargaViewerProps> = ({ sectionId }) => {
  const [section, setSection] = useState<PatrimonioSection | null>(null);
  const [customItems, setCustomItems] = useState<PatrimonioItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = patrimonioData.find((s) => s.id === sectionId);
    if (found) {
      setSection(found);
    }

    if (!db || !found) {
      if (!found) setLoading(false);
      return;
    }

    const docRef = doc(db, "patrimonioData", sectionId);
    
    // Fetch data once instead of live subscription for public view
    const fetchCarga = async () => {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.items)) {
            setCustomItems(data.items);
          } else {
            setCustomItems(null);
          }
        } else {
          setCustomItems(null);
        }
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setLoading(false);
      }
    };

    fetchCarga();
  }, [sectionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-4 text-slate-400">
          <Package className="w-8 h-8" />
          <span className="text-[10px] font-black uppercase tracking-widest">Carregando Relação de Carga...</span>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center max-w-sm text-center">
          <PackageSearch className="w-12 h-12 text-slate-300 mb-4" />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Setor não encontrado</h2>
          <p className="text-xs text-slate-500 font-medium">O código de setor fornecido na URL é inválido ou não existe.</p>
        </div>
      </div>
    );
  }

  const itemsToDisplay = customItems || section.itens;
  const isCustomized = customItems !== null;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-12">
      {/* Red Header Bar */}
      <div className="bg-[#8B0000] text-white pt-10 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 to-red-800 opacity-50"></div>
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-xl shadow-red-900/20 rotate-3 transition-transform hover:rotate-0">
            <ShieldCheck className="w-8 h-8 text-[#8B0000]" />
          </div>
          <h3 className="text-[10px] uppercase font-black tracking-[0.3em] text-red-200 mb-2">
            10º GBM - Intranet
          </h3>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">
            Relação de Carga Fixa
          </h1>
          <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs font-bold text-white/90">{section.nome}</span>
            <span className="text-[10px] bg-red-900/50 text-red-100 px-1.5 py-0.5 rounded uppercase font-mono tracking-widest">
              {section.id.padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          
          <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                Inventário do Setor
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isCustomized ? "Planilha Atualizada" : "Lista Padrão do Sistema"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-2">
                <BoxIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                  {itemsToDisplay.length} {itemsToDisplay.length === 1 ? "Item" : "Itens"}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20">ID</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Descrição do Material</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-24">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsToDisplay.length > 0 ? (
                  itemsToDisplay.map((item, idx) => (
                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 sm:px-6 py-4 text-xs font-bold text-slate-400 group-hover:text-cyan-600 transition-colors">
                        {item.id.padStart(2, '0')}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className="text-sm font-bold text-slate-700 leading-snug">
                          {item.descricao}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-black text-xs">
                          {item.quantidade}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <PackageSearch className="w-8 h-8 text-slate-300" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum item registrado</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center flex flex-col items-center gap-2">
          <div className="w-1 h-8 bg-slate-200 rounded-full"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-sm">
            Documento gerado eletronicamente
          </p>
          {isCustomized && (
            <p className="text-[9px] font-medium text-slate-400 max-w-xs flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Sincronizado via planilha da seção
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper icon
const BoxIcon = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.29 7 12 12 20.71 7" />
    <line x1="12" y1="22" x2="12" y2="12" />
  </svg>
);
