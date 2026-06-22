import React from 'react';
import { motion } from 'motion/react';
import { Hammer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmDesenvolvimento() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Hammer className="w-12 h-12 text-slate-400" />
      </div>
      
      <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Em Desenvolvimento</h1>
      
      <p className="text-sm text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
        Este módulo está sendo construído e estará disponível em breve. Estamos trabalhando para trazer novidades!
      </p>

      <button
        onClick={() => navigate('/')}
        className="mt-8 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Início
      </button>
    </div>
  );
}
