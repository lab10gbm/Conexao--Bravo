export type SentinelaTipo = 'comum' | 'motorista';
export type ScheduleMode = 'rotativo' | 'continuo';

export interface SentinelaSlot {
  id: string;
  rg: string | null;
  tipo: SentinelaTipo;
  posto: string;
  turnoLabel: string;
  horario: string;
  totalHoras?: number;
  customHorario?: boolean;
}

export interface SentinelaTimelineRow {
  id: string;
  intervalIndex: number;
  startStr: string; // "06:00"
  endStr: string; // "08:00"
  horario: string; // "06:00 às 08:00"
  startMin: number;
  endMin: number;
  durationHours: number;
  turnIndex: number;
  turnoLabel: string;
  rg: string | null;
  tipo: SentinelaTipo;
  posto: string;
  periodoTag: 'diurno' | 'almoco' | 'noturno';
  isForbiddenForMotorista: boolean;
  hasConflict: boolean;
  conflictDesc?: string;
}

export interface SlotConflictInfo {
  hasConflict: boolean;
  conflicts: {
    tipo: 'almoco' | 'madrugada';
    descricao: string;
    intervalo: string;
  }[];
}

/**
 * Converte "HH:MM" para minutos a partir da meia-noite (0 a 1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Converte minutos absolutos na jornada 24h (360 = 06:00 até 1800 = 06:00 D+1) de volta para "HH:MM".
 */
export function minutesToTime(min: number): string {
  const norm = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Arredonda minutos para o múltiplo mais próximo (padrão 15 min).
 */
export function roundToNearest(val: number, step = 15): number {
  return Math.round(val / step) * step;
}

/**
 * Analisa a string de horários no formato:
 * "06:00 às 08:00 / 14:00 às 16:00 / 22:00 às 00:00"
 * Retorna os intervalos em minutos normalizados na jornada de 24h (360 a 1800).
 */
export function parseHorarioIntervals(horarioStr: string): { start: number; end: number; duration: number }[] {
  if (!horarioStr) return [];
  const parts = horarioStr.split('/');
  const intervals: { start: number; end: number; duration: number }[] = [];

  for (const part of parts) {
    const match = part.match(/(\d{1,2}:\d{2})\s*(?:às|as|-|a|ate|até)\s*(\d{1,2}:\d{2})/i);
    if (match) {
      let s = timeToMinutes(match[1]);
      let e = timeToMinutes(match[2]);

      // Na escala militar das 06:00 às 06:00 do dia seguinte:
      // Se o horário de início for menor que 06:00 (360 min), é da madrugada seguinte (ex: 00:00, 02:00)
      if (s < 360) s += 1440;
      if (e <= s) e += 1440;

      intervals.push({ start: s, end: e, duration: e - s });
    }
  }

  return intervals;
}

/**
 * Retorna o horário inicial (em minutos normalizados de 360 a 1800) do militar.
 */
export function getEarliestStartTime(horarioStr: string): number {
  if (!horarioStr) return 99999;
  const intervals = parseHorarioIntervals(horarioStr);
  if (intervals.length === 0) return 99999;
  return Math.min(...intervals.map(i => i.start));
}

/**
 * Ordena os slots estritamente pela sequência cronológica do primeiro horário.
 */
export function sortSlotsChronologically(slots: SentinelaSlot[]): SentinelaSlot[] {
  const sorted = [...slots].sort((a, b) => {
    const timeA = getEarliestStartTime(a.horario);
    const timeB = getEarliestStartTime(b.horario);
    return timeA - timeB;
  });

  return sorted.map((s, idx) => ({
    ...s,
    turnoLabel: `${idx + 1}º TURNO`
  }));
}

/**
 * Retorna a tag do período (diurno, almoco protegido, noturno protegido).
 */
export function getPeriodoTag(startMin: number, endMin: number): 'diurno' | 'almoco' | 'noturno' {
  if (startMin >= 1320 || endMin > 1320) return 'noturno';
  // Janela de almoço militar: 11:00 às 13:30 (660 a 810 minutos)
  if (Math.max(startMin, 660) < Math.min(endMin, 810)) return 'almoco';
  return 'diurno';
}

/**
 * Verifica se um intervalo de tempo é proibido para sentinela motorista:
 * Regra 1: Proibido das 22:00 às 06:00 da manhã (descanso noturno) -> minutos 1320 a 1800
 * Regra 2: Proibido das 11:00 às 13:30 (almoço / trânsito) -> minutos 660 a 810
 */
export function isForbiddenMotorista(startMin: number, endMin: number): boolean {
  const lunchOverlap = Math.max(startMin, 660) < Math.min(endMin, 810);
  const nightOverlap = Math.max(startMin, 1320) < Math.min(endMin, 1800);
  return lunchOverlap || nightOverlap;
}

/**
 * Verifica conflitos de regras em uma vaga de sentinela.
 */
export function checkSlotConflict(slot: SentinelaSlot): SlotConflictInfo {
  if (slot.tipo !== 'motorista') {
    return { hasConflict: false, conflicts: [] };
  }

  const intervals = parseHorarioIntervals(slot.horario);
  const conflicts: SlotConflictInfo['conflicts'] = [];

  for (const inv of intervals) {
    if (Math.max(inv.start, 660) < Math.min(inv.end, 810)) {
      conflicts.push({
        tipo: 'almoco',
        descricao: 'Sobrepõe o horário de almoço/trânsito proibido (11:00 às 13:30)',
        intervalo: `${minutesToTime(inv.start)} às ${minutesToTime(inv.end)}`
      });
    }

    if (Math.max(inv.start, 1320) < Math.min(inv.end, 1800)) {
      conflicts.push({
        tipo: 'madrugada',
        descricao: 'Sobrepõe o descanso noturno proibido (22:00 às 06:00)',
        intervalo: `${minutesToTime(inv.start)} às ${minutesToTime(inv.end)}`
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * Gera a escala de sentinelas das 24 horas contínuas (06:00 às 06:00).
 * Retorna:
 * - timeline: A sequência cronológica CONTÍNUA de intervalos hora a hora (zero saltos).
 * - slots: A lista consolidada por militar com a string de horários e total de horas.
 */
export function generateSentinelaSchedule(
  currentSlots: SentinelaSlot[],
  mode: ScheduleMode = 'rotativo'
): { timeline: SentinelaTimelineRow[]; slots: SentinelaSlot[] } {
  const N = currentSlots.length;
  if (N === 0) return { timeline: [], slots: [] };

  const hasMotoristas = currentSlots.some(s => s.tipo === 'motorista');

  // ============================================================
  // MODO 1: TURNOS CONTÍNUOS SEQUENCIAIS (24h divididas por N)
  // ============================================================
  if (mode === 'continuo') {
    const rawStep = 1440 / N;
    let cur = 360;
    const intervals: { start: number; end: number }[] = [];
    for (let i = 0; i < N; i++) {
      const nxt = i === N - 1 ? 1800 : Math.round((360 + (i + 1) * rawStep) / 15) * 15;
      intervals.push({ start: cur, end: nxt });
      cur = nxt;
    }

    const timeline: SentinelaTimelineRow[] = intervals.map((inv, idx) => {
      const slot = currentSlots[idx] || currentSlots[0];
      const startStr = minutesToTime(inv.start);
      const endStr = minutesToTime(inv.end);
      const durH = Math.round(((inv.end - inv.start) / 60) * 10) / 10;
      const tag = getPeriodoTag(inv.start, inv.end);
      const forbidden = isForbiddenMotorista(inv.start, inv.end);
      const conflict = slot.tipo === 'motorista' && forbidden;

      return {
        id: `timeline-c-${idx}`,
        intervalIndex: idx,
        startStr,
        endStr,
        horario: `${startStr} às ${endStr}`,
        startMin: inv.start,
        endMin: inv.end,
        durationHours: durH,
        turnIndex: idx,
        turnoLabel: slot.turnoLabel || `${idx + 1}º TURNO`,
        rg: slot.rg,
        tipo: slot.tipo,
        posto: slot.posto,
        periodoTag: tag,
        isForbiddenForMotorista: forbidden,
        hasConflict: conflict,
        conflictDesc: conflict ? (tag === 'noturno' ? 'Descanso Noturno (22:00-06:00)' : 'Almoço (11:00-13:30)') : undefined
      };
    });

    const slots: SentinelaSlot[] = currentSlots.map((s, idx) => {
      const myRow = timeline[idx];
      return {
        ...s,
        turnoLabel: `${idx + 1}º TURNO`,
        horario: myRow ? myRow.horario : '',
        totalHoras: myRow ? myRow.durationHours : 0,
        customHorario: false
      };
    });

    return { timeline, slots };
  }

  // ============================================================
  // MODO 2: QUARTOS ROTATIVOS INTERCALADOS (Padrão Militar ~2h)
  // ============================================================
  let intervals: { start: number; end: number }[] = [];

  if (N === 1) {
    intervals = [{ start: 360, end: 1800 }];
  } else if (N === 2) {
    intervals = [
      { start: 360, end: 1080 },
      { start: 1080, end: 1800 }
    ];
  } else if (N === 3) {
    intervals = [
      { start: 360, end: 840 },
      { start: 840, end: 1320 },
      { start: 1320, end: 1800 }
    ];
  } else if (N === 4 && !hasMotoristas) {
    // Quarto de hora clássico militar: exatamente 12 turnos de 2h das 06:00 às 06:00
    for (let i = 0; i < 12; i++) {
      intervals.push({
        start: 360 + i * 120,
        end: 360 + (i + 1) * 120
      });
    }
  } else {
    // N >= 4 com motoristas ou N >= 5:
    // Respeita os 4 marcos operacionais do dia:
    // 1. Manhã: 06:00 às 11:00 (300 min) - Permitido a Todos
    // 2. Almoço: 11:00 às 13:30 (150 min) - Proibido Motorista
    // 3. Tarde: 13:30 às 22:00 (510 min) - Permitido a Todos
    // 4. Noite: 22:00 às 06:00 (480 min) - Proibido Motorista
    let c1 = 2; // 06:00-08:30 (2h30), 08:30-11:00 (2h30)
    let c2 = 1; // 11:00-13:30 (2h30)
    let c3 = 4; // 13:30-15:45 (2h15), 15:45-17:45 (2h), 17:45-20:00 (2h15), 20:00-22:00 (2h)
    let c4 = 3; // 22:00-00:45 (2h45), 00:45-03:15 (2h30), 03:15-06:00 (2h45)

    if (N >= 7) {
      c1 = 3; c2 = 1; c3 = 5; c4 = 4;
    }

    function slice(start: number, end: number, count: number) {
      if (count <= 1) return [{ start, end }];
      const step = (end - start) / count;
      const res: { start: number; end: number }[] = [];
      let cur = start;
      for (let i = 0; i < count; i++) {
        const nxt = i === count - 1 ? end : Math.round((start + (i + 1) * step) / 15) * 15;
        res.push({ start: cur, end: nxt });
        cur = nxt;
      }
      return res;
    }

    intervals = [
      ...slice(360, 660, c1),
      ...slice(660, 810, c2),
      ...slice(810, 1320, c3),
      ...slice(1320, 1800, c4)
    ];
  }

  const taggedIntervals = intervals.map(inv => ({
    ...inv,
    dur: inv.end - inv.start,
    forbidden: isForbiddenMotorista(inv.start, inv.end)
  }));

  // Atribuição de militares aos turnos
  const assigned = new Array(taggedIntervals.length).fill(-1);
  const totalMin = currentSlots.map(() => 0);

  if (!hasMotoristas && N === 4) {
    // 100% natural round-robin: 1º Turno às 06:00, 2º Turno às 08:00, 3º Turno às 10:00, 4º Turno às 12:00...
    for (let i = 0; i < taggedIntervals.length; i++) {
      const turnIdx = i % 4;
      assigned[i] = turnIdx;
      totalMin[turnIdx] += taggedIntervals[i].dur;
    }
  } else {
    // Atribuição balanceada com regras de motorista
    for (let t = 0; t < taggedIntervals.length; t++) {
      const inv = taggedIntervals[t];
      const prev = t > 0 ? assigned[t - 1] : -1;

      let candidates: number[] = [];
      for (let i = 0; i < N; i++) {
        if (inv.forbidden && currentSlots[i].tipo === 'motorista') continue;
        candidates.push(i);
      }
      if (candidates.length === 0) candidates = [0];

      candidates.sort((a, b) => {
        const aPrev = (a === prev && candidates.length > 1) ? 1 : 0;
        const bPrev = (b === prev && candidates.length > 1) ? 1 : 0;
        if (aPrev !== bPrev) return aPrev - bPrev;

        const diffMin = totalMin[a] - totalMin[b];
        if (Math.abs(diffMin) > 30) return diffMin;

        // Se for turno diurno e um motorista precisa de horas, prioriza o motorista
        if (!inv.forbidden) {
          const aMot = currentSlots[a].tipo === 'motorista' ? 1 : 0;
          const bMot = currentSlots[b].tipo === 'motorista' ? 1 : 0;
          if (aMot !== bMot) return bMot - aMot;
        }

        return a - b;
      });

      const chosen = candidates[0];
      assigned[t] = chosen;
      totalMin[chosen] += inv.dur;
    }
  }

  // Constrói a Timeline Sequencial Cronológica
  const timeline: SentinelaTimelineRow[] = taggedIntervals.map((inv, idx) => {
    const turnIdx = assigned[idx] >= 0 ? assigned[idx] : (idx % N);
    const slot = currentSlots[turnIdx] || currentSlots[0];
    const startStr = minutesToTime(inv.start);
    const endStr = minutesToTime(inv.end);
    const durH = Math.round(((inv.end - inv.start) / 60) * 10) / 10;
    const tag = getPeriodoTag(inv.start, inv.end);
    const conflict = slot.tipo === 'motorista' && inv.forbidden;

    return {
      id: `timeline-r-${idx}`,
      intervalIndex: idx,
      startStr,
      endStr,
      horario: `${startStr} às ${endStr}`,
      startMin: inv.start,
      endMin: inv.end,
      durationHours: durH,
      turnIndex: turnIdx,
      turnoLabel: `${turnIdx + 1}º TURNO`,
      rg: slot.rg,
      tipo: slot.tipo,
      posto: slot.posto,
      periodoTag: tag,
      isForbiddenForMotorista: inv.forbidden,
      hasConflict: conflict,
      conflictDesc: conflict ? (tag === 'noturno' ? 'Descanso Noturno (22:00-06:00)' : 'Almoço (11:00-13:30)') : undefined
    };
  });

  // Constrói os Slots Resumidos por Militar
  const slots: SentinelaSlot[] = currentSlots.map((s, sIdx) => {
    const myShifts = timeline.filter(t => t.turnIndex === sIdx);
    const horarioStr = myShifts.map(sh => sh.horario).join(' / ');
    const totalH = Math.round((totalMin[sIdx] / 60) * 10) / 10;
    return {
      ...s,
      turnoLabel: `${sIdx + 1}º TURNO`,
      horario: horarioStr || s.horario,
      totalHoras: totalH,
      customHorario: false
    };
  });

  return { timeline, slots };
}

/**
 * Atalho de compatibilidade para retornar os slots calculados automaticamente.
 */
export function calculateAutomaticSchedule(
  currentSlots: SentinelaSlot[],
  options?: {
    mode?: ScheduleMode;
    forceClassicIfPossible?: boolean;
  }
): SentinelaSlot[] {
  const mode = options?.mode || 'rotativo';
  const result = generateSentinelaSchedule(currentSlots, mode);
  return result.slots;
}

/**
 * Atalho para obter diretamente as linhas cronológicas da timeline das 24h.
 */
export function generateTimelineRows(
  currentSlots: SentinelaSlot[],
  mode: ScheduleMode = 'rotativo'
): SentinelaTimelineRow[] {
  const result = generateSentinelaSchedule(currentSlots, mode);
  return result.timeline;
}

/**
 * Cria uma nova vaga de sentinela.
 */
export function createNewSentinelaSlot(index: number, tipo: SentinelaTipo = 'comum'): SentinelaSlot {
  const isSul = index >= 4;
  return {
    id: `sentinela-slot-${Date.now()}-${index}`,
    rg: null,
    tipo,
    posto: isSul ? 'GUARDA SUL' : 'GUARDA NORTE',
    turnoLabel: `${index + 1}º TURNO`,
    horario: '',
    totalHoras: 0,
    customHorario: false
  };
}

/**
 * Cria as 4 vagas padrão (quarto de hora clássico).
 */
export function createDefault4Slots(): SentinelaSlot[] {
  return [
    { id: 'slot-1', rg: null, tipo: 'comum' as SentinelaTipo, posto: 'GUARDA NORTE', turnoLabel: '1º TURNO', horario: '06:00 às 08:00 / 14:00 às 16:00 / 22:00 às 00:00', totalHoras: 6 },
    { id: 'slot-2', rg: null, tipo: 'comum' as SentinelaTipo, posto: 'GUARDA NORTE', turnoLabel: '2º TURNO', horario: '08:00 às 10:00 / 16:00 às 18:00 / 00:00 às 02:00', totalHoras: 6 },
    { id: 'slot-3', rg: null, tipo: 'comum' as SentinelaTipo, posto: 'GUARDA NORTE', turnoLabel: '3º TURNO', horario: '10:00 às 12:00 / 18:00 às 20:00 / 02:00 às 04:00', totalHoras: 6 },
    { id: 'slot-4', rg: null, tipo: 'comum' as SentinelaTipo, posto: 'GUARDA NORTE', turnoLabel: '4º TURNO', horario: '12:00 às 14:00 / 20:00 às 22:00 / 04:00 às 06:00', totalHoras: 6 }
  ];
}

/**
 * Converte uma lista de militares ativados em slots com horários e timeline gerados.
 */
export function buildSlotsFromSelectedMilitars(
  selectedMilitars: { rg: string; tipo: SentinelaTipo; posto?: string }[],
  defaultPosto = 'GUARDA NORTE',
  mode: ScheduleMode = 'rotativo'
): SentinelaSlot[] {
  if (selectedMilitars.length === 0) return [];

  const initialSlots: SentinelaSlot[] = selectedMilitars.map((m, idx) => ({
    id: `slot-${m.rg}-${idx}`,
    rg: m.rg,
    tipo: m.tipo,
    posto: m.posto || defaultPosto,
    turnoLabel: `${idx + 1}º TURNO`,
    horario: '',
    totalHoras: 0
  }));

  const res = generateSentinelaSchedule(initialSlots, mode);
  return res.slots;
}
