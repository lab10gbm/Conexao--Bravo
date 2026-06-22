import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckSquare, Plus, FileText, ArrowRightLeft, CalendarRange } from 'lucide-react';
import { format, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { doc, collection, onSnapshot, setDoc, addDoc, query, where, deleteDoc } from 'firebase/firestore';

interface DayDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  userRg: string;
  isWorkingDay: boolean;
  onPermutaClick: (date: Date) => void;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export function DayDetailsModal({ isOpen, onClose, date, userRg, isWorkingDay, onPermutaClick }: DayDetailsProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [diario, setDiario] = useState('');
  const [isSavingDiario, setIsSavingDiario] = useState(false);

  useEffect(() => {
    if (!isOpen || !date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Fetch Todos
    const qTodos = query(collection(db, `users/${userRg}/todos`), where('date', '==', dateStr));
    const unsubTodos = onSnapshot(qTodos, (snap) => {
      setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() } as TodoItem)));
    });

    // Fetch Diário
    const unsubDiario = onSnapshot(doc(db, `users/${userRg}/diarios`, dateStr), (docSnap) => {
      if (docSnap.exists() && docSnap.data().text) {
        setDiario(docSnap.data().text);
      } else {
        setDiario('');
      }
    });

    return () => {
      unsubTodos();
      unsubDiario();
    };
  }, [isOpen, date, userRg]);

  const handleAddTodo = async () => {
    if (!newTodo.trim() || !date) return;
    try {
      await addDoc(collection(db, `users/${userRg}/todos`), {
        text: newTodo.trim(),
        completed: false,
        date: format(date, 'yyyy-MM-dd')
      });
      setNewTodo('');
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTodo = async (id: string, current: boolean) => {
    try {
      await setDoc(doc(db, `users/${userRg}/todos`, id), {
        completed: !current
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, `users/${userRg}/todos`, id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDiario = async () => {
    if (!date) return;
    setIsSavingDiario(true);
    try {
      await setDoc(doc(db, `users/${userRg}/diarios`, format(date, 'yyyy-MM-dd')), {
        text: diario
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingDiario(false);
    }
  };

  if (!isOpen || !date) return null;
  const isPast = isBefore(date, startOfToday());
  const dateFormatted = format(date, "dd 'de' MMMM", { locale: ptBR });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{dateFormatted}</h2>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                  {isWorkingDay ? "Dia de Serviço" : "Folga"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shadow-sm border border-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-8">
            
            {/* Ações Rápidas */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Ações para o dia
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    onClose();
                    onPermutaClick(date);
                  }}
                  className="flex-1 py-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-100 transition"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Permuta
                </button>
              </div>
            </div>

            {/* Tarefas Pessoais */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Tarefas e Lembretes
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Novo lembrete para este dia..."
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTodo()}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleAddTodo}
                  className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <ul className="flex flex-col gap-2 mt-2">
                {todos.map(todo => (
                  <li key={todo.id} className="flex flex-row items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group border border-transparent hover:border-slate-100">
                    <input 
                      type="checkbox" 
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id, todo.completed)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className={`text-sm flex-1 ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                      {todo.text}
                    </span>
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                {todos.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Nenhum lembrete para este dia.</p>
                )}
              </ul>
            </div>

            {/* Diário de Serviço */}
            <div className="flex flex-col gap-3">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" /> Diário de Serviço
               </h3>
               {(!isWorkingDay && !diario) ? (
                 <p className="text-xs text-slate-400">Este dia é uma folga. O diário é geralmente usado para registrar informações após um serviço.</p>
               ) : null}
               
               <textarea
                  value={diario}
                  onChange={e => setDiario(e.target.value)}
                  placeholder={isPast ? "Como foi o serviço? Ocorrências, pendências, faltas de material..." : "Anotações sobre o serviço previsto..."}
                  className="w-full h-32 bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700 placeholder:text-slate-400 resize-none font-medium"
               />
               <button 
                 onClick={handleSaveDiario}
                 disabled={isSavingDiario}
                 className="self-end px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition"
               >
                 {isSavingDiario ? "Salvando..." : "Salvar Diário"}
               </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
