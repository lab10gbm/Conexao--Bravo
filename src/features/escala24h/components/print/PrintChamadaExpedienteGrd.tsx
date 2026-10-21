import React from 'react';
import { cn, normalizeRg, normalizeAlaField } from '../../../../lib/utils';
import { parseRank, formatRankAndName } from '../../../../lib/rankUtils';
import { UserProfile } from '../../../../types';

export interface PrintChamadaExpedienteGrdProps {
  headerColorClass: string;
  headerBgStyle: React.CSSProperties;
  activeMembersList: any[];
  renderMilitar: (m: any, options?: { compact?: boolean; hideRank?: boolean }) => React.ReactNode;
  rasApplications: any[];
  expedienteMilitars: any[];
  afastamentos?: any[];
  militars: any[];
  selectedDate: string;
  identifiedAla: number | string;
  grdRgs: string[];
  obmContext: string;
  isSigned: boolean;
  user?: UserProfile;
}

export function PrintChamadaExpedienteGrd({
  headerColorClass,
  headerBgStyle,
  activeMembersList,
  renderMilitar,
  rasApplications,
  expedienteMilitars,
  afastamentos,
  militars,
  selectedDate,
  identifiedAla,
  grdRgs,
  obmContext,
  isSigned,
  user
}: PrintChamadaExpedienteGrdProps) {
  const activeAfastamentos = (afastamentos || []).filter((a: any) => {
    if (selectedDate < a.inicio || selectedDate > a.retorno) return false;
    const mil = (militars || []).find(
      (m: any) => normalizeRg(m.rg) === normalizeRg(a.rg)
    );
    if (identifiedAla) {
      const effectiveAla = normalizeAlaField(a.ala || mil?.ala);
      if (effectiveAla && effectiveAla !== normalizeAlaField(identifiedAla)) {
        return false;
      }
    }
    return true;
  });

  const afastadosList = activeAfastamentos
    .map((a: any) => {
      const mil = (militars || []).find(
        (m: any) => normalizeRg(m.rg) === normalizeRg(a.rg)
      );
      if (!mil) return null;
      const typeStr = a.situacao || a.tipoAfastamento || 'Afastamento';
      return `${parseRank(mil.rank)} ${
        mil.warName || (mil.name || '').split(' ')[0]
      } (${typeStr})`;
    })
    .filter(Boolean);

  const grdMilitarsList = (grdRgs || [])
    .map((rg: any) => {
      const cleanRg = typeof rg === 'string' ? rg : rg?.rg;
      if (!cleanRg || !cleanRg.trim()) return null;
      const mil = (militars || []).find(
        (m: any) => normalizeRg(m.rg) === normalizeRg(cleanRg)
      );
      if (!mil) return cleanRg ? `RG: ${cleanRg.trim()}` : null;
      return `${parseRank(mil.rank)} ${
        mil.warName || (mil.name || '').split(' ')[0]
      }`;
    })
    .filter(Boolean) as string[];

  const hasGrd = grdMilitarsList.length > 0;
  const obmName = (obmContext || '10º GBM').split('-')[0].trim();

  const expedienteRgSet = React.useMemo(() => {
    const set = new Set<string>();
    (expedienteMilitars || []).forEach((em: any) => {
      const clean = normalizeRg(em?.rg || em?.militar?.rg || '');
      if (clean) set.add(clean);
    });
    (militars || []).forEach((mil: any) => {
      const clean = normalizeRg(mil?.rg || '');
      if (!clean) return;
      const alaStr = normalizeAlaField(mil?.ala);
      if (
        alaStr === 'EXPEDIENTE' ||
        (mil?.ala && String(mil.ala).trim().toUpperCase().includes('EXP')) ||
        (mil?.setor && !mil?.ala)
      ) {
        set.add(clean);
      }
    });
    return set;
  }, [expedienteMilitars, militars]);

  return (
    <>
      {/* CHAMADA GERAL E RAS */}
      <table className="w-full border-collapse border-2 border-black text-left table-fixed text-[10px]">
        <colgroup>
          <col className="w-[82%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead>
          <tr
            className={cn(
              headerColorClass,
              'font-bold border-b-2 border-black escala-ala-header'
            )}
            style={headerBgStyle}
          >
            <th
              className="border-r border-black p-1 text-center uppercase tracking-wider escala-ala-header"
              style={headerBgStyle}
            >
              CHAMADA GERAL
            </th>
            <th
              className="p-1 text-center uppercase tracking-wider escala-ala-header"
              style={headerBgStyle}
            >
              RAS
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-r border-black p-1.5 px-3 align-top text-[9.5px] font-bold">
              {activeMembersList.length > 0 ? (
                <div
                  className={cn(
                    'grid gap-y-1',
                    activeMembersList.length > 24
                      ? 'grid-cols-4 gap-x-2 text-[9px]'
                      : 'grid-cols-3 gap-x-3.5'
                  )}
                >
                  {activeMembersList.map((m: any, idx: number) => {
                    const militarName =
                      m.label ||
                      formatRankAndName(m.militar) ||
                      [
                        m.militar?.rank,
                        m.militar?.warName || m.militar?.name
                      ]
                        .filter(Boolean)
                        .join(' ') ||
                      m.rg;

                    const cleanRg = normalizeRg(m.rg || m.militar?.rg || '');
                    const isFromExpediente =
                      m.isExpediente ||
                      m.isExp ||
                      m.fromExpediente ||
                      expedienteRgSet.has(cleanRg) ||
                      normalizeAlaField(m.militar?.ala) === 'EXPEDIENTE' ||
                      (m.militar?.ala && String(m.militar.ala).trim().toUpperCase().includes('EXP'));

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 min-w-0"
                        title={isFromExpediente ? `${militarName} (Expediente)` : militarName}
                      >
                        <span className="font-mono text-slate-700 shrink-0">
                          {m.rg} -
                        </span>
                        <span className="truncate whitespace-nowrap font-bold text-slate-900">
                          {militarName}
                        </span>
                        {isFromExpediente && (
                          <span
                            className="text-[7.5px] font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-1 py-[0.5px] rounded ml-0.5 shrink-0 uppercase tracking-tight"
                            style={{
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact',
                            }}
                            title="Militar do Expediente"
                          >
                            EXP
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center font-normal text-slate-500 italic py-2">
                  Nenhum militar na chamada geral.
                </div>
              )}
            </td>
            <td className="p-1.5 px-2 align-top text-[9px] font-bold">
              {rasApplications && rasApplications.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {rasApplications.map((rasItem: any, idx: number) => {
                    const rasApp = {
                      rg: rasItem.militarRg || rasItem.rg,
                      name: rasItem.militarName || rasItem.name,
                      warName: rasItem.militarWarName || rasItem.warName,
                      rank: rasItem.militarRank || rasItem.rank
                    };
                    return (
                      <div key={idx} className="flex items-center gap-1 truncate">
                        <span className="font-mono text-slate-700 shrink-0">
                          {idx + 1} -
                        </span>
                        <span className="truncate">{renderMilitar(rasApp)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="min-h-[50px] flex items-center justify-center p-2 text-center text-slate-500 italic font-normal text-[10px]">
                  Nenhum RAS realizado
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* EXPEDIENTE DE SERVIÇO */}
      <div className="border-2 border-black border-t-0 flex flex-col">
        <div
          className={cn(
            headerColorClass,
            'font-bold border-b-2 border-black text-center p-1 text-[10px] uppercase tracking-wider escala-ala-header'
          )}
          style={headerBgStyle}
        >
          MILITARES DE EXPEDIENTE NO DIA
        </div>

        <div className="p-1.5 px-3 border-b-2 border-black text-[10px] min-h-[30px] font-bold">
          {expedienteMilitars.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-1">
              {expedienteMilitars.map((m: any, idx: number) => {
                const cleanRg = normalizeRg(m.rg || m.militar?.rg || '');
                const milFromPool = (militars || []).find((x: any) => normalizeRg(x.rg) === cleanRg);
                const rawSector =
                  m.sector ||
                  m.setor ||
                  m.secao ||
                  m.militar?.setor ||
                  m.militar?.secao ||
                  m.militar?.sector ||
                  milFromPool?.setor ||
                  milFromPool?.secao ||
                  milFromPool?.sector ||
                  '';
                const sectorName = rawSector.trim() === 'Expediente Geral' ? '' : rawSector.trim();
                return (
                  <div key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="font-mono text-slate-700 shrink-0">
                      {m.rg} -
                    </span>
                    <span className="truncate">
                      {renderMilitar(m.militar || m)}
                    </span>
                    {sectorName && (
                      <span
                        className="text-[7.5px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-1 py-[0.5px] rounded ml-0.5 shrink-0 uppercase tracking-tight"
                        style={{
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        {sectorName}
                      </span>
                    )}
                    {m.is24h && (
                      <span
                        className="text-[7.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1 py-[0.5px] rounded ml-1 shrink-0"
                        style={{
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        24H
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center font-normal text-slate-500 italic">
              Nenhum militar de expediente escalado neste dia.
            </div>
          )}
        </div>
      </div>

      {/* AFASTAMENTOS, GRD E VISTO */}
      <div className="border-2 border-black border-t-0 flex w-full mb-4 items-stretch">
        {/* COLUNA ESQUERDA: AFASTAMENTOS E GRD (82%) */}
        <div className="w-[82%] border-r-2 border-black flex flex-col justify-between">
          <div
            className={cn(
              headerColorClass,
              'font-bold border-b-2 border-black text-center p-1 text-[10px] uppercase tracking-wider escala-ala-header'
            )}
            style={headerBgStyle}
          >
            AFASTAMENTOS
          </div>

          <div className="p-1.5 px-3 border-b-2 border-black text-[10px] min-h-[30px] font-bold flex-1 flex items-center">
            {afastadosList.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-1 w-full">
                {afastadosList.map((str: any, idx: number) => (
                  <span key={idx}>{str}</span>
                ))}
              </div>
            ) : (
              <div className="text-center font-normal text-slate-500 italic w-full">
                Nenhum afastamento.
              </div>
            )}
          </div>

          {/* GRD */}
          <div className="flex w-full min-h-[46px] items-stretch">
            <div className="w-[22%] border-r-2 border-black flex items-center justify-center font-black text-[10.5px] uppercase bg-slate-50 p-2 text-center shrink-0">
              GRD - {obmName}
            </div>
            <div className="w-[78%] p-2 px-3 flex-1 flex items-center">
              {hasGrd ? (
                <div
                  className={cn(
                    'grid gap-x-6 gap-y-1 text-[10px] font-bold uppercase w-full',
                    grdMilitarsList.length > 4 ? 'grid-cols-3' : 'grid-cols-2'
                  )}
                >
                  {grdMilitarsList.map((str: any, idx: number) => (
                    <div key={idx} className="flex gap-1 items-start">
                      <span className="shrink-0">{idx + 1}-</span>
                      <span className="leading-[1.1]">{str}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: VISTO (18%) */}
        <div className="w-[18%] flex flex-col shrink-0 text-center justify-between">
          <div
            className={cn(
              headerColorClass,
              'font-bold border-b-2 border-black text-center p-1 text-[10px] uppercase tracking-wider escala-ala-header'
            )}
            style={headerBgStyle}
          >
            VISTO
          </div>

          <div className="flex-1 flex flex-col items-center justify-between p-1.5 text-center">
            <div className="w-full flex flex-col items-center my-auto pt-1">
              <div className="h-4 w-full"></div>
              <div className="w-4/5 border-b border-black mb-0.5"></div>
              <span className="font-bold text-[9.5px] leading-tight">Ch. SaD</span>
            </div>

            <div className="w-full flex flex-col items-center mt-auto pt-1 pb-0.5">
              <div className="min-h-[20px] flex flex-col items-center justify-end w-full mb-0.5">
                {isSigned && user ? (
                  <div className="text-[8px] font-bold uppercase leading-tight text-center px-0.5">
                    <span>
                      {parseRank(user.rank)} {user.warName || user.name}
                    </span>
                    <span className="block text-[7px] font-semibold text-slate-700">
                      RG: {user.rg}
                    </span>
                  </div>
                ) : (
                  <div className="h-3.5"></div>
                )}
              </div>
              <div className="w-4/5 border-b border-black mb-0.5"></div>
              <span className="font-bold text-[9.5px] leading-tight mb-0">
                Escalante
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
