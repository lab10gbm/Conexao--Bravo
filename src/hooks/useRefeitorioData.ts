import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
const INITIAL_MENU_DATA: any[] = [];
const PROTEINAS: any[] = [
  {
    isCategory: true,
    name: "FRANGO",
    items: [
      "FRANGO ASSADO",
      "FRANGO COZIDO",
      "FRANGO GRELHADO",
      "FRANGO EMPANADO",
      "FILÉ DE FRANGO",
      "FILÉ DE FRANGO GRELHADO",
      "FILÉ DE FRANGO A PARMEGIANA",
      "FILÉ DE FRANGO EMPANADO",
      "COXA E SOBRECOXA",
      "COXA E SOBRECOXA ASSADA",
      "COXA E SOBRECOXA AO MOLHO",
      "FRANGO NA PANELA",
      "STROGONOFF DE FRANGO",
      "ISCA DE FRANGO C/ CALABRESA",
      "PEITO DE FRANGO"
    ]
  },
  {
    isCategory: true,
    name: "CARNE BOVINA",
    items: [
      "BIFE DE PATINHO",
      "BIFE ACEBOLADO",
      "BIFE A ROLÊ",
      "CARNE ASSADA",
      "CARNE ASSADA C/ MOLHO MADEIRA",
      "CARNE DE PANELA",
      "CARNE COZIDA C/ LEGUMES",
      "CARNE MOIDA C/ BATATA",
      "CARNE MOIDA C/ MACARRÃO",
      "STROGONOFF DE CARNE",
      "COSTELA",
      "VACA ATOLADA",
      "RABADA",
      "ALMONDEGA",
      "ACÉM",
      "LAGARTO",
      "CHURRASCO",
      "CHURRASCO MISTO"
    ]
  },
  {
    isCategory: true,
    name: "CARNE SUÍNA",
    items: [
      "LOMBO ASSADO",
      "LOMBO AO MOLHO MADEIRA",
      "LASCA DE LOMBO C/ CALABRESA",
      "LINGUIÇA (CALABRESA)"
    ]
  },
  {
    isCategory: true,
    name: "PEIXES E FRUTOS DO MAR",
    items: [
      "FILÉ DE PEIXE",
      "FILÉ DE PEIXE EMPANADO",
      "FILÉ DE PEIXE AO MOLHO",
      "FILÉ DE PEIXE GRELHADO",
      "PEIXE AO MOLHO DE COCO",
      "FEIJOADA DE FRUTOS DO MAR",
      "RISOTO DE FRUTOS DO MAR"
    ]
  },
  {
    isCategory: true,
    name: "OUTROS E MASSAS",
    items: [
      "FEIJOADA COMPLETA",
      "FEIJOADA",
      "LASANHA DE CARNE",
      "LASANHA DE FRANGO",
      "LASANHA MISTA",
      "PANQUECA",
      "JARDINEIRA",
      "TUTU DE FEIJÃO"
    ]
  }
];

const ACOMPANHAMENTOS: any[] = [
  {
    isCategory: true,
    name: "BATATAS",
    items: [
      "BATATA FRITA",
      "BATATA DORÊ",
      "BATATA PALHA",
      "BATATA SAUTÉ"
    ]
  },
  {
    isCategory: true,
    name: "PURÊ",
    items: [
      "PURÊ DE BATATA",
      "PURÊ DE MANDIOCA",
      "PURÊ DE AIPIM",
      "PURÊ DE BATATA DOCE",
      "PURÊ DE INHAME",
      "PURÊ DE ABÓBORA"
    ]
  },
  {
    isCategory: true,
    name: "QUIBEBE",
    items: [
      "QUIBEBE",
      "QUIBEBE DE ABÓBORA",
      "QUIBEBE DE ABÓBORA COM CAMARÃO",
      "QUIBEBE DE ABÓBORA COM CARNE SECA"
    ]
  },
  {
    isCategory: true,
    name: "FAROFA",
    items: [
      "FAROFA BÁSICA",
      "FAROFA DE BACON",
      "FAROFA DE CALABRESA"
    ]
  },
  {
    isCategory: true,
    name: "DIVERSOS",
    items: [
      "MAIONESE",
      "VINAGRETE",
      "POLENTA",
      "PIRÃO",
      "ANGU",
      "MACARRONESE",
      "AIPIM FRITO",
      "MACARRÃO ALHO E ÓLEO",
      "REPOLHO REFOGADO",
      "COUVE REFOGADA",
      "QUIABO"
    ]
  }
];

const SOBREMESAS: any[] = [
  "MOUSSE DE LIMÃO",
  "MOUSSE DE MARACUJÁ",
  "MOUSSE DE MORANGO",
  "GELATINA",
  "GELATINA C/ CREME",
  "PUDIM",
  "PAVÊ DE CHOCOLATE",
  "BANOFFE",
  "DOCE DE BANANA",
  "PÉ DE MOLEQUE",
  "PÉ DE MOÇA",
  "PAÇOCA",
  "BOMBOM",
  "BANANADA",
  "GELATINA DE MORANGO",
  "DOCE DE LEITE",
  "LARANJA / ABACAXI",
  "SORVETE",
  "FRUTA DA ÉPOCA"
];
const SALADAS: any[] = [
  "SALADAS (VERDES/COZIDA)"
];
const CEIA: any[] = [];

export function useRefeitorioData() {
  const [menus, setMenus] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'refeitorio', 'data');
    const unsubscribe = onSnapshot(docRef, async (snap) => {
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
        
        let loadedCatalog = data.catalog || {
          proteinas: PROTEINAS,
          acompanhamentos: ACOMPANHAMENTOS,
          sobremesas: SOBREMESAS,
          saladas: SALADAS,
          ceia: CEIA
        };

        const DEFAULTS = {
          proteinas: PROTEINAS,
          acompanhamentos: ACOMPANHAMENTOS,
          sobremesas: SOBREMESAS,
          saladas: SALADAS,
          ceia: CEIA
        };

        let dirty = false;
        for (const [key, defaultsArray] of Object.entries(DEFAULTS)) {
          if (!loadedCatalog[key]) {
            loadedCatalog[key] = defaultsArray;
            dirty = true;
          }
        }

        if (dirty) {
           try {
              await setDoc(docRef, { catalog: loadedCatalog }, { merge: true });
           } catch(e) {}
        }
        
        setCatalog(loadedCatalog);
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
    const sortItems = (items: any[]) => {
      return [...items].sort((a, b) => {
        const nameA = typeof a === 'string' ? a : a.name;
        const nameB = typeof b === 'string' ? b : b.name;
        return nameA.localeCompare(nameB, 'pt-BR');
      }).map(item => {
        if (typeof item !== 'string' && item.isCategory) {
          return { ...item, items: [...item.items].sort((a, b) => a.localeCompare(b, 'pt-BR')) };
        }
        return item;
      });
    };

    const sortedCatalog: any = {};
    for (const key in newCatalog) {
      if (Array.isArray(newCatalog[key])) {
        sortedCatalog[key] = sortItems(newCatalog[key]);
      } else {
        sortedCatalog[key] = newCatalog[key];
      }
    }

    setCatalog(sortedCatalog); // optimistic update
    try {
      await setDoc(doc(db, 'refeitorio', 'data'), { catalog: sortedCatalog }, { merge: true });
    } catch (e) {
      console.error("Error saving catalog:", e);
    }
  };

  const restoreDefaultCatalog = async () => {
    const DEFAULTS = {
      proteinas: PROTEINAS,
      acompanhamentos: ACOMPANHAMENTOS,
      sobremesas: SOBREMESAS,
      saladas: SALADAS,
      ceia: CEIA
    };
    await saveCatalog(DEFAULTS);
  };

  return { menus, catalog, loading, saveMenus, saveCatalog, restoreDefaultCatalog };
}

