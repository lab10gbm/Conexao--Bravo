import React from 'react';
import { LayoutGrid, ListTree, List, Building2, BookOpen } from 'lucide-react';

export type ViewMode = 'cards' | 'table_obm' | 'table_unified' | 'summary' | 'plano_chamada';

interface EfetivoToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function EfetivoToolbar({ viewMode, setViewMode }: EfetivoToolbarProps) {
  const getButtonClass = (mode: ViewMode) => 
    `p-1.5 rounded flex items-center justify-center transition-colors ${viewMode === mode ? 'bg-white shadow-sm text-indigo-600 font-black ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-200'}`;

  return (
    <div className="bg-slate-100 p-1 flex items-center gap-1 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
      <button
        onClick={() => setViewMode('cards')}
        className={getButtonClass('cards')}
        title="Modo Cards"
      >
        <LayoutGrid size={18} />
      </button>
      <button
        onClick={() => setViewMode('table_obm')}
        className={getButtonClass('table_obm')}
        title="Planilha (Por OBM)"
      >
        <ListTree size={18} />
      </button>
      <button
        onClick={() => setViewMode('table_unified')}
        className={getButtonClass('table_unified')}
        title="Planilha (Unificado)"
      >
        <List size={18} />
      </button>
      <button
        onClick={() => setViewMode('summary')}
        className={getButtonClass('summary')}
        title="Resumo e Gráficos"
      >
        <Building2 size={18} />
      </button>
      <button
        onClick={() => setViewMode('plano_chamada')}
        className={getButtonClass('plano_chamada')}
        title="Plano de Chamada"
      >
        <BookOpen size={18} />
      </button>
    </div>
  );
}
