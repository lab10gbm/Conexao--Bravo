import { normalizeRg } from './utils';

export interface ConflitoOperacional {
  tipo: 'FERIAS' | 'GRD' | 'AFASTAMENTO' | 'PERMUTA';
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
  dataAlvo: string; // YYYY-MM-DD
  vacations?: any[];
  afastamentos?: any[];
  grdRgs?: string[];
  permutasDoDia?: any[];
  permutaAtualId?: string; // Para ignorar a própria permuta em edição
}

/**
 * Matriz Central de Conflitos Operacionais:
 * Cruza em tempo real Férias DGP, GRD, Afastamentos de Ala e Permutas Simultâneas
 */
export function verificarConflitosMilitar({
  militarRg,
  dataAlvo,
  vacations = [],
  afastamentos = [],
  grdRgs = [],
  permutasDoDia = [],
  permutaAtualId,
}: VerificarConflitosParams): ConflitoOperacional[] {
  const conflitos: ConflitoOperacional[] = [];
  const cleanRg = normalizeRg(militarRg);
  if (!cleanRg || !dataAlvo) return conflitos;

  const targetIso = parseDateToIso(dataAlvo);
  if (!targetIso) return conflitos;

  // 1. VERIFICAÇÃO DE FÉRIAS (DGP)
  if (Array.isArray(vacations) && vacations.length > 0) {
    for (const v of vacations) {
      if (!v) continue;
      if (normalizeRg(v.militarRg) !== cleanRg) continue;
      if (v.status === 'cancelado' || v.status === 'rejeitado') continue;

      const isoInicio = parseDateToIso(v.dataInicio);
      const isoRetorno = parseDateToIso(v.dataRetorno);

      if (isoInicio && isoRetorno) {
        if (targetIso >= isoInicio && targetIso <= isoRetorno) {
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

  return conflitos;
}
