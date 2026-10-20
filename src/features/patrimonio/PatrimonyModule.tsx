import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  ArrowLeft,
  Search,
  ChevronRight,
  Box,
  Edit2,
  Check,
  X,
  ShieldCheck,
  Settings,
  QrCode,
  Table,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Calendar,
  MoveRight,
} from "lucide-react";
import { UserProfile } from "../../types";
import { useMilitars } from "../../contexts/MilitarContext";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, setDoc, collection, deleteDoc } from "firebase/firestore";
import { safeSaveDocument } from "../../lib/apiClient";
import { RankInsignia } from "../../components/RankInsignia";
import { PatrimonyConfigPanel } from "../../components/PatrimonyConfigPanel";
import { cleanUndefined, normalizeRg } from "../../lib/utils";

import { PatrimonioItem, PatrimonioSection, PatrimonyModuleProps } from "./types";
import { PatrimonyQrModal } from "./components/PatrimonyQrModal";
import { PatrimonyNewSectorModal } from "./components/PatrimonyNewSectorModal";
import { PatrimonyTransferModal } from "./components/PatrimonyTransferModal";
import { PatrimonySpreadsheetView } from "./components/PatrimonySpreadsheetView";
import { PatrimonySignaturesSection } from "./components/PatrimonySignaturesSection";

const patrimonioData: PatrimonioSection[] = [];

export function PatrimonyModule({
  user,
  adminModeActive,
  onToggleAdminMode,
  obmContext,
  onBack,
}: PatrimonyModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] =
    useState<PatrimonioSection | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // States for Dynamic Sector Creation
  const [customSectors, setCustomSectors] = useState<PatrimonioSection[]>([]);
  const [showNewSectorModal, setShowNewSectorModal] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [newSectorObm, setNewSectorObm] = useState("");
  const [newSectorDate, setNewSectorDate] = useState("");
  const [newSectorResponsible, setNewSectorResponsible] = useState("");

  const [editingItem, setEditingItem] = useState<PatrimonioItem | null>(null);
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PatrimonioItem>>({ quantidade: 1, situacao: 'Operante', estado: 'Novo' });

  // Load custom sectors in real-time
  useEffect(() => {
    if (!db) return;
    const unsubCustom = onSnapshot(
      collection(db, "customSectors"),
      (snap) => {
        const list: PatrimonioSection[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            nome: d.nome || "",
            obm: d.obm || "10º",
            itens: d.itens || [],
            insertedAt: d.insertedAt || "",
            insertedBy: d.insertedBy || "",
          });
        });
        setCustomSectors(list);
      },
      (err) => {
        console.error("Error loading custom sectors:", err);
      }
    );
    return () => unsubCustom();
  }, []);

  // Helper to normalize OBM strings into filter options
  const normalizeForFilter = (obmStr: string | undefined): string => {
    if (!obmStr) return "10º";
    const u = obmStr.toUpperCase().trim();
    if (u === "10º GBM" || u === "10ºGBM" || u === "10" || u === "10º") return "10º";
    if (u === "26º GBM" || u === "26ºGBM" || u === "26" || u === "26º") return "26º";
    return obmStr;
  };

  // Selected OBM filter state representing the subunit
  const [selectedObmFilter, setSelectedObmFilter] = useState<string>(() => {
    return normalizeForFilter(obmContext || user.obm);
  });

  useEffect(() => {
    if (obmContext) {
      setSelectedObmFilter(normalizeForFilter(obmContext));
    }
  }, [obmContext]);

  // Deselect if switching OBM makes the selection invalid
  useEffect(() => {
    if (selectedSection) {
      const sectionObm = selectedSection.obm || "10º";
      if (sectionObm !== selectedObmFilter) {
        setSelectedSection(null);
      }
    }
  }, [selectedObmFilter, selectedSection]);

  // Custom states for spreadsheet mode and QR codes
  const [customSectionItems, setCustomSectionItems] = useState<Record<string, PatrimonioItem[]>>({});
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [columnMappings, setColumnMappings] = useState<number[]>([0, 1, 2]); // [id, description, quantity]
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [ignoreFirstRow, setIgnoreFirstRow] = useState(true);

  const { militars } = useMilitars();
  const [globalConfig, setGlobalConfig] = useState<{
    comandanteId?: string;
    patrimonioId?: string;
    auxPatrimonioId?: string;
  }>({});

  const [configData, setConfigData] = useState<{
    responsavelId?: string;
    auxSetorId?: string;
  }>({});

  const [signatures, setSignatures] = useState<{
    setor?: { timestamp: string; rg: string };
    auxSetor?: { timestamp: string; rg: string };
    patrimonio?: { timestamp: string; rg: string };
    auxPatrimonio?: { timestamp: string; rg: string };
    comandante?: { timestamp: string; rg: string };
  }>({});

  // Global config listener
  useEffect(() => {
    if (!db) return;
    const unsubGlobal = onSnapshot(
      doc(db, "patrimonioConfig", "global"),
      (snap) => {
        if (snap.exists()) setGlobalConfig(snap.data() as any);
        else setGlobalConfig({});
      },
    );
    return () => unsubGlobal();
  }, []);

  // Real-time listener for current section config
  useEffect(() => {
    if (!selectedSection || !db) {
      setConfigData({});
      setSignatures({});
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "patrimonioConfig", selectedSection.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfigData({
            responsavelId: data.responsavelId || "",
            auxSetorId: data.auxSetorId || "",
          });
          setSignatures({
            setor: data.signatureSetor,
            auxSetor: data.signatureAuxSetor,
            patrimonio: data.signaturePatrimonio,
            auxPatrimonio: data.signatureAuxPatrimonio,
            comandante: data.signatureComandante,
          });
        } else {
          setConfigData({});
          setSignatures({});
        }
      },
      (err) => {
        console.error("Error fetching section config:", err);
      },
    );

    return () => unsubscribe();
  }, [selectedSection]);

  // Load query param on mount to select section
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sectionId = params.get("section");
    if (sectionId) {
      const found = patrimonioData.find((s) => s.id === sectionId);
      if (found) {
        setSelectedSection(found);
      }
    }
  }, []);

  // Real-time listener for ALL custom items
  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(
      collection(db, "patrimonioData"),
      (querySnapshot) => {
        const newData: Record<string, PatrimonioItem[]> = {};
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && Array.isArray(data.items)) {
            newData[docSnap.id] = data.items;
          }
        });
        setCustomSectionItems(newData);
      },
      (err) => {
        console.error("Error fetching custom section items:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time parsing of pasted spreadsheet text
  useEffect(() => {
    if (!pastedText.trim()) {
      setParsedRows([]);
      return;
    }
    const lines = pastedText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const rows = lines.map(line => line.split('\t').map(c => c.trim()));
    setParsedRows(rows);

    // Smart guessing of columns
    if (rows.length > 0) {
      const sampleRowIndex = (rows.length > 1 && ignoreFirstRow) ? 1 : 0;
      const firstRow = rows[sampleRowIndex];
      
      let guessedIdIdx = 0;
      let guessedDescIdx = 1;
      let guessedQtyIdx = 2;

      if (firstRow) {
        const colTypes = firstRow.map(val => {
          if (!val) return 'empty';
          const num = Number(val.replace(/\./g, '').replace(/,/g, '').trim());
          if (!isNaN(num) && num < 1000) return 'number';
          if (val.length > 25) return 'text-long';
          return 'text-short';
        });

        if (firstRow.length === 1) {
          guessedIdIdx = -1;
          guessedDescIdx = 0;
          guessedQtyIdx = -1;
        } else if (firstRow.length === 2) {
          if (colTypes[1] === 'number') {
            guessedIdIdx = -1;
            guessedDescIdx = 0;
            guessedQtyIdx = 1;
          } else {
            guessedIdIdx = 0;
            guessedDescIdx = 1;
            guessedQtyIdx = -1;
          }
        } else {
          let maxLen = -1;
          let bestDescIdx = 1;
          firstRow.forEach((val, idx) => {
            if (val.length > maxLen) {
              maxLen = val.length;
              bestDescIdx = idx;
            }
          });
          guessedDescIdx = bestDescIdx;

          const numIdxs = colTypes.map((t, idx) => t === 'number' ? idx : -1).filter(idx => idx !== -1 && idx !== bestDescIdx);
          if (numIdxs.length > 0) {
            guessedQtyIdx = numIdxs[numIdxs.length - 1];
          } else {
            guessedQtyIdx = -1;
          }

          const remainIdxs = Array.from({ length: firstRow.length }, (_, i) => i)
            .filter(i => i !== guessedDescIdx && i !== guessedQtyIdx);
          if (remainIdxs.length > 0) {
            guessedIdIdx = remainIdxs[0];
          } else {
            guessedIdIdx = -1;
          }
        }
      }
      setColumnMappings([guessedIdIdx, guessedDescIdx, guessedQtyIdx]);
    }
  }, [pastedText, ignoreFirstRow]);

  const getSectionItems = (section: PatrimonioSection) => {
    return customSectionItems[section.id] || section.itens || [];
  };

  const getFinalParsedItems = (): PatrimonioItem[] => {
    const startIndex = ignoreFirstRow ? 1 : 0;
    if (parsedRows.length <= startIndex) return [];

    const [idCol, descCol, qtyCol] = columnMappings;

    return parsedRows.slice(startIndex).map((row, idx) => {
      let id = "";
      if (idCol !== -1 && row[idCol]) {
        id = row[idCol];
      } else {
        id = String(idx + 1).padStart(2, "0");
      }

      let descricao = "";
      if (descCol !== -1 && row[descCol]) {
        descricao = row[descCol];
      } else {
        descricao = "Item sem descrição";
      }

      let quantidade: string | number = 1;
      if (qtyCol !== -1 && row[qtyCol]) {
        const parsedQty = parseInt(row[qtyCol].replace(/\D/g, ""), 10);
        quantidade = isNaN(parsedQty) ? 1 : parsedQty;
      }

      return { id, descricao, quantidade };
    });
  };

  const handleSaveSpreadsheetData = async () => {
    if (!selectedSection || !db) return;
    const updatedItems = getFinalParsedItems();
    if (updatedItems.length === 0) {
      alert("Nenhum item válido para salvar. Verifique sua colagem!");
      return;
    }
    
    try {
      await safeSaveDocument("patrimonioData", selectedSection.id, cleanUndefined({
              items: updatedItems,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), true);
      setIsSpreadsheetMode(false);
      setPastedText("");
    } catch (err) {
      console.error("Failed to save spreadsheet data:", err);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedSection || !db) return;
    if (confirm("Confirmar a exclusão dos dados personalizados para retornar aos itens padrões originais?")) {
      try {
        await safeSaveDocument("patrimonioData", selectedSection.id, cleanUndefined({
                  items: null,
                  updatedAt: new Date().toISOString(),
                  updatedBy: user.warName || user.name
                }), true);
        
        setCustomSectionItems(prev => {
          const updated = { ...prev };
          delete updated[selectedSection.id];
          return updated;
        });
        setIsSpreadsheetMode(false);
        setPastedText("");
      } catch (err) {
        console.error("Failed to reset:", err);
      }
    }
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName.trim()) {
      alert("Por favor, insira o nome do setor.");
      return;
    }
    if (!db) return;

    try {
      const sectorId = "custom_" + Date.now();
      
      let finalDate = new Date().toISOString();
      try {
        if (newSectorDate) finalDate = new Date(newSectorDate).toISOString();
      } catch (e) {
        // use current date if invalid
      }
      
      const sectorData = {
        id: sectorId,
        nome: newSectorName.toUpperCase().trim(),
        obm: newSectorObm || selectedObmFilter || "10º",
        itens: [],
        insertedAt: finalDate,
        insertedBy: user.warName || user.name,
      };

      await safeSaveDocument("customSectors", sectorId, cleanUndefined(sectorData), true);
      
      // Also initialize empty data
      await safeSaveDocument("patrimonioData", sectorId, cleanUndefined({
              items: [],
              updatedAt: finalDate,
              updatedBy: user.warName || user.name
            }), true);

      // If a responsible is selected, set it in config immediately
      if (newSectorResponsible) {
        await safeSaveDocument("patrimonioConfig", sectorId, cleanUndefined({
                  responsavelId: newSectorResponsible,
                  auxSetorId: "",
                }), true);
      }

      setNewSectorName("");
      setNewSectorResponsible("");
      setNewSectorDate("");
      setShowNewSectorModal(false);

      // Select newly created sector
      setSelectedSection({
        id: sectorId,
        nome: sectorData.nome,
        obm: sectorData.obm,
        itens: [],
        insertedAt: sectorData.insertedAt,
        insertedBy: sectorData.insertedBy
      });
    } catch (err) {
      console.error("Erro ao criar o setor:", err);
      alert("Houve um erro ao salvar o novo setor.");
    }
  };

  const handleDeleteCustomSector = async (sector: PatrimonioSection) => {
    if (!db) return;
    if (!confirm(`Deseja realmente excluir permanentemente o setor "${sector.nome}" e todos os seus itens?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "customSectors", sector.id));
      await deleteDoc(doc(db, "patrimonioConfig", sector.id));
      await deleteDoc(doc(db, "patrimonioData", sector.id));
      setSelectedSection(null);
    } catch (err) {
      console.error("Erro ao excluir o setor:", err);
      alert("Erro ao excluir o setor.");
    }
  };

  const handleDeleteItem = async (itemId: string, evt: React.MouseEvent) => {
    evt.stopPropagation();
    if (!selectedSection || !db) return;
    if (!confirm(`Deseja realmente excluir este item?`)) return;

    try {
      const items = [...getSectionItems(selectedSection)];
      const updatedItems = items.filter(i => i.id !== itemId);
      
      await safeSaveDocument("patrimonioData", selectedSection.id, cleanUndefined({
              items: updatedItems,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), true);
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert("Erro ao excluir o item.");
    }
  };

  const handleItemDropdownChange = async (itemId: string, field: 'situacao' | 'estado', value: string) => {
    if (!selectedSection || !db) return;

    try {
      const items = [...getSectionItems(selectedSection)];
      const index = items.findIndex((i) => i.id === itemId);

      if (index === -1) return;

      items[index] = { ...items[index], [field]: value };

      await safeSaveDocument(
        "patrimonioData",
        selectedSection.id,
        cleanUndefined({
          items: items,
          updatedAt: new Date().toISOString(),
          updatedBy: user.warName || user.name,
        }),
        true,
      );

      setCustomSectionItems((prev) => ({
        ...prev,
        [selectedSection.id]: items,
      }));
    } catch (err) {
      console.error(`Failed to update item ${field}:`, err);
      alert("Erro ao atualizar o item.");
    }
  };

  const [transferItemData, setTransferItemData] = useState<{ itemId: string, currentSectionId: string } | null>(null);

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !db || !newItem.id || !newItem.descricao) return;

    try {
      const items = [...getSectionItems(selectedSection)];
      if (items.some((i) => i.id === newItem.id)) {
        alert("Já existe um item com este ID / BP nesta seção.");
        return;
      }

      const itemToAdd: PatrimonioItem = {
        id: newItem.id!,
        descricao: newItem.descricao!,
        quantidade: newItem.quantidade || 1,
        situacao: newItem.situacao || 'Operante',
        estado: newItem.estado || 'Novo'
      };

      items.push(itemToAdd);

      await safeSaveDocument("patrimonioData", selectedSection.id, cleanUndefined({
              items: items,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), true);

      setIsAddingItem(false);
      setNewItem({ quantidade: 1, situacao: 'Operante', estado: 'Novo' });
    } catch (err) {
      console.error("Failed to add new item:", err);
      alert("Erro ao adicionar o item.");
    }
  };

  const executeTransfer = async (targetSectionId: string) => {
    if (!transferItemData || !db || !selectedSection) return;
    
    try {
      const currentItems = [...getSectionItems(selectedSection)];
      const index = currentItems.findIndex(i => i.id === transferItemData.itemId);
      if (index === -1) return;
      
      const itemToTransfer = currentItems[index];
      currentItems.splice(index, 1);
      
      await safeSaveDocument("patrimonioData", selectedSection.id, cleanUndefined({
              items: currentItems,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), true);

      let targetItems: PatrimonioItem[] = [];
      const targetSection = [...patrimonioData, ...customSectors].find(s => s.id === targetSectionId);
      
      if (targetSectionId.startsWith('custom_') || targetSectionId.startsWith('destacamento_')) {
         targetItems = customSectionItems[targetSectionId] || [];
      } else {
         targetItems = targetSection ? (targetSection.itens as PatrimonioItem[]) : [];
         if (customSectionItems[targetSectionId]) {
             targetItems = customSectionItems[targetSectionId];
         }
      }

      const newTargetItems = [...targetItems, { ...itemToTransfer }];

      await safeSaveDocument("patrimonioData", targetSectionId, cleanUndefined({
              items: newTargetItems,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), true);

      setTransferItemData(null);
      alert("Item transferido com sucesso!");
    } catch (err) {
      console.error("Failed to transfer item:", err);
      alert("Erro ao transferir o item.");
    }
  };

  const handleSaveItemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !db || !editingItem || !editingOriginalId) return;

    try {
      const items = [...getSectionItems(selectedSection)];
      const index = items.findIndex(i => i.id === editingOriginalId);
      
      if (index !== -1) {
        items[index] = { ...editingItem };
      } else {
        alert("Item original não encontrado.");
        return;
      }

      await safeSaveDocument("patrimonioData", selectedSection.id, cleanUndefined({
              items: items,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), true);

      setEditingItem(null);
      setEditingOriginalId(null);
    } catch (err) {
      console.error("Failed to save item edit:", err);
      alert("Erro ao salvar a edição do item.");
    }
  };

  const handleSign = async (role: string) => {
    if (!selectedSection || !db) return;
    try {
      const signatureData = {
        timestamp: new Date().toISOString(),
        rg: user.rg,
      };

      const fieldName =
        role === "setor"
          ? "signatureSetor"
          : role === "auxSetor"
            ? "signatureAuxSetor"
            : role === "patrimonio"
              ? "signaturePatrimonio"
              : role === "auxPatrimonio"
                ? "signatureAuxPatrimonio"
                : "signatureComandante";

      await safeSaveDocument(
        "patrimonioConfig",
        selectedSection.id,
        cleanUndefined({
          [fieldName]: signatureData,
        }),
        true,
      );
    } catch (e) {
      console.error("Failed to sign:", e);
    }
  };

  const handleRemoveSign = async (role: string) => {
    if (!selectedSection || !db) return;
    try {
      const fieldName =
        role === "setor"
          ? "signatureSetor"
          : role === "auxSetor"
            ? "signatureAuxSetor"
            : role === "patrimonio"
              ? "signaturePatrimonio"
              : role === "auxPatrimonio"
                ? "signatureAuxPatrimonio"
                : "signatureComandante";

      await safeSaveDocument(
        "patrimonioConfig",
        selectedSection.id,
        cleanUndefined({
          [fieldName]: null,
        }),
        true,
      );
    } catch (e) {
      console.error("Failed to remove sign:", e);
    }
  };

  const responsavel = militars.find((m) => m.rg === configData.responsavelId);
  const comandante = globalConfig.comandanteId
    ? militars.find((m) => m.rg === globalConfig.comandanteId)
    : militars.find((m) => m.rg === "19187");
  const patrimonio = globalConfig.patrimonioId
    ? militars.find((m) => m.rg === globalConfig.patrimonioId)
    : militars.find((m) => m.rg === "49075");
  const auxSetor = configData.auxSetorId
    ? militars.find((m) => m.rg === configData.auxSetorId)
    : null;
  const auxPatrimonio = globalConfig.auxPatrimonioId
    ? militars.find((m) => m.rg === globalConfig.auxPatrimonioId)
    : null;

  const canSignSetor =
    configData.responsavelId &&
    normalizeRg(user.rg) === normalizeRg(configData.responsavelId);
  const canSignAuxSetor =
    configData.auxSetorId &&
    normalizeRg(user.rg) === normalizeRg(configData.auxSetorId);
  const canSignPatrimonio =
    (globalConfig.patrimonioId &&
      normalizeRg(user.rg) === normalizeRg(globalConfig.patrimonioId)) ||
    (!globalConfig.patrimonioId && normalizeRg(user.rg) === "49075");
  const canSignAuxPatrimonio =
    globalConfig.auxPatrimonioId &&
    normalizeRg(user.rg) === normalizeRg(globalConfig.auxPatrimonioId);
  const canSignComandante =
    (globalConfig.comandanteId &&
      normalizeRg(user.rg) === normalizeRg(globalConfig.comandanteId)) ||
    (!globalConfig.comandanteId && normalizeRg(user.rg) === "19187");

  const canEditItems = adminModeActive || canSignSetor || canSignAuxSetor || canSignPatrimonio || canSignAuxPatrimonio;
  const canTransferItems = adminModeActive || canSignPatrimonio || canSignAuxPatrimonio;

  const allSections = useMemo(() => [...patrimonioData, ...customSectors], [customSectors]);

  const filteredSections = useMemo(() => {
    return allSections.filter((section) => {
      const sectionObm = section.obm || "10º";
      if (sectionObm !== selectedObmFilter) return false;
      
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      const sectionMatch = (section.nome || '').toLowerCase().includes(searchLower);
      const itemMatch = getSectionItems(section).some(
        (item) =>
          (item.descricao || '').toLowerCase().includes(searchLower) ||
          (item.id || '').includes(searchLower),
      );

      return sectionMatch || itemMatch;
    });
  }, [allSections, selectedObmFilter, searchTerm, customSectionItems]);

  const currentTransferItem = useMemo(() => {
    if (!transferItemData || !selectedSection) return null;
    return getSectionItems(selectedSection).find(i => i.id === transferItemData.itemId) || null;
  }, [transferItemData, selectedSection, customSectionItems]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full h-auto pb-12 pt-10">
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar ao Portal Principal
          </button>
          {isSidebarMinimized && (
            <button
              onClick={() => setIsSidebarMinimized(false)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-xs hover:bg-cyan-100 text-[10px] font-black uppercase tracking-widest transition-all duration-300 animate-pulse"
              title="Expandir Menu de Seções"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-cyan-600 animate-bounce" />
              <span>Ver Menu de Seções</span>
            </button>
          )}
        </div>
        {user.isAdmin && (
          <div className="flex items-center gap-3">
            {adminModeActive && (
              <button
                onClick={() => setShowConfigPanel(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm hover:bg-cyan-100 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Settings className="w-4 h-4" />
                Configurar Setores
              </button>
            )}
            <button
              onClick={onToggleAdminMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                adminModeActive
                  ? "bg-amber-100 border-amber-200 text-amber-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {adminModeActive
                ? "Modo Administrador: ON"
                : "Ativar Modo Administrador"}
            </button>
          </div>
        )}
      </div>

      {showConfigPanel ? (
        <PatrimonyConfigPanel onBack={() => setShowConfigPanel(false)} />
      ) : (
        <div className="flex flex-col md:flex-row gap-6 h-auto">
          {/* Sidebar with sections */}
          <div
            className={`bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-fit transition-all duration-300 ${
              isSidebarMinimized
                ? "w-0 overflow-hidden opacity-0 border-none scale-95 pointer-events-none"
                : "w-full md:w-[320px] lg:w-[360px] shrink-0"
            }`}
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Carga
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Bens Patrimoniais
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarMinimized(true)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-cyan-600"
                  title="Minimizar Menu"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>

              {/* OBM Selection Panel */}
              <div className="mb-4 bg-slate-50 border border-slate-200/50 rounded-2xl p-3 flex flex-col gap-2 shrink-0">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                  Selecione a Subunidade (OBM)
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  {['10º', '1/10', '2/10', '3/10', '4/10', '26º', '1/26'].map(obmId => {
                    const isActive = selectedObmFilter === obmId;
                    const isUserObm = normalizeForFilter(user.obm) === obmId;
                    return (
                      <button
                        key={obmId}
                        type="button"
                        onClick={() => setSelectedObmFilter(obmId)}
                        className={`py-1.5 px-0.5 rounded-lg text-center relative transition-all ${
                          isActive
                            ? "bg-cyan-600 text-white font-bold text-xs shadow-sm shadow-cyan-600/10"
                            : "hover:bg-slate-100 text-slate-500 text-xs font-semibold"
                        }`}
                        title={
                          obmId === '10º' ? '10º GBM Sede (Angra dos Reis)' :
                          obmId === '1/10' ? 'DBM 1/10 (Itaguaí)' :
                          obmId === '2/10' ? 'DBM 2/10 (Ilha Grande)' :
                          obmId === '3/10' ? 'DBM 3/10 (Frade)' :
                          obmId === '4/10' ? 'DBM 4/10 (Mangaratiba)' :
                          obmId === '26º' ? '26º GBM Sede (Paraty)' :
                          'DBM 1/26 (Parque Mambucaba)'
                        }
                      >
                        <span className="block">{obmId}</span>
                        {isUserObm && (
                          <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-300' : 'bg-cyan-500'}`} title="Sua OBM cadastrada" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5 px-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">
                    {selectedObmFilter === '10º' ? '10º GBM - Sede (Angra dos Reis)' :
                     selectedObmFilter === '1/10' ? '1/10 - DBM (Itaguaí)' :
                     selectedObmFilter === '2/10' ? '2/10 - DBM (Ilha Grande)' :
                     selectedObmFilter === '3/10' ? '3/10 - DBM (Frade)' :
                     selectedObmFilter === '4/10' ? '4/10 - DBM (Mangaratiba)' :
                     selectedObmFilter === '26º' ? '26º GBM - Sede (Paraty)' :
                     '1/26 - DBM (Parque Mambucaba)'}
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar seções ou itens..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-slate-600 placeholder-slate-400 font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Botão de Cadastrar Novo Setor */}
              <button
                type="button"
                onClick={() => {
                  setNewSectorName("");
                  setNewSectorObm(selectedObmFilter);
                  const now = new Date();
                  const offset = now.getTimezoneOffset();
                  const localNow = new Date(now.getTime() - (offset * 60 * 1000));
                  setNewSectorDate(localNow.toISOString().substring(0, 16));
                  setNewSectorResponsible("");
                  setShowNewSectorModal(true);
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all duration-300 shadow-sm shadow-emerald-600/10 hover:shadow-md hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Setor / Seção</span>
              </button>
            </div>

            <div className="w-full p-3 space-y-1">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    selectedSection?.id === section.id
                      ? "bg-cyan-50 border border-cyan-100 text-cyan-700"
                      : "bg-white hover:bg-slate-50 border border-transparent text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedSection?.id === section.id
                          ? "bg-cyan-100 text-cyan-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Box className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{section.nome}</div>
                      <div className="text-[10px] uppercase font-black tracking-wider opacity-60">
                        {getSectionItems(section).length}{" "}
                        {getSectionItems(section).length === 1 ? "item" : "itens"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 ${
                      selectedSection?.id === section.id
                        ? "text-cyan-500"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}

              {filteredSections.length === 0 && (
                <div className="text-center py-10 px-4 text-slate-500 text-sm">
                  Nenhuma seção ou item encontrado.
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-auto">
            {selectedSection ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedSection.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col h-auto"
                >
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1">
                          {selectedSection.nome}
                        </h3>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">
                          Relação de Carga Fixa
                        </p>
                        {selectedSection.insertedAt && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-bold bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 w-fit select-none">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              CADASTRADO EM: {new Date(selectedSection.insertedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            {selectedSection.insertedBy && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-400 uppercase">
                                  POR: {selectedSection.insertedBy}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {selectedSection.id.startsWith("custom_") && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomSector(selectedSection)}
                            className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-250 text-rose-700 hover:text-white hover:bg-rose-600 hover:border-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xs shrink-0"
                            title="Excluir este setor e todos os seus itens"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 currentColor-on-hover" />
                            <span>Excluir Setor</span>
                          </button>
                        )}

                        <button
                          onClick={() => setShowQrModal(true)}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0"
                          title="Gerar QR Code de identificação para esta seção"
                        >
                          <QrCode className="w-4 h-4 text-cyan-500" />
                          <span>QR Code do Setor</span>
                        </button>
                        
                        {canEditItems && (
                          <button
                            onClick={() => setIsSpreadsheetMode(!isSpreadsheetMode)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0 ${
                              isSpreadsheetMode
                                ? "bg-amber-100 border-amber-200 text-amber-800 hover:bg-amber-200"
                                : "bg-white border-slate-200 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200"
                            }`}
                          >
                            <Table className={`w-4 h-4 ${isSpreadsheetMode ? 'text-amber-600' : 'text-slate-400'}`} />
                            <span>{isSpreadsheetMode ? "Ver Carga" : "Modo Planilha"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start sm:items-center gap-4 mt-4">
                      {responsavel ? (
                        <>
                          <div className="min-w-[48px] px-2 min-h-[40px] py-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <RankInsignia
                              rankStr={responsavel.rank}
                              className="origin-center"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              Responsável pelo Setor
                            </p>
                            <p className="text-sm font-bold text-slate-700 truncate">
                              {responsavel.rank}{" "}
                              {responsavel.warName || responsavel.name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">
                              RG: {responsavel.rg}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <Box className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              Responsável pelo Setor
                            </p>
                            <p className="text-sm font-bold text-slate-400 italic">
                              Nenhum responsável designado
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {isSpreadsheetMode ? (
                      <PatrimonySpreadsheetView 
                        selectedSectionId={selectedSection.id}
                        isCustomSection={Boolean(customSectionItems[selectedSection.id])}
                        pastedText={pastedText}
                        setPastedText={setPastedText}
                        parsedRows={parsedRows}
                        ignoreFirstRow={ignoreFirstRow}
                        setIgnoreFirstRow={setIgnoreFirstRow}
                        columnMappings={columnMappings}
                        setColumnMappings={setColumnMappings}
                        getFinalParsedItems={getFinalParsedItems}
                        onResetToDefault={handleResetToDefault}
                        onSaveSpreadsheetData={handleSaveSpreadsheetData}
                        onCancel={() => {
                          setIsSpreadsheetMode(false);
                          setPastedText("");
                        }}
                      />
                    ) : (
                      <div className="grid gap-3">
                        {canEditItems && !isAddingItem && (
                          <div className="flex justify-end mb-1">
                            <button
                              onClick={() => setIsAddingItem(true)}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" /> Novo Item
                            </button>
                          </div>
                        )}
                        
                        {isAddingItem && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-cyan-50 border border-cyan-200 p-4 rounded-xl mb-2"
                          >
                            <form onSubmit={handleSaveNewItem} className="flex-1 flex flex-col sm:flex-row gap-3">
                              <div className="w-20 shrink-0">
                                <label className="text-[9px] font-black uppercase text-cyan-700 tracking-widest block mb-1">ID / BP</label>
                                <input 
                                  className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  value={newItem.id || ''}
                                  onChange={(e) => setNewItem(prev => ({ ...prev, id: e.target.value }))}
                                  placeholder="ID"
                                  required
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[9px] font-black uppercase text-cyan-700 tracking-widest block mb-1">Descrição do Item</label>
                                <input 
                                  className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  value={newItem.descricao || ''}
                                  onChange={(e) => setNewItem(prev => ({ ...prev, descricao: e.target.value }))}
                                  placeholder="Descrição detalhada"
                                  required
                                />
                              </div>
                              <div className="w-20 shrink-0">
                                <label className="text-[9px] font-black uppercase text-cyan-700 tracking-widest block mb-1">QTD</label>
                                <input 
                                  type="number"
                                  min="1"
                                  className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center"
                                  value={newItem.quantidade || 1}
                                  onChange={(e) => setNewItem(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                                  required
                                />
                              </div>
                              <div className="flex items-end gap-1 pb-0.5 shrink-0">
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 bg-cyan-600 text-white hover:bg-cyan-700 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center shadow-sm"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setIsAddingItem(false); setNewItem({ quantidade: 1, situacao: 'Operante', estado: 'Novo' }); }}
                                  className="px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center shadow-sm"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}
                        
                        {getSectionItems(selectedSection)
                        .filter(
                          (item) =>
                            !searchTerm ||
                            (item.descricao || '')
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            (item.id || '').includes(searchTerm.toLowerCase()),
                        )
                        .map((item, index) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            key={`${item.id}-${index}`}
                            className="bg-white border border-slate-100 p-4 rounded-xl flex gap-4 hover:border-cyan-100 hover:shadow-md hover:shadow-cyan-500/5 transition-all group"
                          >
                            {editingOriginalId === item.id ? (
                              <form onSubmit={handleSaveItemEdit} className="flex-1 flex flex-col sm:flex-row gap-3">
                                <div className="w-20 shrink-0">
                                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">ID / BP</label>
                                  <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    value={editingItem?.id || ''}
                                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, id: e.target.value } : null)}
                                    placeholder="ID"
                                    required
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Descrição do Item</label>
                                  <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    value={editingItem?.descricao || ''}
                                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                                    placeholder="Descrição detalhada"
                                    required
                                  />
                                </div>
                                <div className="w-20 shrink-0">
                                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">QTD</label>
                                  <input 
                                    type="number"
                                    min="1"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-center"
                                    value={editingItem?.quantidade || 1}
                                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, quantidade: parseInt(e.target.value) || 1 } : null)}
                                    required
                                  />
                                </div>
                                <div className="flex items-end gap-1 pb-0.5 shrink-0">
                                  <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center shadow-sm"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingOriginalId(null); setEditingItem(null); }}
                                    className="px-3 py-1.5 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center shadow-sm"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 shrink-0 group-hover:bg-cyan-50 group-hover:border-cyan-100 transition-colors">
                                  <span className="text-xs font-black text-slate-400 group-hover:text-cyan-600">
                                    {item.id}
                                  </span>
                                </div>
                                <div className="flex flex-col justify-center flex-1">
                                  <p className="text-sm font-medium text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
                                    {item.descricao}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-end sm:flex-nowrap">
                                  <div className="flex items-center gap-1 mr-1">
                                    <select
                                      disabled={!canEditItems}
                                      value={item.situacao || ""}
                                      onChange={(e) => handleItemDropdownChange(item.id, 'situacao', e.target.value)}
                                      className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:border-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed group-hover:bg-white transition-colors cursor-pointer"
                                    >
                                      <option value="" disabled>Situação</option>
                                      <option value="Operante">Operante</option>
                                      <option value="Inoperante">Inoperante</option>
                                      <option value="Transferido">Transferido</option>
                                    </select>
                                    <select
                                      disabled={!canEditItems}
                                      value={item.estado || ""}
                                      onChange={(e) => handleItemDropdownChange(item.id, 'estado', e.target.value)}
                                      className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:border-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed group-hover:bg-white transition-colors cursor-pointer"
                                    >
                                      <option value="" disabled>Estado</option>
                                      <option value="Novo">Novo</option>
                                      <option value="Bom">Bom</option>
                                      <option value="Ruim">Ruim</option>
                                      <option value="Precário">Precário</option>
                                    </select>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 group-hover:bg-cyan-50 group-hover:border-cyan-200 transition-colors shrink-0">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-cyan-600">
                                      QTD
                                    </span>
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-cyan-700">
                                      {item.quantidade || 1}
                                    </span>
                                  </div>
                                  {canEditItems && (
                                    <div className="flex flex-col sm:flex-row gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      {canTransferItems && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTransferItemData({ itemId: item.id, currentSectionId: selectedSection.id });
                                          }}
                                          className="p-1.5 bg-amber-50 text-amber-600 hover:text-white hover:bg-amber-500 border border-amber-100 rounded-lg transition-colors shadow-xs"
                                          title="Transferir Item para outra Seção"
                                        >
                                          <MoveRight className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingOriginalId(item.id);
                                          setEditingItem({ ...item });
                                        }}
                                        className="p-1.5 bg-cyan-50 text-cyan-600 hover:text-white hover:bg-cyan-600 border border-cyan-100 rounded-lg transition-colors shadow-xs"
                                        title="Editar Item"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => handleDeleteItem(item.id, e)}
                                        className="p-1.5 bg-red-50 text-red-600 hover:text-white hover:bg-red-600 border border-red-100 rounded-lg transition-colors shadow-xs"
                                        title="Excluir Item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </motion.div>
                        ))}
                    </div>
                    )}

                    <PatrimonySignaturesSection 
                      signatures={signatures}
                      canSignPatrimonio={Boolean(canSignPatrimonio)}
                      canSignAuxPatrimonio={Boolean(canSignAuxPatrimonio)}
                      canSignSetor={Boolean(canSignSetor)}
                      canSignAuxSetor={Boolean(canSignAuxSetor)}
                      canSignComandante={Boolean(canSignComandante)}
                      adminModeActive={adminModeActive}
                      onSign={handleSign}
                      onRemoveSign={handleRemoveSign}
                      patrimonio={patrimonio}
                      auxPatrimonio={auxPatrimonio}
                      responsavel={responsavel}
                      auxSetor={auxSetor}
                      comandante={comandante}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex-1 flex flex-col p-8 bg-slate-50/20">
                <div className="max-w-xl mx-auto w-full py-6 space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-100">
                      Módulo de Patrimônio & Carga
                    </span>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Instruções para Conferência e Vistoria
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Este módulo permite a conferência de bens patrimoniais distribuídos pelas seções e alojamentos do 10º GBM.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Box className="w-4 h-4 text-cyan-600" />
                      Guia Rápido de Utilização
                    </h4>
                    <div className="space-y-3 font-sans">
                      <div className="flex gap-2.5 items-start">
                        <span className="w-4 h-4 rounded bg-cyan-50 text-cyan-600 text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700">Selecione o Setor ou Sala</p>
                          <p className="text-[10px] text-slate-500 font-medium">Navegue pelas seções no painel esquerdo para examinar a listagem de bens de cada sala ou alojamento.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="w-4 h-4 rounded bg-cyan-50 text-cyan-600 text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700">Verifique os Itens Física e Quantitativamente</p>
                          <p className="text-[10px] text-slate-500 font-medium">Confirme se as descrições, quantidades e códigos de patrimônio conferem perfeitamente com o espaço físico.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="w-4 h-4 rounded bg-cyan-50 text-cyan-600 text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700">Valide com sua Assinatura Eletrônica</p>
                          <p className="text-[10px] text-slate-500 font-medium">Após validar, registre e autentique o termo de vistoria com suas credenciais de RG CBMERJ.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modais Extraídos */}
      <PatrimonyQrModal 
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        selectedSection={selectedSection}
      />

      <PatrimonyNewSectorModal 
        isOpen={showNewSectorModal}
        onClose={() => setShowNewSectorModal(false)}
        newSectorName={newSectorName}
        setNewSectorName={setNewSectorName}
        newSectorObm={newSectorObm}
        setNewSectorObm={setNewSectorObm}
        newSectorDate={newSectorDate}
        setNewSectorDate={setNewSectorDate}
        newSectorResponsible={newSectorResponsible}
        setNewSectorResponsible={setNewSectorResponsible}
        militars={militars}
        onCreateSector={handleCreateSector}
      />

      <PatrimonyTransferModal 
        isOpen={Boolean(transferItemData)}
        onClose={() => setTransferItemData(null)}
        currentItem={currentTransferItem}
        allSections={allSections}
        selectedSectionId={selectedSection?.id}
        onExecuteTransfer={executeTransfer}
      />
    </div>
  );
}
export default PatrimonyModule;
