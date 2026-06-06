import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Coffee, Utensils, UtensilsCrossed, Sunrise, Sunset, Grape, ChefHat, BookOpen, Settings2, Plus, Edit2, Trash2, QrCode, X, Save, Calendar, Loader2, Printer, Download, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { UserProfile } from '../types';
const DAY_MAP: Record<string, string> = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
  0: 'Domingo'
};
import { QRCodeSVG } from 'qrcode.react';
import { TagInput } from './TagInput';
import { useRefeitorioData } from '../hooks/useRefeitorioData';
import { RefeitorioEditModal } from './RefeitorioEditModal';

interface RefeitorioModuleProps {
  user: UserProfile;
  onBack: () => void;
  initialTab?: 'cardapio' | 'catalogo' | 'gestao';
}

const IMPORT_MENUS_RAW: string = "";

export function RefeitorioModule({ user, onBack, initialTab = 'cardapio' }: RefeitorioModuleProps) {
  const [activeTab, setActiveTab] = useState<'cardapio' | 'catalogo' | 'gestao'>(initialTab);
  const [showQrCode, setShowQrCode] = useState(false);
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDateValue, setEditingDateValue] = useState("");
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [showAllFuture, setShowAllFuture] = useState(false);
  const [pastItemsToShow, setPastItemsToShow] = useState(0);
  const [hiddenCatalogs, setHiddenCatalogs] = useState<string[]>([]);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [showDefaultsConfig, setShowDefaultsConfig] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const { menus, catalog, loading, defaults, saveMenus, saveCatalog, restoreDefaultCatalog, saveDefaults } = useRefeitorioData();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregando dados...</p>
      </div>
    );
  }

  // Derived state for the 7 items
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const menusWithTime = menus.map((m: any, idx: number) => {
    let time = 0;
    if (m.date) {
      const parts = m.date.split('/');
      if (parts.length >= 2) {
        const d = parseInt(parts[0]);
        const mo = parseInt(parts[1]);
        if (!isNaN(d) && !isNaN(mo)) {
          let year = now.getFullYear();
          // Adjust year for Dec/Jan wrap around
          if (now.getMonth() === 0 && mo === 12) year--;
          else if (now.getMonth() === 11 && mo === 1) year++;
          time = new Date(year, mo - 1, d).getTime();
        }
      }
    }
    return { ...m, originalIndex: idx, time };
  });

  const sortedMenus = [...menusWithTime].sort((a, b) => a.time - b.time);

  const yesterdayStart = todayStart - 86400000;
  let baseIdx = sortedMenus.findIndex(m => m.time >= yesterdayStart);
  if (baseIdx === -1) {
    baseIdx = sortedMenus.length;
  }
  
  const startIdx = Math.max(0, baseIdx - pastItemsToShow);
  const endIdx = showAllFuture ? sortedMenus.length : Math.min(sortedMenus.length, baseIdx + 9);

  const visibleMenus = sortedMenus.slice(startIdx, endIdx);
  const hasMorePast = startIdx > 0;
  const hasMoreFuture = !showAllFuture && endIdx < sortedMenus.length;

  let currentMenuId = selectedOriginalIndex;
  if (currentMenuId === null && visibleMenus.length > 0) {
    // Attempt to select 'today', or the next closest future date, or the latest available
    const todayItem = visibleMenus.find(m => m.time === todayStart) || 
                      visibleMenus.find(m => m.time > todayStart) || 
                      visibleMenus[visibleMenus.length - 1];
    if (todayItem) {
      currentMenuId = todayItem.originalIndex;
    }
  }

  const menu = (currentMenuId !== null && menus[currentMenuId]) 
    ? menus[currentMenuId] 
    : (visibleMenus[0] || null);

  const handleUpdateCatalog = (category: string, newValue: string) => {
    const list = newValue.split(',').map(item => item.trim().toUpperCase()).filter(Boolean);
    saveCatalog({ ...catalog, [category]: list });
  };

  const handleImportBulk = () => {
    const lines = IMPORT_MENUS_RAW.split('\n').filter(l => l.trim().length > 0);
    const newItems = [...menus];
    
    for (const line of lines) {
      const parts = line.split('\t').map(p => p.trim());
      if (parts.length >= 5) {
         const date = parts[0];
         const weekdayText = parts[1].toUpperCase();
         const almocoRaw = parts[2];
         const sobremesa = parts[3];
         const jantarRaw = parts[4];
         
         // Basic heuristics: split comma into principal and others
         const almParts = almocoRaw.split(/ e |,| com /).map(s => s.trim()).filter(Boolean);
         const almPrincipal = almParts.length > 0 ? almParts[0].toUpperCase() : almocoRaw.toUpperCase();
         const almAcomp = almParts.slice(1).join(', ').toUpperCase() || 'ARROZ, FEIJÃO';
         
         const janParts = jantarRaw.split(/ e |,| com /).map(s => s.trim()).filter(Boolean);
         const janPrincipal = janParts.length > 0 ? janParts[0].toUpperCase() : jantarRaw.toUpperCase();
         const janAcomp = janParts.slice(1).join(', ').toUpperCase() || 'ARROZ, FEIJÃO';
         
         const isLanche = janPrincipal.includes('CAFÉ') || janPrincipal.includes('SUCO') || janPrincipal.includes('PIPOCA');

         const exists = newItems.findIndex(m => m.date === date);
         const item = {
            date,
            weekday: weekdayText,
            almoco: {
               principal: almPrincipal,
               acompanhamentos: almAcomp.length < 5 ? 'ARROZ, FEIJÃO' : almAcomp,
               saladas: 'SALADA TRADICIONAL',
               sobremesa: sobremesa === '-' ? '' : sobremesa.toUpperCase()
            },
            jantar: isLanche ? { principal: '', acompanhamentos: '', saladas: '', ceia: '' } : {
               principal: janPrincipal,
               acompanhamentos: janAcomp.length < 5 ? 'ARROZ, FEIJÃO' : janAcomp,
               saladas: 'SALADA TRADICIONAL',
               ceia: 'CEIA PADRÃO'
            },
            cafeManha: 'CAFÉ, PÃO, OVOS, FRUTAS',
            lancheTarde: isLanche ? jantarRaw.toUpperCase() : 'CAFÉ DA TARDE PADRÃO'
         };
         
         if (exists !== -1) {
            newItems[exists] = item;
         } else {
            newItems.push(item);
         }
      }
    }
    saveMenus(newItems);
  };

  const handleAdd = () => {
    setEditingItem({
      date: "",
      weekday: "",
      almoco: defaults?.almoco || { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", sobremesa: "" },
      jantar: defaults?.jantar || { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", ceia: "" },
      lancheTarde: defaults?.lancheTarde || "CAFÉ, SUCO, PIPOCA, PÃO RECHEADO",
      cafeManha: defaults?.cafeManha || "CAFÉ, PÃO, OVOS, QUEIJO, PRESUNTO"
    });
    setEditingIndex(null);
    setEditingDateValue("");
    setIsCustomDate(false);
    setShowDefaultsConfig(false);
    setIsEditing(true);
  };

  const handleEdit = (idx: number) => {
    const item = menus[idx];
    setEditingItem(JSON.parse(JSON.stringify(item)));
    setEditingIndex(idx);
    setIsCustomDate(true); // Default to showing custom date when editing an existing one, unless it matches a suggestion
    setShowDefaultsConfig(false);
    if (item.date) {
      const parts = item.date.split('/');
      if (parts.length === 2) {
         let year = now.getFullYear();
         const m = parseInt(parts[1], 10);
         if (now.getMonth() === 0 && m === 12) year--;
         else if (now.getMonth() === 11 && m === 1) year++;
         const ds = parts[0].padStart(2, '0');
         const ms = parts[1].padStart(2, '0');
         setEditingDateValue(`${year}-${ms}-${ds}`);
      } else {
         setEditingDateValue("");
      }
    } else {
      setEditingDateValue("");
    }
    setIsEditing(true);
  };

  const handleDelete = (idx: number) => {
    setConfirmAction({
      message: 'Tem certeza que deseja excluir este cardápio?',
      onConfirm: () => {
        const newMenus = [...menus];
        newMenus.splice(idx, 1);
        saveMenus(newMenus);
        if (currentMenuId === idx) {
          setSelectedOriginalIndex(null);
        }
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (showDefaultsConfig) {
      saveDefaults({
         almoco: editingItem.almoco,
         jantar: editingItem.jantar,
         lancheTarde: editingItem.lancheTarde,
         cafeManha: editingItem.cafeManha
      });
      setShowDefaultsConfig(false);
      handleAdd(); // reset form to normal edit
      return;
    }
    const newMenus = [...menus];
    if (editingIndex !== null) {
      newMenus[editingIndex] = editingItem;
    } else {
      newMenus.push(editingItem);
    }
    saveMenus(newMenus);
    setIsEditing(false);
  };

  const getSuggestedDates = () => {
    const suggestions: { value: string, label: string, dateKey: string, weekday: string }[] = [];
    const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
    const existingDates = new Set(menus.map(m => m.date));
    const startD = new Date();
    
    for (let i = 0; i < 30; i++) {
      const y = startD.getFullYear();
      const mo = String(startD.getMonth() + 1).padStart(2, '0');
      const da = String(startD.getDate()).padStart(2, '0');
      const key = `${da}/${mo}`;
      
      if (!existingDates.has(key) || (editingIndex !== null && editingItem?.date === key)) {
         suggestions.push({
             value: `${y}-${mo}-${da}`,
             label: `${da}/${mo}/${y} (${weekdays[startD.getDay()].toLowerCase()})`,
             dateKey: key,
             weekday: weekdays[startD.getDay()]
         });
      }
      if (suggestions.length >= 6) break;
      startD.setDate(startD.getDate() + 1);
    }
    return suggestions;
  };

  const suggestedDates = getSuggestedDates();

  const getFilteredReportMenus = () => {
    if (!reportStartDate || !reportEndDate) return [];
    
    const [sy, sm, sd] = reportStartDate.split('-').map(Number);
    const startT = new Date(sy, sm - 1, sd).getTime();
    
    const [ey, em, ed] = reportEndDate.split('-').map(Number);
    const endT = new Date(ey, em - 1, ed, 23, 59, 59).getTime();

    const now = new Date();
    
    const menusWithTime = menus.map((m: any, idx: number) => {
      let time = 0;
      if (m.date) {
        const parts = m.date.split('/');
        if (parts.length >= 2) {
          const d = parseInt(parts[0]);
          const mo = parseInt(parts[1]);
          if (!isNaN(d) && !isNaN(mo)) {
            let year = sy;
            // Heuristic for year overlap: if the required end date is next year
            if (ey > sy && mo <= em) year = ey;
            time = new Date(year, mo - 1, d).getTime();
          }
        }
      }
      return { ...m, time, originalIndex: idx };
    });

    return menusWithTime
      .filter((m: any) => m.time >= startT && m.time <= endT)
      .sort((a: any, b: any) => a.time - b.time);
  };

  const reportMenus = getFilteredReportMenus();

  const renderSnackItems = (text: string) => {
    if (!text) return null;
    const items = text
      .replace(/ E /gi, ', ')
      .replace(/ C\/ /gi, ', ')
      .replace(/ COM /gi, ', ')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    return (
      <div className="flex flex-col gap-2 mt-1">
        {items.map((item, i) => {
          const lower = item.toLowerCase();
          let icon = '🔸'; 
          if (lower.includes('café') || lower.includes('cafe')) icon = '☕';
          else if (lower.includes('suco')) icon = '🧃';
          else if (lower.includes('pão') || lower.includes('pao') || lower.includes('bolo') || lower.includes('salgado') || lower.includes('empadão') || lower.includes('torta') || lower.includes('pipoca')) {
            if (lower.includes('bolo')) icon = '🍰';
            else if (lower.includes('pipoca')) icon = '🍿';
            else if (lower.includes('torta')) icon = '🥧';
            else if (lower.includes('empadão') || lower.includes('salgado')) icon = '🥟';
            else icon = '🥖';
          }
          else if (lower.includes('fruta') || lower.includes('banana') || lower.includes('abacaxi') || lower.includes('maracujá')) icon = '🍎';
          else if (lower.includes('queijo') || lower.includes('presunto') || lower.includes('ovo')) {
            if (lower.includes('ovo')) icon = '🥚';
            else if (lower.includes('queijo')) icon = '🧀';
            else if (lower.includes('presunto')) icon = '🥓';
            else icon = '🥪';
          }
          else if (lower.includes('leite')) icon = '🥛';
          
          return (
            <span key={i} className="inline-flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm text-xs font-bold text-slate-700 uppercase">
               <span className="text-base">{icon}</span>
               {item}
            </span>
          );
        })}
      </div>
    );
  };

  const isAdminUser = user?.isAdmin || user?.isRefeitorioAdmin;

  const downloadQR = (id: string, name: string, format: 'svg' | 'png' | 'jpeg') => {
    const svg = document.getElementById(id);
    if (!svg) return;
    let baseSvgData = new XMLSerializer().serializeToString(svg);

    // Ensure the SVG string has a valid xmlns attribute
    if (!baseSvgData.includes('xmlns=')) {
      baseSvgData = baseSvgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const finalSvgData = baseSvgData;

    if (format === 'svg') {
      const blob = new Blob([finalSvgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      const blob = new Blob([finalSvgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        const baseWidth = svg.getBoundingClientRect().width || 160;
        const baseHeight = svg.getBoundingClientRect().height || 160;
        
        // Scale to 1024x1024 to make the downloaded QR Code high definition for print and custom artwork
        const targetSize = 1024;
        const scale = targetSize / baseWidth; 
        
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        if (ctx) {
          if (format === 'jpeg') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          
          const dataURL = canvas.toDataURL(`image/${format}`, 1.0);
          const link = document.createElement("a");
          link.href = dataURL;
          link.download = `${name}.${format === 'jpeg' ? 'jpg' : 'png'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        {!user.rg?.toString().toUpperCase().startsWith('RANCHO') ? (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar ao Portal Principal
          </button>
        ) : (
          <button 
            onClick={() => {
              localStorage.removeItem('militar_profile');
              window.location.reload();
            }}
            className="flex items-center gap-2 text-rose-400 hover:text-rose-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Sair
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 lg:p-12 border border-slate-100 shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
        <div className="absolute -top-10 -right-10 text-rose-50 opacity-50 pointer-events-none">
          <UtensilsCrossed className="w-64 h-64" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Refeitório</h1>
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Alimentação e Nutrição</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {activeTab === 'cardapio' && isAdminUser && menu && currentMenuId !== null && (
                <button
                  onClick={() => handleEdit(currentMenuId)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border border-indigo-100 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm"
                  title="Editar Cardápio do Dia"
                >
                  <Settings2 className="w-4 h-4 sm:w-4 sm:h-4" />
                  <span className="inline">Editar Dia</span>
                </button>
              )}
              <button
                onClick={() => setShowQrCode(true)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-md shadow-slate-200"
              >
                <QrCode className="w-4 h-4" />
                <span className="inline">QR Code</span>
              </button>
              
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('cardapio')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'cardapio' ? 'bg-white text-rose-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                >
                  <Utensils className="w-4 h-4" />
                  Cardápio do Dia
                </button>
                {isAdminUser && (
                  <>
                    <button
                      onClick={() => setActiveTab('catalogo')}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'catalogo' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    >
                      <BookOpen className="w-4 h-4" />
                      Catálogo
                    </button>
                    <button
                      onClick={() => setActiveTab('gestao')}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'gestao' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    >
                      <Settings2 className="w-4 h-4" />
                      Gestão Diária
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'cardapio' ? (
            <motion.div
              key={`cardapio-${currentMenuId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="block overflow-x-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner no-scrollbar w-full mb-2">
                <div className="flex gap-1 min-w-max items-center">
                  {visibleMenus.map((item, index) => (
                  <button
                    key={'btn-' + item.originalIndex + '-' + index}
                    onClick={() => setSelectedOriginalIndex(item.originalIndex)}
                    className={`px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${currentMenuId === item.originalIndex ? 'bg-white text-rose-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span translate="no">{item.weekday ? item.weekday.split('-')[0] : ''}</span>
                      <span className="text-[9px] opacity-70">({item.date.split('/')[0]}/{item.date.split('/')[1]})</span>
                    </div>
                  </button>
                ))}
                  {hasMoreFuture && (
                    <button
                      onClick={() => setShowAllFuture(true)}
                      className="px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all text-indigo-500 bg-indigo-50/50 border border-indigo-100/50 hover:bg-indigo-100 hover:border-indigo-200"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>VER MAIS</span>
                        <span className="text-[9px] opacity-70">FUTUROS</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {menu ? (
              <div className="flex flex-col gap-6 lg:gap-8">
                {/* Cabeçalho do Dia Selecionado */}
                <div className="bg-slate-900 rounded-2xl p-4 md:p-6 text-center shadow-lg w-full">
                  <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-widest text-center">
                    <span translate="no">{menu.weekday}</span> <span className="text-rose-400 font-medium">({menu.date})</span>
                  </h2>
                </div>
                
                <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
                  {/* PRIMARY MEALS (Almoço & Jantar) */}
                  <div className="flex-1 flex flex-col gap-6 lg:gap-8">
                    {/* Almoço */}
                    <div className="bg-white rounded-3xl p-6 lg:p-8 border-2 border-rose-100 shadow-md shadow-rose-100/50 flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-rose-50">
                    <div className="flex items-center gap-3 text-rose-600">
                      <Utensils className="w-7 h-7" />
                      <h3 className="font-black uppercase tracking-widest text-xs">Almoço</h3>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Prato Principal */}
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-rose-600/70 mb-1">
                        <ChefHat className="w-5 h-5" />
                        <span className="font-black uppercase tracking-widest text-[10px]">Prato Principal</span>
                      </div>
                      <p className="text-xl md:text-2xl font-black text-rose-950 uppercase tracking-tight leading-tight">
                        {menu?.almoco?.principal || 'Não definido'}
                      </p>
                    </div>

                    {/* Acompanhamentos e Sobremesa */}
                    <div className="flex-1 flex flex-col gap-5 border-t md:border-t-0 md:border-l md:pl-8 border-rose-100 pt-5 md:pt-0">
                      <div className="flex flex-col gap-3">
                        <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Acompanhamentos</span>
                        <div className="flex flex-wrap text-sm font-bold text-slate-700 uppercase">
                          {(menu?.almoco?.acompanhamentos || '').split(',').map((item: string, i: number) => {
                            const trimmed = item.trim();
                            const lower = trimmed.toLowerCase();
                            let icon = '';
                            if (lower.includes('arroz')) icon = '🍚';
                            else if (lower.includes('feijão') || lower.includes('feijão')) icon = '🫘';
                            else if (lower.includes('batata') || lower.includes('purê')) icon = '🥔';
                            else if (lower.includes('macarrão') || lower.includes('espaguete')) icon = '🍝';
                            else if (lower.includes('farofa') || lower.includes('pirão') || lower.includes('polenta')) icon = '🥣';
                            else if (lower.includes('quibebe')) icon = '🎃';
                            
                            return trimmed ? (
                              <span key={i} className="inline-flex items-center gap-1.5 mr-2 mb-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm text-xs">
                                {icon && <span className="text-sm">{icon}</span>}
                                {trimmed}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>

                      {menu?.almoco?.saladas && menu?.almoco?.saladas !== '-' && (
                        <div className="flex flex-col gap-2">
                          <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Saladas</span>
                          <span className="inline-flex items-center gap-1.5 w-max bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold uppercase">
                            <span className="text-sm">🥗</span>
                            {menu?.almoco?.saladas}
                          </span>
                        </div>
                      )}

                      {menu?.almoco?.sobremesa && (
                        <div className="flex flex-col gap-2 mt-auto">
                          <div className="flex items-center gap-1.5 text-rose-600/80">
                            <Grape className="w-4 h-4 shrink-0" />
                            <span className="font-black uppercase tracking-widest text-[10px]">Sobremesa</span>
                          </div>
                          <p className="text-sm font-bold text-rose-900 uppercase">
                            {menu?.almoco?.sobremesa}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Jantar */}
                <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-xl flex flex-col relative overflow-hidden text-white">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3 text-indigo-400">
                      <Sunset className="w-7 h-7" />
                      <h3 className="font-black uppercase tracking-widest text-xs">Jantar</h3>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Prato Principal */}
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-indigo-400/70 mb-1">
                        <ChefHat className="w-5 h-5" />
                        <span className="font-black uppercase tracking-widest text-[10px]">Prato Principal</span>
                      </div>
                      <p className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-tight">
                        {menu?.jantar?.principal || 'Não definido'}
                      </p>
                    </div>

                    {/* Acompanhamentos e Sobremesa */}
                    <div className="flex-1 flex flex-col gap-5 border-t md:border-t-0 md:border-l md:pl-8 border-slate-700/50 pt-5 md:pt-0">
                      <div className="flex flex-col gap-3">
                        <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">Acompanhamentos</span>
                        <div className="flex flex-wrap text-sm font-bold text-slate-200 uppercase">
                          {(menu?.jantar?.acompanhamentos || '').split(',').map((item: string, i: number) => {
                            const trimmed = item.trim();
                            const lower = trimmed.toLowerCase();
                            let icon = '';
                            if (lower.includes('arroz')) icon = '🍚';
                            else if (lower.includes('feijão') || lower.includes('feijão')) icon = '🫘';
                            else if (lower.includes('batata') || lower.includes('purê')) icon = '🥔';
                            else if (lower.includes('macarrão') || lower.includes('espaguete')) icon = '🍝';
                            else if (lower.includes('farofa') || lower.includes('pirão') || lower.includes('polenta')) icon = '🥣';
                            else if (lower.includes('quibebe')) icon = '🎃';
                            
                            return trimmed ? (
                              <span key={i} className="inline-flex items-center gap-1.5 mr-2 mb-2 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
                                {icon && <span className="text-sm">{icon}</span>}
                                {trimmed}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>

                      {menu?.jantar?.saladas && menu?.jantar?.saladas !== '-' && (
                        <div className="flex flex-col gap-2">
                          <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">Saladas</span>
                          <span className="inline-flex items-center gap-1.5 w-max bg-emerald-900/40 text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-800/50 text-xs font-bold uppercase">
                            <span className="text-sm">🥗</span>
                            {menu?.jantar?.saladas}
                          </span>
                        </div>
                      )}

                      {menu?.jantar?.ceia && (
                        <div className="flex flex-col gap-2 mt-auto">
                          <div className="flex items-center gap-1.5 text-indigo-400/80">
                            <Coffee className="w-4 h-4 shrink-0" />
                            <span className="font-black uppercase tracking-widest text-[10px]">Ceia</span>
                          </div>
                          <p className="text-sm font-bold text-indigo-200 uppercase">
                            {menu?.jantar?.ceia}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECONDARY MEALS (Café & Lanche) */}
              <div className="w-full xl:w-72 flex flex-col sm:flex-row xl:flex-col gap-6 lg:gap-8 shrink-0">
                {/* Café da Manhã */}
                <div className="flex-1 bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <Sunrise className="w-5 h-5" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">Café da Manhã</h3>
                  </div>
                  <div className="flex-1">
                    {renderSnackItems(menu.cafeManha)}
                  </div>
                </div>

                {/* Lanche da Tarde */}
                <div className="flex-1 bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-amber-600">
                    <Coffee className="w-5 h-5" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">Lanche da Tarde</h3>
                  </div>
                  <div className="flex-1">
                    {renderSnackItems(menu.lancheTarde)}
                  </div>
                </div>
              </div>
              </div>
            </div>
            ) : (
              <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                <Utensils className="w-12 h-12 mb-4 opacity-50" />
                <p className="uppercase tracking-widest text-xs font-bold">Nenhum cardápio cadastrado para exibição.</p>
              </div>
            )}
            </motion.div>
            ) : activeTab === 'catalogo' && isAdminUser ? (
            <motion.div
              key="catalogo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <div className="flex justify-end">
                {user?.rg === '54444' && (
                <button
                  onClick={() => setConfirmAction({
                    message: "Tem certeza que deseja restaurar o catálogo? Isso organizará os itens antigos em categorias. Seus itens personalizados serão perdidos.",
                    onConfirm: () => restoreDefaultCatalog(),
                  })}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 border border-amber-100"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" /> Restaurar Organização Padrão
                </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {[
                { title: 'Menu de Proteínas', icon: ChefHat, classColor: 'rose', textClass: 'text-rose-600', borderClass: 'border-rose-100/50', focusClass: 'focus:border-rose-400', bgClass: 'bg-rose-600 hover:bg-rose-700', dataKey: 'proteinas', items: catalog.proteinas },
                { title: 'Garnições', icon: UtensilsCrossed, classColor: 'emerald', textClass: 'text-emerald-600', borderClass: 'border-emerald-100/50', focusClass: 'focus:border-emerald-400', bgClass: 'bg-emerald-600 hover:bg-emerald-700', dataKey: 'acompanhamentos', items: catalog.acompanhamentos },
                { title: 'Saladas', icon: Utensils, classColor: 'amber', textClass: 'text-amber-600', borderClass: 'border-amber-100/50', focusClass: 'focus:border-amber-400', bgClass: 'bg-amber-600 hover:bg-amber-700', dataKey: 'saladas', items: catalog.saladas },
                { title: 'Sobremesas', icon: Grape, classColor: 'indigo', textClass: 'text-indigo-600', borderClass: 'border-indigo-100/50', focusClass: 'focus:border-indigo-400', bgClass: 'bg-indigo-600 hover:bg-indigo-700', dataKey: 'sobremesas', items: catalog.sobremesas },
                { title: 'Ceia', icon: Coffee, classColor: 'sky', textClass: 'text-sky-600', borderClass: 'border-sky-100/50', focusClass: 'focus:border-sky-400', bgClass: 'bg-sky-600 hover:bg-sky-700', dataKey: 'ceia', items: catalog.ceia }
              ].map(col => {
                const isHidden = hiddenCatalogs.includes(col.dataKey);
                return (
                <div key={col.dataKey} className={`bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col gap-4 ${isHidden ? '' : 'max-h-[600px]'}`}>
                  <div className={`flex items-center justify-between sticky top-0 bg-slate-50 py-2 z-10 border-b ${col.borderClass}`}>
                    <div className={`flex items-center gap-3 ${col.textClass}`}>
                      <col.icon className="w-5 h-5" />
                      <h3 className="font-black uppercase tracking-widest text-xs">{col.title} ({col.items.length})</h3>
                    </div>
                    <button 
                      onClick={() => setHiddenCatalogs(prev => prev.includes(col.dataKey) ? prev.filter(k => k !== col.dataKey) : [...prev, col.dataKey])}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-200"
                    >
                      {isHidden ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isHidden && (
                    <>
                      <div className="flex gap-2">
                    <form 
                      onSubmit={e => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('newItem') as HTMLInputElement;
                        if (!input.value.trim()) return;
                        const newItems = [...col.items, input.value.trim().toUpperCase()];
                        saveCatalog({...catalog, [col.dataKey]: newItems});
                        input.value = '';
                      }}
                      className="flex gap-2 flex-1 min-w-0"
                    >
                      <input name="newItem" type="text" placeholder="Novo item..." className={`flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-700 outline-none ${col.focusClass}`} />
                      <button type="button" onClick={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()} className={`p-2 ${col.bgClass} text-white rounded-xl transition-colors shrink-0`} title="Cadastrar Item">
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>
                    {addingCategory === col.dataKey ? (
                      <form 
                        onSubmit={e => {
                          e.preventDefault();
                          const input = e.currentTarget.elements.namedItem('newCategory') as HTMLInputElement;
                          const catName = input.value;
                          if (catName && catName.trim()) {
                             const newItems = [...col.items, { isCategory: true, name: catName.trim().toUpperCase(), items: [] }];
                             saveCatalog({...catalog, [col.dataKey]: newItems});
                          }
                          setAddingCategory(null);
                        }}
                        className="flex gap-2 flex-1 min-w-0"
                      >
                        <input autoFocus name="newCategory" type="text" placeholder="Nome da Categoria..." className="flex-1 min-w-0 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-indigo-700 outline-none focus:border-indigo-400" />
                        <button type="button" onClick={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shrink-0">
                           <Save className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setAddingCategory(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors shrink-0">
                           <X className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setAddingCategory(col.dataKey)}
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors shrink-0 border border-indigo-100" 
                        title="Cadastrar Categoria"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 mt-2 overflow-y-auto no-scrollbar flex-1 pb-4">
                    {col.items.map((item: any, idx: number) => {
                      if (typeof item === 'string') {
                        return (
                          <div key={idx} className="group bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-2">
                            <p className="text-[10px] font-bold text-slate-700 uppercase leading-snug">{item}</p>
                            <button 
                              type="button"
                              onClick={() => {
                                setConfirmAction({
                                  message: 'Tem certeza que deseja excluir este item do catálogo?',
                                  onConfirm: () => {
                                    const newItems = col.items.filter((_: any, i: number) => i !== idx);
                                    saveCatalog({...catalog, [col.dataKey]: newItems});
                                  }
                                });
                              }}
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1 rounded-md hover:bg-rose-50 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      } else if (item && item.isCategory) {
                        return (
                          <div key={idx} className="bg-slate-100/50 p-2 sm:p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center justify-between group">
                              <p className="text-[10px] font-black text-indigo-700 uppercase">{item.name}</p>
                              <button 
                                type="button"
                                onClick={() => {
                                  setConfirmAction({
                                    message: 'Excluir esta categoria e todos os seus itens?',
                                    onConfirm: () => {
                                      const newItems = col.items.filter((_: any, i: number) => i !== idx);
                                      saveCatalog({...catalog, [col.dataKey]: newItems});
                                    }
                                  });
                                }}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1 rounded-md hover:bg-rose-50 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                               {item.items.map((subItem: string, subIdx: number) => (
                                  <span key={subIdx} className="bg-white border border-slate-200 group/sub relative text-slate-600 px-2 py-1.5 flex items-center gap-1 rounded-lg text-[9px] font-bold uppercase pr-5 shadow-sm">
                                     {subItem}
                                     <button 
                                       type="button"
                                       onClick={() => {
                                         setConfirmAction({
                                           message: 'Excluir este item da categoria?',
                                           onConfirm: () => {
                                              const newSubItems = item.items.filter((_: any, ii: number) => ii !== subIdx);
                                              const newCatalogCol = [...col.items];
                                              newCatalogCol[idx] = { ...item, items: newSubItems };
                                              saveCatalog({...catalog, [col.dataKey]: newCatalogCol});
                                           }
                                         });
                                       }}
                                       className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
                                     >
                                        <X className="w-2.5 h-2.5" />
                                     </button>
                                  </span>
                                ))}
                            </div>
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                const input = e.currentTarget.elements.namedItem('newSubItem') as HTMLInputElement;
                                if (!input.value.trim()) return;
                                const newSubItems = [...item.items, input.value.trim().toUpperCase()];
                                const newCatalogCol = [...col.items];
                                newCatalogCol[idx] = { ...item, items: newSubItems };
                                saveCatalog({...catalog, [col.dataKey]: newCatalogCol});
                                input.value = '';
                              }}
                              className="flex gap-1 mt-1"
                            >
                              <input name="newSubItem" type="text" placeholder="Adicionar na categoria..." className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold uppercase text-slate-700 outline-none focus:border-indigo-400" />
                              <button type="button" onClick={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()} className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors border border-indigo-100 shrink-0">
                                <Plus className="w-3 h-3" />
                              </button>
                            </form>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                    </>
                  )}
                </div>
                );
              })}
              </div>
            </motion.div>
            ) : activeTab === 'gestao' && isAdminUser ? (
            <motion.div
              key="gestao"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-50 rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-inner flex flex-col gap-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Settings2 className="w-6 h-6" />
                  <h3 className="font-black uppercase tracking-widest text-sm">Gestão de Cardápios</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowReport(true)}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Extrair Relatório
                  </button>
                  <button 
                    onClick={handleAdd}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Refeição
                  </button>
                </div>
              </div>

              {hasMorePast && (
                <div className="flex justify-center mb-0 mt-4">
                  <button 
                    onClick={() => setPastItemsToShow(prev => prev + 10)}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[10px] sm:text-xs rounded-xl shadow-sm transition-colors border border-slate-200"
                  >
                    Ver 10 dias anteriores
                  </button>
                </div>
              )}

              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm mt-4">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50/50">
                      <th className="py-4 px-6 font-black w-40">Data / Dia</th>
                      <th className="py-4 px-6 font-black">Almoço (Principal)</th>
                      <th className="py-4 px-6 font-black">Jantar (Principal)</th>
                      <th className="py-4 px-6 font-black">Lanches</th>
                      <th className="py-4 px-6 font-black text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {visibleMenus.map((m, i) => (
                      <tr key={'row-' + m.originalIndex + '-' + i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6 flex flex-col items-start gap-1">
                          <div className="font-black text-slate-700">{m.date}</div>
                          <div translate="no" className="text-xs font-bold text-slate-400 uppercase tracking-widest">{m.weekday}</div>
                          {m.isEvento && (
                             <div className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Star className="w-2.5 h-2.5" /> Evento</div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-rose-700 font-bold uppercase tracking-tight text-xs flex items-center gap-2">
                             <ChefHat className="w-3.5 h-3.5 opacity-50" />
                             {m.almoco.principal}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 line-clamp-1" title={m.almoco.acompanhamentos}>
                            {m.almoco.acompanhamentos}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-indigo-700 font-bold uppercase tracking-tight text-xs flex items-center gap-2">
                            <ChefHat className="w-3.5 h-3.5 opacity-50" />
                             {m.jantar.principal}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 line-clamp-1" title={m.jantar.acompanhamentos}>
                            {m.jantar.acompanhamentos}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase">
                          <div className="flex items-center gap-1.5 mb-1 truncate max-w-[200px]" title={m.cafeManha}>
                            <Sunrise className="w-3 h-3 text-emerald-500" />
                            {m.cafeManha}
                          </div>
                          <div className="flex items-center gap-1.5 mb-1 truncate max-w-[200px]" title={m.lancheTarde}>
                            <Coffee className="w-3 h-3 text-amber-500" />
                            {m.lancheTarde}
                          </div>
                          {m.jantar?.ceia && (
                            <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={m.jantar.ceia}>
                              <Coffee className="w-3 h-3 text-indigo-500" />
                              {m.jantar.ceia}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(m.originalIndex)}
                              className="p-2 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors bg-white shadow-sm border border-slate-100"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(m.originalIndex)}
                              className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors bg-white shadow-sm border border-slate-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hasMoreFuture && (
                  <div className="flex justify-center p-4">
                    <button 
                      onClick={() => setShowAllFuture(true)}
                      className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs rounded-xl shadow-sm transition-colors border border-slate-200"
                    >
                      Ver Mais {sortedMenus.length - visibleMenus.length - pastItemsToShow} Dias Futuros
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showQrCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQrCode(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className={`bg-white rounded-3xl p-8 w-full shadow-2xl relative flex flex-col items-center text-center max-h-[90vh] overflow-y-auto ${isAdminUser ? 'max-w-3xl' : 'max-w-sm'}`}
            >
              <button
                onClick={() => setShowQrCode(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-6">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Acessos do Refeitório</h2>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8">Escaneie pelo celular</p>
              
              <div className="flex flex-col sm:flex-row gap-8 w-full justify-center px-4">
                {/* QR Code Público */}
                <div className="flex flex-col items-center flex-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-4 h-8 flex items-center text-center">Cardápio do Dia (Militar Comum)</h3>
                  <div className="bg-white p-4 rounded-3xl border-4 border-slate-100 shadow-sm mb-4 inline-flex flex-col items-center gap-3">
                    <QRCodeSVG 
                      id="qrcode-public"
                      value={`${window.location.origin}/cardapio`} 
                      size={160}
                      bgColor={"#ffffff"}
                      fgColor={"#0f172a"}
                      level={"Q"}
                      includeMargin={false}
                    />
                    <div className="flex gap-2 w-full justify-center mt-2 border-t border-slate-100 pt-2">
                      <button onClick={() => downloadQR('qrcode-public', 'refeitorio-qr-publico', 'svg')} className="text-slate-400 hover:text-indigo-600 transition-colors text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1">SVG</button>
                      <button onClick={() => downloadQR('qrcode-public', 'refeitorio-qr-publico', 'png')} className="text-slate-400 hover:text-indigo-600 transition-colors text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1">PNG</button>
                      <button onClick={() => downloadQR('qrcode-public', 'refeitorio-qr-publico', 'jpeg')} className="text-slate-400 hover:text-indigo-600 transition-colors text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1">JPEG</button>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 w-full border border-slate-100 overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 text-center">Link Público</p>
                    <div className="text-[10px] font-bold text-slate-700 truncate select-all text-center">{`${window.location.origin}/cardapio`}</div>
                  </div>
                </div>

                {/* QR Code Admin */}
                {isAdminUser && (
                  <div className="flex flex-col items-center flex-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-700 mb-4 h-8 flex items-center text-center">Administração-Refeitório (Gestão Completa)</h3>
                    <div className="bg-white p-4 rounded-3xl border-4 border-indigo-100 shadow-sm mb-4 inline-flex flex-col items-center gap-3">
                      <QRCodeSVG 
                        id="qrcode-admin"
                        value={`${window.location.origin}/refeitorio`} 
                        size={160}
                        bgColor={"#ffffff"}
                        fgColor={"#4f46e5"}
                        level={"Q"}
                        includeMargin={false}
                      />
                      <div className="flex gap-2 w-full justify-center mt-2 border-t border-indigo-100 pt-2">
                        <button onClick={() => downloadQR('qrcode-admin', 'refeitorio-qr-admin', 'svg')} className="text-indigo-400 hover:text-indigo-600 transition-colors text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1">SVG</button>
                        <button onClick={() => downloadQR('qrcode-admin', 'refeitorio-qr-admin', 'png')} className="text-indigo-400 hover:text-indigo-600 transition-colors text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1">PNG</button>
                        <button onClick={() => downloadQR('qrcode-admin', 'refeitorio-qr-admin', 'jpeg')} className="text-indigo-400 hover:text-indigo-600 transition-colors text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1">JPEG</button>
                      </div>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3 w-full border border-indigo-100 overflow-hidden">
                      <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1 text-center">Link Restrito</p>
                      <div className="text-[10px] font-bold text-indigo-700 truncate select-all text-center">{`${window.location.origin}/refeitorio`}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Gestão/Edição */}
        <AnimatePresence>
          {isEditing && (
            <RefeitorioEditModal 
               onClose={() => setIsEditing(false)} 
               editIndex={editingIndex} 
            />
          )}
        </AnimatePresence>

        {/* Modal de Relatório */}
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 lg:p-8 overflow-y-auto print:bg-white print:p-0"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 max-w-6xl w-full shadow-2xl relative my-4 sm:my-8 mx-auto print:shadow-none print:m-0 print:p-0 print:border-none print:max-w-full"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 print:hidden">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Printer className="w-5 h-5" />
                  </div>
                  Relatório de Cardápios
                </h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                        window.print();
                    }}
                    className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors hidden sm:block"
                    title="Imprimir página visível (Dica: Use paisagem)"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowReport(false)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6 relative z-50 print:hidden">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Início</label>
                    <input 
                      type="date"
                      value={reportStartDate}
                      onChange={e => setReportStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold uppercase text-slate-700 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Fim</label>
                    <input 
                      type="date"
                      value={reportEndDate}
                      onChange={e => setReportEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold uppercase text-slate-700 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                    />
                  </div>
              </div>

              <div className="hidden print:block text-center mb-6">
                <h1 className="text-2xl font-black uppercase">Cardápio do Refeitório</h1>
                <p className="text-sm font-bold text-slate-600 mt-1">Período: {reportStartDate ? new Date(reportStartDate + 'T12:00:00').toLocaleDateString('pt-BR') : '...'} a {reportEndDate ? new Date(reportEndDate + 'T12:00:00').toLocaleDateString('pt-BR') : '...'}</p>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 print:border-slate-300 print:rounded-none">
                <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] sm:text-xs uppercase tracking-widest text-slate-400 bg-slate-50 print:bg-white print:border-slate-800 print:text-black">
                      <th className="py-3 px-4 font-black w-32 border-r border-slate-100 print:border-slate-800">Dia</th>
                      <th className="py-3 px-4 font-black border-r border-slate-100 print:border-slate-800 w-1/4">Almoço</th>
                      <th className="py-3 px-4 font-black border-r border-slate-100 print:border-slate-800 w-1/4">Jantar</th>
                      <th className="py-3 px-4 font-black border-r border-slate-100 print:border-slate-800">Café / Ceia</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {reportMenus.length === 0 ? (
                       <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">Nenhum cardápio encontrado para o período selecionado.</td>
                       </tr>
                    ) : (
                       reportMenus.map((m: any, i: number) => (
                          <tr key={'report-' + m.originalIndex + '-' + i} className="border-b border-slate-100 print:border-slate-800">
                             <td className="py-3 px-4 border-r border-slate-100 print:border-slate-800 align-top">
                                <div className="font-black text-slate-800 whitespace-nowrap">{m.date}</div>
                                <div translate="no" className="text-[9px] font-bold text-slate-500 uppercase">{m.weekday}</div>
                             </td>
                             <td className="py-3 px-4 border-r border-slate-100 print:border-slate-800 align-top">
                                <strong className="text-rose-700 block mb-1">{m.almoco.principal}</strong>
                                <span className="text-slate-600 block line-clamp-2 print:line-clamp-none">{m.almoco.acompanhamentos}</span>
                                <span className="text-slate-500 block text-[10px] mt-1">{m.almoco.saladas}</span>
                                {m.almoco.sobremesa && <span className="text-indigo-600 block text-[10px] font-bold mt-1">Sob: {m.almoco.sobremesa}</span>}
                             </td>
                             <td className="py-3 px-4 border-r border-slate-100 print:border-slate-800 align-top">
                                <strong className="text-indigo-700 block mb-1">{m.jantar.principal}</strong>
                                <span className="text-slate-600 block line-clamp-2 print:line-clamp-none">{m.jantar.acompanhamentos}</span>
                                <span className="text-slate-500 block text-[10px] mt-1">{m.jantar.saladas}</span>
                             </td>
                             <td className="py-3 px-4 border-r border-slate-100 print:border-slate-800 align-top space-y-2">
                                <div>
                                   <strong className="text-emerald-700 block text-[10px]">CAFÉ DA MANHÃ</strong>
                                   <span className="text-slate-600 block line-clamp-2 print:line-clamp-none">{m.cafeManha}</span>
                                </div>
                                <div>
                                   <strong className="text-sky-700 block text-[10px]">CEIA</strong>
                                   <span className="text-slate-600 block line-clamp-2 print:line-clamp-none">{m.jantar.ceia}</span>
                                </div>
                             </td>
                          </tr>
                       ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{confirmAction.message}</h3>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-widest text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmAction.onConfirm();
                    setConfirmAction(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-widest text-xs text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
