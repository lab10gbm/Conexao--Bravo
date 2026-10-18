import { UserProfile } from '../../../types';

export function matchMilitar(
  militars: UserProfile[],
  id?: string | null,
  rg?: string | null,
  name?: string | null
): UserProfile | undefined {
  if (id) {
    const m = militars.find(mil => mil.uid === id);
    if (m) return m;
  }
  if (rg) {
    const r = String(rg).replace(/\D/g, '');
    const m = militars.find(mil => mil.rg && String(mil.rg).replace(/\D/g, '') === r);
    if (m) return m;
  }
  if (name) {
    const sName = name.toLowerCase().trim();
    return militars.find(mil => 
      (mil.name && mil.name.toLowerCase().trim() === sName) || 
      (mil.warName && mil.warName.toLowerCase().trim() === sName)
    );
  }
  return undefined;
}

export function countCommonCapabilities(reqM?: UserProfile, subM?: UserProfile): number {
  if (!reqM || !subM) return 0;
  let common = 0;

  // Motorista
  if (reqM.ativoCondutor && subM.ativoCondutor) {
    if (reqM.viaturas?.ABT && subM.viaturas?.ABT) common++;
    if (reqM.viaturas?.ABSL && subM.viaturas?.ABSL) common++;
    if (reqM.viaturas?.ASE && subM.viaturas?.ASE) common++;
    if (reqM.viaturas?.AR && subM.viaturas?.AR) common++;
    if (reqM.viaturas?.ARC && subM.viaturas?.ARC) common++;
  }
  if (reqM.ativoEncarregado && subM.ativoEncarregado) common++;
  if (reqM.ativoAbastecedor && subM.ativoAbastecedor) common++;

  // Chefe Gua
  if (reqM.ativoChefeGua && subM.ativoChefeGua) {
    if (reqM.chefeAbt && subM.chefeAbt) common++;
    if (reqM.chefeAbsl && subM.chefeAbsl) common++;
  }

  // Marítimo
  if (reqM.ativoMaritimo && subM.ativoMaritimo) {
    if (reqM.mestreAl && subM.mestreAl) common++;
    if (reqM.mestreBia && subM.mestreBia) common++;
    if (reqM.opAma && subM.opAma) common++;
    if (reqM.gvAma && subM.gvAma) common++;
    if (reqM.marinheiros && subM.marinheiros) common++;
  }

  // Enfermeiro e Comunicante
  if (reqM.ativoEnfermeiro && subM.ativoEnfermeiro) common++;
  if (reqM.ativoComunicante && subM.ativoComunicante) common++;

  // Graduado
  if (reqM.ativoGraduado && subM.ativoGraduado) {
    if (reqM.adjunto && subM.adjunto) common++;
    if (reqM.sgtDia && subM.sgtDia) common++;
    if (reqM.cmtGuarda && subM.cmtGuarda) common++;
    if (reqM.disponivel1 && subM.disponivel1) common++;
    if (reqM.disponivel2 && subM.disponivel2) common++;
  }

  // Cbs e Sds (Sentinela/CbDia)
  if (reqM.ativoCbsSds && subM.ativoCbsSds) {
    if (reqM.faxina && subM.faxina) common++;
    if (reqM.sentinela && subM.sentinela) common++;
    if (reqM.deposito && subM.deposito) common++;
    if (reqM.toqueDeFogo && subM.toqueDeFogo) common++;
    if (reqM.auxRancho && subM.auxRancho) common++;
    if (reqM.cbGuarda && subM.cbGuarda) common++;
    if (reqM.cbDia && subM.cbDia) common++;
    if (reqM.disponivelCbsSds && subM.disponivelCbsSds) common++;
  }

  // Auxiliar VTR
  if (reqM.ativoAuxiliar && subM.ativoAuxiliar) {
    if (reqM.auxAbt && subM.auxAbt) common++;
    if (reqM.auxAbsl && subM.auxAbsl) common++;
    if (reqM.auxArc && subM.auxArc) common++;
    if (reqM.auxAse && subM.auxAse) common++;
    if (reqM.disponivelAux && subM.disponivelAux) common++;
  }

  return common;
}
