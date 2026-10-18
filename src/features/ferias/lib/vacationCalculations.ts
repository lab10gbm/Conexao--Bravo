import { UserProfile, Vacation } from '../../../types';
import { normalizeRg } from '../../../lib/utils';
import { isOfficer, sortAllBySeniority } from '../../../lib/rankUtils';
import { PanoramaData, PanoramaRow, GroupedVacationYear } from '../types';

export function extractYear(val: string): number {
  const match = (val || '').match(/\d{4}/);
  return match ? parseInt(match[0], 10) : parseInt(val || '', 10);
}

export function calculateVacationsByAnoRef(vacations: Vacation[]): Record<string, number> {
  return vacations.reduce((acc, v) => {
    if (v.ato && !v.ato.toUpperCase().includes('ASSEGURADAS') && !v.ato.toUpperCase().includes('CANCELAMENT')) {
      acc[v.anoRef] = (acc[v.anoRef] || 0) + (v.diasGozados || 0);
    }
    return acc;
  }, {} as Record<string, number>);
}

export function calculateMilitarVacationYears(
  vacations: Vacation[],
  visibleVacations: Vacation[]
) {
  let sYear = new Date().getFullYear();

  const validYears = vacations
    .map(v => extractYear(v.anoRef))
    .filter(n => !isNaN(n) && n > 1900);
  if (validYears.length > 0) {
    sYear = Math.min(...validYears);
  }
  const eYear = Math.max(
    new Date().getFullYear() + 1,
    ...(validYears.length > 0 ? validYears : [new Date().getFullYear()])
  );

  const statsByYear: Record<
    number,
    {
      totalGozados: number;
      pending: number;
      temConcessoes: boolean;
      temAsseguradas: boolean;
    }
  > = {};
  for (let y = sYear; y <= eYear; y++) {
    statsByYear[y] = {
      totalGozados: 0,
      pending: 30,
      temConcessoes: false,
      temAsseguradas: false,
    };
  }

  vacations.forEach(v => {
    const y = extractYear(v.anoRef);
    if (!isNaN(y) && statsByYear[y]) {
      if (v.ato && !v.ato.toUpperCase().includes('ASSEGURADAS') && !v.ato.toUpperCase().includes('CANCELAMENT')) {
        statsByYear[y].totalGozados += v.diasGozados || 0;
        statsByYear[y].pending = Math.max(0, 30 - statsByYear[y].totalGozados);
        statsByYear[y].temConcessoes = true;
      }
      if (v.ato?.toUpperCase().includes('ASSEGURADAS')) {
        statsByYear[y].temAsseguradas = true;
      }
    }
  });

  const missingYears: number[] = [];
  const pendingYears: { year: number; pending: number }[] = [];
  for (let y = sYear; y <= eYear; y++) {
    if (!statsByYear[y].temConcessoes && !statsByYear[y].temAsseguradas) {
      missingYears.push(y);
    } else if (statsByYear[y].pending > 0 && statsByYear[y].temConcessoes) {
      pendingYears.push({ year: y, pending: statsByYear[y].pending });
    } else if (!statsByYear[y].temConcessoes && statsByYear[y].temAsseguradas) {
      pendingYears.push({ year: y, pending: 30 });
    }
  }

  const groups: Record<string, Vacation[]> = {};
  visibleVacations.forEach(v => {
    if (!groups[v.anoRef]) groups[v.anoRef] = [];
    groups[v.anoRef].push(v);
  });
  const groupedVacations: GroupedVacationYear[] = Object.keys(groups)
    .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))
    .map(anoRef => {
      const items = groups[anoRef];
      items.sort((a, b) => {
        const ad = a.dataInicio?.split('/').reverse().join('') || '';
        const bd = b.dataInicio?.split('/').reverse().join('') || '';
        return bd.localeCompare(ad);
      });
      return {
        anoRef,
        items,
        totalGozados: statsByYear[parseInt(anoRef, 10)]?.totalGozados || 0,
        pending: statsByYear[parseInt(anoRef, 10)]?.pending || 0,
      };
    });

  return {
    startYear: sYear,
    endYear: eYear,
    vacationsStats: statsByYear,
    missingYears,
    pendingYears,
    groupedVacations,
  };
}

export function calculatePanoramaData(
  allVacations: Vacation[],
  filteredMilitars: UserProfile[],
  panoramaValidations: Record<string, any>,
  panoramaSortMode: 'dias' | 'graduacao'
): PanoramaData {
  const currentYear = new Date().getFullYear();
  const vacsByRg: Record<string, Vacation[]> = {};
  allVacations.forEach(v => {
    const cleanMilitarRg = normalizeRg(v.militarRg || '');
    if (!vacsByRg[cleanMilitarRg]) vacsByRg[cleanMilitarRg] = [];
    vacsByRg[cleanMilitarRg].push(v);
  });

  const oficiais: PanoramaRow[] = [];
  const pracas: PanoramaRow[] = [];
  const regularizadosOficiais: PanoramaRow[] = [];
  const regularizadosPracas: PanoramaRow[] = [];
  const validadosOficiais: PanoramaRow[] = [];
  const validadosPracas: PanoramaRow[] = [];

  for (const m of filteredMilitars) {
    const cleanRg = normalizeRg(m.rg);
    const mVacations = vacsByRg[cleanRg] || [];
    const isVal = panoramaValidations[cleanRg];
    if (mVacations.length === 0 && !isVal) continue;

    let sYear = currentYear;
    const validYears = mVacations
      .map(v => extractYear(v.anoRef))
      .filter(n => !isNaN(n) && n > 1900);
    if (validYears.length > 0) sYear = Math.min(...validYears);

    const statsByYear: Record<
      number,
      {
        totalGozados: number;
        pending: number;
        temConcessoes: boolean;
        temAsseguradas: boolean;
      }
    > = {};
    for (let y = sYear; y <= currentYear; y++) {
      statsByYear[y] = {
        totalGozados: 0,
        pending: 30,
        temConcessoes: false,
        temAsseguradas: false,
      };
    }

    mVacations.forEach(v => {
      const y = extractYear(v.anoRef);
      if (!isNaN(y) && statsByYear[y]) {
        if (v.ato && !v.ato.toUpperCase().includes('ASSEGURADAS') && !v.ato.toUpperCase().includes('CANCELAMENT')) {
          statsByYear[y].totalGozados += v.diasGozados || 0;
          statsByYear[y].pending = Math.max(0, 30 - statsByYear[y].totalGozados);
          statsByYear[y].temConcessoes = true;
        }
        if (v.ato?.toUpperCase().includes('ASSEGURADAS')) {
          statsByYear[y].temAsseguradas = true;
        }
      }
    });

    const missing: number[] = [];
    const pending: { year: number; days: number }[] = [];
    for (let y = sYear; y <= currentYear; y++) {
      if (!statsByYear[y].temConcessoes && !statsByYear[y].temAsseguradas) {
        missing.push(y);
      } else if (statsByYear[y].pending > 0 && statsByYear[y].temConcessoes) {
        pending.push({ year: y, days: statsByYear[y].pending });
      } else if (!statsByYear[y].temConcessoes && statsByYear[y].temAsseguradas) {
        pending.push({ year: y, days: 30 });
      }
    }

    const totalPendingDays =
      pending.reduce((acc, p) => acc + p.days, 0) + missing.length * 30;

    const row: PanoramaRow = {
      militar: m,
      startYear: sYear,
      missingYears: missing,
      pendingBalances: pending,
      totalPendingDays,
      isVal,
    };

    if (isOfficer(m.rank || '')) {
      if (isVal) validadosOficiais.push(row);
      else if (totalPendingDays > 0) oficiais.push(row);
      else regularizadosOficiais.push(row);
    } else {
      if (isVal) validadosPracas.push(row);
      else if (totalPendingDays > 0) pracas.push(row);
      else regularizadosPracas.push(row);
    }
  }

  const sortFn = (a: PanoramaRow, b: PanoramaRow) => {
    if (panoramaSortMode === 'dias') {
      return b.totalPendingDays - a.totalPendingDays;
    } else {
      return sortAllBySeniority(a.militar, b.militar);
    }
  };

  return {
    oficiais: oficiais.sort(sortFn),
    pracas: pracas.sort(sortFn),
    regularizadosOficiais: regularizadosOficiais.sort((a, b) => sortAllBySeniority(a.militar, b.militar)),
    regularizadosPracas: regularizadosPracas.sort((a, b) => sortAllBySeniority(a.militar, b.militar)),
    validadosOficiais: validadosOficiais.sort((a, b) => sortAllBySeniority(a.militar, b.militar)),
    validadosPracas: validadosPracas.sort((a, b) => sortAllBySeniority(a.militar, b.militar)),
  };
}
