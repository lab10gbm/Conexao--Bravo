import React, { useState, useCallback } from 'react';
import { Megaphone, Plus, Trash2, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMuralAvisos } from '../hooks/useMuralAvisos';

export interface MuralAvisosProps {
  isAdminOrEscalante: boolean;
  userName: string;
}

export function MuralAvisos({ isAdminOrEscalante, userName }: MuralAvisosProps) {
  const { avisos, addAviso, deleteAviso } = useMuralAvisos();
  const [isAdding, setIsAdding] = useState(false);
  const [novoAviso, setNovoAviso] = useState('');
  const [eventoData, setEventoData] = useState('');

  const handleAddAviso = useCallback(async () => {
    if (!novoAviso.trim()) return;
    const success = await addAviso({ novoAviso, eventoData, userName });
    if (success) {
      setNovoAviso('');
      setEventoData('');
      setIsAdding(false);
    } else {
      alert('Erro ao adicionar aviso. Verifique as permissões.');
    }
  }, [novoAviso, eventoData, userName, addAviso]);

  const handleDeleteAviso = useCallback(async (id: string) => {
    if (!window.confirm('Excluir este aviso para todos?')) return;
    const success = await deleteAviso(id);
    if (!success) {
      alert('Erro ao excluir aviso.');
    }
  }, [deleteAviso]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4 shadow-sm flex flex-col gap-3"
    >
      {isAdminOrEscalante && (
        <div className="flex justify-end">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1.5 rounded text-[10px] uppercase font-black tracking-widest hover:bg-blue-700 transition"
          >
             {isAdding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
             {isAdding ? 'Cancelar' : 'Novo Evento/Aviso'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {isAdding && isAdminOrEscalante && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
             <div className="pt-2 flex flex-col gap-2 border-t border-blue-200 mt-2">
                <textarea 
                  value={novoAviso}
                  onChange={(e) => setNovoAviso(e.target.value)}
                  placeholder="Detalhes do aviso ou evento..."
                  className="w-full text-sm p-3 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                />
                <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
                   <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-300 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Data do Evento (Opcional):</span>
                      <input 
                         type="date" 
                         value={eventoData}
                         onChange={(e) => setEventoData(e.target.value)}
                         className="text-xs font-bold text-slate-700 focus:outline-none"
                      />
                   </div>
                   <button 
                     onClick={handleAddAviso}
                     disabled={!novoAviso.trim()}
                     className="w-full sm:w-auto flex justify-center items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-50 transition"
                   >
                     <Send className="w-4 h-4" />
                     Publicar
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="text-sm text-blue-900 space-y-2">
        {avisos.length === 0 && !isAdding && (
          <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-blue-600 italic">Nenhum aviso no momento.</motion.li>
        )}
        <AnimatePresence>
          {avisos.map((aviso, i) => (
            <motion.li 
              key={aviso.id} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-2 p-3 bg-white/50 rounded-lg border border-blue-100 group relative"
            >
            <span className="shrink-0 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span></span>
            <div className="flex-1 w-full overflow-hidden">
               {aviso.eventDate && (
                 <span className="inline-block px-1.5 py-0.5 mb-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-widest rounded">
                    Evento: {(() => {
                      try {
                        return format(new Date(aviso.eventDate + 'T12:00:00'), 'dd/MM/yyyy');
                      } catch (e) {
                        return aviso.eventDate;
                      }
                    })()}
                 </span>
               )}
               <p className="whitespace-pre-wrap break-words">{aviso.texto}</p>
               <p className="text-[9px] text-blue-500 uppercase tracking-widest mt-1 font-bold">
                 Enviado por {aviso.autor} • {aviso.createdAt ? format(aviso.createdAt.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'Agora'}
               </p>
            </div>
            {isAdminOrEscalante && (
              <button 
                onClick={() => handleDeleteAviso(aviso.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded absolute right-2 top-2"
                title="Excluir Aviso"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}
