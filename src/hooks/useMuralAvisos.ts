import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanUndefined } from "../lib/utils";

export interface Aviso {
  id: string;
  texto: string;
  autor: string;
  createdAt: any;
  eventDate?: string;
}

export function useMuralAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'mural_avisos'), orderBy('createdAt', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Aviso[];
      setAvisos(data);
      setLoading(false);
    }, (error) => {
      console.warn("Mural fetch warning:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const addAviso = async ({ novoAviso, eventoData, userName }: { novoAviso: string, eventoData?: string, userName: string }) => {
    if (!novoAviso.trim()) return false;
    try {
      const dataToSave: any = {
        texto: novoAviso.trim(),
        autor: userName,
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
