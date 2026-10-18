import { UserProfile } from '../../../types';
import { parseRank, isOfficer, isPraca } from '../../../lib/rankUtils';

export function isPracaElegivel(m: UserProfile): boolean {
  if (!m) return false;
  if ((m as any).isOfficer) return false;

  const parsed = parseRank(m.rank || '');
  if (isOfficer(parsed)) return false;

  const quadroUp = (m.quadro || '').trim().toUpperCase();
  if (quadroUp.startsWith('QO')) return false;

  const combinedUp = `${m.rank || ''} ${m.name || ''}`.toUpperCase();
  if (
    /\b(CORONEL|CEL|TENENTE[\s-]*CORONEL|TEN[\s.]*CEL|TC|MAJOR|MAJ|CAPIT[ÃA]O|CAP|1[º°]?\s*TENENTE|2[º°]?\s*TENENTE|1[º°]?\s*TEN|2[º°]?\s*TEN|ASPIRANTE|ASP\s*OF)\b/.test(combinedUp) &&
    !combinedUp.includes('SUBTEN') &&
    !combinedUp.includes('SUB TEN')
  ) {
    return false;
  }

  if (parsed) {
    return isPraca(parsed);
  }

  return true;
}

export function getHeaderColor(ala: string): string {
  switch (ala) {
    case '1': return 'bg-emerald-600 text-emerald-50';
    case '2': return 'bg-rose-600 text-rose-50';
    case '3': return 'bg-blue-600 text-blue-50';
    case '4': return 'bg-amber-500 text-amber-50';
    case 'EXP': return 'bg-slate-700 text-slate-50';
    default: return 'bg-slate-200 text-slate-800';
  }
}
