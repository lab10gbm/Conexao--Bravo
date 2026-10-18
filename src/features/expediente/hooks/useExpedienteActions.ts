import React, { useState } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { cleanUndefined } from '../../../lib/utils';
import { safeArr } from '../lib/expedienteCalculos';
import { UserProfile } from '../../../types';
import type {
  ExpedienteData,
  Afastamento,
  PermutaDayDetails
} from '../types';

interface UseExpedienteActionsProps {
  data: ExpedienteData;
  setData: React.Dispatch<React.SetStateAction<ExpedienteData>>;
  extraMonthData: Record<string, any>;
  setExtraMonthData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  monthDocRef: any;
  globalDocRef: any;
  monthKey: string;
  normalizedObm: string;
  currentMonth: Date;
  user: UserProfile;
  isAdmin: boolean;
  activeRg: string;
  expedienteUsers: UserProfile[];
  afastamentos: Afastamento[];
  getReqAmount: (rg: string) => number;
  getExpQuota: (rg: string) => number;
  getPermutaForDay: (rg: string, dayStr: string, dataSource?: any) => PermutaDayDetails | null;
  isOrdinarioLockedForUser: (rg: string, targetMonthKey?: string) => boolean;
  isWeeklyLockedForUser: (rg: string, weekMonday: Date) => boolean;
  updateMilitarLocal: (rg: string, updates: Partial<UserProfile>) => void;
  setActionFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
  setMilitaryMoveModal: React.Dispatch<React.SetStateAction<any>>;
  setQuickAddModal: React.Dispatch<React.SetStateAction<any>>;
}

export function useExpedienteActions({
  data,
  setData,
  extraMonthData,
  setExtraMonthData,
  monthDocRef,
  globalDocRef,
  monthKey,
  normalizedObm,
  currentMonth,
  user,
  isAdmin,
  activeRg,
  expedienteUsers,
  afastamentos,
  getReqAmount,
  getExpQuota,
  getPermutaForDay,
  isOrdinarioLockedForUser,
  isWeeklyLockedForUser,
  updateMilitarLocal,
  setActionFeedback,
  setMilitaryMoveModal,
  setQuickAddModal
}: UseExpedienteActionsProps) {
  const [addMemberRg, setAddMemberRg] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [removeMemberRg, setRemoveMemberRg] = useState<string | null>(null);
  const [removeMemberAla, setRemoveMemberAla] = useState('');
  const [autoExpStatus, setAutoExpStatus] = useState(false);

  const handleMoveMilitaryDay = async (rg: string, fromDayStr: string, toDayStr: string) => {
    if (!rg || !fromDayStr || !toDayStr || fromDayStr === toDayStr) return;
    const userSels = safeArr(data.selections[rg]);
    let newSels = userSels.filter((d) => d !== fromDayStr);
    if (!newSels.includes(toDayStr)) {
      newSels.push(toDayStr);
    }
    const userExp = safeArr(data.expedienteDays?.[rg]);
    const newExp = userExp.filter((d) => d !== toDayStr);

    setData((prev) => ({
      ...prev,
      selections: { ...prev.selections, [rg]: newSels },
      expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
    }));

    await setDoc(
      monthDocRef,
      cleanUndefined({
        selections: { [rg]: newSels },
        expedienteDays: { [rg]: newExp }
      }),
      { merge: true }
    );

    setActionFeedback({
      type: 'success',
      message: `Militar remanejado com sucesso para ${toDayStr.split('-').reverse().join('/')}!`
    });
    setMilitaryMoveModal(null);
  };

  const handleRemoveMilitaryFromDay = async (
    rg: string,
    dayStr: string,
    isExpOnly: boolean = false
  ) => {
    if (!rg || !dayStr) return;
    const userSels = safeArr(data.selections[rg]);
    const userExp = safeArr(data.expedienteDays?.[rg]);

    const newSels = isExpOnly ? userSels : userSels.filter((d) => d !== dayStr);
    const newExp = userExp.filter((d) => d !== dayStr);

    setData((prev) => ({
      ...prev,
      selections: { ...prev.selections, [rg]: newSels },
      expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
    }));

    await setDoc(
      monthDocRef,
      cleanUndefined({
        selections: { [rg]: newSels },
        expedienteDays: { [rg]: newExp }
      }),
      { merge: true }
    );

    setActionFeedback({
      type: 'success',
      message: `Escalação removida do dia ${dayStr.split('-').reverse().join('/')}!`
    });
    setMilitaryMoveModal(null);
  };

  const handleSwapMilitaryDays = async (
    rgA: string,
    dayA: string,
    rgB: string,
    dayB: string
  ) => {
    if (!rgA || !rgB || !dayA || !dayB) return;
    const selsA = safeArr(data.selections[rgA]).filter((d) => d !== dayA);
    if (!selsA.includes(dayB)) selsA.push(dayB);

    const selsB = safeArr(data.selections[rgB]).filter((d) => d !== dayB);
    if (!selsB.includes(dayA)) selsB.push(dayA);

    setData((prev) => ({
      ...prev,
      selections: {
        ...prev.selections,
        [rgA]: selsA,
        [rgB]: selsB
      }
    }));

    await setDoc(
      monthDocRef,
      cleanUndefined({
        selections: {
          [rgA]: selsA,
          [rgB]: selsB
        }
      }),
      { merge: true }
    );

    setActionFeedback({
      type: 'success',
      message: 'Posição trocada com sucesso entre os militares!'
    });
    setMilitaryMoveModal(null);
  };

  const handleQuickAssignMilitary = async (
    rg: string,
    dayStr: string,
    mode: 'servico' | 'expediente' = 'servico'
  ) => {
    if (!rg || !dayStr) return;
    const userSels = safeArr(data.selections[rg]);
    const userExp = safeArr(data.expedienteDays?.[rg]);

    let newSels = [...userSels];
    let newExp = [...userExp];

    if (mode === 'servico') {
      if (!newSels.includes(dayStr)) newSels.push(dayStr);
      newExp = newExp.filter((d) => d !== dayStr);
    } else {
      if (!newExp.includes(dayStr)) newExp.push(dayStr);
      newSels = newSels.filter((d) => d !== dayStr);
    }

    setData((prev) => ({
      ...prev,
      selections: { ...prev.selections, [rg]: newSels },
      expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
    }));

    await setDoc(
      monthDocRef,
      cleanUndefined({
        selections: { [rg]: newSels },
        expedienteDays: { [rg]: newExp }
      }),
      { merge: true }
    );

    setActionFeedback({
      type: 'success',
      message: `Militar adicionado com sucesso ao dia ${dayStr.split('-').reverse().join('/')}!`
    });
    setQuickAddModal(null);
  };

  const handleAddToExpediente = async () => {
    if (!addMemberRg) return;
    try {
      const safeRg = addMemberRg
        .toString()
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^0+/, '');
      if (db) {
        await setDoc(doc(db, 'militaries', safeRg), { ala: 'EXP' }, { merge: true });
      }
      updateMilitarLocal(addMemberRg, { ala: 'EXP' });
      setAddMemberRg('');
      setMemberSearchTerm('');
    } catch (e) {
      console.error(e);
      alert('Erro ao adicionar militar ao expediente.');
    }
  };

  const handleRemoveFromExpediente = (rg: string) => {
    setRemoveMemberRg(rg);
    setRemoveMemberAla('');
  };

  const confirmRemoveFromExpediente = async () => {
    if (!removeMemberRg) return;

    let alaValue = '';
    const normalizedAla = removeMemberAla.trim();

    if (['1', '2', '3', '4'].includes(normalizedAla)) {
      alaValue = normalizedAla;
    } else if (normalizedAla !== '0' && normalizedAla !== '') {
      alert('Ala inválida. Digite 1, 2, 3, 4, ou deixe em branco.');
      return;
    }

    try {
      const rgToUpdate = removeMemberRg;
      const safeRg = rgToUpdate
        .toString()
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^0+/, '');

      if (db) {
        await setDoc(doc(db, 'militaries', safeRg), { ala: alaValue }, { merge: true });
      }
      updateMilitarLocal(rgToUpdate, { ala: alaValue });

      try {
        const globalUpdates: any = {
          [`requirements.${rgToUpdate}`]: deleteField(),
          [`userNames.${rgToUpdate}`]: deleteField(),
          [`sectors.${rgToUpdate}`]: deleteField(),
          [`regimes.${rgToUpdate}`]: deleteField()
        };
        await updateDoc(globalDocRef, globalUpdates);
      } catch (e: any) {
        if (e.code !== 'not-found') console.error('Global doc update error:', e);
      }

      try {
        const monthUpdates: any = {
          [`selections.${rgToUpdate}`]: deleteField(),
          [`locked.${rgToUpdate}`]: deleteField(),
          [`lockedOrdinario.${rgToUpdate}`]: deleteField(),
          [`expedienteDays.${rgToUpdate}`]: deleteField()
        };
        await updateDoc(monthDocRef, monthUpdates);
      } catch (e: any) {
        if (e.code !== 'not-found') console.error('Month doc update error:', e);
      }

      setRemoveMemberRg(null);
    } catch (e) {
      console.error(e);
      alert('Erro ao remover militar e limpar dados do expediente.');
    }
  };

  const handleTogglePrefDate = async (dayStr: string) => {
    let sels = Array.isArray(data.selections['ESCALANTE_PREF'])
      ? data.selections['ESCALANTE_PREF']
      : [];
    const isRemoving = sels.includes(dayStr);
    if (isRemoving) sels = sels.filter((d) => d !== dayStr);
    else sels = [...sels, dayStr];

    if (isRemoving) {
      const newPrefs = { ...(data.preferencesDetails || {}) };
      delete newPrefs[dayStr];

      setData((prev) => ({
        ...prev,
        selections: { ...prev.selections, ESCALANTE_PREF: sels },
        preferencesDetails: newPrefs
      }));

      await setDoc(
        monthDocRef,
        cleanUndefined({
          selections: { ESCALANTE_PREF: sels }
        }),
        { merge: true }
      );
      try {
        await updateDoc(monthDocRef, { [`preferencesDetails.${dayStr}`]: deleteField() });
      } catch (e) {}
    } else {
      setData((prev) => ({
        ...prev,
        selections: { ...prev.selections, ESCALANTE_PREF: sels }
      }));
      await setDoc(
        monthDocRef,
        cleanUndefined({ selections: { ESCALANTE_PREF: sels } }),
        { merge: true }
      );
    }
  };

  const updateExpQuota = async (rg: string, quota: number) => {
    const newQuotas = { ...data.expQuotas, [rg]: quota };
    setData((prev) => ({ ...prev, expQuotas: newQuotas }));
    await setDoc(globalDocRef, cleanUndefined({ expQuotas: newQuotas }), { merge: true });
  };

  const handleCycleCellStatus = async (rg: string, dayStr: string) => {
    const isLocked = isOrdinarioLockedForUser(rg, monthKey);
    if (isLocked && !isAdmin && !user.isEscalante && rg !== 'ESCALANTE_PREF') {
      alert(
        'Sua escala ordinária (24h) deste mês já está confirmada e bloqueada. Para trocar de serviço, solicite uma Permuta.'
      );
      return;
    }

    const userSels = safeArr(data.selections[rg]);
    const userExp = safeArr(data.expedienteDays?.[rg]);
    const isSel = userSels.includes(dayStr);
    const isExp = userExp.includes(dayStr);

    let newSels = [...userSels];
    let newExp = [...userExp];

    if (!isSel && !isExp) {
      newSels.push(dayStr);
    } else if (isSel) {
      newSels = newSels.filter((d) => d !== dayStr);
      newExp.push(dayStr);
    } else if (isExp) {
      newExp = newExp.filter((d) => d !== dayStr);
    }

    setData((prev) => ({
      ...prev,
      selections: { ...prev.selections, [rg]: newSels },
      expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
    }));

    await setDoc(
      monthDocRef,
      cleanUndefined({
        selections: { [rg]: newSels },
        expedienteDays: { [rg]: newExp }
      }),
      { merge: true }
    );
  };

  const handleSetWeeklyDayStatus = async (
    rg: string,
    dayStr: string,
    mode: 'cycle' | 'expediente' | 'servico' | 'folga' = 'cycle'
  ) => {
    const isSelf = user.rg === rg || user.uid === rg;
    if (!isAdmin && !user.isEscalante && !isSelf) return;

    const dayMonthKey = dayStr.substring(0, 7);
    const targetDocRef =
      dayMonthKey === monthKey
        ? monthDocRef
        : doc(db, `expediente_${normalizedObm}`, dayMonthKey);
    const dataSource =
      dayMonthKey === monthKey ? data : extraMonthData[dayMonthKey] || {};

    const dayDate = new Date(`${dayStr}T12:00:00`);
    const dayMonday = startOfWeek(dayDate, { weekStartsOn: 1 });

    const isWeekLocked = isWeeklyLockedForUser(rg, dayMonday);
    const isOrd24hLocked = isOrdinarioLockedForUser(rg, dayMonthKey);

    if (isWeekLocked && !isAdmin && !user.isEscalante) {
      alert('O expediente desta semana já foi confirmado e está bloqueado para edições.');
      return;
    }

    const afastamento = afastamentos.find(
      (a) => a.rg === rg && dayStr >= a.inicio && dayStr <= a.retorno
    );
    if (afastamento) return;

    const userSels = safeArr(dataSource.selections?.[rg]);
    const userExp = safeArr(dataSource.expedienteDays?.[rg]);
    const isSel = userSels.includes(dayStr);
    const isExp = userExp.includes(dayStr);

    const permuta = getPermutaForDay(rg, dayStr, dataSource);
    if (permuta && permuta.role === 'substitute' && !isAdmin && !user.isEscalante) {
      alert(
        'Este dia é um Serviço (24h) homologado via Permuta. Não pode ser alterado diretamente.'
      );
      return;
    }

    if (isSel && isOrd24hLocked && !isAdmin && !user.isEscalante) {
      alert(
        'Este dia é um S.24h Mensal Homologado. Não pode ser alterado diretamente; utilize a solicitação de Permuta se precisar trocar.'
      );
      return;
    }

    if (mode === 'servico' && isOrd24hLocked && !isAdmin && !user.isEscalante) {
      alert(
        'A escala ordinária (24h) deste mês já está bloqueada. Novos serviços 24h só podem ser lançados pelo Escalante.'
      );
      return;
    }

    let newSels = [...userSels];
    let newExp = [...userExp];
    const req = getReqAmount(rg);
    const expQuota = getExpQuota(rg);
    const weekDaysList = [0, 1, 2, 3, 4, 5, 6].map((offset) =>
      format(addDays(dayMonday, offset), 'yyyy-MM-dd')
    );
    const currentWeekExpCount = userExp.filter((d) => weekDaysList.includes(d)).length;

    if (mode === 'cycle') {
      if (!isSel && !isExp) {
        if (expQuota > 0 && currentWeekExpCount >= expQuota && !isAdmin && !user.isEscalante) {
          alert(
            `Você já atingiu a cota semanal de ${expQuota} expedientes definida para seu regime/cadastro.`
          );
          return;
        }
        newExp.push(dayStr);
      } else if (isExp) {
        if (isOrd24hLocked && !isAdmin && !user.isEscalante) {
          newExp = newExp.filter((d) => d !== dayStr);
        } else if (req > 0 && userSels.length >= req) {
          newExp = newExp.filter((d) => d !== dayStr);
        } else {
          newExp = newExp.filter((d) => d !== dayStr);
          newSels.push(dayStr);
        }
      } else if (isSel) {
        newSels = newSels.filter((d) => d !== dayStr);
      }
    } else if (mode === 'expediente') {
      if (expQuota > 0 && currentWeekExpCount >= expQuota && !isExp && !isAdmin && !user.isEscalante) {
        alert(
          `Você já selecionou todos os ${expQuota} expedientes permitidos para esta semana.`
        );
        return;
      }
      newSels = newSels.filter((d) => d !== dayStr);
      if (!newExp.includes(dayStr)) {
        newExp.push(dayStr);
      }
    } else if (mode === 'servico') {
      if (req > 0 && userSels.length >= req && !isSel) {
        alert(`Você já selecionou todos os ${req} serviços permitidos.`);
        return;
      }
      newExp = newExp.filter((d) => d !== dayStr);
      if (!newSels.includes(dayStr)) {
        newExp.push(dayStr);
      }
    } else if (mode === 'folga') {
      newSels = newSels.filter((d) => d !== dayStr);
      newExp = newExp.filter((d) => d !== dayStr);
    }

    if (dayMonthKey === monthKey) {
      setData((prev) => ({
        ...prev,
        selections: { ...prev.selections, [rg]: newSels },
        expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
      }));
    } else {
      setExtraMonthData((prev) => ({
        ...prev,
        [dayMonthKey]: {
          selections: { ...(prev[dayMonthKey]?.selections || {}), [rg]: newSels },
          expedienteDays: { ...(prev[dayMonthKey]?.expedienteDays || {}), [rg]: newExp }
        }
      }));
    }

    await setDoc(
      targetDocRef,
      cleanUndefined({
        selections: { [rg]: newSels },
        expedienteDays: { [rg]: newExp }
      }),
      { merge: true }
    );
  };

  const handleCycleWeeklyStatus = async (rg: string, dayStr: string) => {
    if (!isAdmin && !user.isEscalante) return;
    const dayMonthKey = dayStr.substring(0, 7);
    const targetDocRef =
      dayMonthKey === monthKey
        ? monthDocRef
        : doc(db, `expediente_${normalizedObm}`, dayMonthKey);
    const dataSource =
      dayMonthKey === monthKey ? data : extraMonthData[dayMonthKey] || {};

    const userSels = safeArr(dataSource.selections?.[rg]);
    const userExp = safeArr(dataSource.expedienteDays?.[rg]);
    const isSel = userSels.includes(dayStr);
    const isExp = userExp.includes(dayStr);

    let newSels = [...userSels];
    let newExp = [...userExp];

    if (!isSel && !isExp) {
      newExp.push(dayStr);
    } else if (isExp) {
      newExp = newExp.filter((d) => d !== dayStr);
      newSels.push(dayStr);
    } else if (isSel) {
      newSels = newSels.filter((d) => d !== dayStr);
    }

    if (dayMonthKey === monthKey) {
      setData((prev) => ({
        ...prev,
        selections: { ...prev.selections, [rg]: newSels },
        expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
      }));
    } else {
      setExtraMonthData((prev) => ({
        ...prev,
        [dayMonthKey]: {
          selections: { ...(prev[dayMonthKey]?.selections || {}), [rg]: newSels },
          expedienteDays: { ...(prev[dayMonthKey]?.expedienteDays || {}), [rg]: newExp }
        }
      }));
    }

    await setDoc(
      targetDocRef,
      cleanUndefined({
        selections: { [rg]: newSels },
        expedienteDays: { [rg]: newExp }
      }),
      { merge: true }
    );
  };

  const handleAutoFillExp = async () => {
    const newExpDays: Record<string, string[]> = {};
    const svSelections = data.selections || {};

    let totalAssigned = 0;
    let logs: string[] = [];

    expedienteUsers.forEach((u) => {
      const rg = u.rg || u.uid;
      if (!rg || rg === 'ESCALANTE_PREF') return;

      const quota = getExpQuota(rg);
      logs.push(`RG ${rg}: Cota ${quota}`);
      if (quota <= 0) return;

      const userExpDays: string[] = [];

      const firstDay = startOfMonth(currentMonth);
      const lastDay = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start: firstDay, end: lastDay });

      const weeks = new Map<string, Date[]>();
      days.forEach((d) => {
        const weekNum = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        if (!weeks.has(weekNum)) weeks.set(weekNum, []);

        if (d.getDay() !== 0 && d.getDay() !== 6) {
          weeks.get(weekNum)!.push(d);
        }
      });

      weeks.forEach((weekdays) => {
        let assignedThisWeek = 0;
        const sortedWeekdays = [...weekdays].sort(() => Math.random() - 0.5);

        for (const d of sortedWeekdays) {
          if (assignedThisWeek >= quota) break;

          const dayStr = format(d, 'yyyy-MM-dd');
          if (!safeArr(svSelections[rg]).includes(dayStr)) {
            userExpDays.push(dayStr);
            assignedThisWeek++;
          }
        }
      });

      if (userExpDays.length > 0) {
        newExpDays[rg] = userExpDays;
        totalAssigned += userExpDays.length;
      }
    });

    console.log(logs.join('\n'));
    console.log('newExpDays', newExpDays);

    setData((prev) => ({ ...prev, expedienteDays: newExpDays }));
    await setDoc(monthDocRef, cleanUndefined({ expedienteDays: newExpDays }), {
      merge: true
    });

    setAutoExpStatus(true);
    setTimeout(() => setAutoExpStatus(false), 2000);
  };

  const handleUpdatePrefDetail = async (dayStr: string, func: string, qty: number) => {
    if (!func || func.startsWith('_')) return;
    if (typeof qty !== 'number' || isNaN(qty)) return;

    const localDayData = { ...(data.preferencesDetails?.[dayStr] || {}) };
    const fbDayData = { ...(data.preferencesDetails?.[dayStr] || {}) };

    if (qty <= 0) {
      delete localDayData[func];
    } else {
      localDayData[func] = qty;
      fbDayData[func] = qty;
    }

    const newLocalPrefs = {
      ...(data.preferencesDetails || {}),
      [dayStr]: localDayData
    };
    setData((prev) => ({ ...prev, preferencesDetails: newLocalPrefs }));

    if (qty <= 0) {
      try {
        await updateDoc(monthDocRef, {
          [`preferencesDetails.${dayStr}.${func}`]: deleteField()
        });
      } catch (e) {}
    } else {
      const newFbPrefs = { ...(data.preferencesDetails || {}), [dayStr]: fbDayData };
      await setDoc(monthDocRef, cleanUndefined({ preferencesDetails: newFbPrefs }), {
        merge: true
      });
    }
  };

  const handleTargetedToggle = async (rgSelection: string, day: Date) => {
    if (!rgSelection) {
      alert('Nenhum militar selecionado.');
      return;
    }
    const dayStr = format(day, 'yyyy-MM-dd');
    let userSelections = safeArr(data.selections[rgSelection]);
    const req = getReqAmount(rgSelection);
    const isLocked = isOrdinarioLockedForUser(rgSelection, monthKey);

    if (isLocked && rgSelection !== 'ESCALANTE_PREF' && !isAdmin && !user.isEscalante) {
      if (userSelections.length >= req && !userSelections.includes(dayStr)) {
        alert(
          "Sua escala ordinária (24h) deste mês já foi confirmada e está bloqueada. Use a opção 'Solicitar Troca' se precisar permutar."
        );
        return;
      }
    }

    const permuta = getPermutaForDay(rgSelection, dayStr);
    if (permuta && permuta.role === 'substitute' && !isAdmin && !user.isEscalante) {
      alert(
        'Você está escalado neste dia através de Permuta Homologada. Este serviço não pode ser alterado diretamente pelo calendário.'
      );
      return;
    }

    let userExpDays = safeArr(data.expedienteDays?.[rgSelection]);
    let isRemovingExp = false;

    if (rgSelection === 'ESCALANTE_PREF') {
      if (!isAdmin && !user.isEscalante) {
        alert('Apenas o Escalante ou Administrador pode definir datas preferenciais.');
        return;
      }
      if (userSelections.includes(dayStr)) {
        userSelections = userSelections.filter((d) => d !== dayStr);
      } else {
        userSelections = [...userSelections, dayStr];
      }
    } else {
      if (req === 0) {
        alert(
          'Este militar não possui serviços definidos para este mês. Configure-os na aba de Configurar Membros.'
        );
        return;
      }

      if (userSelections.includes(dayStr)) {
        userSelections = userSelections.filter((d) => d !== dayStr);
      } else {
        if (userSelections.length >= req) {
          alert(
            `Você já selecionou todos os ${req} serviços permitidos (${
              userSelections.length
            }/${req}). Para escolher esta data (${format(
              day,
              'dd/MM'
            )}), desmarque primeiro outro dia selecionado.`
          );
          return;
        }
        userSelections = [...userSelections, dayStr];

        if (userExpDays.includes(dayStr)) {
          userExpDays = userExpDays.filter((d) => d !== dayStr);
          isRemovingExp = true;
        }
      }
    }

    const newMonthData: any = {
      selections: {
        [rgSelection]: userSelections
      }
    };

    if (isRemovingExp) {
      newMonthData.expedienteDays = {
        [rgSelection]: userExpDays
      };
    }

    setData((prev) => ({
      ...prev,
      selections: {
        ...prev.selections,
        [rgSelection]: userSelections
      },
      ...(isRemovingExp
        ? {
            expedienteDays: {
              ...(prev.expedienteDays || {}),
              [rgSelection]: userExpDays
            }
          }
        : {})
    }));
    await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
  };

  const handleToggleDay = async (day: Date) => {
    if (!activeRg) {
      alert(
        'Para marcar serviços, é necessário ter o seu RG cadastrado no perfil ou selecionar um militar (Admin).'
      );
      return;
    }
    await handleTargetedToggle(activeRg, day);
  };

  return {
    addMemberRg,
    setAddMemberRg,
    memberSearchTerm,
    setMemberSearchTerm,
    showMemberDropdown,
    setShowMemberDropdown,
    removeMemberRg,
    setRemoveMemberRg,
    removeMemberAla,
    setRemoveMemberAla,
    autoExpStatus,
    setAutoExpStatus,
    handleMoveMilitaryDay,
    handleRemoveMilitaryFromDay,
    handleSwapMilitaryDays,
    handleQuickAssignMilitary,
    handleAddToExpediente,
    handleRemoveFromExpediente,
    confirmRemoveFromExpediente,
    handleTogglePrefDate,
    updateExpQuota,
    handleCycleCellStatus,
    handleSetWeeklyDayStatus,
    handleCycleWeeklyStatus,
    handleAutoFillExp,
    handleUpdatePrefDetail,
    handleTargetedToggle,
    handleToggleDay
  };
}
