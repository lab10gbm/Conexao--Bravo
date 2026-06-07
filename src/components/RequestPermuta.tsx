import React, { useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { UserProfile, PermutaStatus, PermutaRequest } from '../types';
import { format, isBefore, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaForDate, getAlaName, calculateDeadline, cn } from '../lib/utils';
import { Send, CalendarIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppConfig } from '../contexts/ConfigContext';
import { useMilitars } from '../contexts/MilitarContext';
import { cleanUndefined } from "../lib/utils";

interface RequestPermutaProps {
  user: UserProfile;
  obmContext: string;
  initialDate?: Date | null;
  onClose?: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

// Helper to normalize RGs for consistency - Removes leading zeros and non-alphanumeric
const normalizeRg = (rg: string | number) => {
  const str = (rg || '').toString().trim().toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, '');
  return clean.replace(/^0+/, '') || clean;
};

export function RequestPermuta({ user, obmContext, initialDate, onClose, isOpen, setIsOpen, onSuccess }: RequestPermutaProps & { onSuccess?: (dateStr: string) => void }) {
  const [date, setDate] = useState('');
  const [requesterRg, setRequesterRg] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [substituteRg, setSubstituteRg] = useState('');
  const [substituteName, setSubstituteName] = useState('');
  const [isLookingForSubstitute, setIsLookingForSubstitute] = useState(false);
  const [offerType, setOfferType] = useState<'troca' | 'pago' | 'especial'>('troca');
  const [searchingRequester, setSearchingRequester] = useState(false);
  const [searchingSubstitute, setSearchingSubstitute] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { activeMonths: ctxActiveMonths } = useAppConfig();
  const { militars } = useMilitars();

  const openMonths = React.useMemo(() => {
    return Array.isArray(ctxActiveMonths) ? ctxActiveMonths : [];
  }, [ctxActiveMonths]);

  // Sincroniza a data inicial se fornecida
  React.useEffect(() => {
    if (initialDate && isOpen) {
      setDate(format(initialDate, 'yyyy-MM-dd'));
    }
  }, [initialDate, isOpen]);

  // Reset e Sincronização de estado quando o modal abre
  React.useEffect(() => {
    if (isOpen && user.rg) {
      setError('');
      // Inicialmente não seta RGs aqui, deixa o efeito da DATA decidir
      if (!date) {
         setRequesterRg(user.rg);
         setSubstituteRg('');
      }
    }
  }, [isOpen, user.rg, date]);

  // Busca automática do militar (Quem Sai) pelo RG
  React.useEffect(() => {
    const cleanRg = normalizeRg(requesterRg);
    if (cleanRg.length >= 3) {
      if (cleanRg === normalizeRg(user.rg || '')) {
        const formatted = user.rank ? `${user.rank} ${user.warName || user.name}` : user.name;
        setRequesterName(formatted);
        return;
      }
      
      const m = militars.find(mil => normalizeRg(mil.rg) === cleanRg);
      if (m) {
        setRequesterName((m.rank && m.warName) ? `${m.rank} ${m.warName}` : (m.name || 'Militar'));
      } else {
        setRequesterName('Militar não encontrado');
      }
    } else {
      setRequesterName('');
    }
  }, [requesterRg, user.rg, user.name, user.rank, user.warName, militars]);

  // Autopreenchimento Inteligente Baseado na Data e na Ala
  React.useEffect(() => {
    if (date && user.rg && isOpen) {
      const selectedDateObj = new Date(date + 'T00:00:00');
      const alaOnDate = getAlaForDate(selectedDateObj);
      const isExpediente = typeof user.ala === 'string' && (user.ala.toUpperCase() === 'EXP' || user.ala.toUpperCase() === 'EXPEDIENTE' || user.ala.toUpperCase() === 'ESCALANTE');
      
      const isLeaving = !isExpediente && alaOnDate.toString() === user.ala?.toString();

      if (isLeaving) {
        setRequesterRg(user.rg);
        if (substituteRg === user.rg) setSubstituteRg('');
      } else {
        setSubstituteRg(user.rg);
        if (requesterRg === user.rg) setRequesterRg('');
      }
    }
  }, [date, user.ala, user.rg, isOpen]);

  // Busca automática do militar (Quem Entra) pelo RG
  React.useEffect(() => {
    const cleanRg = normalizeRg(substituteRg);
    if (cleanRg.length >= 3) {
      if (cleanRg === normalizeRg(user.rg || '')) {
        const formatted = user.rank ? `${user.rank} ${user.warName || user.name}` : user.name;
        setSubstituteName(formatted);
        return;
      }
      
      const m = militars.find(mil => normalizeRg(mil.rg) === cleanRg);
      if (m) {
        setSubstituteName((m.rank && m.warName) ? `${m.rank} ${m.warName}` : (m.name || 'Militar'));
      } else {
        setSubstituteName('Militar não encontrado');
      }
    } else {
      setSubstituteName('');
    }
  }, [substituteRg, user.rg, user.name, user.rank, user.warName, militars]);

  const selectedDateObj = date ? new Date(date + 'T00:00:00') : null;
  const alaOnDateVal = selectedDateObj ? getAlaForDate(selectedDateObj) : null;
  const isDifferentAla = alaOnDateVal !== null && alaOnDateVal.toString() !== user.ala?.toString();
  
  const isLate = selectedDateObj && !user.isAdmin && (new Date() > calculateDeadline(selectedDateObj));
  
  const isMonthOpen = React.useMemo(() => {
    if (!date) return true;
    const monthPart = date.split('-')[1];
    if (!monthPart) return true;
    const monthIdx = parseInt(monthPart, 10) - 1;
    return openMonths.includes(monthIdx);
  }, [date, openMonths]);

  const isFutureAgendamento = !isMonthOpen && selectedDateObj && !isBefore(selectedDateObj, new Date());

  const targetMissing = requesterRg ? 'substitute' : (substituteRg ? 'requester' : 'substitute');
  const isSubstituteMissing = isLookingForSubstitute && targetMissing === 'substitute';
  const isRequesterMissing = isLookingForSubstitute && targetMissing === 'requester';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setLoading(true);
    setError('');

    if (isLate) {
      setError("Permutas devem ser solicitadas com pelo menos 48h de antecedência do serviço.");
      setLoading(false);
      return;
    }

    if (!isLookingForSubstitute && requesterRg === substituteRg) {
      setError("Os RGs do solicitante e do substituto não podem ser iguais.");
      setLoading(false);
      return;
    }

    // Validação de GRD: Se o substituto já está de GRD neste dia
    if (substituteRg && !isSubstituteMissing) {
      try {
        const obmId = (obmContext || '10º GBM').replace(/\//g, '_').replace(/\s/g, '_');
        const monthKey = date.substring(0, 7); // yyyy-MM
        const docId = `${obmId}_${monthKey}`;
        const grdDoc = await getDoc(doc(db, 'grd_configs', docId));
        if (grdDoc.exists()) {
          const grdData = grdDoc.data().days || {};
          const dayRgs = grdData[date] || [];
          const normalizedGrdRgs = dayRgs.map((r: string) => normalizeRg(r));
          if (normalizedGrdRgs.includes(normalizeRg(substituteRg))) {
            setError("ERRO: O militar que entra (substituto) está escalado de GRD neste dia. É proibida a permuta de GRD para serviço efetivo.");
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Erro ao verificar GRD:", err);
      }
    }

    // Validação de envolvimento: militar deve ser uma das partes
    if (!user.isAdmin) {
       const userRgClean = normalizeRg(user.rg || '');
       if (!isRequesterMissing && normalizeRg(requesterRg) === userRgClean) {} // passes
       else if (!isSubstituteMissing && normalizeRg(substituteRg) === userRgClean) {} // passes
       else {
         setError(`Erro: Você (${user.rg}) deve ser o Solicitante ou o Substituto desta permuta.`);
         setLoading(false);
         return;
       }
    }

    try {
      const reqMilitar = militars.find(m => String(m.rg || '').replace(/\D/g, '') === normalizeRg(requesterRg));
      const subMilitar = militars.find(m => String(m.rg || '').replace(/\D/g, '') === normalizeRg(substituteRg));

      const payload = {
        obm: String(obmContext || '10º GBM'),
        requesterId: isRequesterMissing ? '' : (reqMilitar?.uid || String(auth.currentUser?.uid || user.uid)),
        requesterName: isRequesterMissing ? '' : String(requesterName),
        requesterRg: isRequesterMissing ? '' : String(requesterRg),
        substituteId: isSubstituteMissing ? '' : (subMilitar?.uid || ''),
        substituteRg: isSubstituteMissing ? '' : String(substituteRg),
        substituteName: isSubstituteMissing ? '' : String(substituteName),
        isLookingForSubstitute,
        offerType: isLookingForSubstitute ? offerType : null,
        date: String(date),
        originalAla: user.ala,
        status: isFutureAgendamento ? PermutaStatus.SCHEDULED : PermutaStatus.PENDING,
        acceptedById: isSubstituteMissing ? '' : `rg_${substituteRg}`,
        acceptedByName: isSubstituteMissing ? '' : String(substituteName),
        requesterSigned: isRequesterMissing ? false : normalizeRg(requesterRg) === normalizeRg(user.rg || ''),
        substituteSigned: isSubstituteMissing ? false : normalizeRg(substituteRg) === normalizeRg(user.rg || ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      console.log('[Permuta] Submitting payload:', payload);
      try {
        await addDoc(collection(db, 'permutas'), cleanUndefined(payload));
        console.log('[Permuta] Success submitting!');
        if (onSuccess) {
          onSuccess(String(date));
        } else {
          setTimeout(() => {
             const elm = document.getElementById('status-dashboard');
             if (elm) {
               try { elm.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(e) { elm.scrollIntoView(); }
             } else {
               const elm2 = document.getElementById('permuta-board');
               if (elm2) {
                 try { elm2.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(e) { elm2.scrollIntoView(); }
               }
             }
          }, 300);
        }
      } catch (error: any) {
        console.error('[Permuta] Firestore AddDoc Error:', error);
        handleFirestoreError(error, OperationType.CREATE, 'permutas');
      }

      setIsOpen(false);
    } catch (err: any) {
      console.error('[Permuta] Submit Catch Error:', err);
      try {
        const parsed = JSON.parse(err.message);
        setError(`ERRO (${parsed.operationType}): ${parsed.error}`);
      } catch {
        setError(err.message || 'Erro ao criar solicitação');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white sm:rounded border border-slate-200 shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className={`p-4 sm:p-6 text-white text-center relative border-b-4 shrink-0 ${isFutureAgendamento ? 'bg-amber-600 border-amber-800' : 'bg-[var(--color-brand-dark)] border-[var(--color-brand-red)]'}`}>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg sm:text-xl font-black mb-1 uppercase tracking-tighter">
                  {isFutureAgendamento ? 'Agendamento' : 'Requisição'}
                </h3>
                <p className="text-white/40 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest leading-tight">
                  {isFutureAgendamento ? 'MÊS FECHADO - AGENDAMENTO PRÉVIO' : 'Processamento Operacional'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-3 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 text-center sm:text-left">
                    Data do Serviço Original
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={format(addHours(new Date(), 48), 'yyyy-MM-dd')}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700"
                    />
                  </div>
                </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={isRequesterMissing ? "opacity-50 pointer-events-none" : ""}>
                    <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">
                       Militar que Sai (RG)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required={!isRequesterMissing}
                        disabled={isRequesterMissing}
                        placeholder={isRequesterMissing ? "BUSCANDO..." : "Ex: 12345"}
                        value={requesterRg}
                        onChange={(e) => setRequesterRg(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 uppercase"
                      />
                      {searchingRequester && !isRequesterMissing && (
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      )}
                    </div>
                    {requesterName && requesterRg.length >= 3 && !isRequesterMissing && (
                      <p className={`mt-1 text-[8px] sm:text-[9px] font-black uppercase italic flex items-center gap-1 ${requesterName === 'Militar não encontrado' ? 'text-red-500' : 'text-emerald-600'}`}>
                        {requesterName !== 'Militar não encontrado' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                        {requesterName}
                      </p>
                    )}
                  </div>
                  <div className={isSubstituteMissing ? "opacity-50 pointer-events-none" : ""}>
                    <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">
                      Militar que Entra (RG)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required={!isSubstituteMissing}
                        disabled={isSubstituteMissing}
                        placeholder={isSubstituteMissing ? "BUSCANDO..." : "Ex: 54321"}
                        value={substituteRg}
                        onChange={(e) => setSubstituteRg(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 uppercase"
                      />
                      {searchingSubstitute && !isLookingForSubstitute && (
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      )}
                    </div>
                    {substituteName && substituteRg.length >= 3 && !isLookingForSubstitute && (
                      <p className={`mt-1 text-[8px] sm:text-[9px] font-black uppercase italic flex items-center gap-1 ${substituteName === 'Militar não encontrado' ? 'text-red-500' : 'text-emerald-600'}`}>
                        {substituteName !== 'Militar não encontrado' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                        {substituteName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-[var(--color-brand-dark)] focus:ring-[var(--color-brand-dark)]"
                      checked={isLookingForSubstitute}
                      onChange={(e) => setIsLookingForSubstitute(e.target.checked)}
                    />
                    <span className="text-[10px] sm:text-xs font-black uppercase text-slate-600 tracking-widest">
                      ESTOU PROCURANDO UM PERMUTANTE
                    </span>
                  </label>

                  {isLookingForSubstitute && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex gap-4 pt-1 px-1"
                    >
                      <button 
                        type="button" 
                        onClick={() => setOfferType('troca')}
                        className={`w-6 h-6 rounded-full transition-all ${offerType === 'troca' ? 'ring-2 ring-offset-2 ring-[#1E293B]' : 'hover:scale-110 opacity-50'} bg-[#1E293B]`}
                        title="Troca de Serviço"
                      />
                      <button 
                        type="button" 
                        onClick={() => setOfferType('pago')}
                        className={`w-6 h-6 rounded-full transition-all ${offerType === 'pago' ? 'ring-2 ring-offset-2 ring-[#8B4513]' : 'hover:scale-110 opacity-50'} bg-[#8B4513]`}
                        title="Tabela Comum (Valor Tabelado)"
                      />
                      <button 
                        type="button" 
                        onClick={() => setOfferType('especial')}
                        className={`w-6 h-6 rounded-full transition-all ${offerType === 'especial' ? 'ring-2 ring-offset-2 ring-[#3B0764]' : 'hover:scale-110 opacity-50'} bg-[#3B0764]`}
                        title="Tabela Especial (Valor Especial/Datas Festivas)"
                      />
                    </motion.div>
                  )}
                </div>

                {selectedDateObj && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <div className={cn("p-2.5 sm:p-4 rounded border-2 text-[8px] sm:text-[10px] font-black leading-tight uppercase", isDifferentAla ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700')}>
                      DATA ({format(selectedDateObj, 'dd/MM')}) É DA {getAlaName(alaOnDateVal!)}.
                      {isDifferentAla ? (
                         <> VOCÊ É {typeof user.ala === 'string' && (user.ala.toUpperCase() === 'EXP' || user.ala.toUpperCase() === 'EXPEDIENTE' || user.ala.toUpperCase() === 'ESCALANTE') ? user.ala.toUpperCase() : getAlaName(user.ala)}, SUGERIMOS QUE VOCÊ <span className="underline">ENTRE</span>.</>
                      ) : (
                         <> MESMA ALA, SUGERIMOS QUE VOCÊ <span className="underline">SAI</span>.</>
                      )}
                    </div>
                    {isLate && (
                      <div className="bg-red-50 border-2 border-red-200 p-2.5 sm:p-4 rounded text-red-700 text-[8px] sm:text-[10px] font-black leading-tight uppercase flex flex-col gap-1">
                        <span>FORA DO PRAZO DE REQUISIÇÃO.</span>
                        <span className="text-[7px] opacity-70">O prazo encerrou em: {format(calculateDeadline(selectedDateObj), 'dd/MM HH:mm')}</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-100 p-3 text-red-600 text-[10px] font-bold uppercase">
                    {error}
                  </div>
                )}

                <div className={`border p-2.5 sm:p-4 rounded text-center ${isFutureAgendamento ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  {isFutureAgendamento ? (
                    <p className="text-[7px] sm:text-[9px] text-amber-800 font-bold leading-tight uppercase tracking-tight">
                       ESTE MÊS ESTÁ FECHADO. <span className="font-black">ISTO FICARÁ SALVO COMO UM AGENDAMENTO</span>.
                    </p>
                  ) : (
                    <p className="text-[7px] sm:text-[9px] text-slate-500 font-bold leading-tight uppercase tracking-tight text-center">
                       SOLICITAÇÃO SERÁ <span className="font-black text-slate-800">REGISTRADA NO QUADRO GERAL</span>.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || isLate}
                  className={`w-full text-white py-3 sm:py-4 rounded font-black shadow-lg disabled:opacity-50 transition-all uppercase tracking-widest text-[10px] sm:text-xs shrink-0 ${isFutureAgendamento ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[var(--color-brand-dark)] hover:bg-black'}`}
                >
                  {loading ? 'SINCRONIZANDO...' : (isFutureAgendamento ? 'Agendar' : 'Submeter Solicitação')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
