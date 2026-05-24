import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Coffee, Utensils, UtensilsCrossed, Sunrise, Sunset, Grape, ChefHat, BookOpen, Settings2, Plus, Edit2, Trash2, QrCode, X, Save, Calendar, Loader2, Printer, Download } from 'lucide-react';
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

interface RefeitorioModuleProps {
  user: UserProfile;
  onBack: () => void;
}

const IMPORT_MENUS_RAW: string = "";

export function RefeitorioModule({ user, onBack }: RefeitorioModuleProps) {
  const [activeTab, setActiveTab] = useState<'cardapio' | 'catalogo' | 'gestao'>('cardapio');
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

  const { menus, catalog, loading, saveMenus, saveCatalog } = useRefeitorioData();

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

  let startIdx = Math.max(0, sortedMenus.length - 7);
  const targetIdx = sortedMenus.findIndex(m => m.time >= todayStart);
  if (targetIdx !== -1) {
    const potentialEnd = Math.min(targetIdx + 6, sortedMenus.length - 1);
    startIdx = Math.max(0, potentialEnd - 6);
  }
  
  const visibleMenus = sortedMenus.slice(startIdx, startIdx + 7);

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
      almoco: { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", sobremesa: "" },
      jantar: { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", ceia: "" },
      lancheTarde: "CAFÉ, SUCO, PIPOCA, PÃO RECHEADO",
      cafeManha: "CAFÉ, PÃO, OVOS, QUEIJO, PRESUNTO"
    });
    setEditingIndex(null);
    setEditingDateValue("");
    setIsCustomDate(false);
    setIsEditing(true);
  };

  const handleEdit = (idx: number) => {
    const item = menus[idx];
    setEditingItem(JSON.parse(JSON.stringify(item)));
    setEditingIndex(idx);
    setIsCustomDate(true); // Default to showing custom date when editing an existing one, unless it matches a suggestion
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
    if (window.confirm('Tem certeza que deseja excluir este cardápio?')) {
      const newMenus = [...menus];
      newMenus.splice(idx, 1);
      saveMenus(newMenus);
      if (currentMenuId === idx) {
        setSelectedOriginalIndex(null);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
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
    
    const menusWithTime = menus.map((m: any) => {
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
      return { ...m, time };
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

    const now = new Date();
    const weekdays = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
    const weekdayStr = weekdays[now.getDay()];
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    let finalSvgData = baseSvgData;

    if (id === 'qrcode-public') {
      finalSvgData = `
<svg width="600" height="800" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e" />
      <stop offset="100%" stop-color="#be123c" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.1" />
    </filter>
  </defs>
  <rect width="600" height="800" fill="#f8fafc" />
  <rect width="600" height="180" fill="url(#roseGrad)" />
  <text x="300" y="70" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff" letter-spacing="4">10º GBM - REFEITÓRIO</text>
  <text x="300" y="110" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="42" fill="#ffffff">CARDÁPIO DO DIA</text>
  
  <rect x="180" y="140" width="240" height="50" rx="25" fill="#ffffff" filter="url(#shadow)" />
  <text x="300" y="173" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#0f172a" letter-spacing="1">${weekdayStr} (${dateStr})</text>
  
  <rect x="120" y="240" width="360" height="360" rx="32" fill="#ffffff" filter="url(#shadow)" stroke="#e2e8f0" stroke-width="2" />
  <g transform="translate(140, 260) scale(2)">
    ${baseSvgData}
  </g>
  
  <text x="300" y="660" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" fill="#0f172a">ESCANEIE O QR CODE</text>
  <text x="300" y="690" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" fill="#64748b">para ver as opções de almoço e jantar hoje</text>
</svg>`.trim();
    } else if (id === 'qrcode-admin') {
      finalSvgData = `
<svg width="600" height="800" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="indGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.1" />
    </filter>
  </defs>
  <rect width="600" height="800" fill="#f8fafc" />
  <rect width="600" height="180" fill="url(#indGrad)" />
  <text x="300" y="70" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff" letter-spacing="4">10º GBM - INTRANET</text>
  <text x="300" y="110" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="40" fill="#ffffff">GESTAO REFEITÓRIO</text>
  
  <rect x="160" y="140" width="280" height="50" rx="25" fill="#ffffff" filter="url(#shadow)" />
  <text x="300" y="173" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#0f172a" letter-spacing="1">ACESSO RESTRITO</text>
  
  <rect x="120" y="240" width="360" height="360" rx="32" fill="#ffffff" filter="url(#shadow)" stroke="#4f46e5" stroke-width="4" />
  <g transform="translate(140, 260) scale(2)">
    ${baseSvgData}
  </g>
  
  <text x="300" y="660" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" fill="#0f172a">ÁREA ADMINISTRATIVA</text>
  <text x="300" y="690" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" fill="#64748b">Apenas Oficiais e Permissões Especiais</text>
</svg>`.trim();
    }

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
        // Base SVG is 600x800 for the cards, or fallback to svg dimensions if it's not our cards
        const isCard = id === 'qrcode-public' || id === 'qrcode-admin';
        const baseWidth = isCard ? 600 : (svg.getBoundingClientRect().width || 160);
        const baseHeight = isCard ? 800 : (svg.getBoundingClientRect().height || 160);
        
        // Scale for high DPI
        const scale = isCard ? 2 : 4; 
        
        canvas.width = baseWidth * scale;
        canvas.height = baseHeight * scale;
        
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
                <div className="flex gap-1 min-w-max">
                  {visibleMenus.map((item) => (
                  <button
                    key={item.originalIndex}
                    onClick={() => setSelectedOriginalIndex(item.originalIndex)}
                    className={`px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${currentMenuId === item.originalIndex ? 'bg-white text-rose-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{item.weekday ? item.weekday.split('-')[0] : 'Novo'}</span>
                      <span className="text-[9px] opacity-70">({item.date.split('/')[0]}/{item.date.split('/')[1]})</span>
                    </div>
                  </button>
                ))}
                </div>
              </div>

              {menu ? (
              <div className="flex flex-col gap-6 lg:gap-8">
                {/* Cabeçalho do Dia Selecionado */}
                <div className="bg-slate-900 rounded-2xl p-4 md:p-6 text-center shadow-lg w-full">
                  <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-widest text-center">
                    {menu.weekday} <span className="text-rose-400 font-medium">({menu.date})</span>
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
                        {menu.almoco.principal || 'Não definido'}
                      </p>
                    </div>

                    {/* Acompanhamentos e Sobremesa */}
                    <div className="flex-1 flex flex-col gap-5 border-t md:border-t-0 md:border-l md:pl-8 border-rose-100 pt-5 md:pt-0">
                      <div className="flex flex-col gap-3">
                        <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Acompanhamentos</span>
                        <div className="flex flex-wrap text-sm font-bold text-slate-700 uppercase">
                          {(menu.almoco.acompanhamentos || '').split(',').map((item, i) => {
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

                      {menu.almoco.saladas && menu.almoco.saladas !== '-' && (
                        <div className="flex flex-col gap-2">
                          <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Saladas</span>
                          <span className="inline-flex items-center gap-1.5 w-max bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold uppercase">
                            <span className="text-sm">🥗</span>
                            {menu.almoco.saladas}
                          </span>
                        </div>
                      )}

                      {menu.almoco.sobremesa && (
                        <div className="flex flex-col gap-2 mt-auto">
                          <div className="flex items-center gap-1.5 text-rose-600/80">
                            <Grape className="w-4 h-4 shrink-0" />
                            <span className="font-black uppercase tracking-widest text-[10px]">Sobremesa</span>
                          </div>
                          <p className="text-sm font-bold text-rose-900 uppercase">
                            {menu.almoco.sobremesa}
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
                        {menu.jantar.principal || 'Não definido'}
                      </p>
                    </div>

                    {/* Acompanhamentos e Sobremesa */}
                    <div className="flex-1 flex flex-col gap-5 border-t md:border-t-0 md:border-l md:pl-8 border-slate-700/50 pt-5 md:pt-0">
                      <div className="flex flex-col gap-3">
                        <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">Acompanhamentos</span>
                        <div className="flex flex-wrap text-sm font-bold text-slate-200 uppercase">
                          {(menu.jantar.acompanhamentos || '').split(',').map((item, i) => {
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

                      {menu.jantar.saladas && menu.jantar.saladas !== '-' && (
                        <div className="flex flex-col gap-2">
                          <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">Saladas</span>
                          <span className="inline-flex items-center gap-1.5 w-max bg-emerald-900/40 text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-800/50 text-xs font-bold uppercase">
                            <span className="text-sm">🥗</span>
                            {menu.jantar.saladas}
                          </span>
                        </div>
                      )}

                      {menu.jantar.ceia && (
                        <div className="flex flex-col gap-2 mt-auto">
                          <div className="flex items-center gap-1.5 text-indigo-400/80">
                            <Coffee className="w-4 h-4 shrink-0" />
                            <span className="font-black uppercase tracking-widest text-[10px]">Ceia</span>
                          </div>
                          <p className="text-sm font-bold text-indigo-200 uppercase">
                            {menu.jantar.ceia}
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
            >
              {[
                { title: 'Menu de Proteínas', icon: ChefHat, classColor: 'rose', textClass: 'text-rose-600', borderClass: 'border-rose-100/50', focusClass: 'focus:border-rose-400', bgClass: 'bg-rose-600 hover:bg-rose-700', dataKey: 'proteinas', items: catalog.proteinas },
                { title: 'Garnições', icon: UtensilsCrossed, classColor: 'emerald', textClass: 'text-emerald-600', borderClass: 'border-emerald-100/50', focusClass: 'focus:border-emerald-400', bgClass: 'bg-emerald-600 hover:bg-emerald-700', dataKey: 'acompanhamentos', items: catalog.acompanhamentos },
                { title: 'Saladas', icon: Utensils, classColor: 'amber', textClass: 'text-amber-600', borderClass: 'border-amber-100/50', focusClass: 'focus:border-amber-400', bgClass: 'bg-amber-600 hover:bg-amber-700', dataKey: 'saladas', items: catalog.saladas },
                { title: 'Sobremesas', icon: Grape, classColor: 'indigo', textClass: 'text-indigo-600', borderClass: 'border-indigo-100/50', focusClass: 'focus:border-indigo-400', bgClass: 'bg-indigo-600 hover:bg-indigo-700', dataKey: 'sobremesas', items: catalog.sobremesas },
                { title: 'Ceia', icon: Coffee, classColor: 'sky', textClass: 'text-sky-600', borderClass: 'border-sky-100/50', focusClass: 'focus:border-sky-400', bgClass: 'bg-sky-600 hover:bg-sky-700', dataKey: 'ceia', items: catalog.ceia }
              ].map(col => (
                <div key={col.dataKey} className={`bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col gap-4 max-h-[600px]`}>
                  <div className={`flex items-center gap-3 ${col.textClass} sticky top-0 bg-slate-50 py-2 z-10 border-b ${col.borderClass}`}>
                    <col.icon className="w-5 h-5" />
                    <h3 className="font-black uppercase tracking-widest text-xs">{col.title} ({col.items.length})</h3>
                  </div>
                  <form 
                    onSubmit={e => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('newItem') as HTMLInputElement;
                      if (!input.value.trim()) return;
                      const newItems = [...col.items, input.value.trim().toUpperCase()];
                      saveCatalog({...catalog, [col.dataKey]: newItems});
                      input.value = '';
                    }}
                    className="flex gap-2"
                  >
                    <input name="newItem" type="text" placeholder="Novo item..." className={`flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-700 outline-none ${col.focusClass}`} />
                    <button type="submit" className={`p-2 ${col.bgClass} text-white rounded-xl transition-colors`}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                  <div className="flex flex-col gap-2 mt-2 overflow-y-auto no-scrollbar flex-1 pb-4">
                    {col.items.map((item: string, idx: number) => (
                      <div key={idx} className="group bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold text-slate-700 uppercase leading-snug">{item}</p>
                        <button 
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja excluir este item do catálogo?')) {
                              const newItems = col.items.filter((_, i) => i !== idx);
                              saveCatalog({...catalog, [col.dataKey]: newItems});
                            }
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1 rounded-md hover:bg-rose-50 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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

              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
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
                    {visibleMenus.map((m) => (
                      <tr key={m.originalIndex} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="font-black text-slate-700">{m.date}</div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{m.weekday}</div>
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
        {isEditing && editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 lg:p-8 overflow-y-auto"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 max-w-4xl w-full shadow-2xl relative my-4 sm:my-8 mx-auto"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  {editingIndex !== null ? 'Editar Refeição' : 'Nova Refeição'}
                </h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                     <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Refeição</label>
                        <button 
                           type="button" 
                           onClick={() => setIsCustomDate(!isCustomDate)}
                           className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase"
                        >
                           {isCustomDate ? 'Usar Sugestões' : 'Informar Outra Data'}
                        </button>
                     </div>
                     {!isCustomDate ? (
                        <div className="relative">
                           <select
                              value={editingDateValue}
                              onChange={e => {
                                 const val = e.target.value;
                                 setEditingDateValue(val);
                                 if (val) {
                                    const opt = suggestedDates.find(d => d.value === val);
                                    if (opt) {
                                       setEditingItem({
                                          ...editingItem,
                                          date: opt.dateKey,
                                          weekday: opt.weekday
                                       });
                                    }
                                 }
                              }}
                              required={!isCustomDate}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold uppercase text-slate-700 appearance-none outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                           >
                              <option value="" disabled>Selecione uma data sugerida...</option>
                              {suggestedDates.map(d => (
                                 <option key={d.value} value={d.value}>{d.label}</option>
                              ))}
                           </select>
                           <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                     ) : (
                        <div className="relative">
                          <input 
                            type="date"
                            value={editingDateValue}
                            onChange={e => {
                              const val = e.target.value;
                              setEditingDateValue(val);
                              if (val) {
                                 const [y, m, d] = val.split('-');
                                 const dat = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
                                 const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
                                 setEditingItem({
                                   ...editingItem,
                                   date: `${d}/${m}`,
                                   weekday: weekdays[dat.getDay()]
                                 });
                              }
                            }} 
                            required={isCustomDate}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold uppercase text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                          />
                        </div>
                     )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Almoço */}
                  <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 flex flex-col gap-4">
                    <h4 className="text-rose-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                       <Utensils className="w-4 h-4" /> Almoço
                    </h4>
                    
                    <div>
                      <label className="block text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1.5 ml-1">Prato Principal</label>
                      <TagInput value={editingItem.almoco.principal} onChange={val => setEditingItem({...editingItem, almoco: {...editingItem.almoco, principal: val}})} suggestions={catalog.proteinas} className="border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-100 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1.5 ml-1">Acompanhamentos</label>
                      <TagInput value={editingItem.almoco.acompanhamentos} onChange={val => setEditingItem({...editingItem, almoco: {...editingItem.almoco, acompanhamentos: val}})} suggestions={catalog.acompanhamentos} className="border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-100 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1.5 ml-1">Saladas</label>
                      <TagInput value={editingItem.almoco.saladas} onChange={val => setEditingItem({...editingItem, almoco: {...editingItem.almoco, saladas: val}})} suggestions={catalog.saladas} className="border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-100 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1.5 ml-1">Sobremesa</label>
                      <TagInput value={editingItem.almoco.sobremesa} onChange={val => setEditingItem({...editingItem, almoco: {...editingItem.almoco, sobremesa: val}})} suggestions={catalog.sobremesas} className="border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-100 bg-white" />
                    </div>
                  </div>

                  {/* Jantar */}
                  <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex flex-col gap-4">
                    <h4 className="text-indigo-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                       <Sunset className="w-4 h-4" /> Jantar
                    </h4>
                    
                    <div>
                      <label className="block text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1.5 ml-1">Prato Principal</label>
                      <TagInput value={editingItem.jantar.principal} onChange={val => setEditingItem({...editingItem, jantar: {...editingItem.jantar, principal: val}})} suggestions={catalog.proteinas} className="border-indigo-200 focus-within:border-indigo-400 focus-within:ring-indigo-100 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1.5 ml-1">Acompanhamentos</label>
                      <TagInput value={editingItem.jantar.acompanhamentos} onChange={val => setEditingItem({...editingItem, jantar: {...editingItem.jantar, acompanhamentos: val}})} suggestions={catalog.acompanhamentos} className="border-indigo-200 focus-within:border-indigo-400 focus-within:ring-indigo-100 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1.5 ml-1">Saladas</label>
                      <TagInput value={editingItem.jantar.saladas} onChange={val => setEditingItem({...editingItem, jantar: {...editingItem.jantar, saladas: val}})} suggestions={catalog.saladas} className="border-indigo-200 focus-within:border-indigo-400 focus-within:ring-indigo-100 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1.5 ml-1">Ceia</label>
                      <TagInput value={editingItem.jantar.ceia} onChange={val => setEditingItem({...editingItem, jantar: {...editingItem.jantar, ceia: val}})} suggestions={catalog.ceia} className="border-indigo-200 focus-within:border-indigo-400 focus-within:ring-indigo-100 bg-white" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1"><Sunrise className="w-3 h-3" /> Café da Manhã</label>
                    <TagInput value={editingItem.cafeManha} onChange={val => setEditingItem({...editingItem, cafeManha: val})} suggestions={['CAFÉ', 'PÃO', 'OVOS', 'QUEIJO', 'PRESUNTO', 'FRUTAS', 'BOLO']} className="border-emerald-200 focus-within:border-emerald-400 focus-within:ring-emerald-100 bg-white" />
                  </div>
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1"><Coffee className="w-3 h-3" /> Lanche da Tarde</label>
                    <TagInput value={editingItem.lancheTarde} onChange={val => setEditingItem({...editingItem, lancheTarde: val})} suggestions={['CAFÉ', 'SUCO', 'PIPOCA', 'PÃO RECHEADO', 'BOLO DE BANANA', 'BOLO DE ABACAXI']} className="border-amber-200 focus-within:border-amber-400 focus-within:ring-amber-100 bg-white" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-slate-100">
                   <button 
                     type="button"
                     onClick={() => setIsEditing(false)}
                     className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit"
                     className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-md shadow-slate-200 transition-all"
                   >
                     <Save className="w-4 h-4" />
                     Salvar Refeição
                   </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

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
                       reportMenus.map((m: any) => (
                          <tr key={m.originalIndex} className="border-b border-slate-100 print:border-slate-800">
                             <td className="py-3 px-4 border-r border-slate-100 print:border-slate-800 align-top">
                                <div className="font-black text-slate-800 whitespace-nowrap">{m.date}</div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase">{m.weekday}</div>
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
    </div>
  );
}
