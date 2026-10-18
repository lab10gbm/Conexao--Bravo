import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { LogoDecimoGbm } from '../../../../components/LogoDecimoGbm';
import { LogoCbaSete } from '../../../../components/LogoCbaSete';
import { cn } from '../../../../lib/utils';

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
  toggleOfficerVisibility: (key: 'showOficialDia' | 'showOficialNautica' | 'showOficialMedico') => void;
  oficialDia?: string;
  oficialNautica?: string;
  oficialMedico?: string;
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
  oficialMedico
}: PrintHeaderOficiaisProps) {
  return (
    <div className="flex flex-col w-full mb-2 border-b border-black mt-1 print:mt-4 text-center justify-between">
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
          <div className="font-bold flex flex-col justify-start items-center text-center px-1 flex-1 leading-tight -mt-0.5 sm:-mt-1 pt-0">
            <div className="text-[13px] sm:text-[14px] flex flex-col justify-start items-center text-center tracking-tight leading-tight">
              <span>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</span>
              <span>COMANDO DE BOMBEIROS DA COSTA VERDE</span>
              <span>DÉCIMO GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS</span>
            </div>

            {/* Texto da Escala integrado */}
            <div className="flex flex-wrap justify-center items-center gap-1.5 text-sm sm:text-base font-bold mt-2 sm:mt-2.5 tracking-tight">
              <span>ESCALA DE SERVIÇO PARA O DIA:</span>
              <span>{dateStr}</span>
            </div>
          </div>

          {/* Lado direito: CBA7 */}
          <div
            onClick={() => setShowLogoModal(true)}
            className="w-20 h-24 sm:w-24 sm:h-28 print:w-[86px] print:h-[102px] flex items-start justify-center shrink-0 cursor-pointer relative group rounded-sm hover:outline hover:outline-1 hover:outline-emerald-400 transition-transform hover:scale-102 ml-2 sm:ml-4 pt-0"
            title="CBA VII - Clique para carregar ou alterar esta imagem"
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
          'w-full border-t-2 border-x-2 border-b border-black py-0.5 px-2 text-center font-black uppercase text-[10px] sm:text-[11px] tracking-wider leading-tight escala-ala-header',
          headerColorClass
        )}
        style={headerBgStyle}
      >
        {alaCustomNames[String(alaTheme.num)] || alaTheme.name}
      </div>

      {/* OFICIAIS TABLE */}
      {officerTableLayout === 'linhas' ? (
        <table className="w-full border-collapse border-x-2 border-b border-black table-fixed text-xs select-none">
          <tbody>
            <tr className="border-b border-black group/officer-row h-[18px]">
              <td
                className={cn(
                  'w-[42%] sm:w-[38%] border-r border-black px-2.5 py-0.5 font-bold uppercase text-[9px] sm:text-[10px] text-left escala-ala-header',
                  headerColorClass
                )}
                style={headerBgStyle}
              >
                <div className="flex items-center justify-between">
                  <span>OFICIAL DE DIA E PRONTIDÃO:</span>
                  <button
                    type="button"
                    onClick={() => toggleOfficerVisibility('showOficialDia')}
                    className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer"
                    title={isDiaVisible ? 'Desativar Oficial de Dia' : 'Ativar Oficial de Dia'}
                  >
                    {isDiaVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </td>
              <td className="px-3 py-0.5 font-bold uppercase text-[10.5px] sm:text-[11px] text-left">
                {isDiaVisible ? (
                  oficialDia ? (
                    <span className="font-black underline">{oficialDia}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                  )
                ) : (
                  <span className="opacity-0 select-none">&nbsp;</span>
                )}
              </td>
            </tr>
            <tr className="border-b border-black group/officer-row h-[18px]">
              <td
                className={cn(
                  'w-[42%] sm:w-[38%] border-r border-black px-2.5 py-0.5 font-bold uppercase text-[9px] sm:text-[10px] text-left escala-ala-header',
                  headerColorClass
                )}
                style={headerBgStyle}
              >
                <div className="flex items-center justify-between">
                  <span>OFICIAL DA NÁUTICA:</span>
                  <button
                    type="button"
                    onClick={() => toggleOfficerVisibility('showOficialNautica')}
                    className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer"
                    title={isNauticaVisible ? 'Desativar Oficial da Náutica' : 'Ativar Oficial da Náutica'}
                  >
                    {isNauticaVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </td>
              <td className="px-3 py-0.5 font-bold uppercase text-[10.5px] sm:text-[11px] text-left">
                {isNauticaVisible ? (
                  oficialNautica ? (
                    <span className="font-black underline">{oficialNautica}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                  )
                ) : (
                  <span className="opacity-0 select-none">&nbsp;</span>
                )}
              </td>
            </tr>
            <tr className="group/officer-row h-[18px]">
              <td
                className={cn(
                  'w-[42%] sm:w-[38%] border-r border-black px-2.5 py-0.5 font-bold uppercase text-[9px] sm:text-[10.5px] text-left escala-ala-header',
                  headerColorClass
                )}
                style={headerBgStyle}
              >
                <div className="flex items-center justify-between">
                  <span>OFICIAL MÉDICO:</span>
                  <button
                    type="button"
                    onClick={() => toggleOfficerVisibility('showOficialMedico')}
                    className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer"
                    title={isMedicoVisible ? 'Desativar Oficial Médico' : 'Ativar Oficial Médico'}
                  >
                    {isMedicoVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </td>
              <td className="px-3 py-0.5 font-bold uppercase text-[10.5px] sm:text-[11px] text-left">
                {isMedicoVisible ? (
                  oficialMedico ? (
                    <span className="font-black underline">{oficialMedico}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                  )
                ) : (
                  <span className="opacity-0 select-none">&nbsp;</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        /* 3 COLUNAS LADO A LADO */
        <table className="w-full border-collapse border-x-2 border-b border-black table-fixed text-xs select-none">
          <thead>
            <tr
              className={cn(
                'font-bold border-b border-black text-center text-[9px] sm:text-[10px] uppercase tracking-tight leading-none escala-ala-header',
                headerColorClass
              )}
              style={headerBgStyle}
            >
              <th className="border-r border-black py-[2px] px-1.5 w-[34%] escala-ala-header relative group/officer-col">
                <div className="flex items-center justify-center relative">
                  <span className="truncate">OFICIAL DE DIA E PRONTIDÃO</span>
                  <button
                    type="button"
                    onClick={() => toggleOfficerVisibility('showOficialDia')}
                    className="print:hidden opacity-0 group-hover/officer-col:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer absolute right-0"
                    title={isDiaVisible ? 'Desativar Oficial de Dia' : 'Ativar Oficial de Dia'}
                  >
                    {isDiaVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </th>
              <th className="border-r border-black py-[2px] px-1.5 w-[33%] escala-ala-header relative group/officer-col">
                <div className="flex items-center justify-center relative">
                  <span className="truncate">OFICIAL DA NÁUTICA</span>
                  <button
                    type="button"
                    onClick={() => toggleOfficerVisibility('showOficialNautica')}
                    className="print:hidden opacity-0 group-hover/officer-col:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer absolute right-0"
                    title={isNauticaVisible ? 'Desativar Oficial da Náutica' : 'Ativar Oficial da Náutica'}
                  >
                    {isNauticaVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </th>
              <th className="py-[2px] px-1.5 w-[33%] escala-ala-header relative group/officer-col">
                <div className="flex items-center justify-center relative">
                  <span className="truncate">OFICIAL MÉDICO</span>
                  <button
                    type="button"
                    onClick={() => toggleOfficerVisibility('showOficialMedico')}
                    className="print:hidden opacity-0 group-hover/officer-col:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer absolute right-0"
                    title={isMedicoVisible ? 'Desativar Oficial Médico' : 'Ativar Oficial Médico'}
                  >
                    {isMedicoVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center font-bold text-[11px] uppercase h-5 sm:h-6">
              <td className="border-r border-black py-0.5 px-1.5 align-middle">
                {isDiaVisible ? (
                  oficialDia ? (
                    <span className="font-black underline tracking-tight">{oficialDia}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                  )
                ) : (
                  <span className="opacity-0 select-none">&nbsp;</span>
                )}
              </td>
              <td className="border-r border-black py-0.5 px-1.5 align-middle">
                {isNauticaVisible ? (
                  oficialNautica ? (
                    <span className="font-black underline tracking-tight">{oficialNautica}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                  )
                ) : (
                  <span className="opacity-0 select-none">&nbsp;</span>
                )}
              </td>
              <td className="py-0.5 px-1.5 align-middle">
                {isMedicoVisible ? (
                  oficialMedico ? (
                    <span className="font-black underline tracking-tight">{oficialMedico}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                  )
                ) : (
                  <span className="opacity-0 select-none">&nbsp;</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
