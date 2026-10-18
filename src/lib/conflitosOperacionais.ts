import { normalizeRg, normalizeAlaField, getAlaForDate } from './utils';

export interface ConflitoOperacional {
  tipo: 'FERIAS' | 'GRD' | 'AFASTAMENTO' | 'PERMUTA' | 'ESCALA_REGULAR';
  bloqueante: boolean; // Se true, impede ou adverte fortemente a operação
  titulo: string;
  descricao: string;
  detalhe?: string;
  dataInicio?: string;
  dataRetorno?: string;
  boletim?: string;
  militarRg?: string;
}

export function parseDateToIso(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // Se já for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Se for DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${y}-${m}-${d}`;
  }

  // Se for ISO completo com timestamp (YYYY-MM-DDTHH:mm:ss)
  if (clean.includes('T')) {
    return clean.split('T')[0];
  }

  return clean;
}

export interface VerificarConflitosParams {
  militarRg?: string | number | null;
  militarAla?: string | number | null;
  dataAlvo: string; // YYYY-MM-DD
  vacations?: any[];
  afastamentos?: any[];
  grdRgs?: string[];
  permutasDoDia?: any[];
  permutaAtualId?: string; // Para ignorar a própria permuta em edição
  verificarPlantaoRegular?: boolean; // Se true, detecta se coincide com a escala de 24h regular do militar
  permitirFerias?: boolean; // Se true (ex: RAS), militar de férias é plenamente autorizado a concorrer e ser escalado (não-bloqueante)
}

/**
 * Matriz Central de Conflitos Operacionais:
 * Cruza em tempo real Férias DGP, GRD, Afastamentos de Ala, Permutas Simultâneas e Plantão Regular 24h
 */
export function verificarConflitosMilitar({
  militarRg,
  militarAla,
  dataAlvo,
  vacations = [],
  afastamentos = [],
  grdRgs = [],
  permutasDoDia = [],
  permutaAtualId,
  verificarPlantaoRegular = false,
  permitirFerias = false,
}: VerificarConflitosParams): ConflitoOperacional[] {
  const conflitos: ConflitoOperacional[] = [];
  const cleanRg = normalizeRg(militarRg);
  if (!cleanRg || !dataAlvo) return conflitos;

  const targetIso = parseDateToIso(dataAlvo);
  if (!targetIso) return conflitos;

  // 1. VERIFICAÇÃO DE FÉRIAS (DGP)
  let isEmFerias = false;
  if (Array.isArray(vacations) && vacations.length > 0) {
    for (const v of vacations) {
      if (!v) continue;
      if (normalizeRg(v.militarRg) !== cleanRg) continue;
      if (v.status === 'cancelado' || v.status === 'rejeitado') continue;

      const isoInicio = parseDateToIso(v.dataInicio);
      const isoRetorno = parseDateToIso(v.dataRetorno);

      if (isoInicio && isoRetorno) {
        if (targetIso >= isoInicio && targetIso <= isoRetorno) {
          isEmFerias = true;
          if (permitirFerias) {
            conflitos.push({
              tipo: 'FERIAS',
              bloqueante: false,
              titulo: 'Férias DGP (Apto p/ RAS)',
              descricao: `Militar em período regulamentar de Férias (de ${v.dataInicio} a ${v.dataRetorno}). Autorizado a realizar RAS conforme regulamento.`,
              detalhe: v.boletim ? `Boletim: ${v.boletim}` : undefined,
              dataInicio: v.dataInicio,
              dataRetorno: v.dataRetorno,
              boletim: v.boletim,
              militarRg: cleanRg,
            });
          } else {
            conflitos.push({
              tipo: 'FERIAS',
              bloqueante: true,
              titulo: 'Férias DGP Ativas',
              descricao: `Militar em período regulamentar de Férias (de ${v.dataInicio} a ${v.dataRetorno}).`,
              detalhe: v.boletim ? `Boletim: ${v.boletim}` : undefined,
              dataInicio: v.dataInicio,
              dataRetorno: v.dataRetorno,
              boletim: v.boletim,
              militarRg: cleanRg,
            });
          }
          break; // Um período de férias ativo já é suficiente para alertar
        }
      }
    }
  }

  // 2. VERIFICAÇÃO DE GRD (Guia de Recolhimento / Diária de Reforço)
  if (Array.isArray(grdRgs) && grdRgs.length > 0) {
    const isEscaladoGrd = grdRgs.some((r) => normalizeRg(r) === cleanRg);
    if (isEscaladoGrd) {
      conflitos.push({
        tipo: 'GRD',
        bloqueante: true,
        titulo: 'Escalado em GRD no Dia',
        descricao: 'Militar já está escalado no GRD desta data. Proibido assumir prontidão regular ou permuta.',
        militarRg: cleanRg,
      });
    }
  }

  // 3. VERIFICAÇÃO DE AFASTAMENTOS DA ALA (LTS, Dispensa, Licença Especial)
  if (Array.isArray(afastamentos) && afastamentos.length > 0) {
    for (const a of afastamentos) {
      if (!a) continue;
      if (normalizeRg(a.rg) !== cleanRg) continue;

      const isoInicio = parseDateToIso(a.inicio || a.dataInicio);
      const isoRetorno = parseDateToIso(a.retorno || a.dataRetorno);

      if (isoInicio && isoRetorno) {
        if (targetIso >= isoInicio && targetIso <= isoRetorno) {
          const motivo = a.situacao || a.motivo || 'Afastamento Operacional';
          conflitos.push({
            tipo: 'AFASTAMENTO',
            bloqueante: true,
            titulo: `Afastado da Ala (${motivo})`,
            descricao: `Militar com afastamento cadastrado: ${motivo} (de ${a.inicio || isoInicio} a ${a.retorno || isoRetorno}).`,
            detalhe: a.obs || undefined,
            dataInicio: a.inicio,
            dataRetorno: a.retorno,
            militarRg: cleanRg,
          });
          break;
        }
      }
    }
  }

  // 4. VERIFICAÇÃO DE PERMUTAS DUPLICADAS / CHOQUE DE ESCALA
  if (Array.isArray(permutasDoDia) && permutasDoDia.length > 0) {
    for (const p of permutasDoDia) {
      if (!p || p.id === permutaAtualId) continue;
      if (p.status === 'cancelled' || p.status === 'rejected') continue;

      const pReqRg = normalizeRg(p.requesterRg);
      const pSubRg = normalizeRg(p.substituteRg);

      if (cleanRg === pReqRg || cleanRg === pSubRg) {
        const papel = cleanRg === pReqRg ? 'Solicitante' : 'Substituto';
        const st = (p.status || 'pendente').toUpperCase();
        conflitos.push({
          tipo: 'PERMUTA',
          bloqueante: p.status === 'accepted',
          titulo: 'Permuta Concorrente na Data',
          descricao: `Militar já consta como ${papel} em outra permuta (${st}) para este mesmo plantão.`,
          detalhe: `Permuta ID: ${p.id || 'N/A'}`,
          militarRg: cleanRg,
        });
        break;
      }
    }
  }

  // 5. VERIFICAÇÃO DE PLANTÃO REGULAR DA ALA (Para RAS e Vagas Extras)
  // Se o militar estiver em período regulamentar de Férias, ele está dispensado da escala regular
  if (verificarPlantaoRegular && militarAla && !isEmFerias) {
    const userAlaNum = normalizeAlaField(militarAla);
    if (userAlaNum && userAlaNum !== 'EXP') {
      const [y, m, d] = targetIso.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const alaDoDia = getAlaForDate(dateObj);
      if (userAlaNum === String(alaDoDia)) {
        conflitos.push({
          tipo: 'ESCALA_REGULAR',
          bloqueante: true,
          titulo: `Plantão Regular 24h (Ala ${alaDoDia})`,
          descricao: `Militar está de serviço regular na Ala ${alaDoDia} nesta data. Proibido RAS concomitante.`,
          militarRg: cleanRg,
        });
      }
    }
  }

  return conflitos;
}
