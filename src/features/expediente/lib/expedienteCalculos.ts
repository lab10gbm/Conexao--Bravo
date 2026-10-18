import { parseRank } from '../../../lib/rankUtils';
import { UserProfile } from '../../../types';

export const safeArr = <T = any>(val: any): T[] => Array.isArray(val) ? val : [];

export const FUNCOES_ESCALA = [
  "Condutor de ABT",
  "Condutor de ABSL",
  "Condutor de ASE",
  "Condutor de AR",
  "Condutor de ARC",
  "Chefe de Guarnição ABT",
  "Chefe de Guarnição ABSL",
  "Auxiliar de ABT",
  "Auxiliar de ABSL",
  "Auxiliar de ARC",
  "Auxiliar de ASE",
  "Mestre AL",
  "Mestre BIA",
  "Operador AMA",
  "Guarda-Vidas AMA",
  "Marinheiro",
  "Enfermeiro",
  "Comunicante",
  "Adjunto",
  "Sargento de Dia",
  "Cmt da Guarda",
  "Cabo da Guarda",
  "Cabo de Dia",
  "Sentinela",
  "Faxina",
  "Armeque",
  "Toque de Fogo",
  "Auxiliar de Rancho"
];

export const COMPETENCY_MAP: Record<string, string[]> = {
  "Condutor de ABT": ["viaturas.ABT"],
  "Condutor de ABSL": ["viaturas.ABSL"],
  "Condutor de ASE": ["viaturas.ASE"],
  "Condutor de AR": ["viaturas.AR"],
  "Condutor de ARC": ["viaturas.ARC"],
  "Chefe de Guarnição ABT": ["chefeAbt", "ativoChefeGua"],
  "Chefe de Guarnição ABSL": ["chefeAbsl", "ativoChefeGua"],
  "Auxiliar de ABT": ["auxAbt", "ativoAuxiliar"],
  "Auxiliar de ABSL": ["auxAbsl", "ativoAuxiliar"],
  "Auxiliar de ARC": ["auxArc", "ativoAuxiliar"],
  "Auxiliar de ASE": ["auxAse", "ativoAuxiliar"],
  "Mestre AL": ["mestreAl", "ativoMaritimo"],
  "Mestre BIA": ["mestreBia", "ativoMaritimo"],
  "Operador AMA": ["opAma", "ativoMaritimo"],
  "Guarda-Vidas AMA": ["gvAma", "ativoMaritimo"],
  "Marinheiro": ["marinheiros", "ativoMaritimo"],
  "Enfermeiro": ["ativoEnfermeiro"],
  "Comunicante": ["ativoComunicante"],
  "Adjunto": ["adjunto", "ativoGraduado"],
  "Sargento de Dia": ["sgtDia", "ativoGraduado"],
  "Cmt da Guarda": ["cmtGuarda", "ativoGraduado"],
  "Cabo da Guarda": ["cbGuarda", "ativoCbsSds"],
  "Cabo de Dia": ["cbDia", "ativoCbsSds"],
  "Sentinela": ["sentinela", "ativoCbsSds"],
  "Faxina": ["faxina", "ativoCbsSds"],
  "Armeque": ["deposito", "ativoCbsSds"],
  "Toque de Fogo": ["toqueDeFogo", "ativoCbsSds"],
  "Auxiliar de Rancho": ["auxRancho", "ativoCbsSds"]
};

export const WORK_REGIMES = [
  "3 Exped. e 2 serv. 24h",
  "4 Exped. e 1 serv. 24h",
  "4 Expedientes (Militar Readaptado)",
  "2 e 1/2 Expedientes (Militar com Redução de Carga Horária)",
  "1 Exped. e 3 Serv. 24h (Militar com Redução de Carga Horária)"
];

export function parseRankAndNameFromString(raw: string): { rank: string; name: string } {
  if (!raw) return { rank: '', name: 'MILITAR' };
  const clean = raw.trim().toUpperCase();

  const rankPatterns: [RegExp, string][] = [
    [/^(CORONEL|CEL\.?)\s+/i, 'CORONEL'],
    [/^(TENENTE\s+CORONEL|TEN\.?\s*CEL\.?|TC)\s+/i, 'TEN CEL'],
    [/^(MAJOR|MAJ\.?)\s+/i, 'MAJOR'],
    [/^(CAPITÃO|CAPITAO|CAP\.?)\s+/i, 'CAPITÃO'],
    [/^(1[º°]?\s*TENENTE|1[º°]?\s*TEN\.?)\s+/i, '1º TENENTE'],
    [/^(2[º°]?\s*TENENTE|2[º°]?\s*TEN\.?)\s+/i, '2º TENENTE'],
    [/^(ASPIRANTE|ASP\.?\s*OF\.?|ASP\.?)\s+/i, 'ASPIRANTE'],
    [/^(SUBTENENTE|SUBTEN\.?|SUB\s*TEN\.?|ST)\s+/i, 'SUBTENENTE'],
    [/^(1[º°]?\s*SARGENTO|1[º°]?\s*SGT\.?)\s+/i, '1º SARGENTO'],
    [/^(2[º°]?\s*SARGENTO|2[º°]?\s*SGT\.?)\s+/i, '2º SARGENTO'],
    [/^(3[º°]?\s*SARGENTO|3[º°]?\s*SGT\.?)\s+/i, '3º SARGENTO'],
    [/^(CABO|CB\.?)\s+/i, 'CABO'],
    [/^(SOLDADO|SD\.?)\s+/i, 'SOLDADO'],
  ];

  for (const [regex, rankLabel] of rankPatterns) {
    if (regex.test(clean)) {
      const remaining = clean.replace(regex, '').trim();
      return {
        rank: rankLabel,
        name: remaining || rankLabel
      };
    }
  }

  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return {
      rank: parts[0],
      name: parts.slice(1).join(' ')
    };
  }

  return {
    rank: '',
    name: clean
  };
}

export function splitMilitaryRankAndWarName(found?: UserProfile | null, rawFallbackName?: string): { rank: string; name: string } {
  if (found) {
    const rawRank = found.rank ? parseRank(found.rank).toUpperCase() : '';
    const warName = (found.warName && found.warName.trim())
      ? found.warName.trim().toUpperCase()
      : (found.name && found.name.trim())
        ? found.name.trim().split(/\s+/)[0].toUpperCase()
        : '';

    if (rawRank) {
      return {
        rank: rawRank,
        name: warName || rawRank
      };
    }

    if (found.name && found.name.trim()) {
      return parseRankAndNameFromString(found.name);
    }
  }

  if (rawFallbackName && rawFallbackName.trim()) {
    return parseRankAndNameFromString(rawFallbackName);
  }

  return { rank: '', name: 'MILITAR' };
}

export function formatPreferenceFunction(func: string, qt: number): { line1: string; line2: string } {
  if (!func) return { line1: `★ ${qt}x`, line2: 'VAGA' };
  const trimmed = func.trim();
  const qtLabel = `★ ${qt}x`;

  // 1. Chefe de Guarnição ABT / ABSL / etc.
  const mChefe = trimmed.match(/^Chefe\s+de\s+Guarni[çc][ãa]o\s+(.+)$/i);
  if (mChefe) {
    return {
      line1: `${qtLabel} CHEFE GUARN.`,
      line2: mChefe[1].toUpperCase()
    };
  }

  // 2. Condutor de ABT / ABSL / ASE / AR / ARC / etc.
  const mCond = trimmed.match(/^Condutor\s+de\s+(.+)$/i);
  if (mCond) {
    return {
      line1: `${qtLabel} CONDUTOR`,
      line2: mCond[1].toUpperCase()
    };
  }

  // 3. Auxiliar de ABT / ABSL / ARC / ASE / Rancho / etc.
  const mAux = trimmed.match(/^Auxiliar\s+de\s+(.+)$/i);
  if (mAux) {
    return {
      line1: `${qtLabel} AUXILIAR`,
      line2: mAux[1].toUpperCase()
    };
  }

  // 4. Guarda-Vidas AMA
  const mGv = trimmed.match(/^Guarda-?Vidas\s+(.+)$/i);
  if (mGv) {
    return {
      line1: `${qtLabel} G-VIDAS`,
      line2: mGv[1].toUpperCase()
    };
  }

  // 5. Operador AMA / Mestre AL / Mestre BIA
  const mOp = trimmed.match(/^(Operador|Mestre)\s+(.+)$/i);
  if (mOp) {
    return {
      line1: `${qtLabel} ${mOp[1].toUpperCase()}`,
      line2: mOp[2].toUpperCase()
    };
  }

  // 6. Sargento de Dia / Cabo de Dia
  const mDia = trimmed.match(/^(Sargento|Cabo)\s+de\s+Dia$/i);
  if (mDia) {
    return {
      line1: `${qtLabel} ${mDia[1].toUpperCase()}`,
      line2: 'DE DIA'
    };
  }

  // 7. Cmt da Guarda / Cabo da Guarda
  const mGuarda = trimmed.match(/^(Cmt|Cabo)\s+da\s+Guarda$/i);
  if (mGuarda) {
    return {
      line1: `${qtLabel} ${mGuarda[1].toUpperCase()}`,
      line2: 'DA GUARDA'
    };
  }

  // 8. Toque de Fogo
  if (/^Toque\s+de\s+Fogo$/i.test(trimmed)) {
    return {
      line1: `${qtLabel} TOQUE`,
      line2: 'DE FOGO'
    };
  }

  // 9. Generic multi-word (2 words or more)
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1].toUpperCase();
    const prefix = words.slice(0, words.length - 1).join(' ').toUpperCase();
    return {
      line1: `${qtLabel} ${prefix}`,
      line2: lastWord
    };
  }

  // 10. Single word: e.g. Sentinela, Comunicante, Adjunto, Marinheiro, Enfermeiro, Faxina, Armeque
  return {
    line1: `${qtLabel} ${Number(qt) > 1 ? 'VAGAS' : 'VAGA'}`,
    line2: trimmed.toUpperCase()
  };
}
