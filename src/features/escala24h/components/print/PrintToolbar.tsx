import React from 'react';
import {
  Printer,
  X,
  Image as ImageIcon,
  PenTool,
  Save,
  Shield,
  ExternalLink,
  EyeOff,
  ChevronDown,
  Maximize2,
  Minimize2,
  Columns,
  Rows,
  List
} from 'lucide-react';
import { cn } from '../../../../lib/utils';

export interface PrintToolbarProps {
  isExpandedView: boolean;
  setIsExpandedView: (v: boolean) => void;
  setShowLogoModal: (v: boolean) => void;
  showVisualMode: boolean;
  setShowVisualMode: (v: boolean) => void;
  showOfficerMenu: boolean;
  setShowOfficerMenu: (v: boolean) => void;
  officerMenuRef: React.RefObject<HTMLDivElement>;
  hasAnyVisibleOfficer: boolean;
  activeOfficerCount: number;
  totalOfficerCount?: number;
  enabledOfficerItems?: Array<{ id: string; key: string; label: string; isVisible: boolean }>;
  isDiaVisible: boolean;
  isNauticaVisible: boolean;
  isMedicoVisible: boolean;
  toggleOfficerVisibility: (key: any) => void;
  setAllOfficersVisibility: (v: boolean) => void;
  officerTableLayout: 'colunas' | 'linhas';
  setOfficerTableLayout: (layout: 'colunas' | 'linhas') => void;
  viaturaTableLayout: 'duplo' | 'classico' | 'antigo';
  setViaturaTableLayout: (layout: 'duplo' | 'classico' | 'antigo') => void;
  showAdminMenu: boolean;
  setShowAdminMenu: (v: boolean) => void;
  adminMenuRef: React.RefObject<HTMLDivElement>;
  isAdminRoleVisible: (roleKey: string) => boolean;
  toggleAdminRoleVisibility: (roleKey: string) => void;
  setAllAdminRolesVisibility: (v: boolean) => void;
  isSigned: boolean;
  setIsSigned: (v: boolean) => void;
  isRegistering: boolean;
  onRegister?: (data: { isSigned: boolean }) => Promise<void> | void;
  handlePrintEscala: () => void;
  printFallbackUrl: string | null;
  onClose?: () => void;
  hasPostos?: boolean;
  isPostosVisible?: boolean;
  setIsPostosVisible?: (v: boolean) => void;
}

export function PrintToolbar({
  isExpandedView,
  setIsExpandedView,
  setShowLogoModal,
  showVisualMode,
  setShowVisualMode,
  showOfficerMenu,
  setShowOfficerMenu,
  officerMenuRef,
  hasAnyVisibleOfficer,
  activeOfficerCount,
  totalOfficerCount,
  enabledOfficerItems,
  isDiaVisible,
  isNauticaVisible,
  isMedicoVisible,
  toggleOfficerVisibility,
  setAllOfficersVisibility,
  officerTableLayout,
  setOfficerTableLayout,
  viaturaTableLayout,
  setViaturaTableLayout,
  showAdminMenu,
  setShowAdminMenu,
  adminMenuRef,
  isAdminRoleVisible,
  toggleAdminRoleVisibility,
  setAllAdminRolesVisibility,
  isSigned,
  setIsSigned,
  isRegistering,
  onRegister,
  handlePrintEscala,
  printFallbackUrl,
  onClose,
  hasPostos,
  isPostosVisible = true,
  setIsPostosVisible
}: PrintToolbarProps) {
  return (
    <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/80 px-4 py-2.5 flex items-center justify-between gap-3 print:hidden shadow-lg">
      <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
        <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-black uppercase tracking-wider text-[10px]">
          {isExpandedView ? 'Visualização Expandida' : 'Folha A4 (210 × 297 mm)'}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          type="button"
          onClick={() => setIsExpandedView(!isExpandedView)}
          className={cn(
            'px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-2xs border',
            isExpandedView
              ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border-indigo-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
          )}
          title={isExpandedView ? 'Voltar para a simulação de Folha A4' : 'Expandir para visualização ampla da escala'}
        >
          {isExpandedView ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-indigo-700" />
              <span>Folha A4</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-slate-700" />
              <span>Expandir</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowLogoModal(true)}
          className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs text-xs"
          title="Configurar brasões do cabeçalho e marca d'água central de fundo da escala"
        >
          <Shield className="w-4 h-4 text-amber-700" />
          <span>Brasões & Marca d'Água</span>
        </button>

        <button
          type="button"
          onClick={() => setShowVisualMode(!showVisualMode)}
          className="bg-slate-200 text-slate-800 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 hover:bg-slate-300 cursor-pointer text-xs"
        >
          <ImageIcon className="w-4 h-4" /> {showVisualMode ? 'Modo Texto' : 'Modo Visual'}
        </button>

        {/* Alternador de Layout das Viaturas */}
        <div className="flex items-center bg-slate-800 border border-slate-700 p-0.5 rounded-lg text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setViaturaTableLayout('duplo')}
            className={cn(
              'px-2.5 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5',
              viaturaTableLayout === 'duplo'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-300 hover:text-white'
            )}
            title="Chefe e Condutor lado a lado, e Auxiliares em duplas (design moderno e limpo)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Dividido (2 Col)</span>
          </button>
          <button
            type="button"
            onClick={() => setViaturaTableLayout('classico')}
            className={cn(
              'px-2.5 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5',
              viaturaTableLayout === 'classico'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-300 hover:text-white'
            )}
            title="Formato clássico com barras cinzas individuais para cada função"
          >
            <Rows className="w-3.5 h-3.5" />
            <span>Barras Cinzas</span>
          </button>
          <button
            type="button"
            onClick={() => setViaturaTableLayout('antigo')}
            className={cn(
              'px-2.5 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5',
              viaturaTableLayout === 'antigo'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-300 hover:text-white'
            )}
            title="Versão anterior com função e militar na mesma linha horizontal"
          >
            <List className="w-3.5 h-3.5" />
            <span>Texto em Linha</span>
          </button>
        </div>

        {/* Seletor/Menu de Funções dos Oficiais */}
        <div className="relative" ref={officerMenuRef}>
          <button
            type="button"
            onClick={() => setShowOfficerMenu(!showOfficerMenu)}
            className={cn(
              'border px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs text-xs',
              hasAnyVisibleOfficer
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
            )}
            title="Ativar ou desativar o aparecimento das funções dos oficiais no arquivo de escala"
          >
            {hasAnyVisibleOfficer ? (
              <Shield className="w-4 h-4 text-indigo-700" />
            ) : (
              <EyeOff className="w-4 h-4 text-rose-600" />
            )}
            <span>Oficiais ({activeOfficerCount}/{totalOfficerCount ?? 3})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showOfficerMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-300 rounded-xl shadow-2xl p-3 z-50 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Funções dos Oficiais
                </span>
                <button
                  type="button"
                  onClick={() => setAllOfficersVisibility(!hasAnyVisibleOfficer)}
                  className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                >
                  {hasAnyVisibleOfficer ? 'Desativar Todos' : 'Ativar Todos'}
                </button>
              </div>

              <div className="space-y-1.5">
                {enabledOfficerItems && enabledOfficerItems.length > 0 ? (
                  enabledOfficerItems.map((item) => (
                    <label key={item.key} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <span className="text-[11px] font-bold text-slate-800">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.isVisible}
                        onChange={() => toggleOfficerVisibility(item.key)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </label>
                  ))
                ) : (
                  <>
                    <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <span className="text-[11px] font-bold text-slate-800">Oficial de Dia</span>
                      <input
                        type="checkbox"
                        checked={isDiaVisible}
                        onChange={() => toggleOfficerVisibility('showOficialDia')}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <span className="text-[11px] font-bold text-slate-800">Oficial da Náutica</span>
                      <input
                        type="checkbox"
                        checked={isNauticaVisible}
                        onChange={() => toggleOfficerVisibility('showOficialNautica')}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <span className="text-[11px] font-bold text-slate-800">Oficial Médico</span>
                      <input
                        type="checkbox"
                        checked={isMedicoVisible}
                        onChange={() => toggleOfficerVisibility('showOficialMedico')}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 mt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Estilo da Tabela
                </span>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setOfficerTableLayout('colunas')}
                    className={cn(
                      'py-1 rounded-md transition-all cursor-pointer text-center',
                      officerTableLayout === 'colunas'
                        ? 'bg-white text-indigo-700 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Colunas
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfficerTableLayout('linhas')}
                    className={cn(
                      'py-1 rounded-md transition-all cursor-pointer text-center',
                      officerTableLayout === 'linhas'
                        ? 'bg-white text-indigo-700 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Linhas
                  </button>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                <span>Salvo no Gerar Escala</span>
                <button
                  type="button"
                  onClick={() => setShowOfficerMenu(false)}
                  className="text-slate-700 font-bold hover:underline"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Seletor/Menu de Funções Administrativas */}
        <div className="relative" ref={adminMenuRef}>
          <button
            type="button"
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            className="border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs text-xs"
            title="Ativar ou desativar o aparecimento das funções administrativas no arquivo de escala"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Funções Admin</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showAdminMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-300 rounded-xl shadow-2xl p-3 z-50 text-left max-h-[420px] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Funções Administrativas
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAllAdminRolesVisibility(true)}
                    className="text-[9px] font-black uppercase text-emerald-600 hover:text-emerald-800 cursor-pointer underline"
                  >
                    Ativar
                  </button>
                  <span className="text-slate-300 text-xs">/</span>
                  <button
                    type="button"
                    onClick={() => setAllAdminRolesVisibility(false)}
                    className="text-[9px] font-black uppercase text-rose-600 hover:text-rose-800 cursor-pointer underline"
                  >
                    Ocultar
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { key: 'ADJUNTO', label: 'Adjunto' },
                  { key: 'ENCARREGADO DE MOTORISTA', label: 'Enc. Motorista' },
                  { key: 'RESP FAXINA', label: 'Enc. Faxina' },
                  { key: 'SGT DIA', label: 'Sargento de Dia' },
                  { key: 'CMT GUARDA', label: 'Comandante da Guarda' },
                  { key: 'DIA AO DEPOSITO', label: 'Dia ao Depósito' },
                  { key: 'ABASTECEDOR', label: 'Abastecedor' },
                  { key: 'CB DIA', label: 'Cabo de Dia' },
                  { key: 'CB GUARDA', label: 'Cabo da Guarda' },
                  { key: 'COMUNICANTE 1', label: 'Comunicante 1' },
                  { key: 'COMUNICANTE 2', label: 'Comunicante 2' },
                  { key: 'SENTINELA', label: 'Sentinelas' },
                  { key: 'AUXILIAR RANCHO', label: 'Auxiliar Rancho' },
                  { key: 'TOQUE DE FOGO', label: 'Toque de Fogo' }
                ].map((item) => {
                  const isVis = isAdminRoleVisible(item.key);
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      <span className="text-[11px] font-bold text-slate-800">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isVis}
                        onChange={() => toggleAdminRoleVisibility(item.key)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                <span>Salvo no Gerar Escala</span>
                <button
                  type="button"
                  onClick={() => setShowAdminMenu(false)}
                  className="text-slate-700 font-bold hover:underline"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Seção Postos de Serviço (Praia / Salvamar) */}
        {hasPostos && (
          <button
            type="button"
            onClick={() => setIsPostosVisible && setIsPostosVisible(!isPostosVisible)}
            className={cn(
              "px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs text-xs border",
              isPostosVisible
                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300 line-through opacity-75"
            )}
            title={isPostosVisible ? "Ocultar seção de Postos no Gerar Escala" : "Exibir seção de Postos no Gerar Escala"}
          >
            <span>Postos (Praia)</span>
            <span
              className={cn(
                "text-[9px] px-1 py-0.2 rounded font-black",
                isPostosVisible ? "bg-emerald-200/80 text-emerald-900" : "bg-slate-200 text-slate-600"
              )}
            >
              {isPostosVisible ? "Ativo" : "Oculto"}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsSigned(true)}
          disabled={isSigned}
          className="bg-amber-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer text-xs"
        >
          <PenTool className="w-4 h-4" /> {isSigned ? 'Assinado' : 'Assinar'}
        </button>

        <button
          type="button"
          onClick={async () => {
            if (onRegister) await onRegister({ isSigned });
          }}
          disabled={isRegistering}
          className="bg-emerald-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 hover:bg-emerald-500 cursor-pointer text-xs"
        >
          <Save className="w-4 h-4" /> Registrar
        </button>

        <button
          type="button"
          onClick={handlePrintEscala}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 text-xs"
          title="Imprimir ou Salvar Escala de Serviço em PDF"
        >
          <Printer className="w-4 h-4" /> Imprimir
        </button>

        {printFallbackUrl && (
          <a
            href={printFallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-sm"
            title="Clique para abrir a escala em nova aba e imprimir/salvar em PDF"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir para Imprimir
          </a>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 text-slate-800 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 hover:bg-slate-300 cursor-pointer text-xs"
          >
            <X className="w-4 h-4" /> Fechar
          </button>
        )}
      </div>
    </div>
  );
}
