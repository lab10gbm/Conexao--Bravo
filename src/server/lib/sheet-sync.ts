import axios from 'axios';
import { parse } from 'csv-parse/sync';
import path from 'path';
import fs from 'fs';
import { FieldValue } from 'firebase-admin/firestore';
import { serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { resolveCanonicalScope } from '../../lib/canonicalScope';

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

    const injectedMilitaries = [
      // Ala 3
      { 'RG': "20955", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE ALEX", 'N.Guerra': "ALEX", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "23518", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE MAGALHAES", 'N.Guerra': "MAGALHAES", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "26029", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE ALEXSANDRO", 'N.Guerra': "ALEXSANDRO", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "31610", 'Posto/Grad': "1º SARGENTO", 'NOME': "1º SARGENTO S JUNIOR", 'N.Guerra': "S JUNIOR", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "32102", 'Posto/Grad': "1º SARGENTO", 'NOME': "1º SARGENTO LUIS", 'N.Guerra': "LUIS", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "42998", 'Posto/Grad': "2º SARGENTO", 'NOME': "2º SARGENTO CLEBER", 'N.Guerra': "CLEBER", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "43427", 'Posto/Grad': "2º SARGENTO", 'NOME': "2º SARGENTO THIAGO AZEVEDO", 'N.Guerra': "THIAGO AZEVEDO", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "53754", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO STEINER", 'N.Guerra': "STEINER", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "53786", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO KROWN", 'N.Guerra': "KROWN", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "53819", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO GRANJA", 'N.Guerra': "GRANJA", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54211", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO SALES", 'N.Guerra': "SALES", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54309", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO L SOBRAL", 'N.Guerra': "L SOBRAL", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54315", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO MACHADO", 'N.Guerra': "MACHADO", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54316", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO JULIO CESAR", 'N.Guerra': "JULIO CESAR", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54323", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO VALENTIM", 'N.Guerra': "VALENTIM", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54325", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO L RODRIGUES", 'N.Guerra': "L RODRIGUES", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54326", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO TAVARES", 'N.Guerra': "TAVARES", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54364", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO THIAGO CARVALHO", 'N.Guerra': "THIAGO CARVALHO", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54381", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO PATRICK", 'N.Guerra': "PATRICK", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54991", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO MIERS", 'N.Guerra': "MIERS", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "61302", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO OLIVEIRA", 'N.Guerra': "OLIVEIRA", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "61427", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO ELIAS", 'N.Guerra': "ELIAS", 'ALA': "3", 'OBM': "10º GBM" },
      // Ala 4
      { 'RG': "20936", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE LUCIANO", 'N.Guerra': "LUCIANO", 'Quadro': "Q00/97", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "20960", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE GONCALVES", 'N.Guerra': "GONCALVES", 'Quadro': "Q02/97", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "22333", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE COUTO", 'N.Guerra': "COUTO", 'Quadro': "Q00/97", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "27899", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE S OLIVEIRA", 'N.Guerra': "S OLIVEIRA", 'Quadro': "Q00/00", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "31607", 'Posto/Grad': "1º SARGENTO", 'NOME': "1º SARGENTO ROSARIO", 'N.Guerra': "ROSARIO", 'Quadro': "Q08/02", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "42374", 'Posto/Grad': "2º SARGENTO", 'NOME': "2º SARGENTO SCRIVANO", 'N.Guerra': "SCRIVANO", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "49628", 'Posto/Grad': "CABO", 'NOME': "CABO TEIXEIRA", 'N.Guerra': "TEIXEIRA", 'Quadro': "Q00/14", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "53759", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO RIBEIRO", 'N.Guerra': "RIBEIRO", 'Quadro': "Q00/21", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54028", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO JOSEPH", 'N.Guerra': "JOSEPH", 'Quadro': "Q07/24", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54320", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO VICTOR HUGO", 'N.Guerra': "VICTOR HUGO", 'Quadro': "Q08/24", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54409", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO RENAN GOMES", 'N.Guerra': "RENAN GOMES", 'Quadro': "Q08/24", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54429", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO MOISES", 'N.Guerra': "MOISES", 'Quadro': "Q08/24", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54956", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO ARTHUR", 'N.Guerra': "ARTHUR", 'Quadro': "Q08/25", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "61109", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO MATHEUS SANTOS", 'N.Guerra': "MATHEUS SANTOS", 'Quadro': "Q02/25", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "61385", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO F LOPES", 'N.Guerra': "F LOPES", 'Quadro': "Q02/25", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "61471", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO FERRAZ", 'N.Guerra': "FERRAZ", 'Quadro': "Q02/25", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "2200839", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO EMMANUEL FERREIRA", 'N.Guerra': "EMMANUEL FERREIRA", 'Quadro': "TEMP/00/22", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "2200848", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO GABRIEL", 'N.Guerra': "GABRIEL", 'Quadro': "TEMP/00/22", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "2201179", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO NATÁLIA TAVARES", 'N.Guerra': "NATÁLIA TAVARES", 'Quadro': "TEMP/00/22", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "2201188", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO YAGO VICTOR", 'N.Guerra': "YAGO VICTOR", 'Quadro': "TEMP/00/22", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "61434", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO CAIQUE", 'N.Guerra': "CAIQUE", 'Quadro': "Q08/25", 'ALA': "4", 'OBM': "10º GBM" }
    ];

    records.push(...injectedMilitaries);

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
