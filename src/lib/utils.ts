import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getDay, subDays, addDays } from 'date-fns';
import { OBM_HIERARCHY } from '../constants.ts';
export { getParentObm, getRasSharedObms } from './canonicalScope.ts';

export function normalizeObm(obm?: string): string {
  if (!obm) return '10º GBM';
  const clean = obm.toString().trim().toUpperCase();
  
  if (clean.includes('1/10') || clean.includes('ITAGUA')) return '1/10';
  if (clean.includes('2/10') || clean.includes('ILHA GRANDE') || clean.includes('ABRAAO') || clean.includes('ABRAÃO')) return '2/10';
  if (clean.includes('3/10') || clean.includes('FRADE')) return '3/10';
  if (clean.includes('4/10') || clean.includes('MANGARATIBA')) return '4/10';
  if (clean.includes('1/26') || clean.includes('PARQUE MAMBUCABA') || clean.includes('MAMBUCABA')) return '1/26';

  const sede26Variations = ['26', '26º', '26 GBM', '26º GBM', '26ºGBM', '26GBM', '26º GBM - SEDE', '26º GBM - PARATY', 'PARATY', 'PARATI'];
  if (sede26Variations.includes(clean) || clean.includes('26º') || clean.includes('26 GBM') || clean.includes('PARATY')) return '26º GBM';

  const sede10Variations = ['10', '10º', '10 GBM', '10º GBM', '10ºGBM', '10GBM', 'OBM', '10º GBM - SEDE', '10º GBM SEDE', '10 GBM SEDE', '10º GBM-SEDE', '10º GBM - ANGRA DOS REIS', '10º GBM ANGRA DOS REIS', 'ANGRA'];
  if (sede10Variations.includes(clean) || clean.includes('10º') || clean.includes('10 GBM') || clean.includes('ANGRA')) return '10º GBM';

  return clean;
}

export function getObmSettingsDocKey(obm?: string): string {
  const norm = normalizeObm(obm);
  if (!norm || norm === 'GLOBAL') return '10_gbm';
  return norm.replace(/[º°]/g, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase() || '10_gbm';
}

export function getObmSettingsFallbackKeys(obm?: string): string[] {
  const canonical = getObmSettingsDocKey(obm);
  const norm = normalizeObm(obm);
  const raw = (obm || '').trim();
  const list = [
    canonical,
    norm.replace(/\//g, '_').replace(/\s/g, '_'),
    norm.replace(/º/g, '°').replace(/\//g, '_').replace(/\s/g, '_'),
    norm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_'),
    raw.replace(/\//g, '_').replace(/\s/g, '_'),
  ];
  if (norm === '10º GBM') {
    list.push('10_gbm', '10º_GBM', '10°_GBM', '10__gbm', '10_GBM');
  } else if (norm === '26º GBM') {
    list.push('26_gbm', '26º_GBM', '26°_GBM', '26__gbm', '26_GBM');
  }
  return Array.from(new Set(list.filter(Boolean)));
}

export function normalizeRg(rg?: string | number | null): string {
  if (!rg) return '';
  return String(rg).replace(/\D/g, '').replace(/^0+/, '');
}

export function normalizeAlaField(ala: string | number | undefined): string {
  if (!ala) return '';
  const a = String(ala).toUpperCase().trim();
  if (a.includes('EXP') || a === 'E' || a === 'EXPEDIENTE') return 'EXP';
  if (a === '1' || a === '1ª ALA' || a === 'ALA 1' || a === 'A' || a.includes('ALPHA') || a.includes('ALFA') || a.includes('ALHA')) return '1';
  if (a === '2' || a === '2ª ALA' || a === 'ALA 2' || a === 'B' || a.includes('BRAVO')) return '2';
  if (a === '3' || a === '3ª ALA' || a === 'ALA 3' || a === 'C' || a.includes('CHARLIE')) return '3';
  if (a === '4' || a === '4ª ALA' || a === 'ALA 4' || a === 'D' || a.includes('DELTA')) return '4';
  
  // Fallback if they contain the number but aren't an exact match, carefully avoiding 10, etc.
  // Actually, let's just do exact matching or very safe matching to avoid OBMs being parsed as alas
  if (/\b1\b/.test(a) && !a.includes('10')) return '1';
  if (/\b2\b/.test(a)) return '2';
  if (/\b3\b/.test(a)) return '3';
  if (/\b4\b/.test(a)) return '4';
  
  return '';
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getUserObmAccess = (
  userObm?: string,
  isAdminOrGlobal = false,
  includeSubordinates = false
): string[] => {
  if (isAdminOrGlobal || userObm === 'GLOBAL') {
    return Object.keys(OBM_HIERARCHY); // Global sees everything
  }
  const clean = normalizeObm(userObm);
  if (includeSubordinates && OBM_HIERARCHY[clean]) {
    return OBM_HIERARCHY[clean];
  }
  return [clean];
};

export let GLOBAL_REF_YEAR = 2026;
export let GLOBAL_START_ALA = 2;

export function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) return obj.map(cleanUndefined);
    if (obj instanceof Date) return obj;
    // Keep Firebase FieldValues untouched (they usually have _methodName, or isEqual function)
    if (obj._methodName || typeof obj.isEqual === 'function' || (obj.constructor && obj.constructor.name && obj.constructor.name.includes('FieldValue'))) return obj;
    const newObj: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = cleanUndefined(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

export function setGlobalAlaConfig(year: number, startAla: number) {
  GLOBAL_REF_YEAR = year;
  GLOBAL_START_ALA = startAla;
}

export function calculateDeadline(targetDate: Date): Date {
  const targetDayOfWeek = getDay(targetDate);
  
  // Exceção: Quarta-feira o prazo encerra no domingo anterior
  if (targetDayOfWeek === 3) { 
    const deadlineDate = subDays(targetDate, 3);
    deadlineDate.setHours(23, 59, 59, 999);
    return deadlineDate;
  }
  
  // Exceção: Terça-feira o prazo encerra na quarta-feira da semana passada
  if (targetDayOfWeek === 2) { 
    const deadlineDate = subDays(targetDate, 6);
    deadlineDate.setHours(23, 59, 59, 999);
    return deadlineDate;
  }
  
  // Exceção: Segunda-feira o prazo encerra na quarta-feira da semana passada
  if (targetDayOfWeek === 1) { 
    const deadlineDate = subDays(targetDate, 5);
    deadlineDate.setHours(23, 59, 59, 999);
    return deadlineDate;
  }

  let daysToSubtract = 0;
  let businessDaysSubtracted = 0;
  
  while (businessDaysSubtracted < 3) {
    daysToSubtract++;
    const currentDay = subDays(targetDate, daysToSubtract);
    const dayOfWeek = getDay(currentDay);
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDaysSubtracted++;
    }
  }
  
  const deadlineDate = subDays(targetDate, daysToSubtract);
  deadlineDate.setHours(23, 59, 59, 999);
  
  return deadlineDate;
}

/**
 * Calculates which ala is on duty on a specific date.
 */
export function getAlaForDate(date: Date): number {
  if (!date || isNaN(date.getTime())) return 1;
  const baseDate = new Date(GLOBAL_REF_YEAR, 0, 1);
  const diffInTime = date.getTime() - baseDate.getTime();
  const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));
  
  const ala = (((diffInDays + (GLOBAL_START_ALA - 1)) % 4) + 4) % 4 + 1;
  return isNaN(ala) ? 1 : ala;
}

export function getOppositeAla(ala: number): number {
  if (ala === 1) return 3;
  if (ala === 3) return 1;
  if (ala === 2) return 4;
  if (ala === 4) return 2;
  return 0;
}

export function getAlaColor(ala: number | string): string {
  const alaStr = ala.toString().toUpperCase();
  if (alaStr === 'EXP') return 'bg-slate-500';
  
  const alaNum = typeof ala === 'string' ? parseInt(ala) : ala;
  switch (alaNum) {
    case 1: return 'bg-emerald-400';
    case 2: return 'bg-rose-400';
    case 3: return 'bg-blue-400';
    case 4: return 'bg-amber-400';
    default: return 'bg-gray-400';
  }
}

export function getAlaLightColor(ala: number | string): string {
  const alaStr = ala.toString().toUpperCase();
  if (alaStr === 'EXP') return 'bg-slate-50 text-slate-700';
  
  const alaNum = typeof ala === 'string' ? parseInt(ala) : ala;
  switch (alaNum) {
    case 1: return 'bg-emerald-50 text-emerald-900 border-emerald-100';
    case 2: return 'bg-rose-50 text-rose-900 border-rose-100';
    case 3: return 'bg-sky-50 text-sky-900 border-sky-100';
    case 4: return 'bg-amber-50 text-amber-900 border-amber-100';
    default: return 'bg-gray-50 text-gray-900 border-gray-100';
  }
}

export function getAlaCardColor(ala: number | string): string {
  const alaStr = ala.toString().toUpperCase();
  if (['EXP', 'E', 'EXPEDIENTE'].includes(alaStr)) return 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700';
  if (alaStr === 'ESCALANTE') return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700/50';
  
  const alaNum = typeof ala === 'string' ? parseInt(ala) : ala;
  switch (alaNum) {
    case 1: return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/50';
    case 2: return 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700/50';
    case 3: return 'bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700/50';
    case 4: return 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/50';
    default: return 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700';
  }
}

export function getThemeColors(ala?: string | number) {
  const a = ala?.toString().toUpperCase() || '';
  if (a === '1') return { 
    panel: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60', 
    card: 'bg-emerald-100/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60', 
    text: 'text-emerald-900 dark:text-emerald-200', 
    title: 'text-emerald-800 dark:text-emerald-300', 
    borderInner: 'border-emerald-300 dark:border-emerald-800/60', 
    textLight: 'text-emerald-600 dark:text-emerald-400', 
    iconBg: 'bg-emerald-200 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700', 
    iconText: 'text-emerald-800 dark:text-emerald-200', 
    divide: 'divide-emerald-300 dark:divide-emerald-800' 
  };
  if (a === '2') return { 
    panel: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60', 
    card: 'bg-rose-100/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/60', 
    text: 'text-rose-900 dark:text-rose-200', 
    title: 'text-rose-800 dark:text-rose-300', 
    borderInner: 'border-rose-300 dark:border-rose-800/60', 
    textLight: 'text-rose-600 dark:text-rose-400', 
    iconBg: 'bg-rose-200 dark:bg-rose-900/60 border-rose-300 dark:border-rose-700', 
    iconText: 'text-rose-800 dark:text-rose-200', 
    divide: 'divide-rose-300 dark:divide-rose-800' 
  };
  if (a === '3') return { 
    panel: 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800/60', 
    card: 'bg-sky-100/90 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700/60', 
    text: 'text-sky-900 dark:text-sky-200', 
    title: 'text-sky-800 dark:text-sky-300', 
    borderInner: 'border-sky-300 dark:border-sky-800/60', 
    textLight: 'text-sky-600 dark:text-sky-400', 
    iconBg: 'bg-sky-200 dark:bg-sky-900/60 border-sky-300 dark:border-sky-700', 
    iconText: 'text-sky-800 dark:text-sky-200', 
    divide: 'divide-sky-300 dark:divide-sky-800' 
  };
  if (a === '4') return { 
    panel: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60', 
    card: 'bg-amber-100/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60', 
    text: 'text-amber-900 dark:text-amber-200', 
    title: 'text-amber-800 dark:text-amber-300', 
    borderInner: 'border-amber-300 dark:border-amber-800/60', 
    textLight: 'text-amber-600 dark:text-amber-400', 
    iconBg: 'bg-amber-200 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700', 
    iconText: 'text-amber-800 dark:text-amber-200', 
    divide: 'divide-amber-300 dark:divide-amber-800' 
  };
  if (['EXP', 'E', 'EXPEDIENTE'].includes(a)) return { 
    panel: 'bg-white dark:bg-[#141c2e] border-slate-300 dark:border-slate-700', 
    card: 'bg-slate-100 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700', 
    text: 'text-slate-800 dark:text-slate-100', 
    title: 'text-slate-700 dark:text-slate-300', 
    borderInner: 'border-slate-300 dark:border-slate-700', 
    textLight: 'text-slate-500 dark:text-slate-400', 
    iconBg: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600', 
    iconText: 'text-slate-700 dark:text-slate-200', 
    divide: 'divide-slate-300 dark:divide-slate-700' 
  };
  if (a === 'ESCALANTE') return { 
    panel: 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800/60', 
    card: 'bg-indigo-100/90 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/60', 
    text: 'text-indigo-900 dark:text-indigo-200', 
    title: 'text-indigo-800 dark:text-indigo-300', 
    borderInner: 'border-indigo-300 dark:border-indigo-800/60', 
    textLight: 'text-indigo-600 dark:text-indigo-400', 
    iconBg: 'bg-indigo-200 dark:bg-indigo-900/60 border-indigo-300 dark:border-indigo-700', 
    iconText: 'text-indigo-800 dark:text-indigo-200', 
    divide: 'divide-indigo-300 dark:divide-indigo-800' 
  };
  
  // Default (no ala)
  return { 
    panel: 'bg-white dark:bg-[#141c2e] border-slate-300 dark:border-slate-700', 
    card: 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700', 
    text: 'text-slate-800 dark:text-slate-100', 
    title: 'text-slate-600 dark:text-slate-300', 
    borderInner: 'border-slate-300 dark:border-slate-700', 
    textLight: 'text-slate-500 dark:text-slate-400', 
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700', 
    iconText: 'text-indigo-600 dark:text-indigo-300', 
    divide: 'divide-slate-300 dark:divide-slate-700' 
  };
}

export function getAlaName(ala: number | string): string {
  const alaStr = ala.toString().toUpperCase().trim();
  if (alaStr === 'EXP' || alaStr.includes('EXP')) return 'EXPEDIENTE';
  if (alaStr === 'ESCALANTE') return 'ESCALANTE';
  
  const alaNum = typeof ala === 'string' ? parseInt(ala.replace(/\D/g, ''), 10) : ala;
  if (alaNum === 1) return 'ALA 1';
  if (alaNum === 2) return 'ALA 2';
  if (alaNum === 3) return 'ALA 3';
  if (alaNum === 4) return 'ALA 4';

  return `ALA ${ala}`;
}

export function formatMilitaryName(name: string): string {
  const upper = name.toUpperCase();
  
  // Ranks mapping to their abbreviated names
  const ranks: Record<string, string> = {
    'SD': 'SD',
    'SOLDADO': 'SD',
    'CB': 'CB',
    'CABO': 'CB',
    '3º SGT': '3ºSGT',
    '3 SGT': '3ºSGT',
    '3º SARGENTO': '3ºSGT',
    '3 SARGENTO': '3ºSGT',
    '3ºSGT': '3ºSGT',
    '2º SGT': '2ºSGT',
    '2 SGT': '2ºSGT',
    '2º SARGENTO': '2ºSGT',
    '2 SARGENTO': '2ºSGT',
    '2ºSGT': '2ºSGT',
    '1º SGT': '1ºSGT',
    '1 SGT': '1ºSGT',
    '1º SARGENTO': '1ºSGT',
    '1 SARGENTO': '1ºSGT',
    '1ºSGT': '1ºSGT',
    'SARGENTO': '3ºSGT',
    'SGT': '3ºSGT',
    'SUBTEN': 'SUBTEN',
    'SUBTENENTE': 'SUBTEN',
    'ST': 'SUBTEN',
    'ASP OF': 'ASP OF',
    'ASPIRANTE': 'ASP OF',
    'ASP': 'ASP OF',
    '2º TEN': '2º TEN',
    '2 TEN': '2º TEN',
    '2º TENENTE': '2º TEN',
    '2 TENENTE': '2º TEN',
    '1º TEN': '1º TEN',
    '1 TEN': '1º TEN',
    '1º TENENTE': '1º TEN',
    '1 TENENTE': '1º TEN',
    'CAP': 'CAP',
    'CAPITAO': 'CAP',
    'CAPITÃO': 'CAP',
    'MAJ': 'MAJ',
    'MAJOR': 'MAJ',
    'TC': 'TEN CEL',
    'TEN CEL': 'TEN CEL',
    'TENENTE CORONEL': 'TEN CEL',
    'TENENTE-CORONEL': 'TEN CEL',
    'CEL': 'CEL',
    'CORONEL': 'CEL',
    'AL': 'AL',
    'ALUNO': 'AL'
  };

  // Sort keys by length descending so longer keys match first
  const sortedRanks = Object.entries(ranks).sort((a, b) => b[0].length - a[0].length);

  for (const [rank, full] of sortedRanks) {
    if (upper.startsWith(rank + ' ')) {
      const restOfName = upper.substring(rank.length + 1).trim();
      return `${full} ${restOfName}`;
    }
  }

  for (const [rank, full] of sortedRanks) {
    if (upper === rank) {
      return full;
    }
  }

  // If no rank matched, return up to 2 words
  const words = (name || '').trim().split(/\s+/);
  if (words.length >= 2) return `${words[0]} ${words[1]}`;
  return words[0] || '';
}

export function getLocalIsoDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

