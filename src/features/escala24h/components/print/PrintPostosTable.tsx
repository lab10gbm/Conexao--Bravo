import React, { useMemo } from 'react';
import { cn, normalizeRg } from '../../../../lib/utils';
import { EscalaPostoData, PostoConfig, DEFAULT_POSTOS } from '../../../postos/types';

export interface PrintPostosTableProps {
  postosEscalaEnabled?: boolean;
  postosData?: EscalaPostoData[];
  availablePostosConfig?: PostoConfig[];
  baseRoster: any[];
  militars: any[];
  permutasOut?: any;
  headerColorClass: string;
  headerBgStyle: React.CSSProperties;
  renderMilitar: (m: any, options?: { compact?: boolean; hideRank?: boolean; hidePermutaBadge?: boolean }) => React.ReactNode;
}

export function PrintPostosTable({
  postosEscalaEnabled,
  postosData,
  availablePostosConfig,
  baseRoster = [],
  militars = [],
  permutasOut,
  headerColorClass,
  headerBgStyle,
  renderMilitar
}: PrintPostosTableProps) {
  // 1. Resolve lista de postos ativos a partir de postosData ou configuração padrão
  const activePostos = useMemo(() => {
    if (!postosEscalaEnabled) return [];

    let list: EscalaPostoData[] = [];
    if (postosData && postosData.length > 0) {
      list = postosData;
    } else {
      const configsToUse = availablePostosConfig && availablePostosConfig.length > 0
        ? availablePostosConfig
        : DEFAULT_POSTOS;

      list = configsToUse.map(cfg => ({
        postoId: cfg.id,
        postoNome: cfg.nome,
        tipo: cfg.tipo || 'praia',
        ativa: cfg.ativa !== undefined ? cfg.ativa : true,
        slots: (cfg.funcoes || []).map(f => ({
          slotId: f.id,
          funcaoNome: f.nome,
          rg: null
        }))
      }));
    }

    return list.filter(p => p.ativa !== false);
  }, [postosEscalaEnabled, postosData, availablePostosConfig]);

  if (!postosEscalaEnabled || activePostos.length === 0) {
    return null;
  }

  // Helper para buscar o militar escalado no slot do posto
  const getSlotMilitar = (slot: { slotId: string; funcaoNome: string; rg: string | null }) => {
    if (!slot.rg) return null;
    const cleanRg = normalizeRg(slot.rg);

    // Checar permuta
    let isSwapped = false;
    let subRg: string | null = null;
    let permutaData: any = null;
    if (permutasOut) {
      if (permutasOut instanceof Map || typeof permutasOut.get === 'function') {
        if (permutasOut.has(slot.rg)) {
          permutaData = permutasOut.get(slot.rg);
          isSwapped = true;
          subRg = permutaData?.substituteRg || null;
        } else if (cleanRg && permutasOut.has(cleanRg)) {
          permutaData = permutasOut.get(cleanRg);
          isSwapped = true;
          subRg = permutaData?.substituteRg || null;
        }
      }
    }

    let found = (militars || []).find((m: any) => normalizeRg(m.rg) === cleanRg) ||
      (baseRoster || []).find((m: any) => normalizeRg(m.rg) === cleanRg);

    if (isSwapped && subRg) {
      const cleanSubRg = normalizeRg(subRg);
      const subMilitar = (militars || []).find((m: any) => normalizeRg(m.rg) === cleanSubRg) ||
        (baseRoster || []).find((m: any) => normalizeRg(m.rg) === cleanSubRg);
      if (subMilitar) {
        return { ...subMilitar, isPermuta: true, permutaData };
      }
      return {
        rg: subRg,
        name: permutaData?.substituteName || permutaData?.substituteWarName || subRg,
        warName: permutaData?.substituteWarName || permutaData?.substituteName || subRg,
        rank: permutaData?.substituteRank,
        isPermuta: true,
        permutaData
      };
    }

    return found || { rg: slot.rg, name: slot.rg, warName: slot.rg };
  };

  return (
    <div className="w-full mb-2 uppercase leading-tight">
      {activePostos.map((posto, idx) => {
        const slotsCount = Math.max(1, posto.slots.length);
        const colWidth = `${(100 / slotsCount).toFixed(2)}%`;

        return (
          <div 
            key={posto.postoId || idx} 
            className="border-2 border-black mb-2 last:mb-0 w-full overflow-hidden"
          >
            <table className="w-full border-collapse text-[10.5px] font-sans">
              <thead>
                <tr>
                  <th
                    colSpan={slotsCount}
                    className={cn(
                      'py-1 px-1.5 uppercase border-b border-black text-center escala-ala-header font-bold text-[11px] sm:text-[11.5px]',
                      headerColorClass
                    )}
                    style={headerBgStyle}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{posto.postoNome}</span>
                      {posto.tipo === 'praia' && (
                        <span className="text-[9.5px] opacity-90 font-medium tracking-wider">
                          (POSTO DE PRAIA / SALVAMAR)
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
                <tr className="bg-[#dbe4ee]">
                  {posto.slots.map((slot) => (
                    <th
                      key={slot.slotId}
                      className="escala-vtr-func-header font-bold text-center text-[9px] sm:text-[9.5px] py-[2.5px] px-1 bg-[#dbe4ee] border-b border-r last:border-r-0 border-black"
                      style={{
                        width: colWidth,
                        backgroundColor: '#dbe4ee',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {slot.funcaoNome}:
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {posto.slots.map((slot) => {
                    const militar = getSlotMilitar(slot);
                    return (
                      <td
                        key={slot.slotId}
                        className="text-center font-bold text-[10px] sm:text-[10.5px] py-1.5 px-1 border-r last:border-r-0 border-black bg-white min-h-[22px] align-middle"
                        style={{ width: colWidth }}
                      >
                        {militar ? renderMilitar(militar) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
