import React from 'react';
import { cn } from '../../../lib/utils';
import { LogoManagerModal } from '../../../components/LogoManagerModal';
import { useEscalaPrintData, UseEscalaPrintDataProps } from '../hooks/useEscalaPrintData';
import { PrintToolbar } from './print/PrintToolbar';
import { PrintHeaderOficiais } from './print/PrintHeaderOficiais';
import { PrintViaturasTable } from './print/PrintViaturasTable';
import { PrintPostosTable } from './print/PrintPostosTable';
import { PrintAdminSentinelasPermutas } from './print/PrintAdminSentinelasPermutas';
import { PrintChamadaExpedienteGrd } from './print/PrintChamadaExpedienteGrd';

export function EscalaPrintView(props: UseEscalaPrintDataProps) {
  const data = useEscalaPrintData(props);

  // Configurações da Marca d'Água Central da Escala
  const [watermarkCustom, setWatermarkCustom] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem('escala_watermark_custom');
    } catch {
      return null;
    }
  });

  const [watermarkEnabled, setWatermarkEnabled] = React.useState<boolean>(() => {
    try {
      const val = localStorage.getItem('escala_watermark_enabled');
      return val !== null ? val === 'true' : true;
    } catch {
      return true;
    }
  });

  const [watermarkOpacity, setWatermarkOpacity] = React.useState<number>(() => {
    try {
      const val = localStorage.getItem('escala_watermark_opacity');
      if (!val || val === '0.08') {
        localStorage.setItem('escala_watermark_opacity', '0.18');
        return 0.18;
      }
      return parseFloat(val);
    } catch {
      return 0.18;
    }
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        setWatermarkCustom(localStorage.getItem('escala_watermark_custom'));
        const en = localStorage.getItem('escala_watermark_enabled');
        setWatermarkEnabled(en !== null ? en === 'true' : true);
        const op = localStorage.getItem('escala_watermark_opacity');
        setWatermarkOpacity(op ? parseFloat(op) : 0.18);
      } catch {}
    };
    window.addEventListener('logos_updated', handleUpdate);
    return () => window.removeEventListener('logos_updated', handleUpdate);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-slate-800/90 z-[200] overflow-y-auto print:absolute print:inset-0 print:bg-white print:z-[9999] print:block keep-light"
      data-theme="light"
    >
      {/* Barra de Ações Fixa no Topo */}
      <PrintToolbar
        isExpandedView={data.isExpandedView}
        setIsExpandedView={data.setIsExpandedView}
        setShowLogoModal={data.setShowLogoModal}
        showVisualMode={data.showVisualMode}
        setShowVisualMode={data.setShowVisualMode}
        showOfficerMenu={data.showOfficerMenu}
        setShowOfficerMenu={data.setShowOfficerMenu}
        officerMenuRef={data.officerMenuRef}
        hasAnyVisibleOfficer={data.hasAnyVisibleOfficer}
        activeOfficerCount={data.activeOfficerCount}
        totalOfficerCount={data.totalOfficerCount}
        enabledOfficerItems={data.enabledOfficerItems}
        isDiaVisible={data.isDiaVisible}
        isNauticaVisible={data.isNauticaVisible}
        isMedicoVisible={data.isMedicoVisible}
        toggleOfficerVisibility={data.toggleOfficerVisibility}
        setAllOfficersVisibility={data.setAllOfficersVisibility}
        officerTableLayout={data.officerTableLayout}
        setOfficerTableLayout={data.setOfficerTableLayout}
        viaturaTableLayout={data.viaturaTableLayout}
        setViaturaTableLayout={data.setViaturaTableLayout}
        showAdminMenu={data.showAdminMenu}
        setShowAdminMenu={data.setShowAdminMenu}
        adminMenuRef={data.adminMenuRef}
        isAdminRoleVisible={data.isAdminRoleVisible}
        toggleAdminRoleVisibility={data.toggleAdminRoleVisibility}
        setAllAdminRolesVisibility={data.setAllAdminRolesVisibility}
        isSigned={data.isSigned}
        setIsSigned={data.setIsSigned}
        isRegistering={data.isRegistering}
        onRegister={props.onRegister}
        handlePrintEscala={data.handlePrintEscala}
        printFallbackUrl={data.printFallbackUrl}
        onClose={props.onClose}
        hasPostos={data.hasPostos}
        isPostosVisible={data.isPostosVisible}
        setIsPostosVisible={data.setIsPostosVisible}
      />

      {/* Folha de Impressão */}
      <div
        id="escala-print-sheet"
        className={cn(
          'mx-auto bg-white print:my-0 print:shadow-none print:w-full print:max-w-none relative print:p-0 print:pt-8 print:px-3 text-black font-sans text-[11px] leading-tight flex flex-col transition-all duration-200 print:border-none print:ring-0 print:outline-none',
          data.isExpandedView
            ? 'max-w-[1200px] min-h-screen my-6 p-8 pt-5 shadow-2xl print:shadow-none print:border-none print:ring-0'
            : 'w-[210mm] max-w-[96vw] min-h-[297mm] my-6 p-[6mm] pt-[8.5mm] shadow-[0_25px_70px_rgba(0,0,0,0.65)] ring-1 ring-black/15 print:ring-0 print:border-none print:shadow-none print:outline-none'
        )}
      >
        <style>{`
          @page {
            size: A4 portrait;
            margin: 0 6mm 6mm 6mm;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 0 6mm 6mm 6mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            #escala-print-sheet {
              padding-top: 15.3mm !important;
              border: none !important;
              outline: none !important;
              box-shadow: none !important;
              ring: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              border: none !important;
              outline: none !important;
              box-shadow: none !important;
            }
            .escala-ala-header {
              background-color: ${data.alaTheme.bgHex} !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .escala-vtr-func-header {
              background-color: #dbe4ee !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .escala-watermark {
              position: absolute !important;
              inset: 0 !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              pointer-events: none !important;
              z-index: 10 !important;
              overflow: hidden !important;
            }
            .escala-watermark img {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        `}</style>

        {/* Marca d'Água Central da Escala */}
        {watermarkEnabled && (
          <div
            className="escala-watermark pointer-events-none select-none absolute inset-0 flex items-center justify-center z-10 overflow-hidden"
            aria-hidden="true"
          >
            <img
              src={watermarkCustom || '/brasao-cbmerj-watermark.png'}
              alt="Marca d'água CBMERJ"
              style={{
                opacity: watermarkOpacity,
                maxWidth: data.isExpandedView ? '560px' : '460px',
                maxHeight: data.isExpandedView ? '560px' : '460px',
                width: '58%',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
              className="transform -translate-y-4"
            />
          </div>
        )}

        {/* 1. Header & Oficiais */}
        <PrintHeaderOficiais
          setShowLogoModal={data.setShowLogoModal}
          dateStr={data.dateStr}
          alaTheme={data.alaTheme}
          alaCustomNames={data.alaCustomNames}
          headerColorClass={data.headerColorClass}
          headerBgStyle={data.headerBgStyle}
          officerTableLayout={data.officerTableLayout}
          isDiaVisible={data.isDiaVisible}
          isNauticaVisible={data.isNauticaVisible}
          isMedicoVisible={data.isMedicoVisible}
          toggleOfficerVisibility={data.toggleOfficerVisibility}
          oficialDia={props.oficialDia}
          oficialNautica={props.oficialNautica}
          oficialMedico={props.oficialMedico}
          activeOfficers={data.activeOfficerItems}
          obmContext={props.obmContext}
          user={props.user}
        />

        {/* 2. Viaturas */}
        <PrintViaturasTable
          viaturasInfo={props.viaturasInfo}
          baseRoster={props.baseRoster}
          selectedFunctions={props.selectedFunctions}
          permutasOut={props.permutasOut}
          militars={props.militars}
          headerColorClass={data.headerColorClass}
          headerBgStyle={data.headerBgStyle}
          renderMilitar={data.renderMilitar}
          getByFunc={data.getByFunc}
          shortDateStr={data.shortDateStr}
          viaturaTableLayout={data.viaturaTableLayout}
        />

        {/* 2.1 Postos de Serviço (Praia / Salvamar / Fixos) */}
        {data.isPostosVisible && (
          <PrintPostosTable
            postosEscalaEnabled={props.postosEscalaEnabled}
            postosData={props.postosData}
            availablePostosConfig={props.availablePostosConfig}
            baseRoster={props.baseRoster}
            militars={props.militars}
            permutasOut={props.permutasOut}
            headerColorClass={data.headerColorClass}
            headerBgStyle={data.headerBgStyle}
            renderMilitar={data.renderMilitar}
          />
        )}

        {/* 3. Funções Administrativas, Sentinelas e Permutas */}
        <PrintAdminSentinelasPermutas
          headerColorClass={data.headerColorClass}
          headerBgStyle={data.headerBgStyle}
          isAdminRoleVisible={data.isAdminRoleVisible}
          toggleAdminRoleVisibility={data.toggleAdminRoleVisibility}
          adminRoles={data.adminRoles}
          adminRolesRight={data.adminRolesRight}
          diaDepositoList={data.diaDepositoList}
          getAdminRoleMappedKey={data.getAdminRoleMappedKey}
          renderMilitar={data.renderMilitar}
          sentinelas={data.sentinelas}
          propSentinelaSlots={props.sentinelaSlots}
          com1Militars={data.com1Militars}
          com2Militars={data.com2Militars}
          auxRancho={data.auxRancho}
          toqueFogo={data.toqueFogo}
          permutasAtivas={data.permutasAtivas}
        />

        {/* 4. Chamada Geral, Expediente, Afastamentos, GRD e Visto */}
        <PrintChamadaExpedienteGrd
          headerColorClass={data.headerColorClass}
          headerBgStyle={data.headerBgStyle}
          activeMembersList={data.activeMembersList}
          renderMilitar={data.renderMilitar}
          rasApplications={props.rasApplications}
          expedienteMilitars={data.expedienteMilitars}
          afastamentos={props.afastamentos}
          militars={props.militars}
          selectedDate={props.selectedDate}
          identifiedAla={props.identifiedAla}
          grdRgs={data.grdRgs}
          obmContext={props.obmContext}
          isSigned={data.isSigned}
          user={props.user}
        />
      </div>

      {/* Modal de Logos/Brasões */}
      <LogoManagerModal
        isOpen={data.showLogoModal}
        onClose={() => data.setShowLogoModal(false)}
      />
    </div>
  );
}
