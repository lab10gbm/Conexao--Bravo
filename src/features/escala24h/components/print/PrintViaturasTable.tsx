import React from 'react';
import { cn, normalizeRg } from '../../../../lib/utils';

export interface PrintViaturasTableProps {
  viaturasInfo: any[];
  baseRoster: any[];
  selectedFunctions: Record<string, string[]>;
  permutasOut: any;
  militars: any[];
  headerColorClass: string;
  headerBgStyle: React.CSSProperties;
  renderMilitar: (m: any) => React.ReactNode;
  getByFunc: (name: string) => any[];
  shortDateStr: string;
}

export function PrintViaturasTable({
  viaturasInfo,
  baseRoster,
  selectedFunctions,
  permutasOut,
  militars,
  headerColorClass,
  headerBgStyle,
  renderMilitar,
  getByFunc,
  shortDateStr
}: PrintViaturasTableProps) {
  const displayedVtrs = (viaturasInfo || []).filter((v: any) =>
    v.exibir !== undefined ? Boolean(v.exibir) : true
  );
  if (displayedVtrs.length === 0) return null;

  const activeDisplayedVtrs = displayedVtrs.filter((v: any) => Boolean(v.ativa));
  const inactiveDisplayedVtrs = displayedVtrs.filter((v: any) => !v.ativa);

  const getVtrEspaco = (v: any): '1' | '1/2' | '1/3' => {
    if (v.espaco === '1/3' || v.espaco === '1/2' || v.espaco === '1') return v.espaco;
    const name = (v.vtr || '').toUpperCase();
    if (
      v.maritima ||
      name.startsWith('L-') ||
      name.startsWith('L ') ||
      name.startsWith('BIA')
    )
      return '1/3';
    if (
      name.startsWith('AR-') ||
      name.startsWith('AR ') ||
      name.startsWith('ARC-') ||
      name.startsWith('ARC ') ||
      name === 'AR' ||
      name === 'ARC'
    )
      return '1/2';
    return '1';
  };

  type VtrColumn =
    | { type: 'full'; vtr: any }
    | { type: 'pair'; top: any; bottom: any }
    | { type: 'trio'; items: any[] }
    | { type: 'half'; vtr: any };

  const columns: VtrColumn[] = [];

  const halfPool: any[] = [];
  activeDisplayedVtrs.forEach((v: any) => {
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

  const thirdPool: any[] = [];
  activeDisplayedVtrs.forEach((v: any) => {
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

  activeDisplayedVtrs.forEach((v: any) => {
    if (consumedIds.has(v.id)) return;

    const esp = getVtrEspaco(v);
    if (esp === '1') {
      columns.push({ type: 'full', vtr: v });
      consumedIds.add(v.id);
    } else if (esp === '1/2') {
      const pair = halfPairs[pairIdx++];
      if (pair && 'top' in pair) {
        consumedIds.add(pair.top.id);
        if (pair.top.items) pair.top.items.forEach((it: any) => consumedIds.add(it.id));
        consumedIds.add(pair.bottom.id);
        if (pair.bottom.items) pair.bottom.items.forEach((it: any) => consumedIds.add(it.id));
        columns.push({ type: 'pair', top: pair.top, bottom: pair.bottom });
      } else if (pair && 'vtr' in pair) {
        consumedIds.add(pair.vtr.id);
        if (pair.vtr.items) pair.vtr.items.forEach((it: any) => consumedIds.add(it.id));
        columns.push({ type: 'half', vtr: pair.vtr });
      }
    } else if (esp === '1/3') {
      const group = thirdGroups[trioIdx++];
      if (group && group.length > 0) {
        group.forEach((item: any) => {
          consumedIds.add(item.id);
          if (item.items) item.items.forEach((it: any) => consumedIds.add(it.id));
        });
        columns.push({ type: 'trio', items: group });
      }
    }
  });

  const usedMilitars = new Set<string>();

  const normalize = (s: string) => {
    if (!s) return '';
    return s
      .replace(/[-_]/g, ' ')
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const getSlotName = (v: any, slot: string, defaultName: string) => {
    if (!v) return defaultName;
    if (v.customNames?.[slot]?.trim()) {
      const custom = v.customNames[slot].trim().toUpperCase();
      const sigla = (v.vtr || '').split('-')[0].trim().toUpperCase();
      const genericPrefixes = [
        'CONDUTOR',
        'AUXILIAR',
        'CHEFE',
        'MARINHEIRO',
        'MESTRE',
        'OPERADOR'
      ];
      if (genericPrefixes.includes(custom) && sigla) {
        return `${custom} ${sigla}`.trim();
      }
      if (custom === 'ENFERMEIRO') return 'ENFERMEIRO';
      if (custom === 'AUXILIAR/CHEFE ARC' || custom === 'AUXILIAR / CHEFE ARC')
        return 'AUXILIAR/CHEFE ARC';
      if (custom === 'MESTRE L' || custom === 'MESTRE BIA') return custom;
      if (v.customFunctions?.[slot]) return custom;
      if (custom.endsWith(sigla)) return custom;
      if (
        slot === 'cg' &&
        (custom === 'CHEFE DE GUARNIÇÃO' || custom === 'CHEFE GUA')
      )
        return `CHEFE ${sigla}`;
      return `${custom} ${sigla}`.trim();
    }
    return defaultName;
  };

  const getVtrSlotMilitar = (
    v: any,
    slot: string,
    defaultName: string,
    forceRender = false
  ) => {
    if (!forceRender && (!v || v[slot] === false || v.blocked?.includes(slot)))
      return null;
    const funcName = getSlotName(v, slot, defaultName);
    const rawSigla = (v?.vtr || defaultName || '').split(/[-_\s]/);
    const sigla =
      rawSigla[0] === 'CHEFE' || rawSigla[0] === 'CONDUTOR' || rawSigla[0] === 'AUXILIAR'
        ? rawSigla[1] || ''
        : rawSigla[0] || '';

    // 1. Primary check
    const candidates = getByFunc(funcName);
    let unused = candidates.find((m: any) => !usedMilitars.has(m.rg));
    if (unused) {
      usedMilitars.add(unused.rg);
      return unused;
    }

    // 2. Specific Fallbacks for Chefe (cg)
    if (slot === 'cg') {
      if (sigla) {
        const specificCandidates = getByFunc(`CHEFE ${sigla}`);
        unused = specificCandidates.find((m: any) => !usedMilitars.has(m.rg));
        if (unused) {
          usedMilitars.add(unused.rg);
          return unused;
        }
      }

      const anyChefeSigla = baseRoster.filter((m: any) => {
        if (usedMilitars.has(m.rg)) return false;
        const funcs = (selectedFunctions[m.rg] || []).map(normalize);
        return funcs.some(
          (f) => f.includes('CHEFE') && (sigla ? f.includes(sigla) : true)
        );
      });
      if (anyChefeSigla.length > 0) {
        const chosen = anyChefeSigla[0];
        const isSwapped = permutasOut.has(chosen.rg);
        const actualMilitar = isSwapped
          ? militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) ||
            chosen
          : chosen;
        usedMilitars.add(chosen.rg);
        return actualMilitar;
      }

      const genericChefe = baseRoster.filter((m: any) => {
        if (usedMilitars.has(m.rg)) return false;
        const funcs = (selectedFunctions[m.rg] || []).map(normalize);
        return funcs.some(
          (f) =>
            f === 'CHEFE GUA' ||
            f === 'CHEFE DE GU' ||
            f === 'CHEFE GUARNIÇÃO' ||
            f === 'CHEFE' ||
            f === 'CHEFE GUA ABT' ||
            f === 'CHEFE GUA ABSL'
        );
      });
      if (genericChefe.length > 0) {
        if (sigla === 'ABT') {
          const pref = genericChefe.find((m: any) => m.chefeAbt);
          if (pref) {
            const isSwapped = permutasOut.has(pref.rg);
            const actualMilitar = isSwapped
              ? militars.find(
                  (x: any) => x.rg === permutasOut.get(pref.rg)?.substituteRg
                ) || pref
              : pref;
            usedMilitars.add(pref.rg);
            return actualMilitar;
          }
        } else if (sigla === 'ABSL') {
          const pref = genericChefe.find((m: any) => m.chefeAbsl);
          if (pref) {
            const isSwapped = permutasOut.has(pref.rg);
            const actualMilitar = isSwapped
              ? militars.find(
                  (x: any) => x.rg === permutasOut.get(pref.rg)?.substituteRg
                ) || pref
              : pref;
            usedMilitars.add(pref.rg);
            return actualMilitar;
          }
        }
        const chosen = genericChefe[0];
        const isSwapped = permutasOut.has(chosen.rg);
        const actualMilitar = isSwapped
          ? militars.find(
              (x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg
            ) || chosen
          : chosen;
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
        const mestreGeneric = getByFunc(
          sigla === 'BIA' ? 'MESTRE BIA' : 'MESTRE L'
        );
        unused = mestreGeneric.find((m: any) => !usedMilitars.has(m.rg));
        if (unused) {
          usedMilitars.add(unused.rg);
          return unused;
        }
        const anyMaritimo = baseRoster.filter((m: any) => {
          if (usedMilitars.has(m.rg)) return false;
          const funcs = (selectedFunctions[m.rg] || []).map(normalize);
          return funcs.some((f) => f.includes('MESTRE') || f.includes('MARITIMO'));
        });
        if (anyMaritimo.length > 0) {
          const chosen = anyMaritimo[0];
          const isSwapped = permutasOut.has(chosen.rg);
          const actualMilitar = isSwapped
            ? militars.find(
                (x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg
              ) || chosen
            : chosen;
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
        const marinheiroGeneric = getByFunc(
          sigla === 'BIA' ? 'MARINHEIRO BIA' : 'MARINHEIRO L'
        );
        unused = marinheiroGeneric.find((m: any) => !usedMilitars.has(m.rg));
        if (unused) {
          usedMilitars.add(unused.rg);
          return unused;
        }
        const anyMarinheiro = baseRoster.filter((m: any) => {
          if (usedMilitars.has(m.rg)) return false;
          const funcs = (selectedFunctions[m.rg] || []).map(normalize);
          return funcs.some(
            (f) =>
              f.includes('MARINHEIRO') ||
              f.includes('MARITIMO') ||
              f.includes('GV AMA') ||
              f.includes('OP AMA')
          );
        });
        if (anyMarinheiro.length > 0) {
          const chosen = anyMarinheiro[0];
          const isSwapped = permutasOut.has(chosen.rg);
          const actualMilitar = isSwapped
            ? militars.find(
                (x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg
              ) || chosen
            : chosen;
          usedMilitars.add(chosen.rg);
          return actualMilitar;
        }
      }
    }

    return null;
  };

  const renderSlotsForVtr = (v: any) => {
    const vtrName = (v.vtr || '').toUpperCase();
    const rawSigla = vtrName.split(/[-_\s]/)[0] || '';
    const sigla = rawSigla.startsWith('AR') && rawSigla !== 'ARC' ? 'AR' : rawSigla;
    const isMaritima = Boolean(v.maritima || sigla === 'L' || sigla === 'BIA');

    const defaultCg =
      sigla === 'ABSL'
        ? 'CHEFE ABSL'
        : sigla === 'ABT'
        ? 'CHEFE ABT'
        : sigla === 'ARC'
        ? 'AUXILIAR/CHEFE ARC'
        : sigla === 'ASE'
        ? 'CHEFE ASE'
        : 'CHEFE GUA';
    const fallbackCg = sigla === 'ARC' ? 'AUXILIAR/CHEFE' : 'CHEFE';
    const forceCg = (sigla === 'ABT' || sigla === 'ABSL') && v.cg === undefined;
    const hasChefe = (v.cg === true || forceCg) && !v.blocked?.includes('cg');

    const getAuxDefault = (slot: string) => {
      if (sigla === 'ASE') return 'ENFERMEIRO';
      if (sigla === 'ARC') return 'AUXILIAR/CHEFE ARC';
      if (isMaritima)
        return vtrName.startsWith('BIA') ? 'MARINHEIRO BIA' : 'MARINHEIRO L';
      if (sigla === 'ABT') return 'AUXILIAR ABT';
      if (sigla === 'ABSL') return 'AUXILIAR ABSL';
      return `AUXILIAR ${sigla}`;
    };

    const auxSlots = (['g1', 'g2', 'g3', 'g4'] as const).filter(
      (slot) => v[slot] === true && !v.blocked?.includes(slot)
    );

    const defaultCondutor = isMaritima
      ? vtrName.startsWith('BIA')
        ? 'MESTRE BIA'
        : 'MESTRE L'
      : `CONDUTOR ${sigla || 'AR'}`;
    const fallbackCondutor = isMaritima ? 'MESTRE' : 'CONDUTOR';
    const hasCondutor = v.condutor === true && !v.blocked?.includes('condutor');

    const formatHeaderTitle = (
      raw: string,
      fallback: string,
      isPlural: boolean = false
    ) => {
      let clean = (raw || fallback).trim().toUpperCase().replace(/:$/, '');
      const roleRoots = [
        'CONDUTOR',
        'MESTRE',
        'CHEFE',
        'AUXILIAR',
        'MARINHEIRO',
        'ENFERMEIRO',
        'AUXILIAR/CHEFE'
      ];
      for (const root of roleRoots) {
        if (clean === root || clean.startsWith(`${root} `)) {
          const suffix = clean.slice(root.length).trim();
          if (
            !suffix ||
            suffix === sigla ||
            suffix === 'GUA' ||
            suffix === 'DE GUARNIÇÃO' ||
            suffix === 'L' ||
            suffix === 'BIA' ||
            suffix === 'ABT' ||
            suffix === 'ABSL' ||
            suffix === 'ASE' ||
            suffix === 'AR' ||
            suffix === 'ARC'
          ) {
            clean = root;
            break;
          }
        }
      }
      if (isPlural) {
        if (clean === 'AUXILIAR') clean = 'AUXILIARES';
        else if (clean === 'MARINHEIRO') clean = 'MARINHEIROS';
        else if (clean === 'ENFERMEIRO') clean = 'ENFERMEIROS';
        else if (clean === 'AUXILIAR/CHEFE') clean = 'AUX./CHEFES';
      } else if (clean === 'AUXILIAR/CHEFE') {
        clean = 'AUX./CHEFE';
      }
      return `${clean}:`;
    };

    const rawChefe = v?.customNames?.['cg']?.trim() || fallbackCg;
    const firstAuxSlot = auxSlots[0] || 'g1';
    const rawAux =
      v?.customNames?.[firstAuxSlot]?.trim() ||
      (isMaritima
        ? 'MARINHEIRO'
        : sigla === 'ASE'
        ? 'ENFERMEIRO'
        : sigla === 'ARC'
        ? 'AUXILIAR/CHEFE'
        : 'AUXILIAR');
    const rawCondutor = v?.customNames?.['condutor']?.trim() || fallbackCondutor;

    const activeSameSiglaVtrs = activeDisplayedVtrs.filter((dv: any) => {
      const dvSigla = (dv.vtr || '').toUpperCase().split(/[-_\s]/)[0] || '';
      const normDvSigla =
        dvSigla.startsWith('AR') && dvSigla !== 'ARC' ? 'AR' : dvSigla;
      return normDvSigla === sigla;
    });
    const isLastOfSigla =
      activeSameSiglaVtrs.length === 0 ||
      activeSameSiglaVtrs[activeSameSiglaVtrs.length - 1]?.id === v.id;

    const getExtraUnusedForRole = (slot: string, defaultName: string) => {
      if (!isLastOfSigla) return [];
      const funcName = getSlotName(v, slot, defaultName);
      const extras = getByFunc(funcName).filter((m: any) => !usedMilitars.has(m.rg));
      extras.forEach((m: any) => usedMilitars.add(m.rg));
      return extras;
    };

    const mChefe = hasChefe ? getVtrSlotMilitar(v, 'cg', defaultCg, forceCg) : null;
    const extraChefes = hasChefe ? getExtraUnusedForRole('cg', defaultCg) : [];
    const allChefes = hasChefe ? [mChefe, ...extraChefes] : [];

    const auxMilitars = auxSlots.map((slot) => ({
      slot,
      militar: getVtrSlotMilitar(v, slot, getAuxDefault(slot), false)
    }));
    const extraAuxs =
      auxSlots.length > 0
        ? getExtraUnusedForRole(firstAuxSlot, getAuxDefault(firstAuxSlot))
        : [];
    const allAuxMilitars = [...auxMilitars.map((a) => a.militar), ...extraAuxs];

    const mCondutor = hasCondutor
      ? getVtrSlotMilitar(v, 'condutor', defaultCondutor, true)
      : null;
    const extraCondutores = hasCondutor
      ? getExtraUnusedForRole('condutor', defaultCondutor)
      : [];
    const allCondutores = hasCondutor ? [mCondutor, ...extraCondutores] : [];

    const sections: Array<{
      key: string;
      label: string;
      militars: any[];
    }> = [];

    if (hasChefe) {
      sections.push({
        key: 'chefe',
        label: formatHeaderTitle(
          rawChefe,
          fallbackCg,
          allChefes.filter(Boolean).length > 1
        ),
        militars: allChefes
      });
    }

    if (auxSlots.length > 0) {
      sections.push({
        key: 'auxiliares',
        label: formatHeaderTitle(
          rawAux,
          'AUXILIAR',
          allAuxMilitars.filter(Boolean).length > 1 || auxSlots.length > 1
        ),
        militars: allAuxMilitars
      });
    }

    if (hasCondutor) {
      sections.push({
        key: 'condutor',
        label: formatHeaderTitle(
          rawCondutor,
          fallbackCondutor,
          allCondutores.filter(Boolean).length > 1
        ),
        militars: allCondutores
      });
    }

    if (sections.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center p-1 text-slate-400 italic text-[9px]">
          Sem funções escaladas
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full justify-around w-full divide-y divide-slate-200">
        {sections.map((sec) => {
          const filledMilitars = sec.militars.filter(Boolean);
          const displayMilitars =
            filledMilitars.length > 0 ? filledMilitars : [null];
          return (
            <div
              key={sec.key}
              className="flex items-baseline justify-start gap-1.5 px-1.5 py-0.5 w-full min-h-[16px]"
            >
              <span className="font-black uppercase text-[8.5px] sm:text-[9px] tracking-tight text-slate-900 shrink-0 leading-tight">
                {sec.label}
              </span>
              <div className="flex flex-col flex-1 min-w-0 justify-center">
                {displayMilitars.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    className="w-full leading-tight text-left py-[0.5px]"
                  >
                    <span className="leading-tight text-[9.5px] sm:text-[10px] font-bold text-black whitespace-normal break-words block">
                      {renderMilitar(m) || (
                        <span className="opacity-0 select-none">&nbsp;</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const inactiveNamesStr = inactiveDisplayedVtrs.map((v: any) => v.vtr).join(' / ');

  return (
    <table className="w-full border-collapse border-2 border-black text-left mb-2 table-fixed text-[11px]">
      {columns.length > 0 && (
        <>
          <thead>
            <tr
              className={cn(
                headerColorClass,
                'font-bold border-b-2 border-black text-center text-[9.5px] leading-none escala-ala-header'
              )}
              style={headerBgStyle}
            >
              {columns.map((col, idx) => {
                let headerTitle: React.ReactNode = '';
                if (col.type === 'pair') {
                  headerTitle = col.top.vtr;
                } else if (col.type === 'trio') {
                  headerTitle = col.items[0]?.vtr || '';
                } else {
                  headerTitle = col.vtr.vtr;
                }

                return (
                  <th
                    key={idx}
                    className="border-2 border-black py-[2.5px] px-1.5 leading-none escala-ala-header"
                    style={headerBgStyle}
                  >
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
                  return (
                    <td key={colIdx} className="border border-black p-0 align-top">
                      <div className="flex flex-col h-full">
                        <div className="p-0 flex-1 flex flex-col justify-between">
                          {renderSlotsForVtr(col.top)}
                        </div>
                        <div
                          className={cn(
                            'border-y-2 border-black',
                            headerColorClass,
                            'font-bold text-center text-[9.5px] leading-none py-[2.5px] px-1.5 shrink-0 escala-ala-header'
                          )}
                          style={headerBgStyle}
                        >
                          {col.bottom.vtr}
                        </div>
                        <div className="p-0 flex-1 flex flex-col justify-between">
                          {renderSlotsForVtr(col.bottom)}
                        </div>
                      </div>
                    </td>
                  );
                }

                if (col.type === 'trio') {
                  return (
                    <td key={colIdx} className="border border-black p-0 align-top">
                      <div className="flex flex-col h-full">
                        {col.items.map((itemVtr: any, itemIdx: number) => (
                          <React.Fragment key={itemVtr.id || itemIdx}>
                            {itemIdx > 0 && (
                              <div
                                className={cn(
                                  'border-y-2 border-black',
                                  headerColorClass,
                                  'font-bold text-center text-[9.5px] leading-none py-[2.5px] px-1.5 shrink-0 escala-ala-header'
                                )}
                                style={headerBgStyle}
                              >
                                {itemVtr.vtr}
                              </div>
                            )}
                            <div className="p-0 flex-1 flex flex-col justify-between">
                              {renderSlotsForVtr(itemVtr)}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={colIdx} className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full p-0 justify-between">
                      {renderSlotsForVtr(col.vtr)}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </>
      )}
      {inactiveDisplayedVtrs.length > 0 && (
        <tfoot>
          <tr>
            <td
              colSpan={Math.max(1, columns.length)}
              className={cn(
                'bg-slate-200 px-2 py-1 text-center text-[9.5px] sm:text-[10px] leading-tight uppercase tracking-wide text-slate-800',
                columns.length > 0 ? 'border-t-2 border-black' : ''
              )}
              style={{
                backgroundColor: '#e2e8f0',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="font-black text-black">{inactiveNamesStr}</span>
                <span className="text-slate-500 font-bold">—</span>
                <span className="font-extrabold text-slate-700">INATIVA NO SERVIÇO</span>
                {shortDateStr && (
                  <span className="font-semibold text-slate-600 text-[9px]">
                    ({shortDateStr})
                  </span>
                )}
              </div>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
