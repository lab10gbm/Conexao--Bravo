import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { LogoDecimoGbm } from '../../../../components/LogoDecimoGbm';
import { LogoCbaSete } from '../../../../components/LogoCbaSete';
import { cn } from '../../../../lib/utils';
import { UserProfile } from '../../../../types';
import { resolveCanonicalScope, getCanonicalRegionalCommand, getCanonicalUnit } from '../../../../lib/canonicalScope';

export interface ActiveOfficerItem {
  id: string;
  key: string;
  title: string;
  value?: string;
  isVisible: boolean;
}

export interface PrintHeaderOficiaisProps {
  setShowLogoModal: (v: boolean) => void;
  dateStr: string;
  alaTheme: { num: number; name: string; bgHex: string; bgClass: string };
  alaCustomNames: Record<string, string>;
  headerColorClass: string;
  headerBgStyle: React.CSSProperties;
  officerTableLayout: 'colunas' | 'linhas';
  isDiaVisible: boolean;
  isNauticaVisible: boolean;
  isMedicoVisible: boolean;
  toggleOfficerVisibility: (key: any) => void;
  oficialDia?: string;
  oficialNautica?: string;
  oficialMedico?: string;
  activeOfficers?: ActiveOfficerItem[];
  obmContext?: string;
  user?: UserProfile;
}

export function PrintHeaderOficiais({
  setShowLogoModal,
  dateStr,
  alaTheme,
  alaCustomNames,
  headerColorClass,
  headerBgStyle,
  officerTableLayout,
  isDiaVisible,
  isNauticaVisible,
  isMedicoVisible,
  toggleOfficerVisibility,
  oficialDia,
  oficialNautica,
  oficialMedico,
  activeOfficers,
  obmContext,
  user
}: PrintHeaderOficiaisProps) {
  // Resolução dinâmica do escopo canônico da OBM imersa
  const effectiveObm = (obmContext && obmContext !== 'GLOBAL') ? obmContext : (user?.obm || '10º GBM');
  const scope = resolveCanonicalScope(effectiveObm);
  const regionalCommand = getCanonicalRegionalCommand(scope?.cbaId);
  const cbaName = regionalCommand?.name || 'Comando de Bombeiro de Área VII – Costa Verde';
  const cbaShortName = regionalCommand?.shortName || 'CBA VII';

  const unit = getCanonicalUnit(scope?.unitId || '10_gbm');
  const unitName = scope?.unitId === '10_gbm'
    ? 'DÉCIMO GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS'
    : (unit?.name ? unit.name.toUpperCase() : 'DÉCIMO GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS');

  // Monta lista apenas com as funções ativas configuradas
  const items: ActiveOfficerItem[] = activeOfficers !== undefined
    ? activeOfficers
    : [
        ...(isDiaVisible ? [{ id: 'dia', key: 'showOficialDia', title: 'OFICIAL DE DIA E PRONTIDÃO', value: oficialDia, isVisible: true }] : []),
        ...(isNauticaVisible ? [{ id: 'nautica', key: 'showOficialNautica', title: 'OFICIAL DA NÁUTICA', value: oficialNautica, isVisible: true }] : []),
        ...(isMedicoVisible ? [{ id: 'medico', key: 'showOficialMedico', title: 'OFICIAL MÉDICO', value: oficialMedico, isVisible: true }] : []),
      ];

  return (
    <div className="flex flex-col w-full mb-2 border-b border-black mt-0.5 print:mt-1 text-center justify-between">
      <div className="flex flex-col w-full">
        <div className="flex items-start justify-between w-full mt-0 mb-1 px-2 sm:px-5 print:px-3 pl-3 sm:pl-5">
          {/* Lado esquerdo: Décimo GBM */}
          <div
            onClick={() => setShowLogoModal(true)}
            className="w-20 h-24 sm:w-24 sm:h-28 print:w-[86px] print:h-[102px] flex items-start justify-center shrink-0 cursor-pointer relative group rounded-sm hover:outline hover:outline-1 hover:outline-red-400 transition-transform hover:scale-102 mr-2 sm:mr-4 pt-0"
            title="10º GBM - Clique para carregar ou alterar esta imagem"
          >
            <LogoDecimoGbm
              className="w-full h-full object-contain object-top max-h-[92px] sm:max-h-[105px] print:max-h-[96px]"
              allowUpload={true}
            />
          </div>

          {/* Centro: Cabeçalho Oficial unificado */}
          <div className="font-bold flex flex-col justify-start items-center text-center px-1 flex-1 leading-tight -mt-1 sm:-mt-1.5 pt-0">
            <div className="text-[13px] sm:text-[14px] flex flex-col justify-start items-center text-center tracking-tight leading-tight uppercase">
              <span>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</span>
              <span>{cbaName.toUpperCase()}</span>
              <span>{unitName.toUpperCase()}</span>
            </div>

            {/* Texto da Escala integrado */}
            <div className="flex flex-wrap justify-center items-center gap-1.5 text-sm sm:text-base font-bold mt-1.5 sm:mt-2 tracking-tight">
              <span>ESCALA DE SERVIÇO PARA O DIA:</span>
              <span>{dateStr}</span>
            </div>
          </div>

          {/* Lado direito: CBA */}
          <div
            onClick={() => setShowLogoModal(true)}
            className="w-20 h-24 sm:w-24 sm:h-28 print:w-[86px] print:h-[102px] flex items-start justify-center shrink-0 cursor-pointer relative group rounded-sm hover:outline hover:outline-1 hover:outline-emerald-400 transition-transform hover:scale-102 ml-2 sm:ml-4 pt-0"
            title={`${cbaShortName} - Clique para carregar ou alterar esta imagem`}
          >
            <LogoCbaSete
              className="w-full h-full object-contain object-top max-h-[92px] sm:max-h-[105px] print:max-h-[96px]"
              allowUpload={true}
            />
          </div>
        </div>
      </div>

      {/* CÉLULA HORIZONTAL DO NOME DA ALA ACIMA DOS OFICIAIS */}
      <div
        className={cn(
          'w-full border-t-2 border-x-2 border-black py-0.5 px-2 text-center font-black uppercase text-[10px] sm:text-[11px] tracking-wider leading-tight escala-ala-header',
          items.length > 0 ? 'border-b' : 'border-b-2',
          headerColorClass
        )}
        style={headerBgStyle}
      >
        {alaCustomNames[String(alaTheme.num)] || alaTheme.name}
      </div>

      {/* OFICIAIS TABLE - APENAS SE HOUVER FUNÇÕES ATIVAS */}
      {items.length > 0 && (
        officerTableLayout === 'linhas' ? (
          <table className="w-full border-collapse border-x-2 border-b-2 border-black table-fixed text-xs select-none">
            <tbody>
              {items.map((officer, idx) => (
                <tr
                  key={officer.id}
                  className={cn(
                    "group/officer-row h-[18px]",
                    idx < items.length - 1 && "border-b border-black"
                  )}
                >
                  <td
                    className={cn(
                      'w-[42%] sm:w-[38%] border-r border-black px-2.5 py-0.5 font-bold uppercase text-[9px] sm:text-[10px] text-left escala-ala-header',
                      headerColorClass
                    )}
                    style={headerBgStyle}
                  >
                    <div className="flex items-center justify-between">
                      <span>{officer.title}:</span>
                      <button
                        type="button"
                        onClick={() => toggleOfficerVisibility(officer.key)}
                        className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer"
                        title={`Ocultar ${officer.title}`}
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-0.5 font-bold uppercase text-[10.5px] sm:text-[11px] text-left">
                    {officer.value ? (
                      <span className="font-black underline">{officer.value}</span>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* COLUNAS LADO A LADO - APENAS FUNÇÕES ATIVAS */
          <table className="w-full border-collapse border-x-2 border-b-2 border-black table-fixed text-xs select-none">
            <thead>
              <tr
                className={cn(
                  'font-bold border-b border-black text-center text-[9px] sm:text-[10px] uppercase tracking-tight leading-none escala-ala-header',
                  headerColorClass
                )}
                style={headerBgStyle}
              >
                {items.map((officer, idx) => {
                  const widthPercent = (100 / items.length).toFixed(2) + '%';
                  const isLast = idx === items.length - 1;
                  return (
                    <th
                      key={officer.id}
                      style={{ width: widthPercent }}
                      className={cn(
                        'py-[2px] px-1.5 escala-ala-header relative group/officer-col',
                        !isLast && 'border-r border-black'
                      )}
                    >
                      <div className="flex items-center justify-center relative">
                        <span className="truncate">{officer.title}</span>
                        <button
                          type="button"
                          onClick={() => toggleOfficerVisibility(officer.key)}
                          className="print:hidden opacity-0 group-hover/officer-col:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer absolute right-0"
                          title={`Ocultar ${officer.title}`}
                        >
                          <EyeOff className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="text-center font-bold text-[11px] uppercase h-5 sm:h-6">
                {items.map((officer, idx) => {
                  const widthPercent = (100 / items.length).toFixed(2) + '%';
                  const isLast = idx === items.length - 1;
                  return (
                    <td
                      key={officer.id}
                      style={{ width: widthPercent }}
                      className={cn(
                        'py-0.5 px-1.5 align-middle',
                        !isLast && 'border-r border-black'
                      )}
                    >
                      {officer.value ? (
                        <span className="font-black underline tracking-tight">{officer.value}</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
