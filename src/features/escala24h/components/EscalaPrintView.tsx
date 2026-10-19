import React from 'react';
import { cn } from '../../../lib/utils';
import { LogoManagerModal } from '../../../components/LogoManagerModal';
import { useEscalaPrintData, UseEscalaPrintDataProps } from '../hooks/useEscalaPrintData';
import { PrintToolbar } from './print/PrintToolbar';
import { PrintHeaderOficiais } from './print/PrintHeaderOficiais';
import { PrintViaturasTable } from './print/PrintViaturasTable';
import { PrintAdminSentinelasPermutas } from './print/PrintAdminSentinelasPermutas';
import { PrintChamadaExpedienteGrd } from './print/PrintChamadaExpedienteGrd';

export function EscalaPrintView(props: UseEscalaPrintDataProps) {
  const data = useEscalaPrintData(props);

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
      />

      {/* Folha de Impressão */}
      <div
        id="escala-print-sheet"
        className={cn(
          'mx-auto bg-white print:my-0 print:shadow-none print:w-full print:max-w-none relative print:p-0 print:pt-10 print:px-3 text-black font-sans text-[11px] leading-tight flex flex-col transition-all duration-200',
          data.isExpandedView
            ? 'max-w-[1200px] min-h-screen my-6 p-8 pt-6 shadow-2xl'
            : 'w-[210mm] max-w-[96vw] min-h-[297mm] my-6 p-[6mm] pt-[10mm] shadow-[0_25px_70px_rgba(0,0,0,0.65)] ring-1 ring-black/15'
        )}
      >
        <style>{`
          @page {
            size: A4 portrait;
            margin-top: 22mm;
            margin-bottom: 8mm;
            margin-left: 6mm;
            margin-right: 6mm;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin-top: 22mm;
              margin-bottom: 8mm;
              margin-left: 6mm;
              margin-right: 6mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            #escala-print-sheet {
              padding-top: 18mm !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
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
          }
        `}</style>

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
