import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, X, Image as ImageIcon } from 'lucide-react';
import { RankInsignia } from './RankInsignia';
import { parseRank } from '../lib/rankUtils';
import { formatMilitaryName } from '../lib/utils';

export function EscalaPrintView({
  selectedDate,
  identifiedAla,
  baseRoster,
  permutasOut,
  militars,
  selectedFunctions,
  viaturasInfo,
  onClose
}: any) {
  const [showVisualMode, setShowVisualMode] = useState(false);

  // Helper to get active viaturas dynamically
  const getActiveVtr = (prefix: string, index: number = 0) => {
     if (!viaturasInfo) return prefix;
     const activeVtrs = viaturasInfo.filter((v: any) => (v.exibir ?? v.ativa) && (prefix === 'AR' ? v.vtr.startsWith('AR-') : v.vtr.startsWith(prefix)));
     if (activeVtrs.length > index) return activeVtrs[index].vtr;
     return `${prefix}-???`; 
  };

  // Determine color class based on Ala
  const getPrintColor = (ala: number | string) => {
    const alaStr = ala?.toString().toUpperCase();
    if (alaStr === 'EXP') return 'bg-slate-200';
    const alaNum = typeof ala === 'string' ? parseInt(ala) : ala;
    switch (alaNum) {
      case 1: return 'bg-emerald-200';
      case 2: return 'bg-rose-200';
      case 3: return 'bg-blue-200';
      case 4: return 'bg-amber-200';
      default: return 'bg-gray-200';
    }
  };
  const headerColorClass = getPrintColor(identifiedAla);
  
  // Helpers to get militars by function
  const getByFunc = (funcName: string) => {
    return baseRoster.filter((m: any) => {
      const rg = m.rg || '';
      const funcs = selectedFunctions[rg] || [];
      return funcs.includes(funcName);
    }).map((m: any) => {
      const rg = m.rg || '';
      const isSwapped = permutasOut.has(rg);
      const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(rg).substituteRg) || m) : m;
      return actualMilitar;
    });
  };

  const renderMilitar = (militar: any) => {
    if (!militar) return '';
    if (showVisualMode) {
      return (
        <div className="flex items-center gap-1">
          <div className="origin-left shrink-0 opacity-80">
            <RankInsignia rankStr={militar.rank} className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left justify-center min-w-0">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-[2px] whitespace-nowrap">{parseRank(militar.rank)}</span>
            <span className="text-[11px] font-black uppercase tracking-tight text-slate-800 leading-none truncate block">{militar.warName?.toUpperCase() || formatMilitaryName(militar.name || "")}</span>
          </div>
        </div>
      );
    }
    return `${militar.rank} ${militar.warName || militar.name.split(' ')[0]}`;
  };

  
  let usedMilitars = new Set<string>();
  const getVtrByPrefix = (prefix: string, index: number = 0) => {
     if (!viaturasInfo) return null;
     const activeVtrs = viaturasInfo.filter((v: any) => (v.exibir ?? v.ativa) && (prefix === 'AR' ? v.vtr.startsWith('AR-') : v.vtr.startsWith(prefix)));
     return activeVtrs[index] || null;
  };

  const getSlotName = (v: any, slot: string, defaultName: string) => {
     if (!v) return defaultName;
     if (v.customNames?.[slot]?.trim()) {
        const custom = v.customNames[slot].trim().toUpperCase();
        const sigla = (v.vtr || "").split('-')[0].trim();
        if (slot === 'cg' && custom === 'CHEFE') return `CHEFE-${sigla}`;
        return `${custom} ${sigla}`.trim();
     }
     return defaultName;
  };

  const getVtrSlotMilitar = (v: any, slot: string, defaultName: string) => {
     if (!v || v[slot] === false || v.blocked?.includes(slot)) return null;
     const funcName = getSlotName(v, slot, defaultName);
     const candidates = getByFunc(funcName);
     const unused = candidates.find((m: any) => !usedMilitars.has(m.rg));
     if (unused) {
        usedMilitars.add(unused.rg);
        return unused;
     }
     return null;
  };

  const renderVtrSlot = (v: any, slot: string, defaultName: string, fallbackLabel: string, forceRender = false, invisible = false) => {
     if (!forceRender && (!v || v[slot] === false || v.blocked?.includes(slot))) return null;
     const m = getVtrSlotMilitar(v, slot, defaultName);
     const label = getSlotName(v, slot, defaultName);
     // Shorten label if it's too long, or just use it.
     const displayLabel = v?.customNames?.[slot] ? v.customNames[slot].substring(0, 15) : fallbackLabel;
     
     return (
       <div className={`flex gap-1 items-center min-h-[20px] ${invisible ? 'opacity-0' : ''}`}>
         <span className="font-bold shrink-0">{displayLabel}:</span> 
         <span className="truncate">{renderMilitar(m)}</span>
       </div>
     );
  };


  const adminRoles = {
    'ADJUNTO:': getByFunc('ADJUNTO'),
    'ENCARREGADO DE MOTORIS:': getByFunc('ENCARREGADO DE MOTORISTA'),
    'RESP. P/ FAXINA:': getByFunc('RESP FAXINA'),
    'SGT DE DIA:': getByFunc('SGT DIA'),
    'CMT DA GUARDA:': getByFunc('CMT GUARDA'),
  };

  const adminRolesRight = [
    { label: 'DIA AO DEPÓSITO:', value: getByFunc('DIA AO DEPOSITO')[0] },
    { label: 'DIA AO DEPÓSITO:', value: getByFunc('DIA AO DEPOSITO')[1] },
    { label: 'ABASTECEDOR:', value: getByFunc('ABASTECEDOR')[0] },
    { label: 'CB DE DIA:', value: getByFunc('CB DIA')[0] },
    { label: 'CB DA GUARDA:', value: getByFunc('CB GUARDA')[0] },
  ];

  const comunicantes = getByFunc('COMUNICANTE');
  const auxRancho = getByFunc('AUXILIAR RANCHO');
  const toqueFogo = getByFunc('TOQUE DE FOGO');

  const dateStr = selectedDate ? format(new Date(`${selectedDate}T12:00:00`), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase() : '';
  const shortDateStr = selectedDate ? format(new Date(`${selectedDate}T12:00:00`), "dd/MM/yyyy") : '';

  const renderInativaMsg = () => (
     <div className="flex-1 flex flex-col items-center justify-center text-center font-black text-slate-500 px-2 leading-tight py-4 opacity-60">
        <span>INATIVA NO SERVIÇO</span>
        <span className="text-[10px]">({shortDateStr})</span>
     </div>
  );

  // Get active members list
  const activeMembersList = baseRoster.map((m: any) => {
      const rg = m.rg || '';
      const isSwapped = permutasOut.has(rg);
      const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(rg).substituteRg) || m) : m;
      return { rg: actualMilitar.rg, militar: actualMilitar, label: `${actualMilitar.rank} ${actualMilitar.warName || actualMilitar.name.split(' ')[0]}` };
  });

  const permutasAtivas = Array.from(permutasOut.values()).map((p: any) => {
     const sub = militars.find((x:any) => x.rg === p.substituteRg);
     const req = militars.find((x:any) => x.rg === p.requesterRg);
     return { req, sub, text: `Sai: ${req?.rank} ${req?.warName || req?.name} - Entra: ${sub?.rank} ${sub?.warName || sub?.name}` };
  });

  return (
    <div className="fixed inset-0 bg-slate-800/80 z-[200] overflow-y-auto print:absolute print:inset-0 print:bg-white print:z-[9999] print:block">
      <div className="max-w-[1200px] mx-auto bg-white min-h-screen my-8 print:my-0 shadow-2xl print:shadow-none print:w-full print:max-w-none relative p-8 print:p-0 text-black font-sans text-[11px] leading-tight flex flex-col">
        
        {/* Actions - hidden in print */}
        <div className="absolute top-4 right-4 flex items-center gap-2 print:hidden">
           <button onClick={() => setShowVisualMode(!showVisualMode)} className="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-300">
             <ImageIcon className="w-4 h-4" /> {showVisualMode ? 'Modo Texto' : 'Modo Visual'}
           </button>
           <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-500">
             <Printer className="w-4 h-4" /> Imprimir
           </button>
           <button onClick={onClose} className="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-300">
             <X className="w-4 h-4" /> Fechar
           </button>
        </div>

        {/* HEADER */}
        <div className="flex w-full mb-2 border-b border-black pb-2 mt-8 print:mt-0">
           <div className="w-1/4 text-center border-r border-black pr-2 flex flex-col justify-end">
              <span className="mb-8 font-bold text-sm">VISTO</span>
              <span className="border-t border-black w-3/4 mx-auto pt-1 font-bold">Ch. SaD</span>
           </div>
           <div className="w-3/4 text-center flex flex-col justify-center items-center font-bold pl-2 text-[12px]">
              <span>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</span>
              <span>COMANDO DE BOMBEIROS DA COSTA VERDE</span>
              <span>DÉCIMO GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS</span>
              <div className="flex justify-between w-full mt-4 text-sm px-16">
                 <span>ESCALA DE SERVIÇO PARA O DIA:</span>
                 <span>{dateStr}</span>
              </div>
           </div>
        </div>
        <div className="font-bold flex flex-col mb-2 uppercase text-xs">
            <span>OFICIAL DE DIA E PRONTIDÃO:</span>
            <span>OFICIAL DA NÁUTICA:</span>
            <span>OFICIAL MÉDICO:</span>
        </div>

        {/* VIATURAS TABLE */}
        <table className="w-full border-collapse border-2 border-black text-left mb-2 table-fixed text-[11px]">
           <thead>
              <tr className={`${headerColorClass} font-bold border-b-2 border-black text-center text-xs`}>
                 <th className="border-2 border-black py-1 px-1">{getActiveVtr('ABT')}</th>
                 <th className="border-2 border-black py-1 px-1">{getActiveVtr('ABSL')}</th>
                 <th className="border-2 border-black py-1 px-1">{getActiveVtr('ASE')}</th>
                 <th className="border-2 border-black py-1 px-1">{getActiveVtr('ARC')}</th>
                 <th className="border-2 border-black py-1 px-1">{getActiveVtr('L-')}</th>
              </tr>
           </thead>
           
            <tbody>
              <tr>
                 {/* ABT */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       {(() => { const v = getVtrByPrefix('ABT'); return v && !v.ativa && (v.exibir ?? v.ativa) ? renderInativaMsg() : <>
                          {renderVtrSlot(v, 'cg', 'CHEFE ABT', 'CG')}
                          {renderVtrSlot(v, 'g1', 'AUXILIAR ABT', 'P1')}
                          {renderVtrSlot(v, 'g2', 'AUXILIAR ABT', 'P2')}
                          {renderVtrSlot(v, 'g3', 'AUXILIAR ABT', 'P3')}
                          {renderVtrSlot(v, 'g4', 'AUXILIAR ABT', 'P4')}
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR ABT', 'Mot')}
                       </>})()}
                    </div>
                 </td>
                 {/* ABSL */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       {(() => { const v = getVtrByPrefix('ABSL'); return v && !v.ativa && (v.exibir ?? v.ativa) ? renderInativaMsg() : <>
                          {renderVtrSlot(v, 'cg', 'CHEFE ABSL', 'CG')}
                          {renderVtrSlot(v, 'g1', 'AUXILIAR ABSL', 'Guarnição')}
                          {renderVtrSlot(v, 'g2', 'AUXILIAR ABSL', 'Guarnição')}
                          {renderVtrSlot(v, 'g3', 'AUXILIAR ABSL', 'Guarnição')}
                          {renderVtrSlot(v, 'g4', 'AUXILIAR ABSL', 'Guarnição')}
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR ABSL', 'Mot')}
                       </>})()}
                    </div>
                 </td>
                 {/* ASE */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       {(() => { const v = getVtrByPrefix('ASE'); return v && !v.ativa && (v.exibir ?? v.ativa) ? renderInativaMsg() : <>
                          {renderVtrSlot(v, 'g1', 'ENFERMEIRO', 'Enfermeiro(a)')}
                          {renderVtrSlot(v, 'g2', 'ENFERMEIRO', 'Enfermeiro(a)')}
                          {renderVtrSlot(v, 'g3', 'AUXILIAR ASE', 'Auxiliar')}
                          {renderVtrSlot(v, 'g4', 'AUXILIAR ASE', 'Auxiliar')}
                          {renderVtrSlot(v, 'cg', 'CHEFE ASE', 'CG')}
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR ASE', 'Mot')}
                       </>})()}
                    </div>
                 </td>
                 {/* ARC & AR */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px]">
                       <div className="p-2 flex-1 flex flex-col justify-between">
                       {(() => { const v = getVtrByPrefix('ARC'); return v && !v.ativa && (v.exibir ?? v.ativa) ? renderInativaMsg() : <>
                          {renderVtrSlot(v, 'cg', 'AUXILIAR / CHEFE ARC', 'Guarnição')}
                          {renderVtrSlot(v, 'g1', 'AUXILIAR / CHEFE ARC', 'Guarnição')}
                          {renderVtrSlot(v, 'g2', 'AUXILIAR / CHEFE ARC', 'Guarnição')}
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR ARC', 'Mot')}
                       </>})()}
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5 mt-auto`}>{getActiveVtr('AR')}</div>
                       <div className="p-2 flex flex-col justify-end">
                       {(() => { const v = getVtrByPrefix('AR'); return v && !v.ativa && (v.exibir ?? v.ativa) ? renderInativaMsg() : <>
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR AR', 'Mot', true)}
                       </>})()}
                       </div>
                    </div>
                 </td>
                 {/* L-09 & BIA */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px]">
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                       {(() => { const v = getVtrByPrefix('L-'); return v && !v.ativa && (v.exibir ?? v.ativa) ? renderInativaMsg() : <>
                          {renderVtrSlot(v, 'condutor', 'MESTRE AL', 'MS', true)}
                          {renderVtrSlot(v, 'g1', 'MARINHEIRO', 'MN', true)}
                          {renderVtrSlot(v, 'g2', 'MARINHEIRO', 'MN')}
                       </>})()}
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5`}>{getActiveVtr('BIA', 0)}</div>
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                       {(() => { const v = getVtrByPrefix('BIA', 0); return v && !v.ativa && (v.exibir ?? v.ativa) ? renderInativaMsg() : <>
                          {renderVtrSlot(v, 'condutor', 'MESTRE BIA', 'MS', true)}
                          {renderVtrSlot(v, 'g1', 'MARINHEIRO', 'MN', true)}
                          {renderVtrSlot(v, 'g2', 'MARINHEIRO', 'MN')}
                       </>})()}
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5`}>{getActiveVtr('BIA', 1)}</div>
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                       {(() => { const v = getVtrByPrefix('BIA', 1); return v && !v.ativa && (v.exibir ?? v.ativa) ? renderInativaMsg() : <>
                          {renderVtrSlot(v, 'condutor', 'MESTRE BIA', 'MS', true)}
                          {renderVtrSlot(v, 'g1', 'MARINHEIRO', 'MN')}
                       </>})()}
                       </div>
                    </div>
                 </td>
              </tr>
            </tbody>

        </table>

        {/* ADMIN ROLES */}
        <div className="flex border-2 border-black mb-2 p-1 font-bold uppercase min-h-[90px] text-xs">
           <div className="w-1/2 flex flex-col gap-1 pr-4">
              {Object.entries(adminRoles).map(([k, v]) => (
                <div key={k} className="flex gap-2 w-full items-center min-h-[20px]">
                   <span className="w-[180px] shrink-0">{k}</span>
                   <span className="font-normal truncate">{renderMilitar(v[0])}</span>
                </div>
              ))}
           </div>
           <div className="w-1/2 flex flex-col gap-1">
              {adminRolesRight.map((item, idx) => (
                <div key={idx} className="flex gap-2 w-full items-center min-h-[20px]">
                   <span className="w-[140px] shrink-0">{item.label}</span>
                   <span className="font-normal truncate">{renderMilitar(item.value)}</span>
                </div>
              ))}
           </div>
        </div>

        {/* SENTINELAS & COMUNICANTES */}
        <table className="w-full border-collapse border-2 border-black text-center mb-2 table-fixed">
           <thead>
              <tr className={`${headerColorClass} font-bold border-b-2 border-black`}>
                 <th className="border-r border-black p-1 uppercase w-[40%] text-left pl-2" colSpan={2}>SENTINELAS: <span className="ml-8">GUARDA NORTE</span></th>
                 <th className="border-r border-black p-1 uppercase w-[40%] text-left pl-2" colSpan={2}>SENTINELAS:</th>
                 <th className="p-1 uppercase w-[20%] border-black border-l-2">COMUNICANTE 1:</th>
              </tr>
           </thead>
           <tbody className="text-left font-bold uppercase">
              <tr>
                 <td className="border-r border-black p-1 pl-2 w-8 text-center border-b">1º</td>
                 <td className="border-r border-black p-1 text-center font-normal border-b">6 às 8 / 14 às 16 / 22 às 00:00</td>
                 <td className="border-r border-black p-1 pl-2 w-8 text-center border-b">1º</td>
                 <td className="border-r border-black p-1 text-center font-normal border-b">6 às 7:30 / 12 às 13:30</td>
                 <td className="border-l-2 border-black p-1 font-normal text-center border-b truncate" rowSpan={2}><div className="flex justify-center">{renderMilitar(comunicantes[0])}</div></td>
              </tr>
              <tr>
                 <td className="border-r border-black p-1 pl-2 text-center border-b">2º</td>
                 <td className="border-r border-black p-1 text-center font-normal border-b">8 às 10 / 16 às 18 / 00 às 02:00</td>
                 <td className="border-r border-black p-1 pl-2 text-center border-b">2º</td>
                 <td className="border-r border-black p-1 text-center font-normal border-b">7:30 às 9 / 13:30 às 15</td>
              </tr>
              <tr>
                 <td className="border-r border-black p-1 pl-2 text-center border-b">3º</td>
                 <td className="border-r border-black p-1 text-center font-normal border-b">10 às 12 / 18 às 20 / 02 às 04:00</td>
                 <td className="border-r border-black p-1 pl-2 text-center border-b">3º</td>
                 <td className="border-r border-black p-1 text-center font-normal border-b">9 às 10:30 / 15 às 16:30</td>
                 <td className={`border-y-2 border-l-2 border-black p-1 ${headerColorClass} font-bold text-center`}>COMUNICANTE 2:</td>
              </tr>
              <tr>
                 <td className="border-r border-black p-1 pl-2 text-center border-b">4º</td>
                 <td className="border-r border-black p-1 text-center font-normal border-b">12 às 14 / 20 às 22 / 04 às 06:00</td>
                 <td className="border-r border-black p-1 pl-2 text-center border-b">4º</td>
                 <td className="border-r border-black p-1 text-center font-normal border-b">10:30 às 12/16:30 às 18</td>
                 <td className="border-l-2 border-black p-1 font-normal text-center border-b truncate"><div className="flex justify-center">{renderMilitar(comunicantes[1])}</div></td>
              </tr>
              <tr className={`${headerColorClass} font-bold border-t-2 border-black`}>
                 <td className="border-r border-black p-1 text-center uppercase" colSpan={1}>AUX. RANCHO:</td>
                 <td className="border-r border-black p-1 font-normal bg-white text-center truncate">
                   <div className="flex items-center justify-center gap-2">
                     {auxRancho.map((m: any, i: number) => <React.Fragment key={i}>{i > 0 && <span>/</span>}{renderMilitar(m)}</React.Fragment>)}
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center uppercase" colSpan={1}>Toque de Fogo:</td>
                 <td className="border-black p-1 font-normal bg-white text-center truncate" colSpan={2}>
                   <div className="flex items-center justify-center gap-2">
                     {toqueFogo.map((m: any, i: number) => <React.Fragment key={i}>{i > 0 && <span>/</span>}{renderMilitar(m)}</React.Fragment>)}
                   </div>
                 </td>
              </tr>
           </tbody>
        </table>

        {/* PERMUTAS AUTORIZADAS */}
        <div className="border-2 border-black mb-2 flex flex-col min-h-[60px]">
           <div className={`${headerColorClass} border-b border-black font-bold uppercase text-center p-1`}>
              PERMUTAS AUTORIZADAS:
           </div>
           <div className="p-2 flex flex-wrap gap-4">
              {permutasAtivas.map((p: any, idx: number) => (
                 <div key={idx} className="uppercase text-[10px] flex items-center gap-2">
                   <span className="font-bold">Sai:</span> {renderMilitar(p.req)} <span className="font-bold ml-2">Entra:</span> {renderMilitar(p.sub)}
                 </div>
              ))}
           </div>
        </div>

        {/* CHAMADA GERAL */}
        <table className="w-full border-collapse border-2 border-black text-left table-fixed text-[10px]">
           <thead>
              <tr className={`${headerColorClass} font-bold border-b-2 border-black`}>
                 <th className="border-r border-black p-1 text-center uppercase" colSpan={3}>CHAMADA GERAL</th>
                 <th className="p-1 text-center w-16 uppercase">PROG</th>
              </tr>
           </thead>
           <tbody>
              {Array.from({ length: Math.max(Math.ceil(activeMembersList.length / 3), 9) }).map((_, i) => {
                 const colLen = Math.max(Math.ceil(activeMembersList.length / 3), 9);
                 const m1 = activeMembersList[i] || null;
                 const m2 = activeMembersList[i + colLen] || null;
                 const m3 = activeMembersList[i + colLen * 2] || null;
                 return (
                    <tr key={i}>
                       <td className="border-r border-b border-black p-0.5 px-2 truncate">
                          {m1 ? <div className="flex gap-1 items-center min-h-[20px]"><span className="shrink-0">{m1.rg} -</span> <span className="truncate">{renderMilitar(m1.militar)}</span></div> : ''}
                       </td>
                       <td className="border-r border-b border-black p-0.5 px-2 truncate">
                          {m2 ? <div className="flex gap-1 items-center min-h-[20px]"><span className="shrink-0">{m2.rg} -</span> <span className="truncate">{renderMilitar(m2.militar)}</span></div> : ''}
                       </td>
                       <td className="border-r border-b border-black p-0.5 px-2 truncate">
                          {m3 ? <div className="flex gap-1 items-center min-h-[20px]"><span className="shrink-0">{m3.rg} -</span> <span className="truncate">{renderMilitar(m3.militar)}</span></div> : ''}
                       </td>
                       <td className="border-b border-black p-0.5 text-center font-bold">
                          {i + 1}
                       </td>
                    </tr>
                 );
              })}
           </tbody>
        </table>

      </div>
    </div>
  );
}
