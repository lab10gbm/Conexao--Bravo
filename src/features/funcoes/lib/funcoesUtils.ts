import { UserProfile } from '../../../types';
import { FunctionCondition } from '../../../components/ControleCategoriasModal';

export function checkConditions(militar: UserProfile, conditions?: FunctionCondition[]): { valid: boolean; reason?: string } {
  if (!conditions || conditions.length === 0) return { valid: true };
  
  for (const cond of conditions) {
    const { field, operator, value } = cond;
    if (!value) continue;
    
    let mVal = String((militar as any)[field] || "").toUpperCase();
    const targetVal = value.toUpperCase().trim();
    
    if (operator === "equals") {
      if (mVal !== targetVal) {
         return { valid: false, reason: `Requisito não atendido: ${field} deve ser exatamente "${value}"` };
      }
    } else if (operator === "contains") {
      if (!mVal.includes(targetVal)) {
         return { valid: false, reason: `Requisito não atendido: ${field} deve conter "${value}"` };
      }
    } else if (operator === "in") {
      const targets = targetVal.split(',').map(s => s.trim());
      let isMatch = false;
      if (field === 'cnhCat') {
         const chars = mVal.split('');
         isMatch = chars.some(c => targets.includes(c));
      } else {
         isMatch = targets.some(t => mVal.includes(t) || t === mVal);
      }
      if (!isMatch) {
         return { valid: false, reason: `Requisito não atendido: ${field} deve ser um de: "${value}"` };
      }
    }
  }
  return { valid: true };
}

export function getValue(militar: UserProfile, path: string): boolean {
  if (!path) return false;
  if (path === "ativoAdministrativo") {
    if (militar.ativoAdministrativo !== undefined) return Boolean(militar.ativoAdministrativo);
    return Boolean(militar.ativoGraduado || militar.ativoCbsSds);
  }
  if (path.startsWith("viaturas.")) {
    const key = path.split(".")[1];
    return !!militar.viaturas?.[key as keyof typeof militar.viaturas];
  }
  if (path.startsWith("dynamicFunctions.")) {
    const key = path.split(".")[1];
    return !!militar.dynamicFunctions?.[key];
  }
  return !!militar[path as keyof UserProfile];
}

const rankWeights: Record<string, number> = {
  CORONEL: 1, CEL: 1, "TENENTE CORONEL": 2, "TENENTE-CORONEL": 2, TC: 2,
  MAJOR: 3, MAJ: 3, CAPITÃO: 4, CAP: 4, "1º TENENTE": 5, "1º TEN": 5,
  "2º TENENTE": 6, "2º TEN": 6, ASPIRANTE: 7, ASP: 7, SUBTENENTE: 8,
  "SUB TENENTE": 8, ST: 8, "1º SARGENTO": 9, "1º SGT": 9,
  "2º SARGENTO": 10, "2º SGT": 10, "3º SARGENTO": 11, "3º SGT": 11,
  CABO: 12, CB: 12, SOLDADO: 13, SD: 13,
};

export function sortByRankAndRg(a: UserProfile, b: UserProfile): number {
  const getWeight = (r: string) => rankWeights[r?.toUpperCase()?.trim()] || 99;
  const weightA = getWeight(a.rank || "");
  const weightB = getWeight(b.rank || "");
  if (weightA !== weightB) return weightA - weightB;

  const rgA = parseInt(a.rg?.toString().replace(/\D/g, "") || "0", 10);
  const rgB = parseInt(b.rg?.toString().replace(/\D/g, "") || "0", 10);
  return rgA - rgB;
}
