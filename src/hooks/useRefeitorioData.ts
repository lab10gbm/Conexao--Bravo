import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { cleanUndefined } from "../lib/utils";

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
  const [menus, setMenus] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('refeitorio_menus_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return [];
  });
  const [catalog, setCatalog] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('refeitorio_catalog_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return null;
  });
  const [defaults, setDefaults] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('refeitorio_defaults_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return {
      almoco: { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", sobremesa: "" },
      jantar: { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", ceia: "" },
      lancheTarde: "CAFÉ, SUCO, PIPOCA, PÃO RECHEADO",
      cafeManha: "CAFÉ, PÃO, OVOS, QUEIJO, PRESUNTO"
    };
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'refeitorio', 'data'), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let parsedMenus = data.menus;
        if (!parsedMenus || parsedMenus.length === 0) {
          try {
             const cached = localStorage.getItem('refeitorio_menus_cache');
             if (cached && JSON.parse(cached).length > 0) {
                parsedMenus = JSON.parse(cached);
                // Upload this rescued data
                setDoc(doc(db, 'refeitorio', 'data'), { menus: parsedMenus }, { merge: true }).catch(console.error);
             } else {
                parsedMenus = INITIAL_MENU_DATA;
             }
          } catch(e) { parsedMenus = INITIAL_MENU_DATA; }
        }
        
        parsedMenus = parsedMenus.map((m: any) => ({
          ...m,
          jantar: {
            ...m.jantar,
            ceia: m.jantar?.ceia || m.jantar?.sobremesa || ""
          },
          cafeManha: m.cafeManha || m.ceia || ""
        }));

        setMenus(parsedMenus);
        localStorage.setItem('refeitorio_menus_cache', JSON.stringify(parsedMenus));

        let loadedCatalog = data.catalog;
        if (!loadedCatalog || !loadedCatalog.proteinas || loadedCatalog.proteinas.length === 0) {
           try {
              const cached = localStorage.getItem('refeitorio_catalog_cache');
              if (cached && JSON.parse(cached).proteinas && JSON.parse(cached).proteinas.length > 0) {
                 loadedCatalog = JSON.parse(cached);
                 // Upload this rescued data
                 setDoc(doc(db, 'refeitorio', 'data'), { catalog: loadedCatalog }, { merge: true }).catch(console.error);
              } else {
                 loadedCatalog = { proteinas: PROTEINAS, acompanhamentos: ACOMPANHAMENTOS, sobremesas: SOBREMESAS, saladas: SALADAS, ceia: CEIA };
              }
           } catch(e) { 
              loadedCatalog = { proteinas: PROTEINAS, acompanhamentos: ACOMPANHAMENTOS, sobremesas: SOBREMESAS, saladas: SALADAS, ceia: CEIA }; 
           }
        }

        const defaultRefeicao = data.defaults || {
          almoco: { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", sobremesa: "" },
          jantar: { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", ceia: "" },
          lancheTarde: "CAFÉ, SUCO, PIPOCA, PÃO RECHEADO",
          cafeManha: "CAFÉ, PÃO, OVOS, QUEIJO, PRESUNTO"
        };
        setDefaults(defaultRefeicao);
        localStorage.setItem('refeitorio_defaults_cache', JSON.stringify(defaultRefeicao));

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
           const docRef = doc(db, 'refeitorio', 'data');
           try {
              await setDoc(docRef, cleanUndefined({ catalog: loadedCatalog }), { merge: true });
           } catch(e) {}
        }
        
        setCatalog(loadedCatalog);
        localStorage.setItem('refeitorio_catalog_cache', JSON.stringify(loadedCatalog));
      } else {
        let rescuedMenus = INITIAL_MENU_DATA;
        try {
           const cached = localStorage.getItem('refeitorio_menus_cache');
           if (cached && JSON.parse(cached).length > 0) rescuedMenus = JSON.parse(cached);
        } catch(e) {}
        
        let rescuedCatalog = {
          proteinas: PROTEINAS,
          acompanhamentos: ACOMPANHAMENTOS,
          sobremesas: SOBREMESAS,
          saladas: SALADAS,
          ceia: CEIA
        };
        try {
           const cachedCat = localStorage.getItem('refeitorio_catalog_cache');
           if (cachedCat) {
              const parsed = JSON.parse(cachedCat);
              if (parsed.proteinas && parsed.proteinas.length > 0) rescuedCatalog = parsed;
           }
        } catch(e) {}
        
        setMenus(rescuedMenus);
        setCatalog(rescuedCatalog);
        localStorage.setItem('refeitorio_menus_cache', JSON.stringify(rescuedMenus));
        localStorage.setItem('refeitorio_catalog_cache', JSON.stringify(rescuedCatalog));

        // Sync back to db to populate the fresh doc
        try {
           await setDoc(doc(db, 'refeitorio', 'data'), cleanUndefined({ menus: rescuedMenus, catalog: rescuedCatalog }), { merge: true });
        } catch (e) {
           console.error("Error setting initial doc:", e);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to refeitorio data:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveMenus = async (newMenus: any[]) => {
    setMenus(newMenus); // optimistic update
    localStorage.setItem('refeitorio_menus_cache', JSON.stringify(newMenus));
    try {
      await setDoc(doc(db, 'refeitorio', 'data'), cleanUndefined({ menus: newMenus }), { merge: true });
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
    localStorage.setItem('refeitorio_catalog_cache', JSON.stringify(sortedCatalog));
    try {
      await setDoc(doc(db, 'refeitorio', 'data'), cleanUndefined({ catalog: sortedCatalog }), { merge: true });
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

  const saveDefaults = async (newDefaults: any) => {
    setDefaults(newDefaults);
    localStorage.setItem('refeitorio_defaults_cache', JSON.stringify(newDefaults));
    try {
      await setDoc(doc(db, 'refeitorio', 'data'), cleanUndefined({ defaults: newDefaults }), { merge: true });
    } catch (e) {
      console.error("Error saving defaults:", e);
    }
  };

  return { menus, catalog, loading, defaults, saveMenus, saveCatalog, restoreDefaultCatalog, saveDefaults };
}

