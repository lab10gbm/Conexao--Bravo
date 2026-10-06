import React, { useState, useMemo } from 'react';
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
  rasApplications,
  oficialDia,
  oficialNautica,
  oficialMedico,
  onClose
}: any) {
  const [showVisualMode, setShowVisualMode] = useState(false);

  // Helper to get active viaturas dynamically
  const getActiveVtr = (prefix: string, index: number = 0) => {
     if (!viaturasInfo) return prefix;
     const activeVtrs = viaturasInfo.filter((v: any) => (v.exibir !== undefined ? Boolean(v.exibir) : true) && (prefix === 'AR' ? v.vtr.startsWith('AR-') : v.vtr.startsWith(prefix)));
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
  
  // Normalize function names for robust matching
  const normalize = (s: string) => {
    if (!s) return '';
    return s.replace(/[-_]/g, ' ').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim().toUpperCase();
  };

  // Helpers to get militars by function
  const getByFunc = (funcName: string) => {
    const targetNorm = normalize(funcName);
    return baseRoster.filter((m: any) => {
      const rg = m.rg || '';
      const funcs = selectedFunctions[rg] || [];
      return funcs.some((f: string) => {
        const fNorm = normalize(f);
        if (fNorm === targetNorm) return true;
        if (f.trim().toUpperCase() === funcName.trim().toUpperCase()) return true;
        return false;
      });
    }).map((m: any) => {
      const rg = m.rg || '';
      const isSwapped = permutasOut.has(rg);
      const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(rg)?.substituteRg) || m) : m;
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
     const activeVtrs = viaturasInfo.filter((v: any) => (v.exibir !== undefined ? Boolean(v.exibir) : true) && (prefix === 'AR' ? (v.vtr.startsWith('AR-') || v.vtr.startsWith('AR ')) && !v.vtr.startsWith('ARC') : (v.vtr.startsWith(prefix) || v.vtr.includes(prefix))));
     return activeVtrs[index] || null;
  };

  const getSlotName = (v: any, slot: string, defaultName: string) => {
     if (!v) return defaultName;
     if (v.customNames?.[slot]?.trim()) {
        const custom = v.customNames[slot].trim().toUpperCase();
        const sigla = (v.vtr || "").split('-')[0].trim();
        if (custom === 'ENFERMEIRO') return 'ENFERMEIRO';
        if (custom === 'AUXILIAR/CHEFE ARC' || custom === 'AUXILIAR / CHEFE ARC') return 'AUXILIAR/CHEFE ARC';
        if (custom === 'MESTRE L' || custom === 'MESTRE BIA') return custom;
        if (custom.endsWith(sigla)) return custom;
        if (slot === 'cg' && (custom === 'CHEFE' || custom === 'CHEFE DE GUARNIÇÃO' || custom === 'CHEFE GUA')) return `CHEFE ${sigla}`;
        return `${custom} ${sigla}`.trim();
     }
     return defaultName;
  };

  const getVtrSlotMilitar = (v: any, slot: string, defaultName: string, forceRender = false) => {
     if (!forceRender && (!v || v[slot] === false || v.blocked?.includes(slot))) return null;
     const funcName = getSlotName(v, slot, defaultName);
     const rawSigla = (v?.vtr || defaultName || "").split(/[-_\s]/);
     const sigla = rawSigla[0] === 'CHEFE' || rawSigla[0] === 'CONDUTOR' || rawSigla[0] === 'AUXILIAR'
        ? rawSigla[1] || ''
        : rawSigla[0] || '';
     
     // 1. Primary check: exact or normalized slot function name
     const candidates = getByFunc(funcName);
     let unused = candidates.find((m: any) => !usedMilitars.has(m.rg));
     if (unused) {
        usedMilitars.add(unused.rg);
        return unused;
     }

     // 2. Specific Fallbacks for Chefe (cg)
     if (slot === 'cg') {
        // Fallback A: specific "CHEFE <SIGLA>" (e.g. CHEFE ABT, CHEFE ABSL)
        if (sigla) {
           const specificCandidates = getByFunc(`CHEFE ${sigla}`);
           unused = specificCandidates.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
        }

        // Fallback B: any function with both "CHEFE" and sigla (e.g. CHEFE DA GU ABT, CHEFE DE OPERAÇÃO ABT)
        const anyChefeSigla = baseRoster.filter((m: any) => {
           if (usedMilitars.has(m.rg)) return false;
           const funcs = (selectedFunctions[m.rg] || []).map(normalize);
           return funcs.some(f => f.includes('CHEFE') && (sigla ? f.includes(sigla) : true));
        });
        if (anyChefeSigla.length > 0) {
           const chosen = anyChefeSigla[0];
           const isSwapped = permutasOut.has(chosen.rg);
           const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) || chosen) : chosen;
           usedMilitars.add(chosen.rg);
           return actualMilitar;
        }

        // Fallback C: generic CHEFE GUA / CHEFE DE GU / CHEFE GUARNIÇÃO / CHEFE
        const genericChefe = baseRoster.filter((m: any) => {
           if (usedMilitars.has(m.rg)) return false;
           const funcs = (selectedFunctions[m.rg] || []).map(normalize);
           return funcs.some(f => f === 'CHEFE GUA' || f === 'CHEFE DE GU' || f === 'CHEFE GUARNIÇÃO' || f === 'CHEFE' || f === 'CHEFE GUA ABT' || f === 'CHEFE GUA ABSL');
        });
        if (genericChefe.length > 0) {
           // If slot is ABT, prefer militar with chefeAbt: true if available
           if (sigla === 'ABT') {
              const pref = genericChefe.find((m: any) => m.chefeAbt);
              if (pref) {
                 const isSwapped = permutasOut.has(pref.rg);
                 const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(pref.rg)?.substituteRg) || pref) : pref;
                 usedMilitars.add(pref.rg);
                 return actualMilitar;
              }
           } else if (sigla === 'ABSL') {
              const pref = genericChefe.find((m: any) => m.chefeAbsl);
              if (pref) {
                 const isSwapped = permutasOut.has(pref.rg);
                 const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(pref.rg)?.substituteRg) || pref) : pref;
                 usedMilitars.add(pref.rg);
                 return actualMilitar;
              }
           }
           const chosen = genericChefe[0];
           const isSwapped = permutasOut.has(chosen.rg);
           const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) || chosen) : chosen;
           usedMilitars.add(chosen.rg);
           return actualMilitar;
        }
     }

     // 3. Fallbacks for Condutor
     if (slot === 'condutor') {
        if (sigla) {
           const condutorSigla = getByFunc(`CONDUTOR ${sigla}`);
           unused = condutorSigla.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
        }
        if (sigla === 'L' || sigla === 'BIA' || v?.maritima) {
           const mestreGeneric = getByFunc(sigla === 'BIA' ? 'MESTRE BIA' : 'MESTRE L');
           unused = mestreGeneric.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
           const anyMaritimo = baseRoster.filter((m: any) => {
              if (usedMilitars.has(m.rg)) return false;
              const funcs = (selectedFunctions[m.rg] || []).map(normalize);
              return funcs.some(f => f.includes('MESTRE') || f.includes('MARITIMO'));
           });
           if (anyMaritimo.length > 0) {
              const chosen = anyMaritimo[0];
              const isSwapped = permutasOut.has(chosen.rg);
              const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) || chosen) : chosen;
              usedMilitars.add(chosen.rg);
              return actualMilitar;
           }
        }
     }

     // 4. Fallbacks for Auxiliar (g1..g4)
     if (slot.startsWith('g')) {
        if (sigla) {
           const auxSigla = getByFunc(`AUXILIAR ${sigla}`);
           unused = auxSigla.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
        }
        if (sigla === 'L' || sigla === 'BIA' || v?.maritima) {
           const marinheiroGeneric = getByFunc(sigla === 'BIA' ? 'MARINHEIRO BIA' : 'MARINHEIRO L');
           unused = marinheiroGeneric.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
           const anyMarinheiro = baseRoster.filter((m: any) => {
              if (usedMilitars.has(m.rg)) return false;
              const funcs = (selectedFunctions[m.rg] || []).map(normalize);
              return funcs.some(f => f.includes('MARINHEIRO') || f.includes('MARITIMO') || f.includes('GV AMA') || f.includes('OP AMA'));
           });
           if (anyMarinheiro.length > 0) {
              const chosen = anyMarinheiro[0];
              const isSwapped = permutasOut.has(chosen.rg);
              const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) || chosen) : chosen;
              usedMilitars.add(chosen.rg);
              return actualMilitar;
           }
        }
     }

     return null;
  };

  const renderVtrSlot = (v: any, slot: string, defaultName: string, fallbackLabel: string, forceRender = false, invisible = false) => {
     if (!forceRender && (!v || v[slot] === false || v.blocked?.includes(slot))) return null;
     const m = getVtrSlotMilitar(v, slot, defaultName, forceRender);
     // Shorten label if it's too long, or just use fallbackLabel
     const displayLabel = v?.customNames?.[slot]?.trim() ? v.customNames[slot].trim().substring(0, 15) : fallbackLabel;
     
     return (
       <div className={`flex gap-1 items-start min-h-[20px] ${invisible ? 'opacity-0' : ''}`}>
         <span className="font-bold shrink-0 pt-[1px]">{displayLabel}:</span> 
         <span className="leading-[1.1]">{renderMilitar(m)}</span>
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
  const sentinelas = getByFunc('SENTINELA');

  const safeDateObj = useMemo(() => {
    if (!selectedDate || typeof selectedDate !== 'string') return new Date();
    try {
      let clean = selectedDate.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
        const [d, m, y] = clean.split('/');
        clean = `${y}-${m}-${d}`;
      } else if (clean.includes('T')) {
        clean = clean.split('T')[0];
      }
      const d = new Date(`${clean}T12:00:00`);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  const dateStr = selectedDate ? format(safeDateObj, "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase() : '';
  const shortDateStr = selectedDate ? format(safeDateObj, "dd/MM/yyyy") : '';

  const renderInativaMsg = () => (
     <div className="flex flex-col items-center justify-center text-center font-bold text-slate-500 px-1 py-1 leading-tight opacity-60">
        <span className="text-[9px] uppercase tracking-wide">INATIVA NO SERVIÇO</span>
        <span className="text-[8px] opacity-75">({shortDateStr})</span>
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
        <div className="flex w-full mb-2 border-b border-black mt-8 print:mt-0">
           {/* Left column */}
           <div className="w-1/4 text-center border-r border-black pr-2 flex flex-col items-center pt-5 pb-2">
              <span className="font-bold text-sm mb-6">VISTO</span>
              
              <div className="w-full flex flex-col items-center mb-6">
                 <div className="w-3/4 border-b border-black mb-1"></div>
                 <span className="font-bold text-xs">Ch. SaD</span>
              </div>
              
              <div className="w-full flex flex-col items-center">
                 <div className="w-3/4 border-b border-black mb-1"></div>
                 <span className="font-bold text-xs">Escalante</span>
              </div>
           </div>

           {/* Right column */}
           <div className="w-3/4 text-center flex flex-col justify-between pl-2">
              <div className="font-bold text-[12px] flex flex-col justify-center items-center mt-2 mb-4">
                 <span>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</span>
                 <span>COMANDO DE BOMBEIROS DA COSTA VERDE</span>
                 <span>DÉCIMO GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS</span>
              </div>
              
              <div className="flex justify-center gap-2 w-full text-sm font-bold px-16 mb-2">
                 <span>ESCALA DE SERVIÇO PARA O DIA:</span>
                 <span>{dateStr}</span>
              </div>

              <div className="font-bold flex flex-col text-left uppercase text-xs border-t border-black w-full pt-2 pb-2 pl-4">
                  <span>OFICIAL DE DIA E PRONTIDÃO: {oficialDia ? <span className="ml-1 font-black underline">{oficialDia}</span> : ''}</span>
                  <span>OFICIAL DA NÁUTICA: {oficialNautica ? <span className="ml-1 font-black underline">{oficialNautica}</span> : ''}</span>
                  <span>OFICIAL MÉDICO: {oficialMedico ? <span className="ml-1 font-black underline">{oficialMedico}</span> : ''}</span>
              </div>
           </div>
        </div>

        {/* VIATURAS TABLE */}
        {(() => {
          usedMilitars.clear();
          const displayedVtrs = (viaturasInfo || []).filter((v: any) => v.exibir !== undefined ? Boolean(v.exibir) : true);
          if (displayedVtrs.length === 0) return null;

          const getVtrEspaco = (v: any): '1' | '1/2' | '1/3' => {
            if (v.espaco === '1/3' || v.espaco === '1/2' || v.espaco === '1') return v.espaco;
            const name = (v.vtr || '').toUpperCase();
            if (v.maritima || name.startsWith('L-') || name.startsWith('L ') || name.startsWith('BIA')) return '1/3';
            if (name.startsWith('AR-') || name.startsWith('AR ') || name.startsWith('ARC-') || name.startsWith('ARC ') || name === 'AR' || name === 'ARC') return '1/2';
            return '1';
          };

          type VtrColumn = 
            | { type: 'full'; vtr: any }
            | { type: 'pair'; top: any; bottom: any }
            | { type: 'trio'; items: any[] }
            | { type: 'half'; vtr: any };

          const columns: VtrColumn[] = [];

          // Group 1/2 viaturas into pairs
          const halfPool: any[] = [];
          displayedVtrs.forEach((v: any) => {
            if (getVtrEspaco(v) === '1/2') {
              halfPool.push(v);
            }
          });

          const halfPairs: Array<{ top: any; bottom: any } | { vtr: any }> = [];
          for (let i = 0; i < halfPool.length; i += 2) {
            if (i + 1 < halfPool.length) {
              halfPairs.push({ top: halfPool[i], bottom: halfPool[i + 1] });
            } else {
              halfPairs.push({ vtr: halfPool[i] });
            }
          }

          // Group 1/3 viaturas into trios (up to 3 viaturas sharing 1 space)
          const thirdPool: any[] = [];
          displayedVtrs.forEach((v: any) => {
            if (getVtrEspaco(v) === '1/3') {
              thirdPool.push(v);
            }
          });

          const thirdGroups: Array<any[]> = [];
          for (let i = 0; i < thirdPool.length; i += 3) {
            thirdGroups.push(thirdPool.slice(i, i + 3));
          }

          let pairIdx = 0;
          let trioIdx = 0;
          const consumedIds = new Set<string>();

          displayedVtrs.forEach((v: any) => {
            if (consumedIds.has(v.id)) return;
            const esp = getVtrEspaco(v);
            if (esp === '1') {
              columns.push({ type: 'full', vtr: v });
              consumedIds.add(v.id);
            } else if (esp === '1/2') {
              const pair = halfPairs[pairIdx++];
              if (pair && 'top' in pair) {
                consumedIds.add(pair.top.id);
                consumedIds.add(pair.bottom.id);
                columns.push({ type: 'pair', top: pair.top, bottom: pair.bottom });
              } else if (pair && 'vtr' in pair) {
                consumedIds.add(pair.vtr.id);
                columns.push({ type: 'half', vtr: pair.vtr });
              }
            } else if (esp === '1/3') {
              const group = thirdGroups[trioIdx++];
              if (group && group.length > 0) {
                group.forEach((item: any) => consumedIds.add(item.id));
                columns.push({ type: 'trio', items: group });
              }
            }
          });

          const renderSlotsForVtr = (v: any) => {
            const vtrName = (v.vtr || "").toUpperCase();
            const rawSigla = vtrName.split(/[-_\s]/)[0] || '';
            const sigla = (rawSigla.startsWith('AR') && rawSigla !== 'ARC') ? 'AR' : rawSigla;
            const isMaritima = Boolean(v.maritima || sigla === 'L' || sigla === 'BIA');

            // 1. Chefe (cg)
            const defaultCg = sigla === 'ABSL' ? 'CHEFE ABSL' : sigla === 'ABT' ? 'CHEFE ABT' : sigla === 'ARC' ? 'AUXILIAR/CHEFE ARC' : sigla === 'ASE' ? 'CHEFE ASE' : 'CHEFE GUA';
            const fallbackCg = sigla === 'ARC' ? 'AUXILIAR/CHEFE' : 'CHEFE';
            const forceCg = sigla === 'ABT' || sigla === 'ABSL';

            // 2. Auxiliares (g1..g4)
            const getAuxDefault = (slot: string) => {
              if (sigla === 'ASE') return 'ENFERMEIRO';
              if (sigla === 'ARC') return 'AUXILIAR/CHEFE ARC';
              if (isMaritima) return vtrName.startsWith('BIA') ? 'MARINHEIRO BIA' : 'MARINHEIRO L';
              if (sigla === 'ABT') return 'AUXILIAR ABT';
              if (sigla === 'ABSL') return 'AUXILIAR ABSL';
              return `AUXILIAR ${sigla}`;
            };

            const getAuxFallback = (slot: string) => {
              if (sigla === 'ASE') return 'ENFERMEIRO';
              if (sigla === 'ARC') return 'AUXILIAR/CHEFE';
              return 'AUXILIAR';
            };

            // 3. Condutor
            const defaultCondutor = isMaritima
              ? (vtrName.startsWith('BIA') ? 'MESTRE BIA' : 'MESTRE L')
              : `CONDUTOR ${sigla || 'AR'}`;
            const fallbackCondutor = 'CONDUTOR';

            return (
              <>
                {/* Chefe (cg) */}
                {(v.cg === true || forceCg) && renderVtrSlot(v, 'cg', defaultCg, fallbackCg, forceCg)}

                {/* Auxiliares / Guarnição / Enfermeiro (g1..g4) */}
                {v.g1 === true && renderVtrSlot(v, 'g1', getAuxDefault('g1'), getAuxFallback('g1'))}
                {v.g2 === true && renderVtrSlot(v, 'g2', getAuxDefault('g2'), getAuxFallback('g2'))}
                {v.g3 === true && renderVtrSlot(v, 'g3', getAuxDefault('g3'), getAuxFallback('g3'))}
                {v.g4 === true && renderVtrSlot(v, 'g4', getAuxDefault('g4'), getAuxFallback('g4'))}

                {/* Condutor */}
                {v.condutor === true && renderVtrSlot(v, 'condutor', defaultCondutor, fallbackCondutor, true)}
              </>
            );
          };

          const getSlotCount = (v: any) => {
            if (!v || !v.ativa) return 1;
            let count = 0;
            const vtrName = (v.vtr || "").toUpperCase();
            const rawSigla = vtrName.split(/[-_\s]/)[0] || '';
            const sigla = (rawSigla.startsWith('AR') && rawSigla !== 'ARC') ? 'AR' : rawSigla;
            const forceCg = sigla === 'ABT' || sigla === 'ABSL';

            if ((v.cg === true || forceCg) && (forceCg || !v.blocked?.includes('cg'))) count++;
            if (v.g1 === true && !v.blocked?.includes('g1')) count++;
            if (v.g2 === true && !v.blocked?.includes('g2')) count++;
            if (v.g3 === true && !v.blocked?.includes('g3')) count++;
            if (v.g4 === true && !v.blocked?.includes('g4')) count++;
            if (v.condutor === true && !v.blocked?.includes('condutor')) count++;
            return Math.max(1, count);
          };

          const getDistributionClass = (count: number, isFraction: boolean = false) => {
            if (count <= 1) {
              return 'justify-center';
            }
            if (count === 2) {
              return isFraction ? 'justify-center gap-1.5' : 'justify-center gap-3.5';
            }
            if (count === 3) {
              return isFraction ? 'justify-evenly py-0.5' : 'justify-evenly py-1';
            }
            // 4 ou mais slots: distribui proporcionalmente no espaço
            return isFraction ? 'justify-between' : 'justify-between py-0.5';
          };

          return (
            <table className="w-full border-collapse border-2 border-black text-left mb-2 table-fixed text-[11px]">
               <thead>
                  <tr className={`${headerColorClass} font-bold border-b-2 border-black text-center text-xs`}>
                     {columns.map((col, idx) => {
                        let headerTitle = '';
                        if (col.type === 'pair') headerTitle = col.top.vtr;
                        else if (col.type === 'trio') headerTitle = col.items[0]?.vtr || '';
                        else headerTitle = col.vtr.vtr;

                        return (
                           <th key={idx} className="border-2 border-black py-1 px-1">
                              {headerTitle}
                           </th>
                        );
                     })}
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     {columns.map((col, colIdx) => {
                        if (col.type === 'pair') {
                           const topCount = col.top.ativa ? getSlotCount(col.top) : 1;
                           const bottomCount = col.bottom.ativa ? getSlotCount(col.bottom) : 1;

                           return (
                              <td key={colIdx} className="border border-black p-0 align-top">
                                 <div className="flex flex-col h-full">
                                    {/* Top viatura (1/2 espaço) */}
                                    <div className={`p-1 px-1.5 flex-1 flex flex-col ${getDistributionClass(topCount, true)}`}>
                                       {!col.top.ativa ? renderInativaMsg() : renderSlotsForVtr(col.top)}
                                    </div>

                                    {/* Separador com o nome da viatura inferior */}
                                    <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5 shrink-0`}>
                                       {col.bottom.vtr}
                                    </div>

                                    {/* Bottom viatura (1/2 espaço) */}
                                    <div className={`p-1 px-1.5 flex-1 flex flex-col ${getDistributionClass(bottomCount, true)}`}>
                                       {!col.bottom.ativa ? renderInativaMsg() : renderSlotsForVtr(col.bottom)}
                                    </div>
                                 </div>
                              </td>
                           );
                        }

                        if (col.type === 'trio') {
                           return (
                              <td key={colIdx} className="border border-black p-0 align-top">
                                 <div className="flex flex-col h-full">
                                    {col.items.map((itemVtr: any, itemIdx: number) => {
                                       const count = itemVtr.ativa ? getSlotCount(itemVtr) : 1;
                                       return (
                                          <React.Fragment key={itemVtr.id || itemIdx}>
                                             {itemIdx > 0 && (
                                                <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5 shrink-0`}>
                                                   {itemVtr.vtr}
                                                </div>
                                             )}
                                             <div className={`p-1 px-1.5 flex-1 flex flex-col ${getDistributionClass(count, true)}`}>
                                                {!itemVtr.ativa ? renderInativaMsg() : renderSlotsForVtr(itemVtr)}
                                             </div>
                                          </React.Fragment>
                                       );
                                    })}
                                 </div>
                              </td>
                           );
                        }

                        const fullCount = col.vtr.ativa ? getSlotCount(col.vtr) : 1;
                        return (
                           <td key={colIdx} className="border border-black p-0 align-top">
                              <div className={`flex flex-col h-full p-1.5 px-2 ${getDistributionClass(fullCount, false)}`}>
                                 {!col.vtr.ativa ? renderInativaMsg() : renderSlotsForVtr(col.vtr)}
                              </div>
                           </td>
                        );
                     })}
                  </tr>
               </tbody>
            </table>
          );
        })()}

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
           <colgroup>
              <col className="w-[23%]" />
              <col className="w-[17%]" />
              <col className="w-[23%]" />
              <col className="w-[17%]" />
              <col className="w-[20%]" />
           </colgroup>
           <thead>
              <tr className={`${headerColorClass} font-bold border-b-2 border-black`}>
                 <th className="border-r border-black p-1 uppercase text-left pl-2" colSpan={2}>SENTINELAS: <span className="ml-8">GUARDA NORTE</span></th>
                 <th className="border-r border-black p-1 uppercase text-left pl-2" colSpan={2}>SENTINELAS:</th>
                 <th className="p-1 uppercase border-black border-l-2 text-center" colSpan={1}>COMUNICANTE 1:</th>
              </tr>
           </thead>
           <tbody className="text-left font-bold uppercase">
              <tr>
                 <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-black shrink-0">1º</span>
                     <span className="truncate">{renderMilitar(sentinelas[0])}</span>
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">6 às 8 / 14 às 16 / 22 às 00:00</td>
                 <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-black shrink-0">1º</span>
                     <span className="truncate">{renderMilitar(sentinelas[4])}</span>
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">6 às 7:30 / 12 às 13:30</td>
                 <td className="border-l-2 border-black p-1 font-normal text-center border-b truncate" rowSpan={2}><div className="flex justify-center">{renderMilitar(comunicantes[0])}</div></td>
              </tr>
              <tr>
                 <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-black shrink-0">2º</span>
                     <span className="truncate">{renderMilitar(sentinelas[1])}</span>
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">8 às 10 / 16 às 18 / 00 às 02:00</td>
                 <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-black shrink-0">2º</span>
                     <span className="truncate">{renderMilitar(sentinelas[5])}</span>
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">7:30 às 9 / 13:30 às 15</td>
              </tr>
              <tr>
                 <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-black shrink-0">3º</span>
                     <span className="truncate">{renderMilitar(sentinelas[2])}</span>
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">10 às 12 / 18 às 20 / 02 às 04:00</td>
                 <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-black shrink-0">3º</span>
                     <span className="truncate">{renderMilitar(sentinelas[6])}</span>
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">9 às 10:30 / 15 às 16:30</td>
                 <td className={`border-y-2 border-l-2 border-black p-1 ${headerColorClass} font-bold text-center`}>COMUNICANTE 2:</td>
              </tr>
              <tr>
                 <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-black shrink-0">4º</span>
                     <span className="truncate">{renderMilitar(sentinelas[3])}</span>
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">12 às 14 / 20 às 22 / 04 às 06:00</td>
                 <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-black shrink-0">4º</span>
                     <span className="truncate">{renderMilitar(sentinelas[7])}</span>
                   </div>
                 </td>
                 <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">10:30 às 12/16:30 às 18</td>
                 <td className="border-l-2 border-black p-1 font-normal text-center border-b truncate"><div className="flex justify-center">{renderMilitar(comunicantes[1])}</div></td>
              </tr>
              <tr className={`${headerColorClass} font-bold border-t-2 border-black`}>
                 <td className="border-r border-black p-1 text-center uppercase" colSpan={1}>AUX. RANCHO:</td>
                 <td className="border-r border-black p-1 font-normal bg-white text-center truncate" colSpan={1}>
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
                 <th className="p-1 text-center w-[20%] uppercase">RAS</th>
              </tr>
           </thead>
           <tbody>
              {Array.from({ length: Math.max(Math.ceil(activeMembersList.length / 3), 9, (rasApplications?.length || 0)) }).map((_, i) => {
                 const totalRows = Math.max(Math.ceil(activeMembersList.length / 3), 9, (rasApplications?.length || 0));
                 const cLen = totalRows;
                 
                 const m1 = activeMembersList[i] || null;
                 const m2 = activeMembersList[i + cLen] || null;
                 const m3 = activeMembersList[i + cLen * 2] || null;

                 const rasApp = rasApplications && rasApplications[i] ? {
                    rg: rasApplications[i].militarRg,
                    name: rasApplications[i].militarName,
                    warName: rasApplications[i].militarWarName,
                    rank: rasApplications[i].militarRank,
                 } : null;

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
                       <td className="border-b border-black p-0.5 text-left pl-2 font-bold text-[9px] truncate">
                           {i + 1} {rasApp ? `- ${renderMilitar(rasApp)}` : ''}
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
