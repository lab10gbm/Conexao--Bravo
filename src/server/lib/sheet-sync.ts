import axios from 'axios';
import { parse } from 'csv-parse/sync';
import path from 'path';
import fs from 'fs';
import { FieldValue } from 'firebase-admin/firestore';
import { serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { resolveCanonicalScope } from '../../lib/canonicalScope.ts';

interface SyncOptions {
  db: any;
  clientDb: any;
  isDbHealthy: boolean;
  militaryCache: Map<string, any>;
  deletedMilitaries: Set<string>;
  normalizeRg: (rg: string | number) => string;
  normalizeObm: (obm: string | null | undefined) => string;
}

export async function syncMilitariesFromSheetInternal(options: SyncOptions): Promise<number> {
  const {
    db,
    clientDb,
    isDbHealthy,
    militaryCache,
    deletedMilitaries,
    normalizeRg,
    normalizeObm,
  } = options;

  try {
    const SHEET_URL =
      'https://docs.google.com/spreadsheets/d/1hfAOPnuqmLGxQCLxrQ4hzpp8ee81Pbgk4aCcYcSIqQs/export?format=csv&gid=1221046524';
    console.log('[Sync] Pulling latest military sheet from:', SHEET_URL);
    const response = await axios.get(SHEET_URL);
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
      from_line: 3,
    }) as any[];
    console.log(`[Sync] Downloaded ${records.length} raw rows from spreadsheet.`);

    let defaultAlasMap: Record<string, any> = {};
    const defaultAlasPath = path.join(
      process.cwd(),
      'src/server/lib/default_alas_composition.json',
    );
    if (fs.existsSync(defaultAlasPath)) {
      try {
        defaultAlasMap = JSON.parse(fs.readFileSync(defaultAlasPath, 'utf8'));
      } catch (e) {}
    }

    let count = 0;
    let adminSuccess = false;

    if (db && isDbHealthy) {
      try {
        let batch = db.batch();
        for (const row of records) {
          if (!row['RG']) continue;
          const safeRg = normalizeRg(row['RG']);
          if (!safeRg || safeRg === 'RG') continue;
          if (deletedMilitaries && deletedMilitaries.has(safeRg)) continue;
          const docRef = db.collection('militaries').doc(safeRg);

          const prevMem1 = militaryCache.get(safeRg) || {};
          const defaultEntry1 = defaultAlasMap[safeRg];
          const preservedAla1 =
            defaultEntry1 && defaultEntry1.ala
              ? defaultEntry1.ala
              : prevMem1.ala ||
                row['ALA'] ||
                row['Ala'] ||
                row['Ala/Horário'] ||
                null;

          const data: any = {
            rg: safeRg,
            name: row['NOME'] || row['Nome'] || null,
            warName: row['N.Guerra'] || row['N.Guerra'] || null,
            rank: row['Posto/Grad'] || row['POSTO/GRAD'] || null,
            ala: preservedAla1,
            obm: row['OBM'] ? normalizeObm(row['OBM']) : null,
            scope: resolveCanonicalScope(row['OBM']),
            email: row['E-mail'] || row['EMAIL'] || null,
            cel: row['Cel'] || row['Celular'] || null,
            tel: row['Tel'] || row['Telefone'] || null,
            cidade: row['Cidade'] || row['CIDADE'] || null,
            endereco: row['Endereco'] || row['ENDEREÇO'] || null,
            situacao:
              row['Situação'] || row['Situacao'] || row['SITUAÇÃO'] || null,
            bolMov: row['Bol. Mov.'] || row['Bol Mov'] || row['BOL MOV'] || null,
            quadro: row['Quadro'] || row['QUADRO'] || null,
            idFuncional:
              row['ID Funcional'] ||
              row['Id Funcional'] ||
              row['ID FUNCIONAL'] ||
              null,
            birthDate:
              row['Nascimento'] ||
              row['NASCIMENTO'] ||
              row['birthDate'] ||
              row['D.Nasc'] ||
              row['DATA DE NASCIMENTO'] ||
              row['DataNasc'] ||
              null,
            nascimento:
              row['Nascimento'] ||
              row['NASCIMENTO'] ||
              row['birthDate'] ||
              row['D.Nasc'] ||
              row['DATA DE NASCIMENTO'] ||
              row['DataNasc'] ||
              null,
            updatedAt: FieldValue.serverTimestamp(),
          };

          for (const key in data) {
            if (data[key] === null || data[key] === undefined) delete data[key];
          }

          if (safeRg === '54444') {
            data.isAdmin = true;
            data.isEscalante = true;
          }

          batch.set(docRef, data, { merge: true });
          const mergedMem1 = { ...prevMem1, ...data };
          if (prevMem1.hasCustomPassword !== undefined)
            mergedMem1.hasCustomPassword = prevMem1.hasCustomPassword;
          if (prevMem1.customPassword)
            mergedMem1.customPassword = prevMem1.customPassword;
          militaryCache.set(safeRg, mergedMem1);
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
      } catch (adminErr: any) {
        console.warn(
          '[Sync] Admin SDK sync failed, falling back to Client SDK:',
          adminErr.message,
        );
      }
    }

    if (!adminSuccess && clientDb) {
      let batch = writeBatch(clientDb);
      for (const row of records) {
        if (!row['RG']) continue;
        const safeRg = normalizeRg(row['RG']);
        if (!safeRg || safeRg === 'RG') continue;
        if (deletedMilitaries && deletedMilitaries.has(safeRg)) continue;
        const docRef = doc(clientDb, 'militaries', safeRg);

        const prevMem2 = militaryCache.get(safeRg) || {};
        const defaultEntry2 = defaultAlasMap[safeRg];
        const preservedAla2 =
          defaultEntry2 && defaultEntry2.ala
            ? defaultEntry2.ala
            : prevMem2.ala ||
              row['ALA'] ||
              row['Ala'] ||
              row['Ala/Horário'] ||
              null;

        const data: any = {
          rg: safeRg,
          name: row['NOME'] || row['Nome'] || null,
          warName: row['N.Guerra'] || row['N.Guerra'] || null,
          rank: row['Posto/Grad'] || row['POSTO/GRAD'] || null,
          ala: preservedAla2,
          obm: row['OBM'] ? normalizeObm(row['OBM']) : null,
          email: row['E-mail'] || row['EMAIL'] || null,
          cel: row['Cel'] || row['Celular'] || null,
          tel: row['Tel'] || row['Telefone'] || null,
          cidade: row['Cidade'] || row['CIDADE'] || null,
          endereco: row['Endereco'] || row['ENDEREÇO'] || null,
          situacao:
            row['Situação'] || row['Situacao'] || row['SITUAÇÃO'] || null,
          bolMov: row['Bol. Mov.'] || row['Bol Mov'] || row['BOL MOV'] || null,
          quadro: row['Quadro'] || row['QUADRO'] || null,
          idFuncional:
            row['ID Funcional'] ||
            row['Id Funcional'] ||
            row['ID FUNCIONAL'] ||
            null,
          birthDate:
            row['Nascimento'] ||
            row['NASCIMENTO'] ||
            row['birthDate'] ||
            row['D.Nasc'] ||
            row['DATA DE NASCIMENTO'] ||
            row['DataNasc'] ||
            null,
          nascimento:
            row['Nascimento'] ||
            row['NASCIMENTO'] ||
            row['birthDate'] ||
            row['D.Nasc'] ||
            row['DATA DE NASCIMENTO'] ||
            row['DataNasc'] ||
            null,
          updatedAt: serverTimestamp(),
        };

        for (const key in data) {
          if (data[key] === null || data[key] === undefined) delete data[key];
        }

        if (safeRg === '54444') {
          data.isAdmin = true;
          data.isEscalante = true;
        }

        batch.set(docRef, data, { merge: true });
        const mergedMem2 = { ...prevMem2, ...data };
        if (prevMem2.hasCustomPassword !== undefined)
          mergedMem2.hasCustomPassword = prevMem2.hasCustomPassword;
        if (prevMem2.customPassword)
          mergedMem2.customPassword = prevMem2.customPassword;
        militaryCache.set(safeRg, mergedMem2);
        count++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(clientDb);
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }
    }

    console.log(
      `[Sync] Successfully synchronized ${count} militaries to Firestore & local cache.`,
    );
    return count;
  } catch (err: any) {
    console.error('[Sync] Error synchronizing militaries:', err.message);
    throw err;
  }
}
