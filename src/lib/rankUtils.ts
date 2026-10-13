export function parseRank(r?: string): string {
  if (!r) return '';
  const up = r.toUpperCase().trim();
  
  if (up === 'CEL' || up === 'CORONEL') return 'CORONEL';
  if (up.includes('TEN') && (up.includes('CEL') || up.includes('CORONEL'))) return 'TENENTE CORONEL';
  if (up === 'MAJ' || up === 'MAJOR') return 'MAJOR';
  if (up.includes('CAP') || up === 'CAPITÃO' || up === 'CAPITAO') return 'CAPITÃO';
  if ((up.includes('1') && up.includes('TEN')) || up === '1TEN' || up === '1º TEN') return '1º TENENTE';
  if ((up.includes('2') && up.includes('TEN')) || up === '2TEN' || up === '2º TEN') return '2º TENENTE';
  if (up.includes('ASP') && up.includes('OF')) return 'ASP OF';
  if (up.includes('ASP')) return 'ASP OF'; // fallback for just 'ASP'

  if (up.includes('SUB') || up.includes('ST') || up.includes('SUBTENENTE') || up.includes('SUBTEN')) return 'SUBTEN';
  if ((up.includes('1') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '1SGT' || up === '1ºSGT' || up === '1º SGT') return '1ºSGT';
  if ((up.includes('2') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '2SGT' || up === '2ºSGT' || up === '2º SGT') return '2ºSGT';
  if ((up.includes('3') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '3SGT' || up === '3ºSGT' || up === '3º SGT') return '3ºSGT';
  if (up === 'SGT' || up === 'SARGENTO') return '3ºSGT';
  if (up.includes('CB') || up.includes('CABO')) return 'CB';
  if (up.includes('SD') || up.includes('SOLDADO')) return 'SD';
  
  return up;
}

export function formatRankAbbr(r?: string): string {
  return parseRank(r);
}

export function stripRankPrefix(name: string): string {
  if (!name) return '';
  const prefixes = [
    'SUBTENENTE ', 'SUBTEN ', 'ST ',
    '1º SARGENTO ', '1ºSGT ', '1º SGT ', '1SGT ', '1 SARGENTO ',
    '2º SARGENTO ', '2ºSGT ', '2º SGT ', '2SGT ', '2 SARGENTO ',
    '3º SARGENTO ', '3ºSGT ', '3º SGT ', '3SGT ', '3 SARGENTO ',
    'SARGENTO ', 'SGT ',
    'CABO ', 'CB ',
    'SOLDADO ', 'SD ',
    'CORONEL ', 'CEL ',
    'TENENTE CORONEL ', 'TENENTE-CORONEL ', 'TEN CEL ', 'TC ',
    'MAJOR ', 'MAJ ',
    'CAPITÃO ', 'CAPITAO ', 'CAP ',
    '1º TENENTE ', '1º TEN ', '1TEN ', '1 TEN ',
    '2º TENENTE ', '2º TEN ', '2TEN ', '2 TEN ',
    'ASP OF ', 'ASPIRANTE ', 'ASP ', 'ALUNO ', 'AL '
  ];
  let trimmed = name.trim();
  const up = trimmed.toUpperCase();
  for (const p of prefixes) {
    if (up.startsWith(p)) {
      return trimmed.substring(p.length).trim();
    }
  }
  return trimmed;
}

export function formatRankAndName(militar: any): string {
  if (!militar) return '';
  const rAbbr = formatRankAbbr(militar.rank || '');
  let rawName = militar.warName || '';
  if (!rawName && militar.name) {
    const strippedFullName = stripRankPrefix(militar.name);
    rawName = strippedFullName.split(' ')[0] || militar.name.split(' ')[0];
  }
  if (!rawName) rawName = militar.rg || '';
  const finalName = stripRankPrefix(rawName) || rawName;
  if (rAbbr) {
    return `${rAbbr} ${finalName}`.trim();
  }
  return finalName;
}

export const COLS_OFICIAIS = ['CORONEL', 'TENENTE CORONEL', 'MAJOR', 'CAPITÃO', '1º TENENTE', '2º TENENTE', 'ASP OF'];
export const RANKS_PRACAS = ['SUBTEN', '1ºSGT', '2ºSGT', '3ºSGT', 'CB', 'SD'];
export const ALL_RANKS_IN_ORDER = [...COLS_OFICIAIS, ...RANKS_PRACAS];

export const sortRanks = (a: string, b: string) => {
  const rankA = ALL_RANKS_IN_ORDER.indexOf(parseRank(a));
  const rankB = ALL_RANKS_IN_ORDER.indexOf(parseRank(b));
  const rA = rankA >= 0 ? rankA : 99;
  const rB = rankB >= 0 ? rankB : 99;
  if (rA !== rB) return rA - rB;
  return (a || '').localeCompare(b || '');
};

export const isOfficer = (r: string) => COLS_OFICIAIS.includes(parseRank(r));
export const isPraca = (r: string) => RANKS_PRACAS.includes(parseRank(r));

export const parsePromotionDate = (dateStr: string) => {
  if (!dateStr) return 0;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
    }
  }
  return new Date(dateStr).getTime() || 0;
};

export const sortAllBySeniority = (a: any, b: any) => {
  const allRanks = [...COLS_OFICIAIS, ...RANKS_PRACAS];
  const rankA = allRanks.indexOf(parseRank(a.rank));
  const rankB = allRanks.indexOf(parseRank(b.rank));
  const rA = rankA >= 0 ? rankA : 99;
  const rB = rankB >= 0 ? rankB : 99;
  if (rA !== rB) return rA - rB;
  
  const pDateA = a.promotionDate || (a.promotions && a.promotions.length > 0 ? a.promotions[0].dataPromocao : null);
  const pDateB = b.promotionDate || (b.promotions && b.promotions.length > 0 ? b.promotions[0].dataPromocao : null);
  
  const timeA = pDateA ? parsePromotionDate(pDateA) : 0;
  const timeB = pDateB ? parsePromotionDate(pDateB) : 0;

  if (timeA > 0 && timeB === 0) return -1;
  if (timeA === 0 && timeB > 0) return 1;
  if (timeA > 0 && timeB > 0 && timeA !== timeB) return timeA - timeB; // Older dates come first
  
  return parseInt((a.rg || '').replace(/\D/g,'') || '0') - parseInt((b.rg || '').replace(/\D/g,'') || '0');
};

export const sortOfficersBySeniority = (a: any, b: any) => {
  const rankA = COLS_OFICIAIS.indexOf(parseRank(a.rank));
  const rankB = COLS_OFICIAIS.indexOf(parseRank(b.rank));
  const rA = rankA >= 0 ? rankA : 99;
  const rB = rankB >= 0 ? rankB : 99;
  if (rA !== rB) return rA - rB;
  
  const pDateA = a.promotionDate || (a.promotions && a.promotions.length > 0 ? a.promotions[0].dataPromocao : null);
  const pDateB = b.promotionDate || (b.promotions && b.promotions.length > 0 ? b.promotions[0].dataPromocao : null);
  
  const timeA = pDateA ? parsePromotionDate(pDateA) : 0;
  const timeB = pDateB ? parsePromotionDate(pDateB) : 0;

  if (timeA > 0 && timeB === 0) return -1;
  if (timeA === 0 && timeB > 0) return 1;
  if (timeA > 0 && timeB > 0 && timeA !== timeB) return timeA - timeB; // Older dates come first
  
  return parseInt((a.rg || '').replace(/\D/g,'') || '0') - parseInt((b.rg || '').replace(/\D/g,'') || '0');
};
