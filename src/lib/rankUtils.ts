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

  if (up.includes('SUB') || up.includes('ST') || up.includes('SUBTENENTE') || up.includes('SUBTEN')) return 'SUBTENENTE';
  if ((up.includes('1') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '1SGT') return '1º SARGENTO';
  if ((up.includes('2') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '2SGT') return '2º SARGENTO';
  if ((up.includes('3') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '3SGT') return '3º SARGENTO';
  if (up.includes('CB') || up.includes('CABO')) return 'CABO';
  if (up.includes('SD') || up.includes('SOLDADO')) return 'SOLDADO';
  
  return up;
}

export const COLS_OFICIAIS = ['CORONEL', 'TENENTE CORONEL', 'MAJOR', 'CAPITÃO', '1º TENENTE', '2º TENENTE', 'ASP OF'];
export const RANKS_PRACAS = ['SUBTENENTE', '1º SARGENTO', '2º SARGENTO', '3º SARGENTO', 'CABO', 'SOLDADO'];
export const ALL_RANKS_IN_ORDER = [...COLS_OFICIAIS, ...RANKS_PRACAS];

export const sortRanks = (a: string, b: string) => {
  const rankA = ALL_RANKS_IN_ORDER.indexOf(parseRank(a));
  const rankB = ALL_RANKS_IN_ORDER.indexOf(parseRank(b));
  const rA = rankA >= 0 ? rankA : 99;
  const rB = rankB >= 0 ? rankB : 99;
  if (rA !== rB) return rA - rB;
  return a.localeCompare(b);
};

export const isOfficer = (r: string) => COLS_OFICIAIS.includes(parseRank(r));
export const isPraca = (r: string) => RANKS_PRACAS.includes(parseRank(r));

const parsePromotionDate = (dateStr: string) => {
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
  
  if (pDateA && pDateB) {
    const timeA = parsePromotionDate(pDateA);
    const timeB = parsePromotionDate(pDateB);
    if (timeA !== timeB) return timeA - timeB; // Older dates (smaller timestamp) come first
  }
  
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
  
  if (pDateA && pDateB) {
    const timeA = parsePromotionDate(pDateA);
    const timeB = parsePromotionDate(pDateB);
    if (timeA !== timeB) return timeA - timeB;
  }
  
  return parseInt((a.rg || '').replace(/\D/g,'') || '0') - parseInt((b.rg || '').replace(/\D/g,'') || '0');
};
