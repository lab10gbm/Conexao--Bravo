import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  ShieldCheck, 
  Anchor, 
  Stethoscope, 
  Flame, 
  Award, 
  Compass, 
  Star, 
  LifeBuoy, 
  AlertTriangle, 
  Waves, 
  Crosshair,
  Sparkles
} from 'lucide-react';
import { OfficerSectionItem } from '../types/officerSections';
import { cn } from '../lib/utils';

interface NovaSecaoOficialModalProps {
  isOpen: boolean;
  onClose: () => void;
  obmContext: string;
  onSave: (section: OfficerSectionItem) => Promise<void>;
}

const AVAILABLE_ICONS = [
  { id: 'shield', label: 'Escudo', icon: ShieldCheck },
  { id: 'anchor', label: 'Âncora', icon: Anchor },
  { id: 'stethoscope', label: 'Saúde', icon: Stethoscope },
  { id: 'flame', label: 'Incêndio', icon: Flame },
  { id: 'award', label: 'Distintivo', icon: Award },
  { id: 'compass', label: 'Bússola', icon: Compass },
  { id: 'star', label: 'Estrela', icon: Star },
  { id: 'lifebuoy', label: 'Salvamento', icon: LifeBuoy },
  { id: 'waves', label: 'Náutica', icon: Waves },
  { id: 'crosshair', label: 'Operações', icon: Crosshair }
];

const AVAILABLE_COLORS = [
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-600', border: 'border-indigo-600' },
  { id: 'cyan', label: 'Ciano', bg: 'bg-cyan-600', border: 'border-cyan-600' },
  { id: 'rose', label: 'Rosa', bg: 'bg-rose-600', border: 'border-rose-600' },
  { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-600', border: 'border-emerald-600' },
  { id: 'amber', label: 'Âmbar', bg: 'bg-amber-600', border: 'border-amber-600' },
  { id: 'blue', label: 'Azul', bg: 'bg-blue-600', border: 'border-blue-600' },
  { id: 'purple', label: 'Roxo', bg: 'bg-purple-600', border: 'border-purple-600' }
];

export function NovaSecaoOficialModal({
  isOpen,
  onClose,
  obmContext,
  onSave
}: NovaSecaoOficialModalProps) {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [icon, setIcon] = useState('shield');
  const [color, setColor] = useState('indigo');
  const [col1Name, setCol1Name] = useState('OFICIAL DE DIA / CMT OP / SOBREAVISO 1');
  const [col2Name, setCol2Name] = useState('SOBREAVISO 2 / GRD 2');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome da seção.');
      return;
    }

    setSaving(true);
    try {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_');
      
      const newSection: OfficerSectionItem = {
        id: `sec_${slug}_${Date.now()}`,
        name: name.trim(),
        subtitle: subtitle.trim() || 'Serviço Operacional',
        description: description.trim() || `Escala e serviços de oficiais para ${name.trim()}.`,
        badge: badge.trim() || name.trim(),
        icon,
        color,
        enabled: true,
        isCustom: true,
        col1Name: col1Name.trim() || 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1',
        col2Name: col2Name.trim() || 'SOBREAVISO 2 / GRD 2'
      };

      await onSave(newSection);
      setName('');
      setSubtitle('');
      setDescription('');
      setBadge('');
      onClose();
    } catch (err: any) {
      alert(`Erro ao criar seção: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-base sm:text-lg">
                Criar Nova Seção de Oficiais
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Unidade: <span className="text-indigo-600 dark:text-indigo-400 font-black">{obmContext}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Nome da Seção *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Oficial de Operações, Sobreaviso de Mergulho..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Subtítulo
              </label>
              <input
                type="text"
                placeholder="Ex: Operações Especializadas"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Badge / Etiqueta
              </label>
              <input
                type="text"
                placeholder="Ex: Operacional, Mergulho..."
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Gerenciamento e escala de oficiais para esta divisão."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Seleção de Ícone */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Ícone
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={cn(
                      "p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção de Cor */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Cor do Tema
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {AVAILABLE_COLORS.map((item) => {
                const isSelected = color === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setColor(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      isSelected
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                    )}
                  >
                    <span className={cn("w-2.5 h-2.5 rounded-full", item.bg)} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colunas da Escala */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Personalização das Colunas de Escala
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Nome da Coluna 1
                </label>
                <input
                  type="text"
                  value={col1Name}
                  onChange={(e) => setCol1Name(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Nome da Coluna 2
                </label>
                <input
                  type="text"
                  value={col2Name}
                  onChange={(e) => setCol2Name(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-200 dark:shadow-none flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? 'Criando Seção...' : 'Criar Seção'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
