import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, writeBatch, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Calendar, Check, Save, ShieldCheck, Users, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PermutaRequest } from '../types';
import { AppVisibilityConfig } from './AppVisibilityConfig';
import { useAppConfig } from '../contexts/ConfigContext';

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRV3PAwJrGMQOUaUabnYNlbebEgrsE9wEnQ8Qpu0h-8ZT5WOgL3oyVIeQopb_X7g7PDByvP8OPy9upD/pub?gid=1221046524&single=true&output=csv";

// Helper to normalize RG exactly like the server does
const normalizeRg = (rg: string | undefined): string => {
  if (!rg) return '';
  const str = rg.toString().trim().toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, '');
  // Remove leading zeros to match server aggressive normalization
  return clean.replace(/^0+/, '') || clean;
};

interface AdminPanelProps {
  adminModeActive: boolean;
  onToggleAdminMode: () => void;
}

export function AdminPanel({ adminModeActive, onToggleAdminMode }: AdminPanelProps) {
  const { activeMonths: ctxActiveMonths, alaConfig: ctxAlaConfig, escalanteRGs: ctxEscalanteRGs } = useAppConfig();

  const [openMonths, setOpenMonths] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const [alaConfig, setAlaConfig] = useState({ referenceYear: 2026, startAla: 2 });
  const [savingAla, setSavingAla] = useState(false);

  // Escalantes
  const [escalanteRGs, setEscalanteRGs] = useState<string[]>([]);
  const [newEscalante, setNewEscalante] = useState('');
  const [savingEscalantes, setSavingEscalantes] = useState(false);

  useEffect(() => {
    if (ctxActiveMonths) setOpenMonths(ctxActiveMonths.map(Number));
    if (ctxAlaConfig) setAlaConfig({ referenceYear: ctxAlaConfig.referenceYear || 2026, startAla: ctxAlaConfig.startAla || 2 });
    if (ctxEscalanteRGs) setEscalanteRGs(ctxEscalanteRGs);
  }, [ctxActiveMonths, ctxAlaConfig, ctxEscalanteRGs]);

  const toggleMonth = (monthIndex: number) => {
    setOpenMonths(prev => 
      prev.includes(monthIndex) 
        ? prev.filter(m => m !== monthIndex) 
        : [...prev, monthIndex]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sortedMonths = openMonths.sort((a, b) => a - b);
      await setDoc(doc(db, 'config', 'active_months'), {
        months: sortedMonths,
        updatedAt: new Date().toISOString()
      });
      
      // Update SCHEDULED permutas to PENDING if their month is now open
      const pSnapshot = await getDocs(query(collection(db, 'permutas'), where('status', '==', 'scheduled')));
      const batch = writeBatch(db);
      let batchCount = 0;
      pSnapshot.forEach(doc => {
        const permuta = doc.data() as PermutaRequest;
        const pDate = new Date(permuta.date + 'T00:00:00');
        if (sortedMonths.includes(pDate.getMonth())) {
          batch.update(doc.ref, {
             status: 'pending',
             updatedAt: serverTimestamp()
          });
          batchCount++;
        }
      });
      if (batchCount > 0) {
         await batch.commit();
      }

    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAlaConfig = async () => {
    setSavingAla(true);
    try {
      await setDoc(doc(db, 'config', 'ala_config'), {
        referenceYear: alaConfig.referenceYear,
        startAla: alaConfig.startAla,
        updatedAt: new Date().toISOString()
      });
      // Optionally reload the app to reflect changes cleanly across all dates
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingAla(false);
    }
  };

  const handleAddEscalante = async () => {
    if (!newEscalante.trim()) return;
    const cleaned = normalizeRg(newEscalante);
    if (!cleaned) return;
    if (escalanteRGs.includes(cleaned)) return;
    
    setSavingEscalantes(true);
    try {
      const updated = [...escalanteRGs, cleaned];
      await setDoc(doc(db, 'config', 'roles'), {
        escalanteRGs: updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setNewEscalante('');
    } catch (e) {
      console.error(e);
    } finally {
      setSavingEscalantes(false);
    }
  };

  const handleRemoveEscalante = async (rg: string) => {
    setSavingEscalantes(true);
    try {
      const updated = escalanteRGs.filter(r => r !== rg);
      await setDoc(doc(db, 'config', 'roles'), {
        escalanteRGs: updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingEscalantes(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    name: format(new Date(2026, i, 1), 'MMMM', { locale: ptBR }),
    index: i
  }));

  const handleSync = async () => {
    // @ts-ignore - Accessing internal database properties for debugging
    const rawDbId = db?._databaseId;
    const dbIdString = rawDbId ? (typeof rawDbId === 'string' ? rawDbId : rawDbId.database || '(default)') : (db?.type === 'firestore' ? '(default)' : 'desconhecido');
    
    // Removido confirm() pois é bloqueado no iframe!
    setSyncing(true);
    setSyncStatus('Iniciando sincronização...');
    console.log('[Sync] Started. Using Database ID:', dbIdString);
    
    try {
      // 1. Fetch CSV
      const response = await fetch('/api/csv');
      if (!response.ok) throw new Error('Não foi possível baixar a planilha do servidor.');
      
      const csvText = await response.text();
      const lines = csvText.split('\n');
      
      // 2. Find Header (expecting line 2 based on previous debug)
      let headerIdx = -1;
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        if (lines[i].includes('RG') && lines[i].includes('NOME')) {
          headerIdx = i;
          break;
        }
      }
      
      if (headerIdx === -1) {
        // Fallback search
        headerIdx = lines.findIndex(l => l.includes('RG'));
      }

      if (headerIdx === -1) throw new Error('Cabeçalho da planilha não encontrado.');

      const headers = lines[headerIdx].split(',').map(h => h.trim());
      const rows = lines.slice(headerIdx + 1);
      
      const rgIdx = headers.indexOf('RG');
      const nameIdx = headers.indexOf('NOME');
      const rankIdx = headers.indexOf('Posto/Grad');
      const warNameIdx = headers.indexOf('N.Guerra');
      const alaIdx = headers.indexOf('ALA');
      const birthIdx = headers.indexOf('Nascimento');
      const quadroIdx = headers.indexOf('Quadro') !== -1 ? headers.indexOf('Quadro') : headers.indexOf('QUADRO');
      const idFuncionalIdx = headers.indexOf('ID Funcional');
      const cidadeIdx = headers.indexOf('Cidade') !== -1 ? headers.indexOf('Cidade') : headers.indexOf('CIDADE');
      const celIdx = headers.indexOf('Cel');
      const telIdx = headers.indexOf('Tel');
      const emailIdx = headers.indexOf('E-mail');
      const situacaoIdx = headers.indexOf('Situação');
      const obmIdx = headers.indexOf('OBM');

      setSyncStatus(`Processando ${rows.length} registros...`);

      // 3. Sync in batches
      let batch = writeBatch(db);
      let count = 0;
      let total = 0;

      for (const rowLine of rows) {
        if (!rowLine.trim()) continue;
        
        // Basic CSV column splitter (handle nested commas if needed, but simple is fine for pub-csv)
        // If names have commas, use regex split
        const cols = rowLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const rawRg = cols[rgIdx]?.replace(/"/g, '')?.trim();
        const safeRg = normalizeRg(rawRg);

        if (!safeRg) continue;

        const warName = cols[warNameIdx]?.replace(/"/g, '')?.trim() || '';
        const fullName = cols[nameIdx]?.replace(/"/g, '')?.trim() || '';
        const rank = cols[rankIdx]?.replace(/"/g, '')?.trim() || '';
        let ala = cols[alaIdx]?.replace(/"/g, '')?.trim() || '1';
        if (ala.toUpperCase() === 'ALA') continue; // header skip

        const birthDate = cols[birthIdx]?.replace(/"/g, '')?.trim() || '';
        
        let rawQuadro = quadroIdx !== -1 ? cols[quadroIdx]?.replace(/"/g, '')?.trim() : '';
        const quadroSplit = rawQuadro ? rawQuadro.split('/') : [''];
        if (quadroSplit.length > 1) quadroSplit.pop();
        const quadro = quadroSplit.join('/');

        const idFuncional = idFuncionalIdx !== -1 ? cols[idFuncionalIdx]?.replace(/"/g, '')?.trim() : '';
        const cidade = cidadeIdx !== -1 ? cols[cidadeIdx]?.replace(/"/g, '')?.trim() : '';
        const cel = celIdx !== -1 ? cols[celIdx]?.replace(/"/g, '')?.trim() : '';
        const tel = telIdx !== -1 ? cols[telIdx]?.replace(/"/g, '')?.trim() : '';
        const email = emailIdx !== -1 ? cols[emailIdx]?.replace(/"/g, '')?.trim() : '';
        const situacao = situacaoIdx !== -1 ? cols[situacaoIdx]?.replace(/"/g, '')?.trim() : '';
        let obm = obmIdx !== -1 ? cols[obmIdx]?.replace(/"/g, '')?.trim() : '';
        
        const obmUpper = (obm || '').toUpperCase();
        if (obmUpper === '10º' || obmUpper === '10' || obmUpper === 'OBM' || obmUpper === '10º GBM' || !obm) {
          obm = '10º GBM';
        }

        const mData = {
          rg: rawRg,
          name: fullName,
          warName: warName || (fullName || '').split(' ')[0] || 'Militar',
          rank: rank,
          ala: ala,
          birthDate: birthDate,
          quadro: quadro,
          idFuncional: idFuncional,
          cidade: cidade,
          cel: cel,
          tel: tel,
          email: email,
          situacao: situacao,
          obm: obm,
          updatedAt: serverTimestamp()
        };

        const docRef = doc(collection(db, 'militaries'), safeRg);
        batch.set(docRef, mData);
        
        total++;
        count++;

        if (count >= 400) {
          setSyncStatus(`Gravando lote (${total}/${rows.length})...`);
          try {
            await batch.commit();
          } catch (e: any) {
             console.error('[Sync] Batch failed:', e);
             // Continue to next batch
          }
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      setSyncStatus(`Sucesso! ${total} militares sincronizados.`);
      setTimeout(() => setSyncStatus(''), 5000);
    } catch (error: any) {
      console.error(error);
      setSyncStatus("Erro: " + error.message);
    } finally {
      setTimeout(() => {
        setSyncing(false);
        if (!syncStatus.includes("Erro")) setSyncStatus('');
      }, 5000);
    }
  };

  // @ts-ignore
  const rawInfo = db?._databaseId;
  let dbInfoStr = '(default)';
  if (rawInfo) {
    if (typeof rawInfo === 'string') dbInfoStr = rawInfo;
    else if (rawInfo.database && typeof rawInfo.database === 'string') dbInfoStr = rawInfo.database;
    else dbInfoStr = JSON.stringify(rawInfo); // Safe fallback to avoid React object error
  }

  return (
    <motion.div 
      initial={false}
      animate={{ height: adminModeActive ? 'auto' : 0, opacity: adminModeActive ? 1 : 0, marginBottom: adminModeActive ? 48 : 0 }}
      className="overflow-hidden"
    >
      <div className="border-2 border-slate-200 shadow-sm bg-amber-50 rounded-xl overflow-hidden mt-4">
        <div className="w-full flex items-center justify-between p-4 border-b-2 border-amber-100 mix-blend-multiply">
          <div className="flex items-center gap-3 relative">
             <div className="bg-amber-500 w-1.5 h-1.5 rounded-full animate-pulse absolute -left-1"></div>
             <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest pl-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Painel Administrativo
             </h3>
          </div>
          <button 
            onClick={onToggleAdminMode}
            className="bg-amber-100/50 text-amber-700 p-1.5 rounded hover:bg-amber-200 transition-colors"
            title="Fechar"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="bg-white p-6 space-y-6">
          {/* Seção 1: Sincronização de Banco de Dados */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">Vincular Efetivo (Modo Direto)</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Sincronizando com: <span className="text-amber-500 font-black">{dbInfoStr}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="bg-amber-600 text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-700 disabled:opacity-50 transition-all border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 min-w-[200px] justify-center"
            >
              {syncing ? syncStatus : 'Executar Sincronização Direta'}
            </button>
            {syncing && <div className="text-[8px] text-amber-500 font-black animate-pulse">GRAVANDO NO FIREBASE...</div>}
          </div>
        </div>
      </div>

      {/* Seção 2: Configuração de Calendário */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Períodos Abertos para Permuta</h3>
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Selecione os meses em que as solicitações estão autorizadas</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-800 text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black disabled:opacity-50 transition-all"
          >
            {saving ? 'Gravando...' : (
              <>
                <Save className="w-3.5 h-3.5" />
                Salvar Meses Selecionados
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {months.map((m) => {
            const isActive = openMonths.includes(m.index);
            return (
              <button
                key={m.index}
                onClick={() => toggleMonth(m.index)}
                className={`p-3 rounded border text-[10px] font-black uppercase tracking-tighter transition-all flex items-center justify-between ${
                  isActive 
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-400 opacity-60 grayscale hover:grayscale-0'
                }`}
              >
                {m.name}
                {isActive && <Check className="w-3 h-3 text-amber-600" />}
              </button>
            );
          })}
        </div>
        </div>

      {/* Seção 3: Configuração da Ala de Referência */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Referência de Alas</h3>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Defina o ano base e a ala que trabalha no dia 01/01</p>
            </div>
          </div>
          <button 
            onClick={handleSaveAlaConfig}
            disabled={savingAla}
            className="bg-indigo-600 text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {savingAla ? 'Gravando...' : (
              <>
                <Save className="w-3.5 h-3.5" />
                Salvar Regra
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
           <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ano de Referência</label>
              <input
                type="number"
                value={alaConfig.referenceYear}
                onChange={(e) => setAlaConfig({ ...alaConfig, referenceYear: parseInt(e.target.value) || 2026 })}
                className="w-full border-2 border-slate-200 rounded p-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
              />
           </div>
           <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Qual Ala trabalha em 01/01?</label>
              <select
                value={alaConfig.startAla}
                onChange={(e) => setAlaConfig({ ...alaConfig, startAla: parseInt(e.target.value) || 1 })}
                className="w-full border-2 border-slate-200 rounded p-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
              >
                 <option value={1}>ALA 1</option>
                 <option value={2}>ALA 2</option>
                 <option value={3}>ALA 3</option>
                 <option value={4}>ALA 4</option>
              </select>
           </div>
        </div>
        <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed border-l-2 border-indigo-200 pl-3">
          Essa configuração molda a distribuição de todas as escalas (de 1/1 até 31/12). Ao salvar, os dados passarão a utilizar a escala partindo do dia 1 de janeiro do ano de referência até o proximo. O App irá recarregar.
        </p>
      </div>

      {/* Seção 4: Configuração de Escalantes */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-tight">Gerenciar Escalantes</h3>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Atribua permissões de aprovação de permuta para outros militares</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
           <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digite o RG (ex: 23609)"
                value={newEscalante}
                onChange={(e) => setNewEscalante(e.target.value)}
                className="flex-1 border-2 border-slate-200 rounded p-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
              />
              <button 
                onClick={handleAddEscalante}
                disabled={savingEscalantes || !newEscalante.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {savingEscalantes ? 'Gravando...' : (
                  <>
                    <Plus className="w-4 h-4" />
                    Adicionar à lista
                  </>
                )}
              </button>
           </div>
           
           <div className="flex flex-col gap-2">
             {escalanteRGs.length === 0 ? (
               <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                 Nenhum escalante cadastrado
               </div>
             ) : (
               <ul className="divide-y divide-slate-100 border border-slate-200 rounded overflow-hidden">
                 {escalanteRGs.map((rg) => (
                   <li key={rg} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors">
                     <span className="text-sm font-black text-slate-700 tracking-wide">RG: {rg}</span>
                     <button
                       onClick={() => handleRemoveEscalante(rg)}
                       disabled={savingEscalantes}
                       className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                       title="Remover Escalante"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </li>
                 ))}
               </ul>
             )}
           </div>
        </div>
        <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed border-l-2 border-blue-200 pl-3">
          Militares nesta lista terão acesso a um Modo Escalante. Ao ativarem esse modo, poderão gerenciar as tabelas de permuta na Dashboard (Aprovar, Reprovar e Arquivar) assim como o Administrador faz, porém continuarão não tendo acesso a este Painel de Administração.
        </p>
      </div>

      {/* Seção 5: Configuração de Visibilidade */}
      <AppVisibilityConfig />

        </div>
      </div>
    </motion.div>
  );
}
