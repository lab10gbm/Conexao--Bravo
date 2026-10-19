import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanUndefined } from "../lib/utils";
import { resolveCanonicalScope, isSameUnit } from '../lib/canonicalScope';
import type { ScopeContext } from '../types/scope';

export interface Aviso {
  id: string;
  texto: string;
  autor: string;
  createdAt: any;
  eventDate?: string;
  scope?: ScopeContext;
}

export function useMuralAvisos(obmContext?: string) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'mural_avisos'), orderBy('createdAt', 'desc'), limit(25));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Aviso[];

      // Filtragem por escopo se obmContext for fornecido
      if (obmContext && obmContext !== 'GLOBAL') {
        const currentScope = resolveCanonicalScope(obmContext);
        const filtered = data.filter(a => {
          if (!a.scope) return true; // Retrocompatibilidade com avisos antigos
          return a.scope.unitId === currentScope.unitId || a.scope.cbaId === currentScope.cbaId;
        });
        setAvisos(filtered);
      } else {
        setAvisos(data);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Mural fetch warning:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [obmContext]);

  const addAviso = async ({
    novoAviso,
    eventoData,
    userName,
    obm
  }: {
    novoAviso: string;
    eventoData?: string;
    userName: string;
    obm?: string;
  }) => {
    if (!novoAviso.trim()) return false;
    try {
      const targetScope = resolveCanonicalScope(obm || obmContext);
      const dataToSave: any = {
        texto: novoAviso.trim(),
        autor: userName,
        scope: targetScope,
        createdAt: serverTimestamp()
      };
      if (eventoData) {
        dataToSave.eventDate = eventoData;
      }
      await addDoc(collection(db, 'mural_avisos'), cleanUndefined(dataToSave));
      return true;
    } catch (e) {
      console.error('Erro ao adicionar aviso:', e);
      return false;
    }
  };

  const deleteAviso = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'mural_avisos', id));
      return true;
    } catch (e) {
      console.error('Erro ao excluir aviso:', e);
      return false;
    }
  };

  return { avisos, loading, addAviso, deleteAviso };
}
