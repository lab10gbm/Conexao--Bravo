import React from 'react';
import { Eye, EyeOff, ArrowLeftRight } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { getEarliestStartTime } from '../../../../lib/sentinelaUtils';

export interface PrintAdminSentinelasPermutasProps {
  headerColorClass: string;
  headerBgStyle: React.CSSProperties;
  isAdminRoleVisible: (key: string) => boolean;
  toggleAdminRoleVisibility: (key: string) => void;
  adminRoles: Record<string, any[]>;
  adminRolesRight: Array<{ label: string; values: any[] }>;
  diaDepositoList: any[];
  getAdminRoleMappedKey: (label: string) => string;
  renderMilitar: (m: any, options?: { compact?: boolean; hideRank?: boolean; hidePermutaBadge?: boolean }) => React.ReactNode;
  sentinelas: any[];
  propSentinelaSlots?: any[];
  com1Militars: any[];
  com2Militars: any[];
  auxRancho: any[];
  toqueFogo: any[];
  permutasAtivas: any[];
}

export function PrintAdminSentinelasPermutas({
  headerColorClass,
  headerBgStyle,
  isAdminRoleVisible,
  toggleAdminRoleVisibility,
  adminRoles,
  adminRolesRight,
  diaDepositoList,
  getAdminRoleMappedKey,
  renderMilitar,
  sentinelas,
  propSentinelaSlots,
  com1Militars,
  com2Militars,
  auxRancho,
  toqueFogo,
  permutasAtivas
}: PrintAdminSentinelasPermutasProps) {
  const isSentinelaVisible = isAdminRoleVisible('SENTINELA');
  const isAuxRanchoVisible = isAdminRoleVisible('AUXILIAR RANCHO');
  const isToqueFogoVisible = isAdminRoleVisible('TOQUE DE FOGO');
  const isCom1Visible = isAdminRoleVisible('COMUNICANTE 1');
  const isCom2Visible = isAdminRoleVisible('COMUNICANTE 2');

  const horariosNorte = [
    '6 às 8 / 14 às 16 / 22 às 00:00',
    '8 às 10 / 16 às 18 / 00 às 02:00',
    '10 às 12 / 18 às 20 / 02 às 04:00',
    '12 às 14 / 20 às 22 / 04 às 06:00'
  ];

  const hasMilitar = (m: any) =>
    Boolean(m) && Boolean(renderMilitar(m)) && isSentinelaVisible;

  const totalComCount = (com1Militars?.length || 0) + (com2Militars?.length || 0);

  // Se houver 2 ou mais comunicantes, exibe dois espaços separados: "COMUNICANTE 1:" e "COMUNICANTE 2:", cada militar em seu espaço
  // Se houver apenas 1 comunicante (ou nenhum), exibe apenas 1 espaço limpo com título "COMUNICANTE:"
  const comunicanteSections = totalComCount >= 2 ? [
    {
      key: 'COMUNICANTE 1',
      title: 'COMUNICANTE 1:',
      visible: isCom1Visible,
      militars: com1Militars,
      toggleTitle: isCom1Visible
        ? 'Desativar Comunicante 1 no Gerar Escala'
        : 'Ativar Comunicante 1 no Gerar Escala'
    },
    {
      key: 'COMUNICANTE 2',
      title: 'COMUNICANTE 2:',
      visible: isCom2Visible,
      militars: com2Militars,
      toggleTitle: isCom2Visible
        ? 'Desativar Comunicante 2 no Gerar Escala'
        : 'Ativar Comunicante 2 no Gerar Escala'
    }
  ] : [
    {
      key: 'COMUNICANTE 1',
      title: 'COMUNICANTE:',
      visible: isCom1Visible,
      militars: com1Militars.length > 0 ? com1Militars : com2Militars,
      toggleTitle: isCom1Visible
        ? 'Desativar Comunicante no Gerar Escala'
        : 'Ativar Comunicante no Gerar Escala'
    }
  ];

  const rightSubSections = [
    ...comunicanteSections,
    {
      key: 'AUXILIAR RANCHO',
      title: 'AUXILIAR RANCHO:',
      visible: isAuxRanchoVisible,
      militars: auxRancho,
      toggleTitle: isAuxRanchoVisible
        ? 'Desativar Auxiliar Rancho no Gerar Escala'
        : 'Ativar Auxiliar Rancho no Gerar Escala'
    },
    {
      key: 'TOQUE DE FOGO',
      title: 'TOQUE DE FOGO:',
      visible: isToqueFogoVisible,
      militars: toqueFogo,
      toggleTitle: isToqueFogoVisible
        ? 'Desativar Toque de Fogo no Gerar Escala'
        : 'Ativar Toque de Fogo no Gerar Escala'
    }
  ].filter((sec) => sec.visible);

  const hasRightCol = rightSubSections.length > 0;

  return (
    <div className="flex border-2 border-black mb-2 uppercase leading-tight w-full items-stretch">
      {/* COLUNA ESQUERDA: FUNÇÕES ADMINISTRATIVAS (28%) */}
      <div className="w-[28%] flex flex-col border-r-2 border-black shrink-0">
        <div
          className={cn(
            'py-1 px-1.5 uppercase border-b border-black text-center escala-ala-header font-bold text-[9.5px] sm:text-[10px]',
            headerColorClass
          )}
          style={headerBgStyle}
        >
          FUNÇÕES ADMINISTRATIVAS:
        </div>

        <div className="flex-1 flex flex-col justify-around py-1 px-1.5 gap-0.5 text-[8.5px] sm:text-[9px]">
          {(() => {
            const allAdminRoles = [
              { label: 'ADJUNTO:', values: adminRoles['ADJUNTO:'] || [] },
              {
                label: 'ENC. MOTORISTA:',
                values:
                  adminRoles['ENC. MOTORISTA:'] ||
                  adminRoles['ENC.  MOTORISTA:'] ||
                  adminRoles['ENC. MOTORISTA'] ||
                  adminRoles['ENCARREGADO DE MOTORISTAS:'] ||
                  adminRoles['ENCARREGADO DE MOTORIS:'] ||
                  []
              },
              {
                label: 'ENC. FAXINA:',
                values:
                  adminRoles['ENC. FAXINA:'] ||
                  adminRoles['ENC. FAXINA'] ||
                  adminRoles['ENC FAXINA:'] ||
                  adminRoles['ENC FAXINA'] ||
                  adminRoles['RESP. FAXINA:'] ||
                  adminRoles['RESP. FAXINA'] ||
                  adminRoles['RESP. P/ FAXINA:'] ||
                  []
              },
              { label: 'SGT DE DIA:', values: adminRoles['SGT DE DIA:'] || [] },
              { label: 'CMT DA GUARDA:', values: adminRoles['CMT DA GUARDA:'] || [] },
              ...(diaDepositoList.length > 1
                ? [
                    { label: 'DIA AO DEPÓSITO:', values: diaDepositoList.slice(0, 1) },
                    { label: 'DIA AO DEPÓSITO:', values: diaDepositoList.slice(1) }
                  ]
                : [{ label: 'DIA AO DEPÓSITO:', values: diaDepositoList }]),
              { label: 'ABASTECEDOR:', values: adminRolesRight[2]?.values || [] },
              { label: 'CB DE DIA:', values: adminRolesRight[3]?.values || [] },
              { label: 'CB DA GUARDA:', values: adminRolesRight[4]?.values || [] }
            ];

            const visibleAdminRoles = allAdminRoles.filter((item) =>
              isAdminRoleVisible(getAdminRoleMappedKey(item.label))
            );

            if (visibleAdminRoles.length === 0) {
              return (
                <div className="py-1 text-center text-slate-400 italic text-[9px]">
                  &nbsp;
                </div>
              );
            }

            return visibleAdminRoles.map((item, idx) => {
              const roleKey = getAdminRoleMappedKey(item.label);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-1 w-full min-h-[16px] py-[0.5px] leading-tight group/admin-row"
                >
                  <span className="font-black text-[8.5px] sm:text-[9px] text-slate-900 leading-[1.1] whitespace-normal break-words flex-1 min-w-0 pr-1">
                    {item.label}
                  </span>
                  <span className="font-bold text-[8.5px] sm:text-[9px] text-black shrink-0 whitespace-nowrap text-right ml-auto">
                    {item.values.length > 0 ? (
                      item.values.map((m: any, mIdx: number) => (
                        <React.Fragment key={m?.rg || mIdx}>
                          {mIdx > 0 && <span className="text-slate-400 font-normal mx-0.5">/</span>}
                          <span className="whitespace-nowrap">{renderMilitar(m)}</span>
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="text-slate-300 font-semibold text-[8.5px] select-none">—</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleAdminRoleVisibility(roleKey)}
                    className="print:hidden opacity-0 group-hover/admin-row:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 ml-1 cursor-pointer h-3 flex items-center shrink-0"
                    title={`Desativar ${item.label} no Gerar Escala`}
                  >
                    <EyeOff className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600" />
                  </button>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* COLUNA DIREITA (72%): SENTINELAS + COMUNICANTES + PERMUTAS */}
      <div className="w-[72%] flex flex-col justify-between">
        <div className="flex-1 flex w-full items-stretch">
          {/* SENTINELAS EM 2 COLUNAS */}
          <div
            className={cn(
              'flex-1 flex flex-col min-w-0 group/sent-col',
              hasRightCol ? 'border-r-2 border-black' : ''
            )}
          >
            <div
              className={cn(
                'py-1 px-2 uppercase border-b border-black text-center escala-ala-header font-bold text-[10px] sm:text-[10.5px] flex items-center justify-center relative',
                headerColorClass
              )}
              style={headerBgStyle}
            >
              <span>SENTINELAS:</span>
              <button
                type="button"
                onClick={() => toggleAdminRoleVisibility('SENTINELA')}
                className="print:hidden opacity-0 group-hover/sent-col:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 cursor-pointer absolute right-1.5"
                title={
                  isSentinelaVisible
                    ? 'Desativar Sentinelas no Gerar Escala'
                    : 'Ativar Sentinelas no Gerar Escala'
                }
              >
                {isSentinelaVisible ? (
                  <EyeOff className="w-2.5 h-2.5 text-slate-700 hover:text-rose-700" />
                ) : (
                  <Eye className="w-2.5 h-2.5 text-emerald-700" />
                )}
              </button>
            </div>

            {isSentinelaVisible ? (
              <div className="flex-1 grid grid-cols-2 divide-x divide-black text-[9.5px] sm:text-[10px]">
                {(() => {
                  const rawList =
                    sentinelas && sentinelas.length > 0
                      ? sentinelas
                      : [null, null, null, null];

                  const pairedList = rawList.map((m: any, idx: number) => {
                    const slot = propSentinelaSlots?.[idx];
                    const horario = slot?.horario || horariosNorte[idx] || '';
                    const isMotorista = slot?.tipo === 'motorista';
                    const filled = hasMilitar(m);
                    const startTime = getEarliestStartTime(horario);
                    return { m, slot, horario, isMotorista, filled, startTime, originalIdx: idx };
                  });

                  pairedList.sort((a, b) => {
                    if (a.startTime !== b.startTime) {
                      return a.startTime - b.startTime;
                    }
                    return a.originalIdx - b.originalIdx;
                  });

                  const numberedList = pairedList.map((item, idx) => ({
                    ...item,
                    displayOrder: idx + 1
                  }));
                  const half = Math.ceil(numberedList.length / 2);
                  const colLeft = numberedList.slice(0, half);
                  const colRight = numberedList.slice(half);

                  const renderSentinelaCol = (colItems: typeof numberedList) => (
                    <div className="flex flex-col justify-start py-1 px-2 gap-1.5">
                      {colItems.map((item) => (
                        <div
                          key={item.displayOrder}
                          className="flex flex-col w-full leading-tight py-[1px]"
                        >
                          {/* Linha 1: Turno + Badge Motorista + Militar */}
                          <div className="flex items-center gap-1.5 min-w-0 w-full">
                            <span className="font-black shrink-0 text-[9.5px] sm:text-[10px] text-slate-900">
                              {item.displayOrder}º
                            </span>
                            {item.isMotorista && (
                              <span className="text-[7px] font-black px-1 py-0 bg-amber-100 text-amber-900 border border-amber-300 rounded shrink-0">
                                MOT
                              </span>
                            )}
                            <div className="flex-1 min-w-0 font-bold text-black text-[9.5px] sm:text-[10px] leading-tight">
                              {item.filled ? (
                                renderMilitar(item.m)
                              ) : (
                                <span className="opacity-0 select-none">&nbsp;</span>
                              )}
                            </div>
                          </div>

                          {/* Linha 2 (Abaixo): Horário do Turno */}
                          {item.horario && item.filled && (
                            <div className="w-full text-slate-600 font-mono text-[8px] sm:text-[8.5px] tracking-tight leading-tight mt-0.5 pl-3">
                              {item.horario}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );

                  return (
                    <>
                      {renderSentinelaCol(colLeft)}
                      {renderSentinelaCol(colRight)}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="py-1 px-2 text-center text-slate-400 italic text-[9px]">
                &nbsp;
              </div>
            )}
          </div>

          {/* COMUNICANTES E OUTROS (ocupa ~14.5% do total da folha) */}
          {hasRightCol && (
            <div className="w-[23.5%] shrink-0 flex flex-col justify-between font-bold">
              {rightSubSections.map((sec, sIdx) => (
                <div key={sec.key} className="flex flex-col flex-1">
                  <div
                    className={cn(
                      'py-0.5 px-1 uppercase border-b border-black text-center escala-ala-header font-bold text-[8.5px] sm:text-[9px] shrink-0',
                      sIdx > 0 ? 'border-t border-black' : '',
                      headerColorClass
                    )}
                    style={headerBgStyle}
                  >
                    {sec.title}
                  </div>
                  <div className="flex-1 min-h-[18px] flex flex-col items-center justify-center py-0.5 px-1 font-bold text-center relative group/right-sec text-[9px] sm:text-[9.5px] gap-0.5">
                    {sec.militars.length > 0 ? (
                      sec.militars.map((m: any, idx: number) => (
                        <div
                          key={m?.rg || idx}
                          className="whitespace-normal break-words w-full leading-tight"
                        >
                          {renderMilitar(m)}
                        </div>
                      ))
                    ) : (
                      <span className="opacity-0 select-none text-[8px]">&nbsp;</span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleAdminRoleVisibility(sec.key)}
                      className="print:hidden opacity-0 group-hover/right-sec:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 absolute right-0.5 top-0.5 cursor-pointer"
                      title={sec.toggleTitle}
                    >
                      <EyeOff className="w-2 h-2 text-slate-400 hover:text-rose-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PARTE INFERIOR: PERMUTAS AUTORIZADAS */}
        <div className="border-t-2 border-black flex flex-col w-full shrink-0">
          <div
            className={cn(
              headerColorClass,
              'border-b border-black font-bold uppercase text-center py-0.5 px-1 text-[9.5px] sm:text-[10px] escala-ala-header'
            )}
            style={headerBgStyle}
          >
            PERMUTAS AUTORIZADAS:
          </div>
          <div className="py-1.5 px-2.5 min-h-[26px]">
            {permutasAtivas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-x-3 print:gap-x-2 gap-y-1.5 print:gap-y-1 items-start">
                {permutasAtivas.map((p: any, idx: number) => {
                  const subMilitar = p.sub;
                  const reqMilitar = p.req;
                  const subRg = subMilitar?.rg || p.raw?.substituteRg || '';
                  const reqRg = reqMilitar?.rg || p.raw?.requesterRg || '';

                  return (
                    <div
                      key={idx}
                      className="inline-flex items-start gap-1.5 py-0.5 min-w-0"
                    >
                      {/* Rótulos: ENTRA (em cima) e SAI (em baixo com símbolo de permuta) */}
                      <div className="flex flex-col shrink-0 gap-0.5 justify-center min-w-[44px]">
                        <span className="font-black text-[8.5px] sm:text-[9px] print:text-[8.5px] uppercase tracking-tight text-slate-900 leading-tight">
                          ENTRA:
                        </span>
                        <span className="font-black text-[8.5px] sm:text-[9px] print:text-[8.5px] uppercase tracking-tight text-slate-900 leading-tight flex items-center gap-1">
                          SAI :
                          <span className="inline-flex items-center justify-center bg-amber-500 text-white rounded-[2px] w-3 h-3 shrink-0 shadow-2xs">
                            <ArrowLeftRight className="w-2 h-2 text-white stroke-[2.5]" />
                          </span>
                        </span>
                      </div>

                      {/* Militares: Posto/Graduação e Nome com RG entre parênteses */}
                      <div className="flex flex-col min-w-0 gap-0.5 justify-center overflow-hidden">
                        <div className="text-[8.5px] sm:text-[9px] print:text-[8.5px] font-bold text-black uppercase leading-tight flex items-center gap-1 whitespace-nowrap">
                          {renderMilitar(subMilitar, { hideRank: false, hidePermutaBadge: true })}
                          {subRg && (
                            <span className="font-bold text-black">
                              ({subRg})
                            </span>
                          )}
                        </div>
                        <div className="text-[8.5px] sm:text-[9px] print:text-[8.5px] font-bold text-black uppercase leading-tight flex items-center gap-1 whitespace-nowrap">
                          {renderMilitar(reqMilitar, { hideRank: false, hidePermutaBadge: true })}
                          {reqRg && (
                            <span className="font-bold text-black">
                              ({reqRg})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full text-center font-normal text-slate-500 italic text-[9.5px] py-0.5">
                Nenhuma permuta foi realizada.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
