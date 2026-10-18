import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Package, 
  ChefHat, 
  CalendarDays, 
  ClipboardList, 
  ShoppingBag,
  BookOpen
} from 'lucide-react';
import { UserProfile } from '../../types';
import { cn, cleanUndefined, getLocalIsoDateString } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useRefeitorioData } from '../../hooks/useRefeitorioData';
import { RefeitorioModule } from '../../components/RefeitorioModule';
import { AprovisionamentoCatalogo, GastoIngrediente } from '../../components/AprovisionamentoCatalogo';
import { AprovisionamentoGerenciarCategoriasModal } from '../../components/AprovisionamentoGerenciarCategoriasModal';

import { 
  Material, 
  Receita, 
  CardapioDia, 
  ListaDeCompras, 
  ItemListaCompras, 
  CategoriaMaterial, 
  TipoUso, 
  AprovisionamentoTab, 
  PaxDefaults 
} from './types';
import { MOCK_MATERIAIS, MOCK_RECEITAS, MOCK_CARDAPIO } from './mockData';
import { AprovisionamentoNovoProdutoModal } from './components/AprovisionamentoNovoProdutoModal';
import { AprovisionamentoNovaListaModal } from './components/AprovisionamentoNovaListaModal';
import { AprovisionamentoAddItemModal } from './components/AprovisionamentoAddItemModal';
import { AprovisionamentoEstoqueTab } from './components/AprovisionamentoEstoqueTab';
import { AprovisionamentoCardapioTab } from './components/AprovisionamentoCardapioTab';
import { AprovisionamentoPrevisaoTab } from './components/AprovisionamentoPrevisaoTab';
import { AprovisionamentoListaComprasTab } from './components/AprovisionamentoListaComprasTab';

export function AprovisionamentoModule({ userProfile }: { userProfile: UserProfile | null }) {
  const [activeTab, setActiveTab] = useState<AprovisionamentoTab>('CADASTRO');
  const [showArquivadas, setShowArquivadas] = useState(false);
  
  const [categoriasAbas, setCategoriasAbas] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) {
         const parsed = JSON.parse(cached);
         if (parsed.categoriasAbas && parsed.categoriasAbas.length > 0) return parsed.categoriasAbas;
      }
    } catch(e) {}
    return ['MERCADO', 'PROTEINA', 'SACOLAO', 'LIMPEZA', 'OPERACIONALIZACAO'];
  });

  const [materiais, setMateriais] = useState<Material[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) {
         const parsed = JSON.parse(cached);
         if (parsed.materiais && parsed.materiais.length > 0) return parsed.materiais;
      }
    } catch(e) {}
    return MOCK_MATERIAIS;
  });

  const [receitas, setReceitas] = useState<Receita[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) {
         const parsed = JSON.parse(cached);
         if (parsed.receitas && parsed.receitas.length > 0) return parsed.receitas;
      }
    } catch(e) {}
    return MOCK_RECEITAS;
  });

  const [cardapio, setCardapio] = useState<CardapioDia[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached && JSON.parse(cached).cardapio) return JSON.parse(cached).cardapio;
    } catch(e) {}
    return MOCK_CARDAPIO;
  });

  const [listasDeCompras, setListasDeCompras] = useState<ListaDeCompras[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.listasDeCompras) return parsed.listasDeCompras;
          let migrated: ListaDeCompras[] = [];
          if (parsed.historicoListas) migrated = [...parsed.historicoListas].map(h => ({ ...h, arquivada: h.arquivada ?? true }));
          if (parsed.listaCompras && parsed.listaCompras.length > 0) {
             migrated.push({
                id: `lista_migrada_${Date.now()}`,
                nome: 'Lista Salva Anterior',
                estabelecimento: '',
                local: '',
                dataCriacao: new Date().toISOString(),
                arquivada: false,
                itens: parsed.listaCompras
             });
          }
          if (migrated.length > 0) return migrated;
      }
    } catch(e) {}
    return [];
  });

  const [paxDefaults, setPaxDefaults] = useState<PaxDefaults>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached && JSON.parse(cached).paxDefaults) return JSON.parse(cached).paxDefaults;
    } catch(e) {}
    return { cafe: 60, almoco: 60, jantar: 60 };
  });

  const [datasEstoque, setDatasEstoque] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) return JSON.parse(cached).datasEstoque || ['27/05'];
    } catch(e) {}
    return ['27/05'];
  });

  const [cadastroFiltroMsg, setCadastroFiltroMsg] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaMaterial>('MERCADO');
  const [filtroCategoriaPrevisao, setFiltroCategoriaPrevisao] = useState<CategoriaMaterial>('MERCADO');
  const [gastosCatalogo, setGastosCatalogo] = useState<Record<string, GastoIngrediente[]>>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_gastos_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return {};
  });

  const [paxPratosCatalogo, setPaxPratosCatalogo] = useState<Record<string, { semana?: number, fds?: number, evento?: number }>>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_pax_pratos_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return {};
  });

  const [previsaoDiasOptions, setPrevisaoDiasOptions] = useState<number[]>(() => {
    try {
      const cached = localStorage.getItem('previsaoDiasOptions');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return [3, 5, 10];
  });

  const [newPrevisaoDiaStr, setNewPrevisaoDiaStr] = useState<string>('');
  const [mostrarTodosPrevisao, setMostrarTodosPrevisao] = useState(false);
  const [showAddListaModal, setShowAddListaModal] = useState(false);
  const [manualItemForm, setManualItemForm] = useState({ 
    nome: '', 
    quantidade: 1, 
    undMedida: 'UN', 
    categoria: 'OUTROS',
    materialId: '' as string | undefined
  });
  
  const [showNovoProdutoModal, setShowNovoProdutoModal] = useState(false);
  const [showGerenciarCategoriasModal, setShowGerenciarCategoriasModal] = useState(false);
  const [showNovaListaModal, setShowNovaListaModal] = useState(false);
  const [expandedListaId, setExpandedListaId] = useState<string | null>(null);

  const { menus } = useRefeitorioData();

  const filteredMenus = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const ontemTime = hoje.getTime() - (86400000 * 1); // yesterday
    
    const validMenusAndTimes = menus.map((menu: any) => {
       if (!menu.date) return null;
       const parts = menu.date.split('/');
       if (parts.length < 2) return null;
       const d = parseInt(parts[0]);
       const mo = parseInt(parts[1]);
       if (isNaN(d) || isNaN(mo)) return null;
       let year = hoje.getFullYear();
       if (hoje.getMonth() === 0 && mo === 12) year--;
       else if (hoje.getMonth() === 11 && mo === 1) year++;
       const cDate = new Date(year, mo - 1, d);
       cDate.setHours(0,0,0,0);
       return { menu, time: cDate.getTime() };
    }).filter(Boolean) as { menu: any, time: number }[];

    return validMenusAndTimes
      .filter(item => item.time >= ontemTime)
      .sort((a, b) => a.time - b.time)
      .map(item => item.menu);
  }, [menus]);

  const [showNovaDataPopup, setShowNovaDataPopup] = useState(false);
  const [novaDataValue, setNovaDataValue] = useState('');

  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [editingMenuIndex, setEditingMenuIndex] = useState<number | null>(null);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const pendingSaveRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef({ materiais, receitas, cardapio, datasEstoque, listasDeCompras, paxDefaults, previsaoDiasOptions, categoriasAbas });

  const syncAndSave = (newData: Partial<typeof dataRef.current>) => {
    dataRef.current = { ...dataRef.current, ...newData };
    localStorage.setItem('aprovisionamento_dados_cache', JSON.stringify(dataRef.current));
    
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    
    pendingSaveRef.current = setTimeout(async () => {
      try {
        const cleanedData = cleanUndefined(dataRef.current);
        await setDoc(doc(db, 'aprovisionamento', 'dados'), cleanUndefined(cleanedData), { merge: true });
        pendingSaveRef.current = null;
      } catch (e) {
        console.error("Error saving aprovisionamento dados:", e);
      }
    }, 1000);
  };

  useEffect(() => {
    let unsubscribeGastos: (() => void) | undefined;
    let unsubscribeDados: (() => void) | undefined;

    const fetchDados = async () => {
      try {
        // Fetch Gastos via real-time listener so it syncs across module tabs instantly
        const docRefGastos = doc(db, 'aprovisionamento', 'gastos_catalogo');
        unsubscribeGastos = onSnapshot(docRefGastos, (snapGastos) => {
          if (snapGastos.exists()) {
            const data = snapGastos.data();
            const gastos = data.gastos || {};
            const paxPratos = data.paxPratos || {};
            setGastosCatalogo(gastos);
            setPaxPratosCatalogo(paxPratos);
            localStorage.setItem('aprovisionamento_gastos_cache', JSON.stringify(gastos));
            localStorage.setItem('aprovisionamento_pax_pratos_cache', JSON.stringify(paxPratos));
          }
        });

        // Fetch Dados Principais via real-time listener
        const docRefDados = doc(db, 'aprovisionamento', 'dados');
        unsubscribeDados = onSnapshot(docRefDados, (snapDados) => {
          if (pendingSaveRef.current) return;

          if (snapDados.exists()) {
            const data = snapDados.data();
            const loadedMateriais = data.materiais && data.materiais.length > 0 ? data.materiais : MOCK_MATERIAIS;
            const loadedReceitas = data.receitas && data.receitas.length > 0 ? data.receitas : MOCK_RECEITAS;
            
            const loadedCardapio = data.cardapio || cardapio;
            const loadedDatasEstoque = data.datasEstoque || datasEstoque;
            const loadedListasDeCompras = data.listasDeCompras || listasDeCompras;
            const loadedPaxDefaults = data.paxDefaults || paxDefaults;
            const loadedPrevisaoDias = data.previsaoDiasOptions || previsaoDiasOptions;
            const loadedCategoriasAbas = data.categoriasAbas && data.categoriasAbas.length > 0 ? data.categoriasAbas : categoriasAbas;

            setMateriais(loadedMateriais);
            setReceitas(loadedReceitas);
            setCardapio(loadedCardapio);
            setDatasEstoque(loadedDatasEstoque);
            setListasDeCompras(loadedListasDeCompras);
            setPaxDefaults(loadedPaxDefaults);
            setPrevisaoDiasOptions(loadedPrevisaoDias);
            setCategoriasAbas(loadedCategoriasAbas);
            
            const fullDataToCache = {
              ...data,
              materiais: loadedMateriais,
              receitas: loadedReceitas,
              cardapio: loadedCardapio,
              datasEstoque: loadedDatasEstoque,
              listasDeCompras: loadedListasDeCompras,
              paxDefaults: loadedPaxDefaults,
              previsaoDiasOptions: loadedPrevisaoDias,
              categoriasAbas: loadedCategoriasAbas
            };
            dataRef.current = fullDataToCache;
            localStorage.setItem('aprovisionamento_dados_cache', JSON.stringify(fullDataToCache));
          } else {
            const initialData = { 
              materiais, 
              receitas, 
              cardapio, 
              datasEstoque, 
              listasDeCompras,
              paxDefaults,
              previsaoDiasOptions,
              categoriasAbas
            };
            setDoc(docRefDados, cleanUndefined(initialData)).catch(e => console.warn('Could not seed initial db', e));
          }
          setIsDataLoaded(true);
        }, (err) => {
          console.error("Error fetching aprovisionamento dados:", err);
          setIsDataLoaded(true);
        });
      } catch (e) {
        console.error("Error setting up aprovisionamento listeners:", e);
        setIsDataLoaded(true);
      }
    };
    fetchDados();

    return () => {
      if (unsubscribeGastos) unsubscribeGastos();
      if (unsubscribeDados) unsubscribeDados();
    };
  }, []);

  // Flush remaining saves exactly when component unmounts
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
        const cleanedData = cleanUndefined(dataRef.current);
        setDoc(doc(db, 'aprovisionamento', 'dados'), cleanUndefined(cleanedData), { merge: true }).catch(console.error);
        pendingSaveRef.current = null;
      }
    };
  }, []);

  const getActiveListaId = () => {
     const unarchived = listasDeCompras.filter(l => !l.arquivada);
     return unarchived.length > 0 ? unarchived[0].id : null;
  };

  const [selectedListaId, setSelectedListaId] = useState<string | null>(null);

  const promptAddToListaCompras = (material: Material, suggestedQty: number) => {
    const listId = getActiveListaId();
    setSelectedListaId(listId);
    
    const qt = suggestedQty > 0 ? Math.ceil(suggestedQty) : 1;
    setManualItemForm({
      nome: material.nome,
      quantidade: qt,
      undMedida: material.undMedida,
      categoria: material.categoria,
      materialId: material.id
    });
    setShowAddListaModal(true);
  };

  const handleManualAddToLista = (listaId: string) => {
    setSelectedListaId(listaId);
    setManualItemForm({ nome: '', quantidade: 1, undMedida: 'UN', categoria: 'OUTROS', materialId: undefined });
    setShowAddListaModal(true);
  };

  const handleSaveManualItem = () => {
    if (!manualItemForm.nome.trim() || !selectedListaId) return;

    const newItem: ItemListaCompras = {
      id: Math.random().toString(36).substring(2, 9),
      materialId: manualItemForm.materialId,
      nome: manualItemForm.nome.toUpperCase().trim(),
      categoria: manualItemForm.categoria.toUpperCase().trim() || 'OUTROS',
      undMedida: manualItemForm.undMedida.toUpperCase().trim() || 'UN',
      quantidade: manualItemForm.quantidade,
      concluido: false
    };

    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === selectedListaId) {
            return { ...l, itens: [...l.itens, newItem] };
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
    setShowAddListaModal(false);
  };

  const handleRemoveFromListaCompras = (listaId: string, itemId: string) => {
    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === listaId) {
            return { ...l, itens: l.itens.filter(i => i.id !== itemId) };
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
  };

  const handleNovaListaCompras = (data: { nome: string; dataCriacao: string; estabelecimento: string; local: string }) => {
    const novaLista: ListaDeCompras = {
       id: `lista_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
       nome: data.nome,
       estabelecimento: data.estabelecimento,
       local: data.local,
       dataCriacao: data.dataCriacao,
       arquivada: false,
       itens: []
    };
    
    setListasDeCompras(prev => {
       const next = [novaLista, ...prev];
       syncAndSave({ listasDeCompras: next });
       return next;
    });
    setSelectedListaId(novaLista.id);
  };

  const handleToggleConcluidoListaCompras = (listaId: string, itemId: string) => {
    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === listaId) {
            return { ...l, itens: l.itens.map(i => i.id === itemId ? { ...i, concluido: !i.concluido } : i) };
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
  };

  const handleChangeQuantidadeListaCompras = (listaId: string, itemId: string, qty: number) => {
    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === listaId) {
            return { ...l, itens: l.itens.map(i => i.id === itemId ? { ...i, quantidade: qty } : i) };
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
  };

  const handleChangeValorPagoListaCompras = (listaId: string, itemId: string, val: number) => {
    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === listaId) {
            return { ...l, itens: l.itens.map(i => i.id === itemId ? { ...i, valorPago: val } : i) }
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
  };

  const handleAddDataEstoque = () => {
    if (novaDataValue && !datasEstoque.includes(novaDataValue)) {
      const novaData = novaDataValue;
      const newDatasEstoque = [...datasEstoque, novaData];
      setDatasEstoque(newDatasEstoque);
      
      const latestData = datasEstoque[datasEstoque.length - 1];
      
      let newMateriais = materiais;
      setMateriais(prev => {
        newMateriais = prev.map(m => {
          const estoques = m.estoquesPorData || { '27/05': m.estoque };
          const val = estoques[latestData] ?? m.estoque;
          return {
            ...m,
            estoquesPorData: { ...estoques, [novaData]: val },
            estoque: val
          };
        });
        return newMateriais;
      });
      
      if (isDataLoaded) {
        syncAndSave({ datasEstoque: newDatasEstoque, materiais: newMateriais });
      }
    }
    setShowNovaDataPopup(false);
    setNovaDataValue('');
  };

  const handleRemoveDataEstoque = (dataToRemove: string) => {
    if (datasEstoque.length > 1) {
      const newDatas = datasEstoque.filter(dt => dt !== dataToRemove);
      setDatasEstoque(newDatas);
      syncAndSave({ datasEstoque: newDatas });
    }
  };

  // Cálculos de Previsão
  const previsaoContext = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    const latestEstoqueDataStr = datasEstoque[datasEstoque.length - 1];
    let latestEstoqueDate = new Date(hoje);
    if (latestEstoqueDataStr) {
       const [ed, em] = latestEstoqueDataStr.split('/').map(Number);
       if (!isNaN(ed) && !isNaN(em)) {
          let eYear = hoje.getFullYear();
          if (hoje.getMonth() === 0 && em === 12) eYear--;
          else if (hoje.getMonth() === 11 && em === 1) eYear++;
          latestEstoqueDate = new Date(eYear, em - 1, ed);
          latestEstoqueDate.setHours(0,0,0,0);
       }
    }
    
    const needsByMaterialId: Record<string, { inDays: Record<number, number>, hoje: number, total: number }> = {};
    
    materiais.forEach(m => {
      needsByMaterialId[m.id] = { inDays: {}, hoje: 0, total: 0 };
      previsaoDiasOptions.forEach(opt => needsByMaterialId[m.id].inDays[opt] = 0);
    });

    menus.forEach((menu: any) => {
      if (!menu.date) return;
      const parts = menu.date.split('/');
      if (parts.length < 2) return;
      const d = parseInt(parts[0]);
      const mo = parseInt(parts[1]);
      if (isNaN(d) || isNaN(mo)) return;
      
      let year = hoje.getFullYear();
      if (hoje.getMonth() === 0 && mo === 12) year--;
      else if (hoje.getMonth() === 11 && mo === 1) year++;
      
      const cDate = new Date(year, mo - 1, d);
      cDate.setHours(0,0,0,0);
      
      const isPast = cDate.getTime() <= latestEstoqueDate.getTime();
      const diffTime = cDate.getTime() - latestEstoqueDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      const diffTimeHoje = cDate.getTime() - hoje.getTime();
      const diffDaysHoje = Math.round(diffTimeHoje / (1000 * 60 * 60 * 24));
      
      const paxLocalCafe = menu.efetivoCafe || paxDefaults.cafe || 60;
      const paxLocalAlmoco = menu.efetivoAlmoco || paxDefaults.almoco || 60;
      const paxLocalJantar = menu.efetivoJantar || paxDefaults.jantar || 60;

      const itemsOfDay: { name: string, meal: 'CAFE' | 'ALMOCO' | 'JANTAR' }[] = [];
      const addDishes = (dishes: string, meal: 'CAFE' | 'ALMOCO' | 'JANTAR') => {
        if (!dishes || dishes === '-') return;
        dishes.split(',').forEach(dStr => {
           const trimmed = dStr.trim();
           if (trimmed) itemsOfDay.push({ name: trimmed, meal });
        });
      };
      
      if (menu.cafeManha) addDishes(menu.cafeManha, 'CAFE');
      if (menu.lancheTarde) addDishes(menu.lancheTarde, 'CAFE');

      if (menu.almoco) {
        if (menu.almoco.principal) itemsOfDay.push({ name: menu.almoco.principal.trim(), meal: 'ALMOCO' });
        addDishes(menu.almoco.acompanhamentos, 'ALMOCO');
        addDishes(menu.almoco.saladas, 'ALMOCO');
        if (menu.almoco.sobremesa && menu.almoco.sobremesa !== '-') itemsOfDay.push({ name: menu.almoco.sobremesa.trim(), meal: 'ALMOCO' });
      }
      
      if (menu.jantar) {
        if (menu.jantar.principal) itemsOfDay.push({ name: menu.jantar.principal.trim(), meal: 'JANTAR' });
        addDishes(menu.jantar.acompanhamentos, 'JANTAR');
        addDishes(menu.jantar.saladas, 'JANTAR');
        if (menu.jantar.ceia && menu.jantar.ceia !== '-') itemsOfDay.push({ name: menu.jantar.ceia.trim(), meal: 'JANTAR' });
      }
      
      itemsOfDay.forEach(item => {
         const gastoKey = Object.keys(gastosCatalogo).find(k => k.toLowerCase() === item.name.toLowerCase());
         const regrasGasto = gastoKey ? gastosCatalogo[gastoKey] : undefined;
         if (!regrasGasto) return;
         
         const dayOfWeek = cDate.getDay();
         const isFds = dayOfWeek === 0 || dayOfWeek === 6;
         
         const paxForMeal = item.meal === 'CAFE' ? paxLocalCafe : item.meal === 'ALMOCO' ? paxLocalAlmoco : paxLocalJantar;

         regrasGasto.forEach(gasto => {
            const mat = materiais.find(m => m.nome.toLowerCase() === gasto.nome.toLowerCase());
            if (!mat || !needsByMaterialId[mat.id]) return;

            let qtdCost = 0;
            const isEvento = menu.isEvento;
            const multiplier = isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
            
            const paxConfig = paxPratosCatalogo[gastoKey] || {};
            const standardPax = isEvento 
                ? (paxConfig.evento || paxDefaults.almoco || 60)
                : (isFds ? (paxConfig.fds || paxDefaults.almoco || 60) : (paxConfig.semana || paxDefaults.almoco || 60));
                
            qtdCost = (multiplier / standardPax) * paxForMeal;

            if (qtdCost > 0 && !isPast) {
              needsByMaterialId[mat.id].total += qtdCost;
              if (diffDaysHoje <= 0) needsByMaterialId[mat.id].hoje += qtdCost;
              previsaoDiasOptions.forEach(opt => {
                if (diffDays <= opt) {
                  needsByMaterialId[mat.id].inDays[opt] += qtdCost;
                }
              });
            }
         });
      });
    });

    const currentGastosGlobais = [
      ...(gastosCatalogo['Itens Alimentação'] || []),
      ...(gastosCatalogo['Itens Não Alimentares'] || [])
    ];

    const maxDays = previsaoDiasOptions.length > 0 ? Math.max(...previsaoDiasOptions) : 0;
    const maxDate = new Date(latestEstoqueDate.getTime() + maxDays * 24 * 60 * 60 * 1000);
    let simDate = new Date(latestEstoqueDate.getTime() + 24 * 60 * 60 * 1000);
    
    const failSafeDate = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);
    if (simDate < failSafeDate) simDate = failSafeDate;

    while (simDate <= maxDate) {
      const cDate = new Date(simDate);
      const isFds = cDate.getDay() === 0 || cDate.getDay() === 6;
      
      const diffTime = cDate.getTime() - latestEstoqueDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const diffTimeHoje = cDate.getTime() - hoje.getTime();
      const diffDaysHoje = Math.round(diffTimeHoje / (1000 * 60 * 60 * 24));

      const d = String(cDate.getDate()).padStart(2, '0');
      const m = String(cDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${d}/${m}`;
      
      const findMenu = menus.find((menu: any) => menu.date === dateStr);

      currentGastosGlobais.forEach(gasto => {
        const mat = materiais.find(m => m.nome.toLowerCase() === gasto.nome.toLowerCase());
        if (!mat || !needsByMaterialId[mat.id]) return;

        let qtdCost = 0;
        const multiplier = findMenu?.isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
        qtdCost = multiplier;

        if (qtdCost > 0) {
          needsByMaterialId[mat.id].total += qtdCost;
          if (diffDaysHoje <= 0) needsByMaterialId[mat.id].hoje += qtdCost;
          previsaoDiasOptions.forEach(opt => {
            if (diffDays <= opt) {
              needsByMaterialId[mat.id].inDays[opt] += qtdCost;
            }
          });
        }
      });
      
      simDate = new Date(simDate.getTime() + 24 * 60 * 60 * 1000);
    }

    return { needsByMaterialId, latestEstoqueDate };
  }, [menus, materiais, gastosCatalogo, previsaoDiasOptions, datasEstoque, paxDefaults, paxPratosCatalogo]);

  const calculoPrevisao = previsaoContext.needsByMaterialId;
  const latestEstoqueDate = previsaoContext.latestEstoqueDate;

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    setMateriais(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      syncAndSave({ materiais: next });
      return next;
    });
  };

  const handleAddCategoria = (novaCategoria: string) => {
    if (categoriasAbas.includes(novaCategoria)) return;
    setCategoriasAbas(prev => {
      const next = [...prev, novaCategoria];
      syncAndSave({ categoriasAbas: next });
      return next;
    });
  };

  const handleRenameCategoria = (oldName: string, newName: string) => {
    if (categoriasAbas.includes(newName)) return;
    
    setCategoriasAbas(prev => prev.map(c => c === oldName ? newName : c));
    setMateriais(prev => prev.map(m => m.categoria === oldName ? { ...m, categoria: newName } : m));
    
    if (filtroCategoria === oldName) setFiltroCategoria(newName);
    if (filtroCategoriaPrevisao === oldName) setFiltroCategoriaPrevisao(newName);
    
    syncAndSave({
      categoriasAbas: categoriasAbas.map(c => c === oldName ? newName : c),
      materiais: materiais.map(m => m.categoria === oldName ? { ...m, categoria: newName } : m)
    });
  };

  const handleDeleteCategoria = (nome: string) => {
    const temProdutos = materiais.some(m => m.categoria === nome);
    if (temProdutos) {
      alert('Existem produtos cadastrados nesta categoria. Mude-os de categoria ou exclua-os antes de deletar a categoria.');
      return;
    }
    setCategoriasAbas(prev => {
      const next = prev.filter(c => c !== nome);
      syncAndSave({ categoriasAbas: next });
      if (filtroCategoria === nome) setFiltroCategoria(next[0] || 'OUTROS');
      if (filtroCategoriaPrevisao === nome) setFiltroCategoriaPrevisao(next[0] || 'OUTROS');
      return next;
    });
  };

  const handleAddNewMaterial = () => {
    setShowNovoProdutoModal(true);
  };

  const handleSaveNewProduct = (nome: string, undMedida: string) => {
    const newMat: Material = {
      id: `mat_${Date.now()}`,
      nome,
      categoria: filtroCategoria,
      undMedida,
      tipoUso: 'imediato',
      estoque: 0,
      estoquesPorData: {},
      favorito: false
    };

    setMateriais(prev => {
      const next = [...prev, newMat];
      syncAndSave({ materiais: next });
      return next;
    });
  };

  const handleRemoveMaterial = (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente remover o material "${nome}"?`)) return;
    
    setMateriais(prev => {
      const next = prev.filter(m => m.id !== id);
      syncAndSave({ materiais: next });
      return next;
    });
  };

  const tabs = [
    { id: 'CADASTRO', label: 'Cadastro & Estoque', icon: Package },
    { id: 'RECEITAS', label: 'Planejamento Semanal', icon: ChefHat },
    { id: 'CATALOGO', label: 'Catálogo / Comp. de Pratos', icon: BookOpen },
    { id: 'CARDAPIO', label: 'Cardápio / Simulação', icon: CalendarDays },
    { id: 'PREVISAO', label: 'Listas e Previsão', icon: ClipboardList },
    { id: 'LISTA_COMPRAS', label: 'Lista de Compras', icon: ShoppingBag },
  ] as const;

  const materiaisFiltrados = useMemo(() => {
    return materiais.filter(m => 
      m.categoria === filtroCategoria &&
      (m.nome || '').toLowerCase().includes(cadastroFiltroMsg.toLowerCase())
    ).sort((a, b) => {
      if (a.favorito && !b.favorito) return -1;
      if (!a.favorito && b.favorito) return 1;
      return (a.nome || '').localeCompare(b.nome || '');
    });
  }, [materiais, filtroCategoria, cadastroFiltroMsg]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
              Aprovisionamento
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Integração Cardápio / Estoque
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 bg-slate-100/50 p-2 rounded-2xl border border-slate-200/60 shadow-inner">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300",
                isActive 
                  ? "bg-white text-amber-600 shadow-sm border border-slate-200 translate-y-[-1px]" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>
      
      {activeTab === 'RECEITAS' ? (
        <div className="-mt-8">
          <RefeitorioModule 
            key={activeTab}
            user={userProfile || { uid: '0', name: 'User', rank: 'SD', ala: '0', isAdmin: false }} 
            onBack={() => setActiveTab('CADASTRO')} 
            initialTab="cardapio"
          />
        </div>
      ) : activeTab === 'CATALOGO' ? (
        <div className="-mt-8">
          <AprovisionamentoCatalogo 
            user={userProfile || { uid: '0', name: 'User', rank: 'SD', ala: '0', isAdmin: false }} 
            materiais={materiais}
            paxDefaults={paxDefaults}
            onUpdatePaxDefaults={(newPaxDefaults) => {
              setPaxDefaults(newPaxDefaults);
              syncAndSave({ paxDefaults: newPaxDefaults });
            }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm min-h-[500px]">
          {activeTab === 'CADASTRO' && (
            <AprovisionamentoEstoqueTab 
              categoriasAbas={categoriasAbas}
              filtroCategoria={filtroCategoria}
              setFiltroCategoria={setFiltroCategoria}
              cadastroFiltroMsg={cadastroFiltroMsg}
              setCadastroFiltroMsg={setCadastroFiltroMsg}
              onOpenCategoriasModal={() => setShowGerenciarCategoriasModal(true)}
              onAddNewMaterial={handleAddNewMaterial}
              datasEstoque={datasEstoque}
              onRemoveDataEstoque={handleRemoveDataEstoque}
              showNovaDataPopup={showNovaDataPopup}
              setShowNovaDataPopup={setShowNovaDataPopup}
              novaDataValue={novaDataValue}
              setNovaDataValue={setNovaDataValue}
              onAddDataEstoque={handleAddDataEstoque}
              materiaisFiltrados={materiaisFiltrados}
              onUpdateMaterial={updateMaterial}
              onRemoveMaterial={handleRemoveMaterial}
            />
          )}

          {activeTab === 'CARDAPIO' && (
            <AprovisionamentoCardapioTab 
              paxDefaults={paxDefaults}
              onUpdatePaxDefaults={(newPax) => {
                setPaxDefaults(newPax);
                syncAndSave({ paxDefaults: newPax });
              }}
              isEditingMenu={isEditingMenu}
              setIsEditingMenu={setIsEditingMenu}
              editingMenuIndex={editingMenuIndex}
              setEditingMenuIndex={setEditingMenuIndex}
              filteredMenus={filteredMenus}
              menus={menus}
              gastosCatalogo={gastosCatalogo}
              paxPratosCatalogo={paxPratosCatalogo}
              materiais={materiais}
            />
          )}

          {activeTab === 'PREVISAO' && (
            <AprovisionamentoPrevisaoTab 
              previsaoDiasOptions={previsaoDiasOptions}
              setPrevisaoDiasOptions={setPrevisaoDiasOptions}
              newPrevisaoDiaStr={newPrevisaoDiaStr}
              setNewPrevisaoDiaStr={setNewPrevisaoDiaStr}
              mostrarTodosPrevisao={mostrarTodosPrevisao}
              setMostrarTodosPrevisao={setMostrarTodosPrevisao}
              categoriasAbas={categoriasAbas}
              filtroCategoriaPrevisao={filtroCategoriaPrevisao}
              setFiltroCategoriaPrevisao={setFiltroCategoriaPrevisao}
              materiais={materiais}
              calculoPrevisao={calculoPrevisao}
              datasEstoque={datasEstoque}
              latestEstoqueDate={latestEstoqueDate}
              listasDeCompras={listasDeCompras}
              onPromptAddToListaCompras={promptAddToListaCompras}
              onSyncAndSave={syncAndSave}
            />
          )}

          {activeTab === 'LISTA_COMPRAS' && (
            <AprovisionamentoListaComprasTab 
              listasDeCompras={listasDeCompras}
              onOpenNovaListaModal={() => setShowNovaListaModal(true)}
              expandedListaId={expandedListaId}
              setExpandedListaId={setExpandedListaId}
              onArchiveLista={(listaId) => {
                setListasDeCompras(prev => {
                  const next = prev.map(l => l.id === listaId ? { ...l, arquivada: true } : l);
                  syncAndSave({ listasDeCompras: next });
                  return next;
                });
              }}
              onManualAddToLista={handleManualAddToLista}
              onToggleConcluido={handleToggleConcluidoListaCompras}
              onRemoveItem={handleRemoveFromListaCompras}
              onChangeQuantidade={handleChangeQuantidadeListaCompras}
              onChangeValorPago={handleChangeValorPagoListaCompras}
              showArquivadas={showArquivadas}
              setShowArquivadas={setShowArquivadas}
            />
          )}
        </div>
      )}

      {/* Modais Extraídos */}
      <AprovisionamentoAddItemModal 
        isOpen={showAddListaModal}
        onClose={() => setShowAddListaModal(false)}
        listasDeCompras={listasDeCompras}
        selectedListaId={selectedListaId}
        onSelectListaId={setSelectedListaId}
        manualItemForm={manualItemForm}
        setManualItemForm={setManualItemForm}
        materiais={materiais}
        onSave={handleSaveManualItem}
        onOpenNovaListaModal={() => setShowNovaListaModal(true)}
      />

      <AprovisionamentoGerenciarCategoriasModal
        isOpen={showGerenciarCategoriasModal}
        onClose={() => setShowGerenciarCategoriasModal(false)}
        categorias={categoriasAbas}
        materiais={materiais}
        onAddCategoria={handleAddCategoria}
        onRenameCategoria={handleRenameCategoria}
        onDeleteCategoria={handleDeleteCategoria}
      />

      <AprovisionamentoNovoProdutoModal 
        isOpen={showNovoProdutoModal}
        onClose={() => setShowNovoProdutoModal(false)}
        filtroCategoria={filtroCategoria}
        onSave={handleSaveNewProduct}
      />

      <AprovisionamentoNovaListaModal 
        isOpen={showNovaListaModal}
        onClose={() => setShowNovaListaModal(false)}
        onSave={handleNovaListaCompras}
      />
    </div>
  );
}
export default AprovisionamentoModule;
