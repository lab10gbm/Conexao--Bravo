import path from 'path';
import fs from 'fs';
import { FieldValue } from 'firebase-admin/firestore';
import { doc, writeBatch } from 'firebase/firestore';

export interface MedicosSyncOptions {
  db: any;
  clientDb: any;
  isDbHealthy: boolean;
  militaryCache: Map<string, any>;
  deletedMilitaries?: Set<string>;
  normalizeRg: (rg: string | number) => string;
  normalizeObm: (obm: string | null | undefined) => string;
  incrementCacheVersion?: () => number;
}

export function mapRegiaoCba(obm: string): { regiao: string; cba: string } {
  const o = (obm || '').toUpperCase();
  if (o.includes('COSTA VERDE') || o.includes('10º GBM') || o.includes('26º GBM')) {
    return { regiao: 'Costa Verde', cba: 'CBA VII' };
  }
  if (o.includes('GSE') || o.includes('SOCORRO DE EMERGÊNCIA')) {
    return { regiao: 'GSE (Estadual)', cba: 'CBA VIII / GSE' };
  }
  if (
    o.includes('HCAP') ||
    o.includes('HOSPITAL CENTRAL') ||
    o.includes('DGS') ||
    o.includes('DIRETORIA-GERAL DE SAÚDE') ||
    o.includes('CPM') ||
    o.includes('PERÍCIAS MÉDICAS') ||
    o.includes('COAPH')
  ) {
    return { regiao: 'Capital (Complexo de Saúde)', cba: 'CBA I' };
  }
  if (o.includes('1ª POLICLÍNICA') || o.includes('CAMPINHO') || o.includes('CTQUIM')) {
    return { regiao: 'Capital (Campinho)', cba: 'CBA I' };
  }
  if (o.includes('2ª POLICLÍNICA') || o.includes('NOVA IGUAÇU')) {
    return { regiao: 'Baixada Fluminense', cba: 'CBA VI' };
  }
  if (o.includes('3ª POLICLÍNICA') || o.includes('NITERÓI')) {
    return { regiao: 'Metropolitana', cba: 'CBA IX' };
  }
  if (o.includes('4ª POLICLÍNICA') || o.includes('CAMPOS')) {
    return { regiao: 'Norte-Noroeste', cba: 'CBA IV' };
  }
  if (o.includes('SUL')) {
    return { regiao: 'Sul Fluminense', cba: 'CBA III' };
  }
  if (o.includes('SERRANA') || o.includes('TERESÓPOLIS')) {
    return { regiao: 'Serrana', cba: 'CBA II' };
  }
  if (o.includes('NORTE-NOROESTE')) {
    return { regiao: 'Norte-Noroeste', cba: 'CBA IV' };
  }
  if (o.includes('LITORÂNEA')) {
    return { regiao: 'Baixada Litorânea', cba: 'CBA V' };
  }
  if (o.includes('GMAR')) {
    return { regiao: 'Salvamento Marítimo', cba: 'CBA X' };
  }
  if (o.includes('GOA')) {
    return { regiao: 'Atividades Especializadas', cba: 'CBA VIII' };
  }
  if (
    o.includes('DGP/OE') ||
    o.includes('SECRETARIA') ||
    o.includes('ALERJ') ||
    o.includes('PGE') ||
    o.includes('TRIBUNAL') ||
    o.includes('PREFEITURA')
  ) {
    return { regiao: 'Órgãos Externos / DGP', cba: 'DGP/OE' };
  }
  return { regiao: 'Geral CBMERJ', cba: 'CBMERJ' };
}

export function loadMedicosJson(): any[] {
  const jsonPath = path.join(process.cwd(), 'src/server/data/medicos_cbmerj.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e: any) {
      console.warn('[MedicosSync] Error reading medicos_cbmerj.json:', e.message);
    }
  }
  return [];
}

export async function syncMedicosInternal(options: MedicosSyncOptions): Promise<number> {
  const {
    db,
    clientDb,
    isDbHealthy,
    militaryCache,
    deletedMilitaries,
    normalizeRg,
    normalizeObm,
    incrementCacheVersion,
  } = options;

  const medicos = loadMedicosJson();
  if (medicos.length === 0) {
    console.warn('[MedicosSync] No doctors found in medicos_cbmerj.json');
    return 0;
  }

  console.log(`[MedicosSync] Starting sync of ${medicos.length} medical officers...`);

  let count = 0;
  let adminSuccess = false;

  if (db && isDbHealthy) {
    try {
      let batch = db.batch();
      for (const item of medicos) {
        const safeRg = normalizeRg(item.rg);
        if (!safeRg || safeRg === 'RG') continue;
        if (deletedMilitaries && deletedMilitaries.has(safeRg)) continue;

        const docRef = db.collection('militaries').doc(safeRg);
        const prev = militaryCache.get(safeRg) || {};

        const isGse = item.gse || item.obm?.toUpperCase().includes('GSE') || item.obm?.toUpperCase().includes('SOCORRO DE EMERGÊNCIA');
        const { regiao, cba } = mapRegiaoCba(item.obm);

        const data: any = {
          rg: safeRg,
          name: item.name || prev.name || null,
          warName: item.warName || prev.warName || null,
          rank: item.rank || prev.rank || null,
          quadro: item.quadro || prev.quadro || 'QOS/Méd',
          isOficial: true,
          isMedico: true,
          gse: Boolean(isGse),
          idFuncional: item.idFuncional || prev.idFuncional || null,
          admissionDate: item.admissionDate || item.ingresso || prev.admissionDate || null,
          ingresso: item.ingresso || item.admissionDate || prev.ingresso || null,
          regiao: prev.regiao || regiao,
          cba: prev.cba || cba,
          obmOrigem: item.obm || prev.obmOrigem || null,
          obm: prev.obm ? normalizeObm(prev.obm) : (item.obm ? normalizeObm(item.obm) : null),
          ala: prev.ala || item.ala || 'EXP',
          situacao: prev.situacao || item.situacao || 'ATIVO',
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (item.funcao) data.funcao = item.funcao;
        if (item.tempoFuncao) data.tempoFuncao = item.tempoFuncao;
        if (prev.obmAtuacao) data.obmAtuacao = prev.obmAtuacao;

        // Limpa campos nulos ou indefinidos
        for (const k in data) {
          if (data[k] === null || data[k] === undefined) delete data[k];
        }

        batch.set(docRef, data, { merge: true });
        const merged = { ...prev, ...data };
        militaryCache.set(safeRg, merged);
        count++;

        if (count % 450 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }

      if (count % 450 !== 0) {
        await batch.commit();
      }
      adminSuccess = true;
      console.log(`[MedicosSync] Successfully synced ${count} doctors via Admin SDK.`);
    } catch (err: any) {
      console.warn('[MedicosSync] Admin SDK sync notice, attempting Client SDK:', err.message);
    }
  }

  if (!adminSuccess && clientDb) {
    try {
      let batch = writeBatch(clientDb);
      for (const item of medicos) {
        const safeRg = normalizeRg(item.rg);
        if (!safeRg || safeRg === 'RG') continue;
        if (deletedMilitaries && deletedMilitaries.has(safeRg)) continue;

        const docRef = doc(clientDb, 'militaries', safeRg);
        const prev = militaryCache.get(safeRg) || {};

        const isGse = item.gse || item.obm?.toUpperCase().includes('GSE') || item.obm?.toUpperCase().includes('SOCORRO DE EMERGÊNCIA');
        const { regiao, cba } = mapRegiaoCba(item.obm);

        const data: any = {
          rg: safeRg,
          name: item.name || prev.name || null,
          warName: item.warName || prev.warName || null,
          rank: item.rank || prev.rank || null,
          quadro: item.quadro || prev.quadro || 'QOS/Méd',
          isOficial: true,
          isMedico: true,
          gse: Boolean(isGse),
          idFuncional: item.idFuncional || prev.idFuncional || null,
          admissionDate: item.admissionDate || item.ingresso || prev.admissionDate || null,
          ingresso: item.ingresso || item.admissionDate || prev.ingresso || null,
          regiao: prev.regiao || regiao,
          cba: prev.cba || cba,
          obmOrigem: item.obm || prev.obmOrigem || null,
          obm: prev.obm ? normalizeObm(prev.obm) : (item.obm ? normalizeObm(item.obm) : null),
          ala: prev.ala || item.ala || 'EXP',
          situacao: prev.situacao || item.situacao || 'ATIVO',
          updatedAt: new Date().toISOString(),
        };

        if (item.funcao) data.funcao = item.funcao;
        if (item.tempoFuncao) data.tempoFuncao = item.tempoFuncao;
        if (prev.obmAtuacao) data.obmAtuacao = prev.obmAtuacao;

        for (const k in data) {
          if (data[k] === null || data[k] === undefined) delete data[k];
        }

        batch.set(docRef, data, { merge: true });
        const merged = { ...prev, ...data };
        militaryCache.set(safeRg, merged);
        count++;

        if (count % 450 === 0) {
          await batch.commit();
          batch = writeBatch(clientDb);
        }
      }

      if (count % 450 !== 0) {
        await batch.commit();
      }
      console.log(`[MedicosSync] Successfully synced ${count} doctors via Client SDK.`);
    } catch (clientErr: any) {
      console.error('[MedicosSync] Client SDK sync error:', clientErr.message);
    }
  }

  if (incrementCacheVersion) {
    incrementCacheVersion();
  }

  return count;
}
