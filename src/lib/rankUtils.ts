export function parseRank(r?: string): string {
  if (!r) return '';
  const up = r.toUpperCase().trim();
  
  if (up === 'CEL' || up === 'CORONEL') return 'CORONEL';
  if (up.includes('TEN') && (up.includes('CEL') || up.includes('CORONEL'))) return 'TEN CEL';
  if (up === 'MAJ' || up === 'MAJOR') return 'MAJOR';
  if (up.includes('CAP') || up === 'CAPITÃO' || up === 'CAPITAO') return 'CAPITÃO';
  if ((up.includes('1') && up.includes('TEN')) || up === '1TEN' || up === '1º TEN') return '1º TEN';
  if ((up.includes('2') && up.includes('TEN')) || up === '2TEN' || up === '2º TEN') return '2º TEN';
  if (up.includes('ASP') && up.includes('OF')) return 'ASP OF';
  if (up.includes('ASP')) return 'ASP OF'; // fallback for just 'ASP'

  if (up.includes('SUB') || up.includes('ST') || up.includes('SUBTENENTE') || up.includes('SUBTEN')) return 'SUBTEN';
  if ((up.includes('1') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '1SGT') return '1º SGT';
  if ((up.includes('2') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '2SGT') return '2º SGT';
  if ((up.includes('3') && (up.includes('SGT') || up.includes('SARGENTO'))) || up === '3SGT') return '3º SGT';
  if (up.includes('CB') || up.includes('CABO')) return 'CABO';
  if (up.includes('SD') || up.includes('SOLDADO')) return 'SOLDADO';
  
  return up;
}

export const COLS_OFICIAIS = ['CORONEL', 'TEN CEL', 'MAJOR', 'CAPITÃO', '1º TEN', '2º TEN', 'ASP OF'];
export const RANKS_PRACAS = ['SUBTEN', '1º SGT', '2º SGT', '3º SGT', 'CABO', 'SOLDADO'];

export const isOfficer = (r: string) => COLS_OFICIAIS.includes(parseRank(r));
export const isPraca = (r: string) => RANKS_PRACAS.includes(parseRank(r));

export const sortAllBySeniority = (a: any, b: any) => {
  const allRanks = [...COLS_OFICIAIS, ...RANKS_PRACAS];
  const rankA = allRanks.indexOf(parseRank(a.rank));
  const rankB = allRanks.indexOf(parseRank(b.rank));
  const rA = rankA >= 0 ? rankA : 99;
  const rB = rankB >= 0 ? rankB : 99;
  if (rA !== rB) return rA - rB;
  
  if (a.promotionDate && b.promotionDate) {
    const timeA = new Date(a.promotionDate).getTime();
    const timeB = new Date(b.promotionDate).getTime();
    if (timeA !== timeB) return timeA - timeB;
  }
  
  return parseInt((a.rg || '').replace(/\D/g,'') || '0') - parseInt((b.rg || '').replace(/\D/g,'') || '0');
};

export const sortOfficersBySeniority = (a: any, b: any) => {
  const rankA = COLS_OFICIAIS.indexOf(parseRank(a.rank));
  const rankB = COLS_OFICIAIS.indexOf(parseRank(b.rank));
  const rA = rankA >= 0 ? rankA : 99;
  const rB = rankB >= 0 ? rankB : 99;
  if (rA !== rB) return rA - rB;
  
  if (a.promotionDate && b.promotionDate) {
    const timeA = new Date(a.promotionDate).getTime();
    const timeB = new Date(b.promotionDate).getTime();
    if (timeA !== timeB) return timeA - timeB;
  }
  
  return parseInt((a.rg || '').replace(/\D/g,'') || '0') - parseInt((b.rg || '').replace(/\D/g,'') || '0');
};
