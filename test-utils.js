
function normalizeObm(obm?: string): string {
  if (!obm) return '10º GBM';
  const clean = obm.toString().trim().toUpperCase();
  
  const sede10Variations = ['10', '10º', '10 GBM', '10º GBM', '10ºGBM', '10GBM', 'OBM', '10º GBM - SEDE', '10º GBM SEDE', '10 GBM SEDE', '10º GBM-SEDE', '10º GBM - ANGRA DOS REIS', '10º GBM ANGRA DOS REIS'];
  if (sede10Variations.includes(clean)) return '10º GBM';
  
  const sede26Variations = ['26', '26º', '26 GBM', '26º GBM', '26ºGBM', '26GBM', '26º GBM - SEDE', '26º GBM - PARATY'];
  if (sede26Variations.includes(clean)) return '26º GBM';

  if (['1/26', '1 / 26', '1/26 - MANGARATIBA / PARATY', '1/26 GBM'].includes(clean)) return '1/26';
  
  return clean;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getUserObmAccess = (userObm?: string, isAdmin = false): string[] => {
  if (isAdmin) {
    return Object.keys(OBM_HIERARCHY); // Admin sees everything
  }
  const obm = userObm || '';
  return OBM_HIERARCHY[obm] || [obm];
};

export let GLOBAL_REF_YEAR = 2026;
export let GLOBAL_START_ALA = 2;

function cleanUndefined(obj: any): any {
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

function setGlobalAlaConfig(year: number, startAla: number) {
  GLOBAL_REF_YEAR = year;
  GLOBAL_START_ALA = startAla;
}

function calculateDeadline(targetDate: Date): Date {
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
function getAlaForDate(date: Date): number {
  const baseDate = new Date(GLOBAL_REF_YEAR, 0, 1);
  const diffInTime = date.getTime() - baseDate.getTime();
  const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));
  
  const ala = (((diffInDays + (GLOBAL_START_ALA - 1)) % 4) + 4) % 4 + 1;
  return ala;
}

function getOppositeAla(ala: number): number {
  if (ala === 1) return 3;
  if (ala === 3) return 1;
  if (ala === 2) return 4;
  if (ala === 4) return 2;
  return 0;
}

function getAlaColor(ala: number | string): string {
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

function getAlaLightColor(ala: number | string): string {
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

function getAlaCardColor(ala: number | string): string {
  const alaStr = ala.toString().toUpperCase();
  if (['EXP', 'E', 'EXPEDIENTE'].includes(alaStr)) return 'bg-slate-200 text-slate-900';
  if (alaStr === 'ESCALANTE') return 'bg-indigo-100 text-indigo-900';
  
  const alaNum = typeof ala === 'string' ? parseInt(ala) : ala;
  switch (alaNum) {
    case 1: return 'bg-emerald-100 text-emerald-900';
    case 2: return 'bg-rose-100 text-rose-900';
    case 3: return 'bg-sky-100 text-sky-900';
    case 4: return 'bg-amber-100 text-amber-900';
    default: return 'bg-gray-100 text-gray-900';
  }
}

function getThemeColors(ala?: string | number) {
  const a = ala?.toString().toUpperCase() || '';
  if (a === '1') return { panel: 'bg-emerald-50 border-emerald-200', card: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-900', title: 'text-emerald-800', borderInner: 'border-emerald-200', textLight: 'text-emerald-600', iconBg: 'bg-emerald-200 border-emerald-400', iconText: 'text-emerald-800', divide: 'divide-emerald-200' };
  if (a === '2') return { panel: 'bg-rose-50 border-rose-200', card: 'bg-rose-100 border-rose-300', text: 'text-rose-900', title: 'text-rose-800', borderInner: 'border-rose-200', textLight: 'text-rose-600', iconBg: 'bg-rose-200 border-rose-400', iconText: 'text-rose-800', divide: 'divide-rose-200' };
  if (a === '3') return { panel: 'bg-sky-50 border-sky-200', card: 'bg-sky-100 border-sky-300', text: 'text-sky-900', title: 'text-sky-800', borderInner: 'border-sky-200', textLight: 'text-sky-600', iconBg: 'bg-sky-200 border-sky-400', iconText: 'text-sky-800', divide: 'divide-sky-200' };
  if (a === '4') return { panel: 'bg-amber-50 border-amber-200', card: 'bg-amber-100 border-amber-300', text: 'text-amber-900', title: 'text-amber-800', borderInner: 'border-amber-200', textLight: 'text-amber-600', iconBg: 'bg-amber-200 border-amber-400', iconText: 'text-amber-800', divide: 'divide-amber-200' };
  if (['EXP', 'E', 'EXPEDIENTE'].includes(a)) return { panel: 'bg-slate-100 border-slate-300', card: 'bg-slate-200 border-slate-300', text: 'text-slate-800', title: 'text-slate-700', borderInner: 'border-slate-300', textLight: 'text-slate-500', iconBg: 'bg-slate-200 border-slate-400', iconText: 'text-slate-700', divide: 'divide-slate-300' };
  if (a === 'ESCALANTE') return { panel: 'bg-indigo-50 border-indigo-200', card: 'bg-indigo-100 border-indigo-300', text: 'text-indigo-900', title: 'text-indigo-800', borderInner: 'border-indigo-200', textLight: 'text-indigo-600', iconBg: 'bg-indigo-200 border-indigo-400', iconText: 'text-indigo-800', divide: 'divide-indigo-200' };
  
  // Default (no ala)
  return { panel: 'bg-white border-slate-200', card: 'bg-slate-50 border-slate-200', text: 'text-slate-800', title: 'text-slate-500', borderInner: 'border-slate-200', textLight: 'text-slate-500', iconBg: 'bg-indigo-100 border-indigo-300', iconText: 'text-indigo-600', divide: 'divide-slate-200' };
}

function getAlaName(ala: number | string): string {
  const alaStr = ala.toString().toUpperCase();
  if (alaStr === 'EXP') return 'EXPEDIENTE';
  if (alaStr === 'ESCALANTE') return 'ESCALANTE';
  return `ALA ${ala}`;
}

function formatMilitaryName(name: string): string {
  const upper = name.toUpperCase();
  
  // Ranks mapping to their abbreviations
  const ranks: Record<string, string> = {
    'SOLDADO': 'SD',
    'CABO': 'CB',
    '3º SARGENTO': '3º SGT',
    '3 SARGENTO': '3º SGT',
    '3 SGT': '3º SGT',
    '2º SARGENTO': '2º SGT',
    '2 SARGENTO': '2º SGT',
    '2 SGT': '2º SGT',
    '1º SARGENTO': '1º SGT',
    '1 SARGENTO': '1º SGT',
    '1 SGT': '1º SGT',
    'SUBTENENTE': 'SUBTEN',
    'ASP OF': 'ASP',
    'ASPIRANTE': 'ASP',
    '2º TENENTE': '2º TEN',
    '2 TENENTE': '2º TEN',
    '2 TEN': '2º TEN',
    '1º TENENTE': '1º TEN',
    '1 TENENTE': '1º TEN',
    '1 TEN': '1º TEN',
    'CAPITAO': 'CAP',
    'CAPITÃO': 'CAP',
    'MAJOR': 'MAJ',
    'TENENTE-CORONEL': 'TC',
    'TENENTE CORONEL': 'TC',
    'TEN CEL': 'TC',
    'CORONEL': 'CEL',
    'ALUNO': 'AL'
  };

  for (const [rank, abbr] of Object.entries(ranks)) {
    if (upper.startsWith(rank + ' ')) {
      const restOfName = upper.substring(rank.length + 1).trim();
      return `${abbr} ${restOfName}`;
    }
  }

  // Also check if it already starts with an abbreviation
  const abbrs = Array.from(new Set(Object.values(ranks)));
  for (const abbr of abbrs) {
    if (upper.startsWith(abbr + ' ')) {
      const restOfName = upper.substring(abbr.length + 1).trim();
      return `${abbr} ${restOfName}`;
    }
  }

  // If no rank matched, return up to 2 words
  const words = (name || '').trim().split(/\s+/);
  if (words.length >= 2) return `${words[0]} ${words[1]}`;
  return words[0] || '';
}
module.exports = { formatMilitaryName };
