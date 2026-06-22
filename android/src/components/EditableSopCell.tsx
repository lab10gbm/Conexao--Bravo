import React, { useState } from 'react';
import { Check, X, ChevronDown, Edit2 } from 'lucide-react';
import { LETTER_SIZES, NUMERIC_SIZES } from '../constants';

interface EditableCellProps {
  item: any;
  field: string;
  value: string;
  centered?: boolean;
  isEditing: boolean;
  editingValue: string;
  onSetEditing: (cell: { rg: string, field: string, value: string } | null) => void;
  onEditingValueChange: (val: string) => void;
  onSaveEdit: () => void;
  isModerator: boolean;
  isOwnItem: boolean;
  fieldType: string;
  viewType: 'status' | 'tamanho';
  saving: boolean;
  onQuickSave: (rgStr: string, field: string, newVal: string) => Promise<void>;
}

export const EditableSopCell = React.memo(({ 
  item, 
  field, 
  value, 
  centered = true,
  isEditing,
  editingValue,
  onSetEditing,
  onEditingValueChange,
  onSaveEdit,
  isModerator,
  isOwnItem,
  fieldType,
  viewType,
  saving,
  onQuickSave
}: EditableCellProps) => {
  const rawValue = (value || '-').trim();
  const isLocked = rawValue === 'NÃO NECESSITA';
  const canEdit = isModerator || (isOwnItem && !isLocked);
  
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);

  const [sizeCategory, setSizeCategory] = useState<'letras' | 'numeros' | 'ambos'>(
    fieldType === 'number' ? 'numeros' : (fieldType === 'letter' ? 'letras' : (LETTER_SIZES.includes(rawValue) ? 'letras' : (NUMERIC_SIZES.includes(rawValue) ? 'numeros' : 'letras')))
  );

  const { representsPositivo, representsNegativo, representsIsento, pureSize, displaySize } = (() => {
    let v = rawValue;
    const conds = ['NOVO', 'BOM', 'RUIM', 'PRECÁRIO', 'PRECARIO'];
    for (const c of conds) {
      if (v.includes(c)) {
         v = v.replace(new RegExp(`(^|\\s)${c}(\\s|$)`, 'i'), ' ');
      }
    }
    v = v.trim();

    const isIsento = v === 'NÃO NECESSITA';
    const isNegativo = v.startsWith('NÃO POSSUI') || v === 'NÃO';
    const isPositivo = !isIsento && !isNegativo && v !== '-' && v !== '';

    let pSize = v;
    if (isNegativo) {
       pSize = pSize.replace('NÃO POSSUI', '').trim();
    } else if (isPositivo) {
       pSize = pSize.replace('POSSUI', '').replace('SIM', '').trim();
    }
    
    const dSize = pSize === '' ? 'TAM. N/R' : (pSize === 'TAMANHO ÚNICO' || pSize === 'T. UNICO' || pSize === 'Tamanho Único' ? 'U' : pSize);

    return { representsPositivo: isPositivo, representsNegativo: isNegativo, representsIsento: isIsento, pureSize: pSize, displaySize: dSize };
  })();

  const isUIActionDisabled = saving || localSaving;

  const handleQuickSave = async (newVal: string) => {
    setLocalSaving(true);
    try {
      await onQuickSave(item.rgStr, field, newVal);
      setShowQuickMenu(false);
    } finally {
      setLocalSaving(false);
    }
  };

  if (isEditing) {
    return (
      <td className={`p-2 border-r border-slate-100 ${centered ? 'text-center' : ''} bg-emerald-50`}>
        <div className="flex items-center gap-1 justify-center">
          <input 
            autoFocus
            className="w-full max-w-[80px] p-1 text-[10px] uppercase font-bold border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={editingValue}
            onChange={(e) => onEditingValueChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onSetEditing(null);
            }}
          />
          <button onClick={onSaveEdit} disabled={isUIActionDisabled} className="text-emerald-600 hover:text-emerald-700">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onSetEditing(null)} className="text-rose-600 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    );
  }

  const isStatusOnly = pureSize === '';
  
  const renderContent = () => {
    if (viewType === 'status') {
      if (representsPositivo) {
        return (
          <div className="flex items-center justify-center gap-2 text-emerald-700">
            <div className="bg-emerald-100 p-1.5 rounded-full ring-2 ring-emerald-50 shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="hidden md:inline text-[9px] font-black uppercase tracking-tight">Possui</span>
          </div>
        );
      } else if (representsNegativo) {
        return (
          <div className="flex items-center justify-center gap-2 text-rose-300 opacity-60">
            <div className="bg-rose-50 p-1.5 rounded-full border border-rose-100 shrink-0">
              <X className="w-3.5 h-3.5" />
            </div>
            <span className="hidden md:inline text-[9px] font-black uppercase tracking-tight">Não</span>
          </div>
        );
      } else if (representsIsento) {
        return (
          <div className="flex items-center justify-center gap-2 text-slate-400 opacity-40">
            <div className="bg-slate-100 p-1.5 rounded-full border border-slate-200 shrink-0">
              <X className="w-3.5 h-3.5" />
            </div>
            <span className="hidden md:inline text-[9px] font-black uppercase tracking-tight">Isento</span>
          </div>
        );
      }
      return <span className="text-slate-200 font-black text-[10px]">-</span>;
    }

    if (fieldType === 'unique') {
      const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (canEdit && !isUIActionDisabled) {
          handleQuickSave(representsPositivo ? 'NÃO POSSUI' : 'POSSUI');
        }
      };

      if (canEdit) {
        return (
          <button 
            onClick={handleToggle}
            disabled={isUIActionDisabled}
            className={`
              font-black transition-all text-[11px] leading-none flex items-center justify-center min-h-[32px] px-3 rounded-xl border shadow-sm outline-none w-full max-w-[60px] mx-auto
              ${representsPositivo ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' : 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-300'}
              cursor-pointer active:scale-95
            `}
            title="Clique para alternar o status"
          >
            U
          </button>
        );
      }

      return (
        <span 
          className={`
            font-black transition-all text-[11px] leading-none flex items-center justify-center min-h-[32px] px-3 rounded-xl border shadow-sm
            ${representsPositivo ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'}
          `}
        >
          U
        </span>
      );
    }

    if (representsIsento) {
      return (
        <span className="font-black transition-all text-[11px] leading-none flex items-center justify-center min-h-[32px] px-3 rounded-xl text-slate-400 opacity-60 bg-slate-100 border border-slate-200 text-[10px]">
          N.N
        </span>
      );
    }

    if (representsPositivo && isStatusOnly) {
       return (
         <div className="flex flex-col items-center gap-1">
           <span className="text-[8px] font-black text-emerald-600/50 uppercase tracking-tighter">TAM?</span>
           <div className="w-8 h-1.5 bg-emerald-100 rounded-full"></div>
         </div>
       );
    }

    return (
      <span 
        className={`
          font-black transition-all text-[11px] leading-none flex items-center justify-center min-h-[32px] px-3 rounded-xl
          ${representsPositivo && !isStatusOnly ? 'text-emerald-700 bg-emerald-50 border border-emerald-100 shadow-sm' : ''}
          ${representsNegativo ? 'text-rose-700 bg-rose-50 border border-rose-100 shadow-sm' : ''}
          ${rawValue === '-' ? 'text-slate-200' : ''}
          ${displaySize === 'TAM. N/R' ? 'text-[9px]' : ''}
        `}
      >
        {displaySize}
      </span>
    );
  };

  const isTamanhoFixed = viewType === 'tamanho' && (representsIsento || fieldType === 'unique');
  const displayCanEdit = canEdit && !isTamanhoFixed;

  return (
    <td 
      className={`p-3 border-r border-slate-100 ${centered ? 'text-center' : ''} transition-all relative group ${displayCanEdit ? 'hover:bg-emerald-50/50' : ''} min-w-[120px]`}
    >
      <div className={`flex items-center gap-3 ${centered ? 'justify-center' : ''} w-full h-full`}>
        {viewType === 'status' && canEdit ? (
          <div className="relative w-full group/sel">
            <select
              value={rawValue}
              onChange={(e) => handleQuickSave(e.target.value)}
              disabled={isUIActionDisabled}
              className={`
                w-full appearance-none text-[9px] font-black uppercase py-2 px-3 rounded-xl cursor-pointer focus:outline-none transition-all
                border border-transparent hover:border-slate-200 shadow-sm
                ${representsPositivo ? 'bg-emerald-50 text-emerald-700' : ''}
                ${representsNegativo ? 'bg-rose-50 text-rose-700' : ''}
                ${representsIsento ? 'bg-slate-100 text-slate-500 opacity-60' : ''}
              `}
            >
              {(isModerator ? ['POSSUI', 'NÃO POSSUI', 'NÃO NECESSITA'] : ['POSSUI', 'NÃO POSSUI']).map(opt => (
                <option key={opt} value={opt} className="bg-white text-slate-800">
                  {opt === 'POSSUI' ? '✅ POSSUI' : opt === 'NÃO POSSUI' ? '❌ NÃO' : '🚫 N.N'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-current opacity-40 pointer-events-none group-hover/sel:opacity-100 transition-opacity" />
            {isUIActionDisabled && (
              <div className="absolute inset-0 bg-white/40 flex items-center justify-center rounded-xl">
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent animate-spin rounded-full" />
              </div>
            )}
          </div>
        ) : viewType === 'tamanho' && displayCanEdit && fieldType !== 'status' ? (
          <div className="relative w-full group/sel">
            <select
              value={rawValue}
              onChange={(e) => handleQuickSave(e.target.value)}
              disabled={isUIActionDisabled}
              className={`
                w-full appearance-none text-[9px] font-black uppercase py-2 px-3 rounded-xl cursor-pointer focus:outline-none transition-all
                border border-transparent hover:border-slate-200 shadow-sm
                ${representsPositivo ? 'bg-emerald-50 text-emerald-700' : representsNegativo ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}
              `}
            >
              <option value={rawValue}>{displaySize} (Atual)</option>
              <option value="POSSUI">SÓ POSSUI (SEM TAM)</option>
              <option value="NÃO POSSUI">TAM. N/R</option>
              <option value="NÃO NECESSITA">NÃO NECESSITA</option>
              {fieldType === 'unique' && <option value="TAMANHO ÚNICO">T. ÚNICO</option>}
              {fieldType === 'letter' && ["PP", "P", "M", "G", "GG", "XG", "XXG", "EXG"].map(s => <option key={s} value={representsNegativo ? `NÃO POSSUI ${s}` : s}>{s}</option>)}
              {fieldType === 'number' && Array.from({length: 30}, (_, i) => 32 + i).map(s => <option key={s} value={representsNegativo ? `NÃO POSSUI ${s}` : s.toString()}>{s}</option>)}
              {(!fieldType || fieldType === 'text') && [...["PP", "P", "M", "G", "GG"], ...Array.from({length: 10}, (_, i) => 38 + i)].map(s => <option key={s} value={representsNegativo ? `NÃO POSSUI ${s}` : s.toString()}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-current opacity-40 pointer-events-none group-hover/sel:opacity-100 transition-opacity" />
            {isUIActionDisabled && (
              <div className="absolute inset-0 bg-white/40 flex items-center justify-center rounded-xl">
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent animate-spin rounded-full" />
              </div>
            )}
          </div>
        ) : (
          <div 
            className={`w-full h-full flex items-center justify-center min-h-[32px] ${displayCanEdit ? 'cursor-pointer' : ''}`}
            onClick={() => displayCanEdit && onSetEditing({ rg: item.rgStr, field, value: rawValue })}
          >
            {renderContent()}
          </div>
        )}
        
        {canEdit && viewType === 'tamanho' && false && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all absolute right-1 top-1 z-10">
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowQuickMenu(!showQuickMenu); }}
                className={`p-1.5 rounded-lg border shadow-sm backdrop-blur-sm transition-all
                  ${showQuickMenu ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white/90 text-slate-400 hover:text-emerald-600 border-slate-200'}
                `}
                title="Alterar Status / Tamanho"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              {showQuickMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowQuickMenu(false)}></div>
                  <div className="absolute top-full right-0 z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 min-w-[280px] mt-2 animate-in fade-in zoom-in slide-in-from-top-2 duration-200 origin-top-right">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-800 tracking-tight">{field}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Configuração Rápida</span>
                      </div>
                      <button onClick={() => setShowQuickMenu(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                           <div className="w-1 h-1 rounded-full bg-emerald-400" /> Alterar Status
                        </p>
                        <div className="flex flex-col gap-1 w-full">
                          {(isModerator ? ['POSSUI', 'NÃO POSSUI', 'NÃO NECESSITA'] : ['POSSUI', 'NÃO POSSUI']).map(s => (
                            <button
                              key={s}
                              onClick={() => handleQuickSave(s)}
                              className={`
                                w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between
                                ${s === 'POSSUI' ? 'text-emerald-700 hover:bg-emerald-50' : ''}
                                ${s === 'NÃO POSSUI' ? 'text-rose-700 hover:bg-rose-50' : ''}
                                ${s === 'NÃO NECESSITA' ? 'text-slate-600 hover:bg-slate-100' : ''}
                              `}
                            >
                              <span>{s}</span>
                              {rawValue === s && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                           <div className="w-1 h-1 rounded-full bg-indigo-400" /> Escolher Tamanho
                        </p>
                        
                        {fieldType === 'unique' ? (
                          <button
                            onClick={() => handleQuickSave('T. UNICO')}
                            className={`w-full py-3 text-[10px] font-black uppercase rounded-xl transition-all border ${rawValue === 'T. UNICO' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'}`}
                          >
                            Aplicar Tamanho Único
                          </button>
                        ) : (
                          <>
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200 shadow-inner">
                              <button 
                                onClick={() => setSizeCategory('letras')}
                                className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${sizeCategory === 'letras' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Letras
                              </button>
                              <button 
                                onClick={() => setSizeCategory('numeros')}
                                className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${sizeCategory === 'numeros' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Números
                              </button>
                              {isModerator && (
                                <button 
                                  onClick={() => setSizeCategory('ambos')}
                                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${sizeCategory === 'ambos' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                  Ambos
                                </button>
                              )}
                            </div>

                            <div className="space-y-4">
                              {(sizeCategory === 'letras' || sizeCategory === 'ambos') && (
                                <div className="animate-in fade-in duration-300">
                                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                     <div className="w-1 h-1 rounded-full bg-indigo-400" /> Letras (P / M / G)
                                  </p>
                                  <div className="grid grid-cols-5 gap-1">
                                    {LETTER_SIZES.map(s => (
                                      <button
                                        key={s}
                                        onClick={() => handleQuickSave(s)}
                                        className={`text-[9px] font-black uppercase p-2 border rounded-lg transition-all text-center
                                          ${rawValue === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100 text-indigo-700'}
                                        `}
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(sizeCategory === 'numeros' || sizeCategory === 'ambos') && (
                                <div className="animate-in fade-in duration-300">
                                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                     <div className="w-1 h-1 rounded-full bg-slate-400" /> Numeração (0 - 60)
                                  </p>
                                  <div className="grid grid-cols-6 gap-1">
                                    {NUMERIC_SIZES.map(s => (
                                      <button
                                        key={s}
                                        onClick={() => handleQuickSave(s)}
                                        className={`text-[9px] font-black p-2 border rounded-lg transition-all text-center
                                          ${rawValue === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600'}
                                        `}
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <button 
                          onClick={() => { setShowQuickMenu(false); onSetEditing({ rg: item.rgStr, field, value }); }}
                          className="w-full p-3 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Digitar Valor Customizado
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </td>
  );
});
