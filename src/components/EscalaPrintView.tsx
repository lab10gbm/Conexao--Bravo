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
  onClose
}: any) {
  const [showVisualMode, setShowVisualMode] = useState(false);

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

  const abtCg = getByFunc('CHEFE ABT');
  const abtAux = getByFunc('AUXILIAR ABT');
  const abtMot = getByFunc('CONDUTOR ABT');

  const abslCg = getByFunc('CHEFE ABSL');
  const abslAux = getByFunc('AUXILIAR ABSL');
  const abslMot = getByFunc('CONDUTOR ABSL');

  const aseEnf = getByFunc('ENFERMEIRO');
  const aseAux = getByFunc('OPERADOR AMA');
  const aseMot = getByFunc('CONDUTOR ASE');

  const arcGuar = getByFunc('AUXILIAR / CHEFE ARC');
  const arcMot = getByFunc('CONDUTOR ARC');

  const arMot = getByFunc('CONDUTOR AR');

  const l09Ms = getByFunc('MESTRE AL');
  const l09Mn = getByFunc('MARINHEIRO');

  const bia006Ms = getByFunc('MESTRE BIA');
  const bia006Mn = []; 
  const bia013Ms = [];

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
                 <th className="border-2 border-black py-1 px-1">ABT-183</th>
                 <th className="border-2 border-black py-1 px-1">ABSL-152</th>
                 <th className="border-2 border-black py-1 px-1">ASE-404</th>
                 <th className="border-2 border-black py-1 px-1">ARC-162</th>
                 <th className="border-2 border-black py-1 px-1">L-09</th>
              </tr>
           </thead>
           <tbody>
              <tr>
                 {/* ABT-183 */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">CG:</span> <span className="truncate">{renderMilitar(abtCg[0])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">P1:</span> <span className="truncate">{renderMilitar(abtAux[0])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px] opacity-0"><span className="font-bold shrink-0">P1:</span> <span className="truncate">{renderMilitar(abtAux[1])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">P2:</span> <span className="truncate">{renderMilitar(abtAux[2])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Mot:</span> <span className="truncate">{renderMilitar(abtMot[0])}</span></div>
                    </div>
                 </td>
                 {/* ABSL-152 */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">CG:</span> <span className="truncate">{renderMilitar(abslCg[0])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Guarnição:</span> <span className="truncate">{renderMilitar(abslAux[0])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px] opacity-0"><span className="font-bold shrink-0">Guarnição:</span> <span className="truncate">{renderMilitar(abslAux[1])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px] opacity-0"><span className="font-bold shrink-0">Guarnição:</span> <span className="truncate">{renderMilitar(abslAux[2])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Mot:</span> <span className="truncate">{renderMilitar(abslMot[0])}</span></div>
                    </div>
                 </td>
                 {/* ASE-404 */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Enfermeiro (a):</span> <span className="truncate">{renderMilitar(aseEnf[0])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px] opacity-0"><span className="font-bold shrink-0">Enfermeiro (a):</span> <span className="truncate">{renderMilitar(aseEnf[1])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Auxiliar:</span> <span className="truncate">{renderMilitar(aseAux[0])}</span></div>
                       <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Mot:</span> <span className="truncate">{renderMilitar(aseMot[0])}</span></div>
                    </div>
                 </td>
                 {/* ARC-162 & AR-583 */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px]">
                       <div className="p-2 flex-1 flex flex-col justify-between">
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Guarnição:</span> <span className="truncate">{renderMilitar(arcGuar[0])}</span></div>
                          <div className="flex gap-1 items-center min-h-[20px] opacity-0"><span className="font-bold shrink-0">Guarnição:</span> <span className="truncate">{renderMilitar(arcGuar[1])}</span></div>
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Mot:</span> <span className="truncate">{renderMilitar(arcMot[0])}</span></div>
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5 mt-auto`}>AR-583</div>
                       <div className="p-2 flex flex-col justify-end">
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">Mot:</span> <span className="truncate">{renderMilitar(arMot[0])}</span></div>
                       </div>
                    </div>
                 </td>
                 {/* L-09 & BIA */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px]">
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">MS:</span> <span className="truncate">{renderMilitar(l09Ms[0])}</span></div>
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">MN:</span> <span className="truncate">{renderMilitar(l09Mn[0])}</span></div>
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5`}>BIA-006</div>
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">MS:</span> <span className="truncate">{renderMilitar(bia006Ms[0] || l09Ms[1])}</span></div>
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">MN:</span> <span className="truncate">{renderMilitar(bia006Mn[0] || l09Mn[1])}</span></div>
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5`}>BIA-013</div>
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">MS:</span> <span className="truncate">{renderMilitar(bia013Ms[0] || l09Ms[2])}</span></div>
                          <div className="flex gap-1 items-center min-h-[20px]"><span className="font-bold shrink-0">MN:</span> <span className="truncate">{renderMilitar(l09Mn[2])}</span></div>
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
