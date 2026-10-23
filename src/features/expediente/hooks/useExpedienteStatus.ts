import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserProfile, PermutaRequest } from '../../../types';
import { formatMilitaryName } from '../../../lib/utils';
import { safeArr, COMPETENCY_MAP } from '../lib/expedienteCalculos';
import type {
  Afastamento,
  ExpedienteData,
  DayStatusResult,
  PermutaDayDetails
} from '../types';

interface UseExpedienteStatusProps {
  data: ExpedienteData;
  extraMonthData: Record<string, any>;
  afastamentos: Afastamento[];
  generalPermutas: PermutaRequest[];
  expedienteUsers: UserProfile[];
  militars: UserProfile[];
  monthKey: string;
}

export function useExpedienteStatus({
  data,
  extraMonthData,
  afastamentos,
  generalPermutas,
  expedienteUsers,
  militars,
  monthKey
}: UseExpedienteStatusProps) {
  const getRegime = (rg: string): string => {
    if (!rg) return '';
    const clean = String(rg).replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
    let val = data.regimes?.[rg];
    if (!val) val = data.regimes?.[clean];
    if (!val) {
      const foundKey = Object.keys(data.regimes || {}).find(
        (k) => k.replace(/[^A-Z0-9]/g, '').replace(/^0+/, '') === clean
      );
      if (foundKey) val = data.regimes[foundKey];
    }
    return typeof val === 'string' ? val : '';
  };

  const getSector = (rg: string): string => {
    const val = data.sectors?.[rg];
    return typeof val === 'string' ? val : '';
  };

  const getReqAmount = (rg: string): number => {
    if (!rg) return 0;
    const clean = String(rg).replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');

    let val = data.requirements?.[rg];
    if (val === undefined || isNaN(val)) {
      val = data.requirements?.[clean];
    }
    if (val === undefined || isNaN(val)) {
      const foundKey = Object.keys(data.requirements || {}).find(
        (k) => k.replace(/[^A-Z0-9]/g, '').replace(/^0+/, '') === clean
      );
      if (foundKey && data.requirements?.[foundKey] !== undefined)
        val = data.requirements[foundKey];
    }

    if (typeof val === 'number' && !isNaN(val)) {
      return val;
    }

    const reg = getRegime(rg);
    if (reg) {
      if (/1\s*exped.*3\s*serv/i.test(reg)) return 3;
      if (/3\s*exped.*(?:2\s*serv|serv)/i.test(reg)) return 2;
      if (/4\s*exped.*1\s*serv/i.test(reg)) return 1;
      if (/readaptado|redu[çc][ãa]o/i.test(reg)) return 0;
    }

    return 0;
  };

  const getExpQuota = (rg: string): number => {
    if (!rg) return 0;
    const clean = String(rg).replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');

    let val = data.expQuotas?.[rg];
    if (val === undefined || isNaN(val)) {
      val = data.expQuotas?.[clean];
    }
    if (val === undefined || isNaN(val)) {
      const foundKey = Object.keys(data.expQuotas || {}).find(
        (k) => k.replace(/[^A-Z0-9]/g, '').replace(/^0+/, '') === clean
      );
      if (foundKey && data.expQuotas?.[foundKey] !== undefined)
        val = data.expQuotas[foundKey];
    }
    if (typeof val === 'number' && !isNaN(val)) {
      return val;
    }

    const regime = getRegime(rg);
    const match = regime.match(/(\d+)\s*Exped/i);
    if (match) return parseInt(match[1], 10);
    if (/readaptado/i.test(regime)) return 4;
    if (/redu[çc][ãa]o/i.test(regime)) return 2;
    return 0;
  };

  const getRegimeDisplay = (rg: string): string => {
    const raw = getRegime(rg);
    if (raw) {
      if (/1\s*Exped.*3\s*serv/i.test(raw)) return '01 Expediente e 03 serviços';
      if (/3\s*Exped.*(?:2\s*serv|serv)/i.test(raw)) return '03 Expedientes e 02 serviços';
      if (/4\s*Exped.*1\s*serv/i.test(raw)) return '04 Expedientes e 01 serviço';
      if (/4\s*Expedientes/i.test(raw) || /readaptado/i.test(raw)) return '04 Expedientes';
      if (/2\s*(?:e\s*)?1\/2\s*Exped/i.test(raw) || /redu[çc][ãa]o/i.test(raw))
        return '02 e 1/2 Expedientes';
      return raw;
    }
    const req = getReqAmount(rg);
    if (req === 3) return '01 Expediente e 03 serviços';
    if (req === 2) return '03 Expedientes e 02 serviços';
    if (req === 1) return '04 Expedientes e 01 serviço';
    if (req === 0) return '04 Expedientes';
    return '-';
  };

  const getServicosOrdinariosDisplay = (u: UserProfile): string => {
    const rg = u.rg || u.uid;
    const reqAmount = getReqAmount(rg);
    const rawRegime = getRegime(rg);
    const sels = safeArr(data.selections[rg]);

    if (sels.length > 0) {
      const sorted = [...sels].sort();
      const formattedDays = sorted.map((dayStr) => {
        const dateObj = new Date(dayStr + 'T12:00:00');
        const day = format(dateObj, 'dd');
        const mon = format(dateObj, 'MMM', { locale: ptBR })
          .replace('.', '')
          .toLowerCase();
        return `${day} ${mon}`;
      });

      if (formattedDays.length === 1) return formattedDays[0];
      if (formattedDays.length === 2) return `${formattedDays[0]} e ${formattedDays[1]}`;
      return `${formattedDays.slice(0, -1).join(', ')} e ${
        formattedDays[formattedDays.length - 1]
      }`;
    }

    const isExento =
      reqAmount === 0 &&
      (rawRegime.includes('Readaptado') ||
        rawRegime.includes('Redução') ||
        rawRegime.includes('4 Expedientes'));

    if (reqAmount === 0 || isExento) {
      return 'DTS';
    }

    return '';
  };

  const getPermutaForDay = (
    rg: string,
    dayStr: string,
    dataSource?: any
  ): PermutaDayDetails | null => {
    if (!rg || !dayStr) return null;
    const targetCleanRg = String(rg || '').replace(/\D/g, '').trim();
    if (!targetCleanRg) return null;

    // 1. Permutas gerais da coleção 'permutas'
    for (const p of generalPermutas) {
      if (p.archived) continue;
      const st = String(p.status || '').toLowerCase().trim();
      if (st === 'cancelled' || st === 'rejected') continue;
      if (p.date !== dayStr) continue;

      const subClean = String(p.substituteRg || '').replace(/\D/g, '').trim();
      const idClean = String(p.acceptedById || '').replace(/\D/g, '').trim();
      const targetMilClean = String(p.targetMilitarId || '').replace(/\D/g, '').trim();
      const subIdClean = String(p.substituteId || '').replace(/\D/g, '').trim();

      const isSub =
        (subClean && subClean === targetCleanRg) ||
        (idClean && idClean === targetCleanRg) ||
        (targetMilClean && targetMilClean === targetCleanRg) ||
        (subIdClean && subIdClean === targetCleanRg);

      if (isSub) {
        return {
          hasPermuta: true,
          role: 'substitute',
          status: st,
          otherPartyName: p.requesterName,
          otherPartyRg: p.requesterRg,
          source: 'general',
          permutaDocId: p.id
        };
      }

      const reqClean = String(p.requesterRg || '').replace(/\D/g, '').trim();
      const reqIdClean = String(p.requesterId || '').replace(/\D/g, '').trim();
      const isReq =
        (reqClean && reqClean === targetCleanRg) ||
        (reqIdClean && reqIdClean === targetCleanRg);

      if (isReq) {
        return {
          hasPermuta: true,
          role: 'requester',
          status: st,
          otherPartyName: p.substituteName || p.acceptedByName,
          otherPartyRg: p.substituteRg,
          source: 'general',
          permutaDocId: p.id
        };
      }
    }

    // 2. Troca interna do módulo ExpedienteScheduler (data.swapRequests)
    const currentMonthSwapReqs = safeArr(data?.swapRequests);
    const extraSwapReqs = safeArr(dataSource?.swapRequests);
    const allSwapReqs = [...currentMonthSwapReqs, ...extraSwapReqs];

    const enteringSwap = allSwapReqs.find(
      (r) =>
        String(r.rg || '').replace(/\D/g, '').trim() === targetCleanRg &&
        r.toDay === dayStr &&
        (r.status === 'approved' || r.status === 'pending')
    );
    if (enteringSwap) {
      return {
        hasPermuta: true,
        role: 'substitute',
        status: enteringSwap.status || 'approved',
        otherPartyName: enteringSwap.userName,
        source: 'internal'
      };
    }

    const leavingSwap = allSwapReqs.find(
      (r) =>
        String(r.rg || '').replace(/\D/g, '').trim() === targetCleanRg &&
        r.fromDay === dayStr &&
        (r.status === 'approved' || (r.status === 'pending' && safeArr(dataSource?.selections?.[rg]).includes(dayStr)))
    );
    if (leavingSwap) {
      return {
        hasPermuta: true,
        role: 'requester',
        status: leavingSwap.status || 'approved',
        otherPartyName: leavingSwap.userName,
        source: 'internal'
      };
    }

    return null;
  };

  const checkDayHasPermuta = (
    rg: string,
    dayStr: string,
    dataSource?: any
  ): boolean => {
    const info = getPermutaForDay(rg, dayStr, dataSource);
    return Boolean(info && info.role === 'substitute');
  };

  const getDayStatus = (rg: string, dayStr: string): DayStatusResult => {
    const dayMonthKey = dayStr.substring(0, 7);
    const dataSource =
      dayMonthKey === monthKey ? data : extraMonthData[dayMonthKey] || {};
    const sels = safeArr(dataSource.selections?.[rg]);
    const expDays = safeArr(dataSource.expedienteDays?.[rg]);

    const cleanTargetRg = String(rg || '').replace(/\D/g, '').trim();
    const afastamento = afastamentos.find(
      (a) =>
        String(a.rg || '').replace(/\D/g, '').trim() === cleanTargetRg &&
        dayStr >= a.inicio &&
        dayStr <= a.retorno
    );
    if (afastamento) {
      return {
        text: afastamento.situacao.toUpperCase(),
        type: 'afastamento',
        label: afastamento.situacao.toUpperCase(),
        isPermuta: false
      };
    }

    // Permuta
    const permutaInfo = getPermutaForDay(rg, dayStr, dataSource);

    if (permutaInfo && permutaInfo.role === 'substitute') {
      const isApproved = ['accepted', 'scheduled', 'approved'].includes(
        permutaInfo.status
      );
      const textStr = isApproved ? 'PERMUTA DEFERIDA' : 'PERMUTA PENDENTE';
      return {
        text: textStr,
        type: 'servico',
        label: textStr,
        isPermuta: true,
        permutaInfo
      };
    }

    if (permutaInfo && permutaInfo.role === 'requester') {
      const isApproved = ['accepted', 'scheduled', 'approved'].includes(
        permutaInfo.status
      );
      if (isApproved) {
        if (expDays.includes(dayStr)) {
          return {
            text: 'EXPEDIENTE',
            type: 'expediente',
            label: 'EXPEDIENTE',
            isPermuta: true,
            permutaInfo
          };
        }
        return {
          text: 'FOLGA (PERMUTA)',
          type: 'folga',
          label: 'FOLGA (PERMUTA)',
          isPermuta: true,
          permutaInfo
        };
      } else {
        if (sels.includes(dayStr)) {
          const textStr = 'PERMUTA PENDENTE';
          return {
            text: textStr,
            type: 'servico',
            label: textStr,
            isPermuta: true,
            permutaInfo
          };
        }
        if (expDays.includes(dayStr)) {
          return {
            text: 'EXPEDIENTE',
            type: 'expediente',
            label: 'EXPEDIENTE',
            isPermuta: false
          };
        }
        return {
          text: 'FOLGA',
          type: 'folga',
          label: 'FOLGA',
          isPermuta: false
        };
      }
    }

    // Seleção de serviço 24h
    if (sels.includes(dayStr)) {
      return {
        text: 'SERVIÇO',
        type: 'servico',
        label: 'SERVIÇO',
        isPermuta: false
      };
    }

    // Expediente
    if (expDays.includes(dayStr)) {
      return {
        text: 'EXPEDIENTE',
        type: 'expediente',
        label: 'EXPEDIENTE',
        isPermuta: false
      };
    }

    // Folga
    return {
      text: 'FOLGA',
      type: 'folga',
      label: 'FOLGA',
      isPermuta: false
    };
  };

  const getWorkersForDay = (dayStr: string) => {
    const dayMonthKey = dayStr.substring(0, 7);
    const dataSource =
      dayMonthKey === monthKey ? data : extraMonthData[dayMonthKey] || {};
    const selsObj = dataSource.selections || {};
    const expObj = dataSource.expedienteDays || {};
    const grdObj = dataSource.grdData || {};

    const servicoMap = new Map<
      string,
      { rg: string; name: string; isGrd: boolean; isPermuta?: boolean }
    >();

    // A partir das seleções regulares do mês
    Object.entries(selsObj).forEach(([rg, sels]: [string, any]) => {
      if (rg !== 'ESCALANTE_PREF' && Array.isArray(sels) && sels.includes(dayStr)) {
        const st = getDayStatus(rg, dayStr);
        if (st.type === 'servico') {
          const found = expedienteUsers.find((u) => (u.rg || u.uid) === rg);
          servicoMap.set(rg, {
            rg,
            name: found
              ? formatMilitaryName(
                  found.rank
                    ? `${found.rank} ${found.warName || found.name.split(' ')[0]}`
                    : found.name
                )
              : dataSource.userNames?.[rg] || rg,
            isGrd: !!grdObj[dayStr]?.includes(rg),
            isPermuta: Boolean(st.isPermuta)
          });
        }
      }
    });

    // A partir de permutas onde o militar assumiu o serviço nesta data
    expedienteUsers.forEach((u) => {
      const rg = u.rg || u.uid;
      if (!rg || servicoMap.has(rg) || rg === 'ESCALANTE_PREF') return;
      const st = getDayStatus(rg, dayStr);
      if (st.type === 'servico' && st.isPermuta) {
        servicoMap.set(rg, {
          rg,
          name: formatMilitaryName(
            u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name
          ),
          isGrd: !!grdObj[dayStr]?.includes(rg),
          isPermuta: true
        });
      }
    });

    const servicoList = Array.from(servicoMap.values());

    const expedienteList = Object.entries(expObj)
      .filter(
        ([rg, expDays]: [string, any]) =>
          rg !== 'ESCALANTE_PREF' &&
          Array.isArray(expDays) &&
          expDays.includes(dayStr)
      )
      .filter(([rg]) => getDayStatus(rg, dayStr).type === 'expediente')
      .map(([rg]) => {
        const found = expedienteUsers.find((u) => (u.rg || u.uid) === rg);
        return {
          rg,
          name: found
            ? formatMilitaryName(
                found.rank
                  ? `${found.rank} ${found.warName || found.name.split(' ')[0]}`
                  : found.name
              )
            : dataSource.userNames?.[rg] || rg
        };
      });

    return { servicoList, expedienteList };
  };

  const checkNeedFulfilled = (
    funcStr: string,
    dayStr: string,
    qtRequired: number = 1
  ): boolean => {
    const { servicoList } = getWorkersForDay(dayStr);
    const allWorkers = [...servicoList];
    const map = COMPETENCY_MAP[funcStr];
    if (!map) return false;

    let fulfilledCount = 0;

    for (const worker of allWorkers) {
      const m = militars.find((mil) => (mil.rg || mil.uid) === worker.rg);
      if (m) {
        let hasCompetency = false;
        for (const key of map) {
          if (key.startsWith('viaturas.')) {
            if (m.viaturas?.[key.split('.')[1]]) hasCompetency = true;
          } else {
            if ((m as any)[key] || m.dynamicFunctions?.[key]) hasCompetency = true;
          }
        }
        if (hasCompetency) fulfilledCount++;
      }
    }
    return fulfilledCount >= qtRequired;
  };

  const isOrdinarioLockedForUser = (
    rg: string,
    targetMonthKey: string = monthKey
  ): boolean => {
    if (!rg || rg === 'ESCALANTE_PREF') return false;
    const source =
      targetMonthKey === monthKey ? data : extraMonthData[targetMonthKey] || {};
    const isLocked = !!(source.lockedOrdinario?.[rg] ?? source.locked?.[rg]);
    if (!isLocked) return false;

    const req = getReqAmount(rg);
    const userSels = safeArr(source.selections?.[rg]);
    if (req > 0 && userSels.length < req) {
      return false;
    }
    return true;
  };

  const isWeeklyLockedForUser = (rg: string, weekMonday: Date): boolean => {
    if (!rg || rg === 'ESCALANTE_PREF') return false;
    const weekKey = format(weekMonday, 'yyyy-MM-dd');
    const weekMonthKey = format(weekMonday, 'yyyy-MM');
    const source =
      weekMonthKey === monthKey ? data : extraMonthData[weekMonthKey] || {};
    return !!source.lockedWeekly?.[weekKey]?.[rg];
  };

  return {
    getReqAmount,
    getRegime,
    getSector,
    getRegimeDisplay,
    getServicosOrdinariosDisplay,
    getExpQuota,
    getPermutaForDay,
    checkDayHasPermuta,
    getDayStatus,
    getWorkersForDay,
    checkNeedFulfilled,
    isOrdinarioLockedForUser,
    isWeeklyLockedForUser
  };
}
