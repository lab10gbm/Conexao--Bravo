import { format, getDay } from 'date-fns';
import { parseRank, sortOfficersBySeniority } from '../../../lib/rankUtils';
import { UserProfile } from '../../../types';
import { OfficerQuotaItem } from '../types';

export function calculateOfficerQuotas(
  activeOfficers: UserProfile[],
  monthDaysOnly: Date[]
): OfficerQuotaItem[] {
  if (activeOfficers.length === 0) return [];

  // Sort by Seniority (Antiguidade). CORONEL -> ASP OF
  const sortedOfficers = [...activeOfficers].sort(sortOfficersBySeniority);

  const totalDays = monthDaysOnly.length;
  const numOfficers = sortedOfficers.length;
  const baseQuota = Math.floor(totalDays / numOfficers);
  const remainder = totalDays % numOfficers;

  const dist: OfficerQuotaItem[] = sortedOfficers.map(m => ({
    rg: m.rg,
    name: `${parseRank(m.rank)} ${m.warName || (m.name || '').split(' ')[0]}`,
    quotaTotal: baseQuota,
    quotaRed: 0,
    quotaPurple: 0,
    quotaBlack: 0,
    daysRed: [],
    daysPurple: [],
    daysBlack: []
  }));

  // Distribute remainder to the most modern (end of array)
  for (let i = 0; i < remainder; i++) {
    dist[dist.length - 1 - i].quotaTotal += 1;
  }

  const redDays: string[] = [];
  const purpleDays: string[] = [];
  const blackDays: string[] = [];

  monthDaysOnly.forEach(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = getDay(day);
    if (dayOfWeek === 0 || dayOfWeek === 6) redDays.push(dayStr);
    else if (dayOfWeek === 5) purpleDays.push(dayStr);
    else blackDays.push(dayStr);
  });

  let currentModernIdx = dist.length - 1;
  redDays.forEach(day => {
    dist[currentModernIdx].daysRed.push(day);
    dist[currentModernIdx].quotaRed += 1;
    currentModernIdx -= 1;
    if (currentModernIdx < 0) {
      currentModernIdx = dist.length - 1;
    }
  });

  purpleDays.forEach(day => {
    let chosenIdx = -1;
    let minRed = 9999;
    let bestModernity = -1;

    for (let i = 0; i < dist.length; i++) {
      const officer = dist[i];
      const currentTotal = officer.quotaRed + officer.quotaPurple + officer.quotaBlack;
      if (currentTotal < officer.quotaTotal) {
        if (officer.quotaRed < minRed) {
          minRed = officer.quotaRed;
          bestModernity = i;
          chosenIdx = i;
        } else if (officer.quotaRed === minRed) {
          if (i > bestModernity) {
            bestModernity = i;
            chosenIdx = i;
          }
        }
      }
    }

    if (chosenIdx !== -1) {
      dist[chosenIdx].daysPurple.push(day);
      dist[chosenIdx].quotaPurple += 1;
    }
  });

  const availableBlackDays = [...blackDays];
  dist.forEach(officer => {
    const missing = officer.quotaTotal - (officer.quotaRed + officer.quotaPurple);
    if (missing > 0) {
      officer.quotaBlack = missing;
      for (let i = 0; i < missing; i++) {
        if (availableBlackDays.length > 0) {
          officer.daysBlack.push(availableBlackDays.shift() as string);
        }
      }
    }
  });

  return dist;
}
