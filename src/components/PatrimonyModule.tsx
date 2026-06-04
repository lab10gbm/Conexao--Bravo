import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  ArrowLeft,
  Search,
  ChevronRight,
  Hash,
  Box,
  Edit2,
  Check,
  X,
  ShieldCheck,
  Settings,
  QrCode,
  Printer,
  Table,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Calendar,
  MoveRight,
} from "lucide-react";
import { UserProfile } from "../types";
export interface PatrimonioItem {
  id: string;
  descricao?: string;
  quantidade?: number;
  [key: string]: any;
}
export interface PatrimonioSection {
  nome?: string;
  title?: string;
  itens?: PatrimonioItem[];
  items?: PatrimonioItem[];
  id?: string;
  [key: string]: any;
}
const patrimonioData: PatrimonioSection[] = [];
import { useMilitars } from "../contexts/MilitarContext";
import { db } from "../lib/firebase";
import { doc, onSnapshot, setDoc, collection, deleteDoc } from "firebase/firestore";
import { RankInsignia } from "./RankInsignia";
import { PatrimonyConfigPanel } from "./PatrimonyConfigPanel";
import { cleanUndefined } from "../lib/utils";

interface SectorQrCodeProps {
  value: string;
  size?: number;
}

const SectorQrCode: React.FC<SectorQrCodeProps> = ({ value, size = 160 }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width: size,
      color: {
        dark: "#0f172a", // slate-900 (matches palette)
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error("Failed to generate QR Code", err);
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!qrDataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-slate-400 bg-slate-50 border border-slate-150 rounded-lg animate-pulse"
      >
        <span className="text-[10px] font-black uppercase tracking-wider">Gerando...</span>
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code do Setor"
      width={size}
      height={size}
      className="rounded-lg object-contain select-none"
      referrerPolicy="no-referrer"
    />
  );
};

interface PatrimonyModuleProps {
  user: UserProfile;
  adminModeActive: boolean;
  onToggleAdminMode: () => void;
  obmContext?: string;
  onBack: () => void;
}

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
          guessedIdIdx = -1; // Auto
          guessedDescIdx = 0;
          guessedQtyIdx = -1; // Default 1
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
            guessedQtyIdx = numIdxs[numIdxs.length - 1]; // Use last number column
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
    return customSectionItems[section.id] || section.itens;
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
      await setDoc(doc(db, "patrimonioData", selectedSection.id), cleanUndefined({
              items: updatedItems,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), { merge: true });
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
        await setDoc(doc(db, "patrimonioData", selectedSection.id), cleanUndefined({
                  items: null,
                  updatedAt: new Date().toISOString(),
                  updatedBy: user.warName || user.name
                }), { merge: true });
        
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
      const docRef = doc(db, "customSectors", sectorId);
      
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

      await setDoc(docRef, cleanUndefined(sectorData));
      
      // Also initialize empty data
      await setDoc(doc(db, "patrimonioData", sectorId), cleanUndefined({
              items: [],
              updatedAt: finalDate,
              updatedBy: user.warName || user.name
            }), { merge: true });

      // If a responsible is selected, set it in config immediately
      if (newSectorResponsible) {
        await setDoc(doc(db, "patrimonioConfig", sectorId), cleanUndefined({
                  responsavelId: newSectorResponsible,
                  auxSetorId: "",
                }), { merge: true });
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
      
      await setDoc(doc(db, "patrimonioData", selectedSection.id), cleanUndefined({
              items: updatedItems,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), { merge: true });
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

      await setDoc(
        doc(db, "patrimonioData", selectedSection.id),
        cleanUndefined({
                  items: items,
                  updatedAt: new Date().toISOString(),
                  updatedBy: user.warName || user.name,
                }),
        { merge: true },
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

      await setDoc(doc(db, "patrimonioData", selectedSection.id), cleanUndefined({
              items: items,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), { merge: true });

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
      // 1. Remove from current section
      const currentItems = [...getSectionItems(selectedSection)];
      const index = currentItems.findIndex(i => i.id === transferItemData.itemId);
      if (index === -1) return;
      
      const itemToTransfer = currentItems[index];
      currentItems.splice(index, 1);
      
      // Update current section
      await setDoc(doc(db, "patrimonioData", selectedSection.id), cleanUndefined({
              items: currentItems,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), { merge: true });

      // 2. Add to target section
      let targetItems: PatrimonioItem[] = [];
      const targetSection = [...patrimonioData, ...customSectors].find(s => s.id === targetSectionId);
      
      if (targetSectionId.startsWith('custom_') || targetSectionId.startsWith('destacamento_')) {
         targetItems = customSectionItems[targetSectionId] || [];
      } else {
         targetItems = targetSection ? (targetSection.itens as PatrimonioItem[]) : [];
         if (customSectionItems[targetSectionId]) {
             // In case it was customized
             targetItems = customSectionItems[targetSectionId];
         }
      }

      const newTargetItems = [...targetItems, { ...itemToTransfer }];

      await setDoc(doc(db, "patrimonioData", targetSectionId), cleanUndefined({
              items: newTargetItems,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), { merge: true });

      setTransferItemData(null);
      alert("Item transferido com sucesso!");
    } catch (err) {
      console.error("Failed to transfer item:", err);
      alert("Erro ao transferir o item.");
    }
  };

  const renderTransferModal = () => {
    if (!transferItemData) return null;

    const currentItem = getSectionItems(selectedSection!).find(i => i.id === transferItemData.itemId);

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="bg-amber-600 p-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <MoveRight className="w-5 h-5" />
              <h2 className="font-bold tracking-tight">Transferir Item</h2>
            </div>
            <button onClick={() => setTransferItemData(null)} className="text-white/80 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Item a transferir</p>
              <p className="text-sm font-bold text-slate-700">{currentItem?.id} - {currentItem?.descricao}</p>
            </div>
            
            <p className="text-xs uppercase font-black tracking-widest text-slate-500 mb-3">Selecione o Destino:</p>
            <div className="grid gap-2">
              {allSections.filter(s => s.id !== selectedSection?.id).map(s => (
                <button
                  key={s.id}
                  onClick={() => executeTransfer(s.id)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-bold">{s.nome}</p>
                    {s.obm && <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-0.5">{s.obm}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
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

      await setDoc(doc(db, "patrimonioData", selectedSection.id), cleanUndefined({
              items: items,
              updatedAt: new Date().toISOString(),
              updatedBy: user.warName || user.name
            }), { merge: true });

      setEditingItem(null);
      setEditingOriginalId(null);
    } catch (err) {
      console.error("Failed to save item edit:", err);
      alert("Erro ao salvar a edição do item.");
    }
  };

  const handleSign = async (
    role: "setor" | "auxSetor" | "patrimonio" | "auxPatrimonio" | "comandante",
  ) => {
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

      await setDoc(
        doc(db, "patrimonioConfig", selectedSection.id),
        cleanUndefined({
                  [fieldName]: signatureData,
                }),
        { merge: true },
      );
    } catch (e) {
      console.error("Failed to sign:", e);
    }
  };

  const handleRemoveSign = async (
    role: "setor" | "auxSetor" | "patrimonio" | "auxPatrimonio" | "comandante",
  ) => {
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

      await setDoc(
        doc(db, "patrimonioConfig", selectedSection.id),
        cleanUndefined({
                  [fieldName]: null,
                }),
        { merge: true },
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

  const normalizeRg = (rg: string) => rg.replace(/\D/g, "");

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

  const allSections = useMemo(() => [...patrimonioData, ...customSectors], [patrimonioData, customSectors]);

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

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full h-auto pb-12">
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
                          obmId === '10º' ? '10º GBM Sede (Angra)' :
                          obmId === '1/10' ? 'Itaguaí' :
                          obmId === '2/10' ? 'Mambucaba' :
                          obmId === '3/10' ? 'Frade' :
                          obmId === '4/10' ? 'Mangaratiba' :
                          obmId === '26º' ? '26º GBM Sede (Paraty)' :
                          'Paraty'
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
                     selectedObmFilter === '2/10' ? '2/10 - DBM (Mambucaba)' :
                     selectedObmFilter === '3/10' ? '3/10 - DBM (Frade)' :
                     selectedObmFilter === '4/10' ? '4/10 - DBM (Mangaratiba)' :
                     selectedObmFilter === '26º' ? '26º GBM - Sede (Paraty)' :
                     '1/26 - DBM (Paraty)'}
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
                        {/* Excluir Setor se for customizado */}
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

                        {/* Section QR Code */}
                        <button
                          onClick={() => setShowQrModal(true)}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0"
                          title="Gerar QR Code de identificação para esta seção"
                        >
                          <QrCode className="w-4 h-4 text-cyan-500" />
                          <span>QR Code do Setor</span>
                        </button>
                        
                        {/* Spreadsheet Mode Selector */}
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

                    {false ? (
                      <div />
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start sm:items-center gap-4">
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
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    {isSpreadsheetMode ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div>
                            <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider mb-1 flex items-center gap-2">
                              <Table className="w-4 h-4 text-cyan-600 animate-pulse" />
                              Copiar e Colar Planilha Excel
                            </h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                              Selecione e copie as colunas da sua planilha Excel (ID, descrição e quantidade) e cole-as no campo de texto abaixo.
                            </p>
                          </div>
                          
                          {customSectionItems[selectedSection.id] && (
                            <button
                              onClick={handleResetToDefault}
                              className="px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl flex items-center gap-1.5 transition-all border border-red-200 shadow-sm bg-white shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Reverter para o Padrão
                            </button>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">
                            Área de Colagem (Pressione Ctrl+V ou Cmd+V aqui)
                          </label>
                          <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder={`Exemplo de colagem do Excel:
01	Armário de Aço Cinza com Prateleiras	2
02	Mesa de Escritório Tipo L	1
03	Cadeira de Escritório Giratória Azul	3`}
                            rows={5}
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 font-mono text-xs focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 focus:outline-none transition-all placeholder-slate-300 resize-y"
                          />
                        </div>
                        
                        {parsedRows.length > 0 && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 border border-slate-100 rounded-xl shadow-sm gap-2 font-sans">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={ignoreFirstRow}
                                  onChange={(e) => setIgnoreFirstRow(e.target.checked)}
                                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                Desconsiderar primeira linha (Cabeçalho da Planilha)
                              </label>
                              
                              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-1 rounded-lg shrink-0">
                                {getFinalParsedItems().length} itens detectados
                              </span>
                            </div>

                            {/* Column mapping selection */}
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm font-sans">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">
                                Mapeador de Colunas Detectadas
                              </h5>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {["Coluna ID / Código", "Coluna Descrição", "Coluna Quantidade"].map((colTitle, colMapIdx) => (
                                  <div key={colTitle} className="flex flex-col gap-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-sans">{colTitle}</span>
                                    <select
                                      value={columnMappings[colMapIdx]}
                                      onChange={(e) => {
                                        const newVal = parseInt(e.target.value, 10);
                                        setColumnMappings(prev => {
                                          const next = [...prev];
                                          next[colMapIdx] = newVal;
                                          return next;
                                        });
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-cyan-500 font-sans"
                                    >
                                      <option value={-1}>
                                        {colMapIdx === 0 ? "Gerar ID automático (01, 02...)" : colMapIdx === 2 ? "Fixar quantidade como 1" : "Ignorar coluna"}
                                      </option>
                                      {parsedRows[0]?.map((colSample, cellIdx) => (
                                        <option key={cellIdx} value={cellIdx}>
                                          Coluna {cellIdx + 1} ({colSample.length > 20 ? colSample.substring(0, 17) + "..." : colSample || "vazia"})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Final outputs preview table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-60 overflow-y-auto shadow-sm font-sans">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                    <th className="px-4 py-2.5">ID final</th>
                                    <th className="px-4 py-2.5">Descrição do Item Mapeado</th>
                                    <th className="px-4 py-2.5 text-right pr-6">Qtd</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                                  {getFinalParsedItems().map((item, idx) => (
                                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-2 text-cyan-600 font-extrabold">{item.id}</td>
                                      <td className="px-4 py-2 max-w-sm truncate text-slate-600">{item.descricao}</td>
                                      <td className="px-4 py-2 text-right pr-6 text-slate-950 font-black">{item.quantidade}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Actions bar */}
                            <div className="flex gap-3 justify-end pt-2 font-sans">
                              <button
                                onClick={() => {
                                  setIsSpreadsheetMode(false);
                                  setPastedText("");
                                }}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveSpreadsheetData}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                              >
                                <Check className="w-4 h-4" />
                                Confirmar e Salvar Carga
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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

                    <div className="mt-16 mb-8 pt-8 border-t border-slate-200 flex flex-wrap justify-center gap-12 gap-y-16 px-4">
                      {/* Responsável pelo Patrimônio */}
                      <div className="flex flex-col items-center justify-end text-center relative group/sig w-52">
                        <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
                          {signatures.patrimonio ? (
                            <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
                              <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                                Assinado Eletronicamente
                              </span>
                              <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                                {new Date(
                                  signatures.patrimonio.timestamp,
                                ).toLocaleString("pt-BR")}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
                          {!signatures.patrimonio && canSignPatrimonio && (
                            <button
                              onClick={() => handleSign("patrimonio")}
                              className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                            >
                              <Edit2 className="w-3 h-3" /> Assinar Dcto
                            </button>
                          )}
                          {signatures.patrimonio &&
                            (canSignPatrimonio || adminModeActive) && (
                              <button
                                onClick={() => handleRemoveSign("patrimonio")}
                                className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
                              >
                                Remover Assinatura
                              </button>
                            )}
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                          {patrimonio?.warName ||
                            patrimonio?.name ||
                            "Douglas M. G. Gabi"}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          {patrimonio
                            ? `${patrimonio.rank} - RG ${patrimonio.rg}`
                            : "SGT BM 02/13 - RG 49.075"}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          Responsável pelo Patrimônio
                        </p>
                      </div>

                      {/* Auxiliar de Patrimônio */}
                      {auxPatrimonio && (
                        <div className="flex flex-col items-center justify-end text-center relative group/sig w-52">
                          <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
                            {signatures.auxPatrimonio ? (
                              <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
                                <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                                  Assinado Eletronicamente
                                </span>
                                <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                                  {new Date(
                                    signatures.auxPatrimonio.timestamp,
                                  ).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
                            {!signatures.auxPatrimonio &&
                              canSignAuxPatrimonio && (
                                <button
                                  onClick={() => handleSign("auxPatrimonio")}
                                  className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                                >
                                  <Edit2 className="w-3 h-3" /> Assinar Dcto
                                </button>
                              )}
                            {signatures.auxPatrimonio &&
                              (canSignAuxPatrimonio || adminModeActive) && (
                                <button
                                  onClick={() =>
                                    handleRemoveSign("auxPatrimonio")
                                  }
                                  className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
                                >
                                  Remover Assinatura
                                </button>
                              )}
                          </div>

                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                            {auxPatrimonio.warName || auxPatrimonio.name}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            {auxPatrimonio.rank} - RG {auxPatrimonio.rg}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Auxiliar de Patrimônio
                          </p>
                        </div>
                      )}

                      {/* Responsável pelo Setor */}
                      <div className="flex flex-col items-center justify-end text-center relative group/sig w-52">
                        <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
                          {signatures.setor ? (
                            <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
                              <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                                Assinado Eletronicamente
                              </span>
                              <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                                {new Date(
                                  signatures.setor.timestamp,
                                ).toLocaleString("pt-BR")}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
                          {!signatures.setor && canSignSetor && responsavel && (
                            <button
                              onClick={() => handleSign("setor")}
                              className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                            >
                              <Edit2 className="w-3 h-3" /> Assinar Dcto
                            </button>
                          )}
                          {signatures.setor &&
                            (canSignSetor || adminModeActive) && (
                              <button
                                onClick={() => handleRemoveSign("setor")}
                                className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
                              >
                                Remover Assinatura
                              </button>
                            )}
                        </div>

                        {responsavel ? (
                          <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                              {responsavel.warName || responsavel.name}
                            </p>
                            <p className="text-[10px] font-bold uppercase text-slate-500">
                              {responsavel.rank} - RG {responsavel.rg}
                            </p>
                            <p className="text-[10px] font-bold uppercase text-slate-500">
                              Responsável pelo Setor
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                            Responsável pelo Setor
                          </p>
                        )}
                      </div>

                      {/* Auxiliar do Setor */}
                      {auxSetor && (
                        <div className="flex flex-col items-center justify-end text-center relative group/sig w-52">
                          <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
                            {signatures.auxSetor ? (
                              <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
                                <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                                  Assinado Eletronicamente
                                </span>
                                <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                                  {new Date(
                                    signatures.auxSetor.timestamp,
                                  ).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
                            {!signatures.auxSetor && canSignAuxSetor && (
                              <button
                                onClick={() => handleSign("auxSetor")}
                                className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                              >
                                <Edit2 className="w-3 h-3" /> Assinar Dcto
                              </button>
                            )}
                            {signatures.auxSetor &&
                              (canSignAuxSetor || adminModeActive) && (
                                <button
                                  onClick={() => handleRemoveSign("auxSetor")}
                                  className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
                                >
                                  Remover Assinatura
                                </button>
                              )}
                          </div>

                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                            {auxSetor.warName || auxSetor.name}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            {auxSetor.rank} - RG {auxSetor.rg}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Auxiliar do Setor
                          </p>
                        </div>
                      )}

                      {/* Comandante */}
                      <div className="flex flex-col items-center justify-end text-center relative group/sig w-52 mt-8">
                        <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
                          {signatures.comandante ? (
                            <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
                              <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                                Assinado Eletronicamente
                              </span>
                              <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                                {new Date(
                                  signatures.comandante.timestamp,
                                ).toLocaleString("pt-BR")}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
                          {!signatures.comandante && canSignComandante && (
                            <button
                              onClick={() => handleSign("comandante")}
                              className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                            >
                              <Edit2 className="w-3 h-3" /> Assinar Dcto
                            </button>
                          )}
                          {signatures.comandante &&
                            (canSignComandante || adminModeActive) && (
                              <button
                                onClick={() => handleRemoveSign("comandante")}
                                className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
                              >
                                Remover Assinatura
                              </button>
                            )}
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                          {comandante?.warName ||
                            comandante?.name ||
                            "Paulo R. Goncalves Escarani"}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          {comandante
                            ? `${comandante.rank} - RG ${comandante.rg}`
                            : "Ten Cel BM QOC/96 - RG 19.187"}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          Comandante do 10º GBM
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex-1 flex flex-col p-8 bg-slate-50/20">
                <div className="max-w-xl mx-auto w-full py-6 space-y-6">
                  {/* Title & Badge */}
                  <div className="text-center space-y-3">
                    <span className="px-3 py-1 bg-[#8B0000]/10 border border-[#8B0000]/20 text-[#8B0000] rounded-full text-[9px] font-black uppercase tracking-widest inline-block">
                      {selectedObmFilter.endsWith('/26') || selectedObmFilter === '26º' ? '26º GBM' : '10º GBM'} • OBM {selectedObmFilter}
                    </span>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Controle Patrimonial de Carga Fixa
                    </h3>
                    <p className="text-xs text-slate-500 font-sans leading-relaxed">
                      Painel digital de gerenciamento preventivo para a {
                        selectedObmFilter === '10º' ? 'Sede Angra dos Reis (10º GBM)' :
                        selectedObmFilter === '1/10' ? '1/10 Itaguaí' :
                        selectedObmFilter === '2/10' ? '2/10 Mambucaba' :
                        selectedObmFilter === '3/10' ? '3/10 Frade' :
                        selectedObmFilter === '4/10' ? '4/10 Mangaratiba' :
                        selectedObmFilter === '26º' ? 'Sede Paraty (26º GBM)' :
                        '1/26 Paraty'
                      }.
                    </p>
                  </div>

                  {/* Active OBM Status Banner */}
                  {(() => {
                    const isUserObmActive = normalizeForFilter(user.obm) === selectedObmFilter;
                    return (
                      <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs transition-all ${
                        isUserObmActive
                          ? "bg-slate-50/60 border-emerald-200/50"
                          : "bg-amber-50/40 border-amber-200/50"
                      }`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isUserObmActive
                            ? "bg-emerald-100/80 text-emerald-600"
                            : "bg-amber-100/80 text-amber-600"
                        }`}>
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                              Status do Militar Conectado
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              isUserObmActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {isUserObmActive
                                ? "Sua OBM Ativa"
                                : "Acesso Visitante"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium font-sans leading-relaxed">
                            {isUserObmActive
                              ? `Como militar lotado na OBM ${selectedObmFilter}, você tem autorização total para examinar a carga, assinar digitalmente e retificar pendências patrimoniais dos setores de sua subunidade.`
                              : `Sua OBM cadastrada é ${user.obm || '10º GBM'}. Você está visualizando o inventário da subunidade destacada ${selectedObmFilter}. Suas permissões de assinatura local podem variar.`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 border border-slate-200/70 rounded-xl shadow-xs text-center space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                        Setores Cadastrados ({selectedObmFilter})
                      </span>
                      <p className="text-2xl font-black text-[#8B0000]">
                        {allSections.filter(s => (s.obm || '10º') === selectedObmFilter).length}
                      </p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        Setores Mapeados
                      </p>
                    </div>
                    <div className="bg-white p-4 border border-slate-200/70 rounded-xl shadow-xs text-center space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                        Equipamentos Cadastrados
                      </span>
                      <p className="text-2xl font-black text-cyan-600">
                        {allSections
                          .filter(s => (s.obm || '10º') === selectedObmFilter)
                          .reduce((acc, curr) => acc + (customSectionItems[curr.id] || curr.itens).length, 0)}
                      </p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        Bens Registrados
                      </p>
                    </div>
                  </div>

                  {/* Operational Directions & Guide */}
                  <div className="bg-white p-5 border border-slate-200/70 rounded-xl shadow-xs space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-500" /> Diretrizes de Conferência Patrimonial
                    </h4>
                    <div className="space-y-3">
                      <div className="flex gap-2.5 items-start">
                        <span className="w-4 h-4 rounded bg-cyan-50 text-cyan-600 text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700">Escolha o Setor</p>
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

      {/* Modal do QR Code do Setor (com lib-free SVG QR Code, pronto para impressão) */}
      {showQrModal && selectedSection && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 font-sans">
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">
              QR Code de Identificação
            </h4>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6">
              {selectedSection.nome}
            </p>

            {/* QR Card for printing */}
            <div id="print-qr-card" className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col items-center w-full max-w-[280px]">
              {/* Header inside QR card for context */}
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-4 text-center">
                10º GBM - INTRANET
              </div>
              
              {/* Custom Vector QR Code */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <SectorQrCode value={window.location.origin + "/carga-fixa/" + selectedSection.id} size={160} />
              </div>

              <div className="text-[12px] font-black uppercase tracking-widest text-slate-800 mt-4 text-center">
                {selectedSection.nome}
              </div>
              <div className="text-[8px] text-slate-400 font-mono tracking-wider mt-1.5 break-all select-all uppercase">
                {selectedSection.id}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mt-4 max-w-xs font-sans font-medium">
              Cole este QR Code na entrada do setor ou no armário principal. Os militares poderão escaneá-lo para acessar a relação de carga fixa instantaneamente.
            </p>

            <div className="flex gap-2 w-full mt-6">
              <button
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const printContents = document.getElementById("print-qr-card")?.innerHTML;
                  if (printContents) {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Imprimir QR Code - ${selectedSection.nome}</title>
                            <style>
                              body {
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                              }
                              #card {
                                border: 4px solid #f1f5f9;
                                border-radius: 24px;
                                padding: 40px;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                text-align: center;
                                max-width: 350px;
                              }
                              .header {
                                font-size: 11px;
                                font-weight: 900;
                                letter-spacing: 0.25em;
                                color: #0891b2;
                                margin-bottom: 24px;
                                text-transform: uppercase;
                              }
                              .title {
                                font-size: 16px;
                                font-weight: 900;
                                text-transform: uppercase;
                                margin-top: 24px;
                                color: #1e293b;
                                letter-spacing: 0.05em;
                              }
                              .subtitle {
                                font-size: 10px;
                                font-family: monospace;
                                color: #94a3b8;
                                margin-top: 8px;
                              }
                              .qr-wrapper {
                                background: #f8fafc;
                                padding: 16px;
                                border-radius: 16px;
                                border: 1px solid #e2e8f0;
                              }
                            </style>
                          </head>
                          <body>
                            <div id="card">
                              <div class="header">10º GBM - INTRANET</div>
                              <div class="qr-wrapper">${document.getElementById("print-qr-card")?.getElementsByTagName("svg")[0]?.outerHTML || ""}</div>
                              <div class="title">${selectedSection.nome}</div>
                              <div class="subtitle">${selectedSection.id}</div>
                            </div>
                            <script>
                              window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                              }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    } else {
                      alert("Por favor, permita popups para poder abrir a janela de impressão do QR Code.");
                    }
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-600/10"
              >
                <Printer className="w-4 h-4" />
                Imprimir QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Cadastrar Novo Setor */}
      {showNewSectorModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-250 font-sans">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    Cadastrar Seção / Setor
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Bens Patrimoniais por OBM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewSectorModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSector} className="space-y-5">
              {/* Nome do Setor */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest font-sans">
                  Nome do Novo Setor / Seção <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="EX: SEÇÃO DE COMUNICAÇÃO SOCIAL"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-600 uppercase font-sans tracking-wide"
                  value={newSectorName}
                  onChange={(e) => setNewSectorName(e.target.value)}
                />
              </div>

              {/* Subunidade (OBM) e Data de criação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest font-sans">
                    Subunidade (OBM)
                    <span className="text-red-500"> *</span>
                  </label>
                  <select
                    value={newSectorObm}
                    onChange={(e) => setNewSectorObm(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-600 font-sans"
                  >
                    {['10º', '1/10', '2/10', '3/10', '4/10', '26º', '1/26'].map(obmId => (
                      <option key={obmId} value={obmId}>
                        {obmId === '10º' ? '10º GBM Sede (Angra)' :
                         obmId === '1/10' ? `${obmId} DBM (Itaguaí)` :
                         obmId === '2/10' ? `${obmId} DBM (Mambucaba)` :
                         obmId === '3/10' ? `${obmId} DBM (Frade)` :
                         obmId === '4/10' ? `${obmId} DBM (Mangaratiba)` :
                         obmId === '26º' ? '26º GBM Sede (Paraty)' :
                         `${obmId} DBM (Paraty)`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest font-sans">
                    Data de Criação / Cadastro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-600 font-sans"
                    value={newSectorDate}
                    onChange={(e) => setNewSectorDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Responsável pelo Setor (Militars) */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest font-sans">
                  Oficial ou Praça Responsável (Opcional)
                </label>
                <select
                  value={newSectorResponsible}
                  onChange={(e) => setNewSectorResponsible(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-600 font-sans"
                >
                  <option value="">Selecione um oficial/praça cadastrado...</option>
                  {militars.map((m) => (
                    <option key={m.rg} value={m.rg}>
                      {m.rank} {m.warName || m.name} (RG: {m.rg})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                  Você também pode reconfigurar ou alterar o oficial responsável depois, no painel administrativo do setor.
                </span>
              </div>

              {/* Modais Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 flex-col-reverse sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowNewSectorModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all uppercase tracking-widest font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/15 uppercase tracking-widest font-sans"
                >
                  <Check className="w-4 h-4" />
                  Salvar Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {renderTransferModal()}
    </div>
  );
}
