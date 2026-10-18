import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { normalizeObm, normalizeRg } from '../lib/utils';
import { verificarConflitosMilitar, ConflitoOperacional, parseDateToIso } from '../lib/conflitosOperacionais';

export interface UseConflitosOperacionaisProps {
  obmContext: string;
  selectedDate?: string | null;
}

export function useConflitosOperacionais({ obmContext, selectedDate }: UseConflitosOperacionaisProps) {
  const [afastamentos, setAfastamentos] = useState<any[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [grdMonthDays, setGrdMonthDays] = useState<Record<string, string[]>>({});
  const [permutasDoMes, setPermutasDoMes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cleanObm = normalizeObm(obmContext || '10º GBM');
  const obmDocKey = cleanObm.replace(/\//g, '_').replace(/\s/g, '_');

  const monthKey = useMemo(() => {
    if (!selectedDate) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const iso = parseDateToIso(selectedDate);
    return iso ? iso.substring(0, 7) : `${new Date().getFullYear()}-01`;
  }, [selectedDate]);

  // 1. Escuta Afastamentos da OBM
  useEffect(() => {
    const qAfast = query(
      collection(db, 'afastamentos_alas'),
      where('obm', '==', cleanObm)
    );

    const unsubAfast = onSnapshot(
      qAfast,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAfastamentos(data);
      },
      (err) => console.warn('[useConflitosOperacionais] Erro afastamentos:', err.message)
    );

    return () => unsubAfast();
  }, [cleanObm]);

  // 2. Escuta Férias DGP ativas
  useEffect(() => {
    // Escuta coleção vacations
    const qVac = query(collection(db, 'vacations'));
    const unsubVac = onSnapshot(
      qVac,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVacations(list);
      },
      (err) => console.warn('[useConflitosOperacionais] Erro vacations:', err.message)
    );

    return () => unsubVac();
  }, []);

  // 3. Escuta GRD do mês correspondente
  useEffect(() => {
    const grdDocRef = doc(db, 'grd_configs', `${obmDocKey}_${monthKey}`);
    const unsubGrd = onSnapshot(
      grdDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setGrdMonthDays(data?.days || {});
        } else {
          setGrdMonthDays({});
        }
      },
      (err) => console.warn('[useConflitosOperacionais] Erro grd:', err.message)
    );

    return () => unsubGrd();
  }, [obmDocKey, monthKey]);

  // 4. Escuta Permutas do mês
  useEffect(() => {
    const startIso = `${monthKey}-01`;
    const endIso = `${monthKey}-31`;

    const qPerm = query(
      collection(db, 'permutas'),
      where('date', '>=', startIso),
      where('date', '<=', endIso)
    );

    const unsubPerm = onSnapshot(
      qPerm,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPermutasDoMes(list);
        setLoading(false);
      },
      (err) => {
        console.warn('[useConflitosOperacionais] Erro permutas mês:', err.message);
        setLoading(false);
      }
    );

    return () => unsubPerm();
  }, [monthKey]);

  // Checagem sob demanda para qualquer militar e data
  const checarConflito = useCallback(
    (
      militarRg: string | number | null | undefined,
      dataAlvo: string,
      permutaAtualId?: string,
      militarAla?: string | number | null,
      verificarPlantaoRegular?: boolean,
      permitirFerias?: boolean
    ): ConflitoOperacional[] => {
      if (!militarRg || !dataAlvo) return [];

      const targetIso = parseDateToIso(dataAlvo) || dataAlvo;
      const grdRgs = grdMonthDays[targetIso] || [];
      const permutasDoDia = permutasDoMes.filter((p) => p.date === targetIso);

      return verificarConflitosMilitar({
        militarRg,
        militarAla,
        dataAlvo: targetIso,
        vacations,
        afastamentos,
        grdRgs,
        permutasDoDia,
        permutaAtualId,
        verificarPlantaoRegular,
        permitirFerias,
      });
    },
    [afastamentos, vacations, grdMonthDays, permutasDoMes]
  );

  return {
    afastamentos,
    vacations,
    grdMonthDays,
    permutasDoMes,
    checarConflito,
    loading,
  };
}
