import React, { useState } from 'react';
import { LayoutGrid, X, BadgeInfo, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { cleanUndefined } from '../../../lib/utils';
import { UserProfile } from '../../../types';

export interface GrdPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainTab: 'grd' | 'officers';
  currentDate: Date;
  militars: UserProfile[];
  docId: string;
  obmId: string;
}

export function GrdPasteModal({
  isOpen,
  onClose,
  mainTab,
  currentDate,
  militars,
  docId,
  obmId,
}: GrdPasteModalProps) {
  const [pasteContent, setPasteContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [pasteResults, setPasteResults] = useState<{ success: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setPasteResults(null);
    setPasteContent('');
    onClose();
  };

  const handlePasteMass = async () => {
    if (!pasteContent.trim()) return;
    setSaving(true);
    setPasteResults(null);

    const rows = pasteContent.split('\n').filter(line => line.trim());
    let successCount = 0;
    const errors: string[] = [];
    
    if (mainTab === 'grd') {
      const newPastedGrdData: Record<string, string[]> = {};
      for (const row of rows) {
        const parts = row.split('\t').map(p => p.trim());
        if (parts.length < 2) continue;

        const dateStr = parts[0];
        let finalDateStr = '';
        
        const dateParts = dateStr.split(/[\/\-]/);
        if (dateParts.length >= 2) {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10);
          const year = dateParts[2] 
            ? (dateParts[2].length === 2 ? 2000 + parseInt(dateParts[2], 10) : parseInt(dateParts[2], 10)) 
            : currentDate.getFullYear();
          
          if (!isNaN(day) && !isNaN(month)) {
            const d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime())) finalDateStr = format(d, 'yyyy-MM-dd');
          }
        }

        if (!finalDateStr) {
          errors.push(`Data inválida: ${dateStr}`);
          continue;
        }

        const rgs = parts.slice(1).filter(rg => rg.length > 0).slice(0, 6);
        const validRgs = rgs.filter(rg => {
          const found = militars.find(m => m.rg === rg);
          if (!found) {
            errors.push(`RG ${rg} não encontrado (Data ${dateStr})`);
            return false;
          }
          return true;
        });

        if (validRgs.length > 0) {
          newPastedGrdData[finalDateStr] = validRgs;
          successCount++;
        }
      }

      try {
        if (Object.keys(newPastedGrdData).length > 0) {
          const payload = cleanUndefined({ days: newPastedGrdData });
          await fetch('/api/officer-scales/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collectionName: 'grd_configs',
              docId,
              data: payload,
              merge: true
            })
          }).catch(err => console.warn('[GrdPasteModal] Backend API warning:', err));
        }
        setPasteResults({ success: successCount, errors });
      } catch (err) {
        console.error(err);
        setPasteResults({ success: successCount, errors: [...errors, "Erro ao salvar."] });
      }
    } else {
      // Officers Paste
      const newPastedOfficerData: Record<string, Record<string, string>> = {};
      for (const row of rows) {
        const parts = row.split('\t').map(p => p.trim());
        if (parts.length < 2) continue;

        const dateStr = parts[0];
        if (!dateStr || dateStr.toLowerCase().startsWith('data')) continue;
        
        let finalDateStr = '';
        const dateParts = dateStr.split(/[\/\-]/);
        if (dateParts.length >= 2) {
          const dayNum = parseInt(dateParts[0], 10);
          const monthNum = parseInt(dateParts[1], 10);
          const yearPart = dateParts[2];
          const yearNum = yearPart 
            ? (yearPart.length === 2 ? 2000 + parseInt(yearPart, 10) : parseInt(yearPart, 10)) 
            : currentDate.getFullYear();
          
          if (!isNaN(dayNum) && !isNaN(monthNum)) {
            const d = new Date(yearNum, monthNum - 1, dayNum);
            if (!isNaN(d.getTime())) finalDateStr = format(d, 'yyyy-MM-dd');
          }
        }

        if (!finalDateStr) {
          errors.push(`Data inválida ou não encontrada: ${dateStr}`);
          continue;
        }

        // expected: DATA | OFICIAL DIA | SOBREAVISO
        newPastedOfficerData[finalDateStr] = {
          oficialDia: parts[2] || '',
          sobreaviso: parts[3] || ''
        };
        successCount++;
      }

      try {
        if (Object.keys(newPastedOfficerData).length > 0) {
          const payload = cleanUndefined({ days: newPastedOfficerData });
          await fetch('/api/officer-scales/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collectionName: 'officer_scales',
              docId: obmId,
              data: payload,
              merge: true
            })
          }).catch(err => console.warn('[GrdPasteModal] Backend API warning:', err));
        }
        setPasteResults({ success: successCount, errors });
      } catch (err) {
        console.error(err);
        setPasteResults({ success: successCount, errors: [...errors, "Erro ao salvar."] });
      }
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-cyan-600" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 leading-none">Importar da Planilha</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cole aqui os dados do Google Sheets / Excel</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-all"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 mb-2">
              <BadgeInfo className="w-3 h-3" /> Instruções
            </p>
            <p className="text-xs text-amber-800 leading-relaxed italic">
              Copie as colunas da sua planilha e cole abaixo. 
              <br />
              {mainTab === 'grd' ? (
                <>Formato: <span className="font-bold underline">Data [TAB] RG1 [TAB] RG2...</span></>
              ) : (
                <>Formato: <span className="font-bold underline">Data [TAB] DIA [TAB] OFICIAL [TAB] SOBREAVISO</span></>
              )}
            </p>
          </div>

          {!pasteResults ? (
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Cole aqui..."
              className="w-full h-64 p-4 text-[11px] font-mono border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-cyan-500 transition-all resize-none bg-slate-50"
            />
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-black text-emerald-800 uppercase tracking-tight">Importação Concluída</h4>
                <p className="text-xs text-emerald-600 mt-1">{pasteResults.success} dias atualizados com sucesso.</p>
              </div>

              {pasteResults.errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-2">Avisos / Erros:</h4>
                  <ul className="space-y-1 text-[10px] text-rose-600 font-bold overflow-y-auto max-h-32">
                    {pasteResults.errors.map((err, i) => (
                      <li key={i} className="flex items-center gap-2">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-slate-50 flex items-center justify-end gap-3">
          {!pasteResults ? (
            <>
              <button 
                onClick={handleClose}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button 
                disabled={saving || !pasteContent.trim()}
                onClick={handlePasteMass}
                className="px-6 py-2.5 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-200 transition-all flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Confirmar Importação
              </button>
            </>
          ) : (
            <button 
              onClick={handleClose}
              className="px-6 py-2.5 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
