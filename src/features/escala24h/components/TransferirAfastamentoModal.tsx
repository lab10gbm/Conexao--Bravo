import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarOff, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  User, 
  FileText 
} from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { normalizeObm, normalizeRg, normalizeAlaField } from '../../../lib/utils';
import { parseRank } from '../../../lib/rankUtils';

interface TransferirAfastamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  militar: any;
  selectedDate: string;
  obmContext: string;
  onSuccess: (militar: any, situacao: string) => void;
}

const SITUACOES = [
  'DISPENSA',
  'DISPENSA MÉDICA',
  'FÉRIAS',
  'LICENÇA',
  'CURSO',
  'NÚPCIAS',
  'LUTO',
  'OUTROS'
];

export function TransferirAfastamentoModal({
  isOpen,
  onClose,
  militar,
  selectedDate,
  obmContext,
  onSuccess
}: TransferirAfastamentoModalProps) {
  const [situacao, setSituacao] = useState('DISPENSA');
  const [inicio, setInicio] = useState(selectedDate || '');
  const [retorno, setRetorno] = useState(selectedDate || '');
  const [obs, setObs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInicio(selectedDate || '');
      setRetorno(selectedDate || '');
      setSituacao('DISPENSA');
      setObs('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, selectedDate]);

  if (!isOpen || !militar) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inicio || !retorno) {
      setErrorMsg('Preencha as datas de início e retorno.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const cleanRg = normalizeRg(militar.rg);
      const targetAla = militar.ala ? normalizeAlaField(militar.ala) : '1';
      const targetObm = militar.obm ? normalizeObm(militar.obm) : normalizeObm(obmContext || '10º GBM');

      const docId = `${cleanRg}_${inicio}_${Date.now()}`;
      const payload = {
        rg: cleanRg,
        ala: targetAla,
        inicio,
        retorno,
        situacao,
        tipoAfastamento: situacao,
        obs: obs.trim(),
        obm: targetObm,
        createdAt: new Date().toISOString()
      };

      await fetch('/api/doc/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: 'afastamentos_alas',
          docId,
          data: payload
        })
      });

      onSuccess(militar, situacao);
      onClose();
    } catch (err: any) {
      console.error('[TransferirAfastamentoModal] Erro ao gravar afastamento:', err);
      setErrorMsg(err.message || 'Erro ao registrar afastamento no banco de dados.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 text-amber-100 border border-white/20 flex items-center justify-center shadow-inner">
                <CalendarOff className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight">
                  Transferir para Afastamento
                </h2>
                <p className="text-[11px] text-amber-100/90 font-medium">
                  Registra o afastamento e retira o militar da relação da escala.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-xl text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback de Erro */}
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 px-5 py-3 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Dados do Militar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                    {parseRank(militar.rank)}
                  </span>
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 truncate">
                    {militar.warName || militar.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  RG: {militar.rg} • Ala {militar.ala || '1'} • {militar.obm || obmContext}
                </div>
              </div>
            </div>

            {/* Motivo / Situação */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Motivo / Tipo de Afastamento *
              </label>
              <select
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {SITUACOES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Período (Início e Retorno) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  Data de Início *
                </label>
                <input
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  Data de Retorno / Término *
                </label>
                <input
                  type="date"
                  value={retorno}
                  onChange={(e) => setRetorno(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                Observações / Detalhes (Opcional)
              </label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex: Atestado médico de 24h homologado..."
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gravando...</span>
                  </>
                ) : (
                  <>
                    <CalendarOff className="w-4 h-4" />
                    <span>Confirmar e Afastar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
