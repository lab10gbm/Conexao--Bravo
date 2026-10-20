import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  doc, onSnapshot, query, collection, where 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { normalizeObm } from '../../../lib/utils';
import { PermutaRequest } from '../../../types';
import { ExpedienteData, Afastamento } from '../types';

interface UseExpedienteDataOptions {
  selectedObm: string;
  currentMonth: Date;
  obmContext?: string;
}

export function useExpedienteData({ selectedObm, currentMonth, obmContext }: UseExpedienteDataOptions) {
  const [data, setData] = useState<ExpedienteData>({
    requirements: {},
    selections: {},
    userNames: {},
    sectors: {},
    regimes: {},
    locked: {},
    lockedOrdinario: {},
    lockedWeekly: {},
    swapRequests: [],
    weeklyChangeRequests: [],
    preferencesDetails: {},
    expedienteDays: {},
    expQuotas: {},
    grdData: {}
  });

  const [loading, setLoading] = useState(true);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [generalPermutas, setGeneralPermutas] = useState<PermutaRequest[]>([]);

  const normalizedObm = selectedObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthDocRef = doc(db, `expediente_${normalizedObm}`, monthKey);
  const globalDocRef = doc(db, 'config', `expediente_global_${normalizedObm}`);

  // Listener: Afastamentos
  useEffect(() => {
    if (!obmContext) return;
    const q = query(collection(db, 'afastamentos_alas'), where('obm', '==', normalizeObm(obmContext)));
    const unsub = onSnapshot(q, (snap) => {
      const result: Afastamento[] = [];
      snap.forEach(docSnap => {
        result.push({ id: docSnap.id, ...docSnap.data() } as Afastamento);
      });
      setAfastamentos(result);
    }, (err) => {
      console.error("Error fetching afastamentos in useExpedienteData:", err);
    });
    return () => unsub();
  }, [obmContext]);

  // Listener: Permutas gerais
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'permutas'), (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PermutaRequest));
      setGeneralPermutas(list);
    }, (err) => {
      console.error("Error fetching permutas in useExpedienteData:", err);
    });
    return () => unsub();
  }, []);

  // Listener: Expediente mensal, global e GRD
  useEffect(() => {
    setLoading(true);
    let monthData: any = { selections: {}, expedienteDays: {} };
    let globalData: any = { requirements: {}, userNames: {}, sectors: {}, expQuotas: {} };
    let grdData: any = {};

    const mergeData = () => {
      setData({
        requirements: { ...(globalData.requirements || {}), ...(monthData.requirements || {}) },
        selections: monthData.selections || {},
        locked: monthData.locked || {},
        lockedOrdinario: monthData.lockedOrdinario || monthData.locked || {},
        lockedWeekly: monthData.lockedWeekly || {},
        swapRequests: monthData.swapRequests || [],
        weeklyChangeRequests: monthData.weeklyChangeRequests || [],
        preferencesDetails: monthData.preferencesDetails || {},
        expedienteDays: monthData.expedienteDays || {},
        expQuotas: globalData.expQuotas || {},
        userNames: { ...(globalData.userNames || {}), ...(monthData.userNames || {}) },
        sectors: { ...(globalData.sectors || {}), ...(monthData.sectors || {}) },
        regimes: { ...(globalData.regimes || {}), ...(monthData.regimes || {}) },
        grdData: grdData || {}
      });
      setLoading(false);
    };

    const obmGrdId = selectedObm.replace(/\//g, '_').replace(/\s/g, '_');
    const grdDocId = `${obmGrdId}_${monthKey}`;

    // 1. Initial backend load to guarantee data even with client permission blocks
    let isMounted = true;
    Promise.all([
      fetch(`/api/doc/get?collection=${encodeURIComponent(`expediente_${normalizedObm}`)}&docId=${encodeURIComponent(monthKey)}`).then(r => r.json()).catch(() => null),
      fetch(`/api/doc/get?collection=${encodeURIComponent(`expediente_${normalizedObm}`)}&docId=global`).then(r => r.json()).catch(() => null),
      fetch(`/api/doc/get?collection=grd_configs&docId=${encodeURIComponent(grdDocId)}`).then(r => r.json()).catch(() => null)
    ]).then(([mRes, gRes, grdRes]) => {
      if (!isMounted) return;
      if (mRes?.success && mRes?.data) {
        monthData = { ...monthData, ...mRes.data };
      }
      if (gRes?.success && gRes?.data) {
        globalData = { ...globalData, ...gRes.data };
      }
      if (grdRes?.success && grdRes?.data) {
        grdData = grdRes.data.days || {};
      }
      mergeData();
    }).catch(err => {
      console.warn('[useExpedienteData] Initial fetch notice:', err?.message);
    });

    // 2. Real-time listeners with resilient error handling (prevents uncaught runtime exceptions)
    let unsubMonth = () => {};
    let unsubGlobal = () => {};
    let unsubGrd = () => {};

    try {
      unsubMonth = onSnapshot(monthDocRef, (docSnap) => {
        if (docSnap.exists()) {
          monthData = docSnap.data();
        } else {
          monthData = { selections: {}, locked: {}, swapRequests: [], weeklyChangeRequests: [] };
        }
        mergeData();
      }, (error) => {
        console.warn('[useExpedienteData] monthDocRef snapshot notice (handled via API fallback):', error?.message);
      });
    } catch (e) {}

    try {
      unsubGlobal = onSnapshot(globalDocRef, (docSnap) => {
        if (docSnap.exists()) {
          globalData = docSnap.data();
        } else {
          globalData = { requirements: {}, userNames: {}, sectors: {} };
        }
        mergeData();
      }, (error) => {
        console.warn('[useExpedienteData] globalDocRef snapshot notice (handled via API fallback):', error?.message);
      });
    } catch (e) {}

    try {
      unsubGrd = onSnapshot(doc(db, 'grd_configs', grdDocId), (docSnap) => {
        if (docSnap.exists()) {
          grdData = docSnap.data().days || {};
        } else {
          grdData = {};
        }
        mergeData();
      }, (error) => {
        console.warn('[useExpedienteData] grdDoc snapshot notice (handled via API fallback):', error?.message);
      });
    } catch (e) {}

    return () => {
      isMounted = false;
      unsubMonth();
      unsubGlobal();
      unsubGrd();
    };
  }, [monthKey, selectedObm, normalizedObm]);

  return {
    data,
    setData,
    loading,
    afastamentos,
    generalPermutas,
    normalizedObm,
    monthKey,
    monthDocRef,
    globalDocRef
  };
}
