import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    const q = query(collection(db, 'mural_avisos'), orderBy('createdAt', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aviso));
      setAvisos(data);
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
      await addDoc(collection(db, 'mural_avisos'), dataToSave);
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
