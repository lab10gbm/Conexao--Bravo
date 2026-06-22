import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

interface MilitarContextType {
  militars: UserProfile[];
  loading: boolean;
  refreshMilitars: (rg?: string) => Promise<void>;
  updateMilitarLocal: (rg: string, updates: Partial<UserProfile>) => void;
}

const MilitarContext = createContext<MilitarContextType | undefined>(undefined);

export function MilitarProvider({ children }: { children: ReactNode }) {
  const [militars, setMilitars] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuta em tempo real todas as alterações na coleção de militares
    // Isso substitui a rota /api/militar e o localStorage, o próprio Firebase tem cache offline
    const unsubscribe = onSnapshot(collection(db, 'militaries'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(d => {
        const data = d.data();
        return ({
          rg: d.id,
          name: data.name || '',
          postGrad: data.postGrad || '',
          registration: data.registration || '',
          unit: data.unit || '',
          phone: data.phone || '',
          email: data.email || '',
          ...data
        } as unknown) as UserProfile;
      });
      setMilitars(fetchedMembers);
      setLoading(false);
    }, (error) => {
      console.error('Realtime Firebase error on militars:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compatibilidade com componentes antigos que chamam refreshMilitars
  const refreshMilitars = async (rg?: string) => {
    // Com onSnapshot, a atualização é automática e em tempo real. Não precisamos recarregar nada.
    // Pode apenas resolver as promisses de outros arquivos
    return Promise.resolve();
  };

  const updateMilitarLocal = (rg: string, updates: Partial<UserProfile>) => {
    setMilitars(prev => prev.map(m => {
      if (m.rg === rg || m.uid === rg || (m.rg && m.rg.toString() === rg.toString())) {
        return { ...m, ...updates };
      }
      return m;
    }));
  };

  return (
    <MilitarContext.Provider value={{
      militars,
      loading,
      refreshMilitars,
      updateMilitarLocal
    }}>
      {children}
    </MilitarContext.Provider>
  );
}

export function useMilitars() {
  const context = useContext(MilitarContext);
  if (context === undefined) {
    throw new Error('useMilitars must be used within a MilitarProvider');
  }
  return context;
}
