import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { normalizeRg } from '../../../lib/utils';
import { UserProfile } from '../../../types';

export interface VacationValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetRg: string;
  user: UserProfile;
  onSuccess: (targetRgNorm: string, payload: any) => void;
}

export function VacationValidationModal({
  isOpen,
  onClose,
  targetName,
  targetRg,
  user,
  onSuccess,
}: VacationValidationModalProps) {
  const [password, setPassword] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rg: user.rg, password }),
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Senha incorreta.');
      }
      
      const targetRgNorm = normalizeRg(targetRg);
      const docId = `${targetRgNorm}_${user.rg}_${Date.now()}`;
      const payload = {
        targetRg: targetRgNorm,
        targetName: targetName,
        validatorRg: user.rg,
        validatorName: `${user.rank || ''} ${user.warName || user.name.split(' ')[0]}`.trim(),
        validatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'vacation_validations', docId), payload);
      onSuccess(targetRgNorm, payload);
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao validar');
    } finally {
      setValidating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Validar Férias</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Militar: {targetName}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded-xl text-center border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sua Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-0 transition-all font-mono text-xs text-slate-700"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            
            <button
              type="submit"
              disabled={validating}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {validating ? 'Validando...' : 'Confirmar Validação'}
            </button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
