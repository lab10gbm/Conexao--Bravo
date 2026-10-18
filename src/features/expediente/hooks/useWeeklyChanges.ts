import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { cleanUndefined, formatMilitaryName } from '../../../lib/utils';
import { safeArr } from '../lib/expedienteCalculos';
import type {
  WeeklyChangeRequest,
  WeeklyDayChange,
  ExpedienteData,
  DayStatusResult
} from '../types';
import { UserProfile } from '../../../types';

interface UseWeeklyChangesProps {
  data: ExpedienteData;
  setData: React.Dispatch<React.SetStateAction<ExpedienteData>>;
  extraMonthData: Record<string, any>;
  setExtraMonthData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  monthKey: string;
  monthDocRef: any;
  normalizedObm: string;
  activeRg: string;
  user: UserProfile;
  isAdmin: boolean;
  expedienteUsers: UserProfile[];
  fullWeekDays: Date[];
  selectedWeekMonday: Date;
  getDayStatus: (rg: string, dayStr: string) => DayStatusResult;
  setActionFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export function useWeeklyChanges({
  data,
  setData,
  extraMonthData,
  setExtraMonthData,
  monthKey,
  monthDocRef,
  normalizedObm,
  activeRg,
  user,
  isAdmin,
  expedienteUsers,
  fullWeekDays,
  selectedWeekMonday,
  getDayStatus,
  setActionFeedback
}: UseWeeklyChangesProps) {
  const [showWeeklyChangeModal, setShowWeeklyChangeModal] = useState(false);
  const [proposedWeeklyChanges, setProposedWeeklyChanges] = useState<
    Record<string, 'expediente' | 'servico' | 'folga'>
  >({});
  const [weeklyChangeReason, setWeeklyChangeReason] = useState('');

  const currentWeekKey = format(selectedWeekMonday, 'yyyy-MM-dd');

  const allWeeklyChangeRequests: WeeklyChangeRequest[] = useMemo(() => {
    const list: WeeklyChangeRequest[] = [];
    const seen = new Set<string>();

    (data.weeklyChangeRequests || []).forEach((r) => {
      if (!seen.has(r.id)) {
        list.push(r);
        seen.add(r.id);
      }
    });

    Object.values(extraMonthData).forEach((m) => {
      (m?.weeklyChangeRequests || []).forEach((r: WeeklyChangeRequest) => {
        if (!seen.has(r.id)) {
          list.push(r);
          seen.add(r.id);
        }
      });
    });

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data.weeklyChangeRequests, extraMonthData]);

  const userCurrentWeekRequest = useMemo(() => {
    return allWeeklyChangeRequests.find(
      (r) => r.rg === activeRg && r.weekKey === currentWeekKey
    );
  }, [allWeeklyChangeRequests, activeRg, currentWeekKey]);

  const handleOpenWeeklyChangeModal = () => {
    const initialChanges: Record<string, 'expediente' | 'servico' | 'folga'> = {};
    fullWeekDays.forEach((d) => {
      const dStr = format(d, 'yyyy-MM-dd');
      const st = getDayStatus(activeRg, dStr);
      initialChanges[dStr] = st.type === 'afastamento' ? 'folga' : st.type;
    });
    setProposedWeeklyChanges(initialChanges);
    setWeeklyChangeReason(userCurrentWeekRequest?.reason || '');
    setShowWeeklyChangeModal(true);
  };

  const handleSubmitWeeklyChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRg) return;

    const changes: WeeklyDayChange[] = [];
    fullWeekDays.forEach((d) => {
      const dStr = format(d, 'yyyy-MM-dd');
      const curStatus = getDayStatus(activeRg, dStr).type;
      const normCur = curStatus === 'afastamento' ? 'folga' : curStatus;
      const propStatus = proposedWeeklyChanges[dStr] || normCur;

      if (propStatus !== normCur) {
        changes.push({
          dayStr: dStr,
          dayLabel: `${format(d, 'EEEE', { locale: ptBR })} (${format(d, 'dd/MM')})`,
          currentStatus: normCur,
          proposedStatus: propStatus
        });
      }
    });

    if (changes.length === 0) {
      setActionFeedback({
        type: 'error',
        message: 'Nenhum dia foi alterado. Selecione ao menos um status diferente.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    if (!weeklyChangeReason.trim()) {
      setActionFeedback({
        type: 'error',
        message: 'Por favor, informe a justificativa da alteração.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    const weekLabel = `${format(fullWeekDays[0], 'dd/MM')} a ${format(
      fullWeekDays[6],
      'dd/MM/yyyy'
    )}`;
    const targetUserObj =
      expedienteUsers.find((u) => (u.rg || u.uid) === activeRg) || user;
    const userName = formatMilitaryName(
      targetUserObj.rank
        ? `${targetUserObj.rank} ${
            targetUserObj.warName || targetUserObj.name.split(' ')[0]
          }`
        : targetUserObj.name
    );

    const newRequest: WeeklyChangeRequest = {
      id: Math.random().toString(36).substring(2, 9),
      rg: activeRg,
      userName,
      weekKey: currentWeekKey,
      weekLabel,
      changes,
      reason: weeklyChangeReason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const weekMondayMonthKey = format(selectedWeekMonday, 'yyyy-MM');
    const targetDocRef =
      weekMondayMonthKey === monthKey
        ? monthDocRef
        : doc(db, `expediente_${normalizedObm}`, weekMondayMonthKey);
    const dataSource =
      weekMondayMonthKey === monthKey
        ? data
        : extraMonthData[weekMondayMonthKey] || {};

    const existing = (dataSource.weeklyChangeRequests || []).filter(
      (r: WeeklyChangeRequest) =>
        r.id !== newRequest.id &&
        !(r.rg === activeRg && r.weekKey === currentWeekKey && r.status === 'pending')
    );
    const updated = [...existing, newRequest];

    if (weekMondayMonthKey === monthKey) {
      setData((prev) => ({ ...prev, weeklyChangeRequests: updated }));
    } else {
      setExtraMonthData((prev) => ({
        ...prev,
        [weekMondayMonthKey]: {
          ...(prev[weekMondayMonthKey] || {}),
          weeklyChangeRequests: updated
        }
      }));
    }

    await setDoc(targetDocRef, cleanUndefined({ weeklyChangeRequests: updated }), {
      merge: true
    });
    setShowWeeklyChangeModal(false);
    setActionFeedback({
      type: 'success',
      message: 'Solicitação de alteração enviada com sucesso ao Escalante!'
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleApproveWeeklyChange = async (req: WeeklyChangeRequest) => {
    if (!isAdmin && !user.isEscalante) return;

    try {
      const changesByMonth: Record<string, WeeklyDayChange[]> = {};
      req.changes.forEach((c) => {
        const mKey = c.dayStr.substring(0, 7);
        if (!changesByMonth[mKey]) changesByMonth[mKey] = [];
        changesByMonth[mKey].push(c);
      });

      for (const [mKey, changes] of Object.entries(changesByMonth)) {
        const docRef =
          mKey === monthKey
            ? monthDocRef
            : doc(db, `expediente_${normalizedObm}`, mKey);
        const source = mKey === monthKey ? data : extraMonthData[mKey] || {};

        let userSels = safeArr(source.selections?.[req.rg]);
        let userExp = safeArr(source.expedienteDays?.[req.rg]);

        changes.forEach((c) => {
          if (c.proposedStatus === 'expediente') {
            userExp = [...userExp.filter((d) => d !== c.dayStr), c.dayStr];
            userSels = userSels.filter((d) => d !== c.dayStr);
          } else if (c.proposedStatus === 'servico') {
            userSels = [...userSels.filter((d) => d !== c.dayStr), c.dayStr];
            userExp = userExp.filter((d) => d !== c.dayStr);
          } else if (c.proposedStatus === 'folga') {
            userExp = userExp.filter((d) => d !== c.dayStr);
            userSels = userSels.filter((d) => d !== c.dayStr);
          }
        });

        await setDoc(
          docRef,
          cleanUndefined({
            selections: { [req.rg]: userSels },
            expedienteDays: { [req.rg]: userExp }
          }),
          { merge: true }
        );

        if (mKey === monthKey) {
          setData((prev) => ({
            ...prev,
            selections: { ...prev.selections, [req.rg]: userSels },
            expedienteDays: { ...(prev.expedienteDays || {}), [req.rg]: userExp }
          }));
        } else {
          setExtraMonthData((prev) => ({
            ...prev,
            [mKey]: {
              ...(prev[mKey] || {}),
              selections: { ...(prev[mKey]?.selections || {}), [req.rg]: userSels },
              expedienteDays: { ...(prev[mKey]?.expedienteDays || {}), [req.rg]: userExp }
            }
          }));
        }
      }

      const reviewerName = formatMilitaryName(
        user.rank
          ? `${user.rank} ${user.warName || user.name.split(' ')[0]}`
          : user.name
      );
      const reqMonthKey = req.weekKey.substring(0, 7);
      const reqDocRef =
        reqMonthKey === monthKey
          ? monthDocRef
          : doc(db, `expediente_${normalizedObm}`, reqMonthKey);
      const source =
        reqMonthKey === monthKey ? data : extraMonthData[reqMonthKey] || {};

      const updatedRequests = (source.weeklyChangeRequests || []).map(
        (r: WeeklyChangeRequest) => {
          if (r.id === req.id) {
            return {
              ...r,
              status: 'approved' as const,
              reviewedBy: reviewerName,
              reviewedAt: new Date().toISOString()
            };
          }
          return r;
        }
      );

      await setDoc(
        reqDocRef,
        cleanUndefined({ weeklyChangeRequests: updatedRequests }),
        { merge: true }
      );

      if (reqMonthKey === monthKey) {
        setData((prev) => ({ ...prev, weeklyChangeRequests: updatedRequests }));
      } else {
        setExtraMonthData((prev) => ({
          ...prev,
          [reqMonthKey]: {
            ...(prev[reqMonthKey] || {}),
            weeklyChangeRequests: updatedRequests
          }
        }));
      }

      setActionFeedback({
        type: 'success',
        message: `Alteração de ${req.userName} aprovada com sucesso! A escala foi atualizada.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Erro ao aprovar alteração semanal:', err);
      setActionFeedback({ type: 'error', message: 'Erro ao aprovar alteração.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleRejectWeeklyChange = async (
    req: WeeklyChangeRequest,
    rejectionReason?: string
  ) => {
    if (!isAdmin && !user.isEscalante) return;

    try {
      const reviewerName = formatMilitaryName(
        user.rank
          ? `${user.rank} ${user.warName || user.name.split(' ')[0]}`
          : user.name
      );
      const reqMonthKey = req.weekKey.substring(0, 7);
      const reqDocRef =
        reqMonthKey === monthKey
          ? monthDocRef
          : doc(db, `expediente_${normalizedObm}`, reqMonthKey);
      const source =
        reqMonthKey === monthKey ? data : extraMonthData[reqMonthKey] || {};

      const updatedRequests = (source.weeklyChangeRequests || []).map(
        (r: WeeklyChangeRequest) => {
          if (r.id === req.id) {
            return {
              ...r,
              status: 'rejected' as const,
              rejectionReason:
                rejectionReason || 'Solicitação não aprovada pelo escalante',
              reviewedBy: reviewerName,
              reviewedAt: new Date().toISOString()
            };
          }
          return r;
        }
      );

      await setDoc(
        reqDocRef,
        cleanUndefined({ weeklyChangeRequests: updatedRequests }),
        { merge: true }
      );

      if (reqMonthKey === monthKey) {
        setData((prev) => ({ ...prev, weeklyChangeRequests: updatedRequests }));
      } else {
        setExtraMonthData((prev) => ({
          ...prev,
          [reqMonthKey]: {
            ...(prev[reqMonthKey] || {}),
            weeklyChangeRequests: updatedRequests
          }
        }));
      }

      setActionFeedback({
        type: 'success',
        message: `Solicitação de ${req.userName} recusada.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Erro ao recusar alteração semanal:', err);
    }
  };

  const handleCancelWeeklyChange = async (reqId: string, weekKey: string) => {
    try {
      const reqMonthKey = weekKey.substring(0, 7);
      const reqDocRef =
        reqMonthKey === monthKey
          ? monthDocRef
          : doc(db, `expediente_${normalizedObm}`, reqMonthKey);
      const source =
        reqMonthKey === monthKey ? data : extraMonthData[reqMonthKey] || {};

      const updatedRequests = (source.weeklyChangeRequests || []).filter(
        (r: WeeklyChangeRequest) => r.id !== reqId
      );

      await setDoc(
        reqDocRef,
        cleanUndefined({ weeklyChangeRequests: updatedRequests }),
        { merge: true }
      );

      if (reqMonthKey === monthKey) {
        setData((prev) => ({ ...prev, weeklyChangeRequests: updatedRequests }));
      } else {
        setExtraMonthData((prev) => ({
          ...prev,
          [reqMonthKey]: {
            ...(prev[reqMonthKey] || {}),
            weeklyChangeRequests: updatedRequests
          }
        }));
      }

      setActionFeedback({
        type: 'success',
        message: 'Solicitação de alteração cancelada.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Erro ao cancelar solicitação:', err);
    }
  };

  return {
    allWeeklyChangeRequests,
    userCurrentWeekRequest,
    showWeeklyChangeModal,
    setShowWeeklyChangeModal,
    proposedWeeklyChanges,
    setProposedWeeklyChanges,
    weeklyChangeReason,
    setWeeklyChangeReason,
    handleOpenWeeklyChangeModal,
    handleSubmitWeeklyChangeRequest,
    handleApproveWeeklyChange,
    handleRejectWeeklyChange,
    handleCancelWeeklyChange
  };
}
