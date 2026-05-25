import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
const INITIAL_MENU_DATA: any[] = [];
const PROTEINAS: any[] = [];
const ACOMPANHAMENTOS: any[] = [];
const SOBREMESAS: any[] = [];
const SALADAS: any[] = [];
const CEIA: any[] = [];

export function useRefeitorioData() {
  const [menus, setMenus] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'refeitorio', 'data');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let parsedMenus = data.menus || INITIAL_MENU_DATA;
        
        // Migrate structure if needed
        parsedMenus = parsedMenus.map((m: any) => ({
          ...m,
          jantar: {
            ...m.jantar,
            ceia: m.jantar?.ceia || m.jantar?.sobremesa || ""
          },
          cafeManha: m.cafeManha || m.ceia || ""
        }));

        setMenus(parsedMenus);
        setCatalog(data.catalog || {
          proteinas: PROTEINAS,
          acompanhamentos: ACOMPANHAMENTOS,
          sobremesas: SOBREMESAS,
          saladas: SALADAS,
          ceia: CEIA
        });
      } else {
        setMenus(INITIAL_MENU_DATA);
        setCatalog({
          proteinas: PROTEINAS,
          acompanhamentos: ACOMPANHAMENTOS,
          sobremesas: SOBREMESAS,
          saladas: SALADAS,
          ceia: CEIA
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching refeitorio data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveMenus = async (newMenus: any[]) => {
    setMenus(newMenus); // optimistic update
    try {
      await setDoc(doc(db, 'refeitorio', 'data'), { menus: newMenus }, { merge: true });
    } catch (e) {
      console.error("Error saving menus:", e);
    }
  };

  const saveCatalog = async (newCatalog: any) => {
    setCatalog(newCatalog); // optimistic update
    try {
      await setDoc(doc(db, 'refeitorio', 'data'), { catalog: newCatalog }, { merge: true });
    } catch (e) {
      console.error("Error saving catalog:", e);
    }
  };

  return { menus, catalog, loading, saveMenus, saveCatalog };
}
