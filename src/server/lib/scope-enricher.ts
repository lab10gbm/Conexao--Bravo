/**
 * CONEXÃO BRAVO — Mecanismo de Enriquecimento de Escopo Canônico
 * 
 * Função:
 * - Lê coleções operacionais (/militaries, /permutas, /registro_escalas_24h, /ras_opportunities)
 * - Aplica o resolver canônico resolveCanonicalScope()
 * - Injeta o campo scope: { orgId, cbaId, unitId, subunitId } de forma não-destrutiva (merge)
 * - Respeita rigorosamente a cota gratuita do Firebase Spark Plan (R$ 0,00 de custo)
 * - Suporta execução com dry-run (simulação) obrigatória por padrão
 */

import { resolveCanonicalScope, formatScopeLabel, isSameScope } from '../../lib/canonicalScope.ts';
import type { ScopeContext } from '../../types/scope.ts';
import {
  collection,
  getDocs,
  doc as clientDocRef,
  writeBatch as clientWriteBatch,
  query,
  limit as clientLimit
} from 'firebase/firestore';

export interface EnrichmentOptions {
  db?: any;                  // Admin SDK Firestore instance
  clientDb?: any;            // Client SDK Firestore instance
  isDbHealthy?: boolean;     // Se Admin SDK está saudável com Service Account
  dryRun?: boolean;          // true: simula sem gravar; false: efetiva gravação
  collections?: string[];    // Coleções a processar (default: todas)
  limitPerCollection?: number; // Limite opcional para testes
  militaryCache?: Map<string, any>; // Cache em memória do servidor
}

export interface CollectionEnrichmentSummary {
  collectionName: string;
  totalFound: number;
  alreadyScoped: number;
  needsEnrichment: number;
  written: number;
  scopeBreakdown: Record<string, number>;
  sampleTransformations: Array<{
    id: string;
    rawObm?: string;
    previousScope?: ScopeContext | null;
    resolvedScope: ScopeContext;
  }>;
}

export interface EnrichmentReport {
  timestamp: string;
  dryRun: boolean;
  totalFound: number;
  totalAlreadyScoped: number;
  totalNeedingEnrichment: number;
  totalWritten: number;
  collections: Record<string, CollectionEnrichmentSummary>;
}

const DEFAULT_COLLECTIONS = [
  'militaries',
  'permutas',
  'registro_escalas_24h',
  'ras_opportunities'
];

export async function enrichDatabaseScope(options: EnrichmentOptions): Promise<EnrichmentReport> {
  const {
    db: adminDb,
    clientDb,
    isDbHealthy = false,
    dryRun = true,
    collections = DEFAULT_COLLECTIONS,
    limitPerCollection,
    militaryCache
  } = options;

  const useAdmin = Boolean(isDbHealthy && adminDb);
  if (!useAdmin && !clientDb) {
    throw new Error('[ScopeEnricher] Nenhum banco de dados disponível (nem Admin SDK nem Client SDK).');
  }

  const report: EnrichmentReport = {
    timestamp: new Date().toISOString(),
    dryRun,
    totalFound: 0,
    totalAlreadyScoped: 0,
    totalNeedingEnrichment: 0,
    totalWritten: 0,
    collections: {}
  };

  console.log(`\n======================================================`);
  console.log(`🚀 CONEXÃO BRAVO — ENRIQUECIMENTO DE ESCOPO CANÔNICO`);
  console.log(`Modo: ${dryRun ? '🔍 DRY-RUN (SIMULAÇÃO SEGURA - NENHUMA ESCRITA)' : '⚡ EXECUÇÃO REAL (GRAVAÇÃO EM BATCH)'}`);
  console.log(`Motor de Banco: ${useAdmin ? 'Firebase Admin SDK' : 'Firebase Client SDK'}`);
  console.log(`Coleções-alvo: ${collections.join(', ')}`);
  console.log(`======================================================\n`);

  for (const collName of collections) {
    console.log(`\n📂 Analisando coleção: /${collName}...`);

    const summary: CollectionEnrichmentSummary = {
      collectionName: collName,
      totalFound: 0,
      alreadyScoped: 0,
      needsEnrichment: 0,
      written: 0,
      scopeBreakdown: {},
      sampleTransformations: []
    };

    // 1. Leitura dos documentos
    const docsToProcess: Array<{ id: string; data: any }> = [];

    if (useAdmin) {
      let q: any = adminDb.collection(collName);
      if (limitPerCollection && limitPerCollection > 0) {
        q = q.limit(limitPerCollection);
      }
      const snapshot = await q.get();
      snapshot.forEach((d: any) => {
        docsToProcess.push({ id: d.id, data: d.data() });
      });
    } else {
      let q: any = collection(clientDb, collName);
      if (limitPerCollection && limitPerCollection > 0) {
        q = query(q, clientLimit(limitPerCollection));
      }
      const snapshot = await getDocs(q);
      snapshot.forEach((d: any) => {
        docsToProcess.push({ id: d.id, data: d.data() });
      });
    }

    summary.totalFound = docsToProcess.length;
    console.log(`   -> Total de documentos lidos: ${summary.totalFound}`);

    const updatesQueue: Array<{ id: string; resolvedScope: ScopeContext }> = [];

    // 2. Análise de cada documento
    for (const item of docsToProcess) {
      const { id, data } = item;
      const rawObm = data.obm || data.requesterObm || data.unit || null;
      const resolvedScope = resolveCanonicalScope(rawObm);

      // Contabiliza distribuição por subunidade
      summary.scopeBreakdown[resolvedScope.subunitId] = (summary.scopeBreakdown[resolvedScope.subunitId] || 0) + 1;

      const hasExactScope = data.scope && isSameScope(data.scope, resolvedScope);

      if (hasExactScope) {
        summary.alreadyScoped++;
      } else {
        summary.needsEnrichment++;
        updatesQueue.push({ id, resolvedScope });

        if (summary.sampleTransformations.length < 5) {
          summary.sampleTransformations.push({
            id,
            rawObm: rawObm || '(vazio/não definido)',
            previousScope: data.scope || null,
            resolvedScope
          });
        }
      }
    }

    console.log(`   -> Já escopados: ${summary.alreadyScoped}`);
    console.log(`   -> Necessitam enriquecimento: ${summary.needsEnrichment}`);

    // 3. Gravação em lotes (somente se dryRun === false)
    if (!dryRun && updatesQueue.length > 0) {
      console.log(`   ⚡ Gravando ${updatesQueue.length} atualizações em lotes (batch)...`);
      const BATCH_SIZE = 400; // Margem de segurança abaixo de 500
      let batchIndex = 0;

      for (let i = 0; i < updatesQueue.length; i += BATCH_SIZE) {
        batchIndex++;
        const chunk = updatesQueue.slice(i, i + BATCH_SIZE);

        if (useAdmin) {
          const batch = adminDb.batch();
          for (const upd of chunk) {
            const ref = adminDb.collection(collName).doc(upd.id);
            batch.set(ref, { scope: upd.resolvedScope }, { merge: true });
          }
          await batch.commit();
        } else {
          const batch = clientWriteBatch(clientDb);
          for (const upd of chunk) {
            const ref = clientDocRef(clientDb, collName, upd.id);
            batch.set(ref, { scope: upd.resolvedScope }, { merge: true });
          }
          await batch.commit();
        }

        // Atualiza cache em memória do servidor para militaries
        if (collName === 'militaries' && militaryCache) {
          for (const upd of chunk) {
            const cached = militaryCache.get(upd.id);
            if (cached) {
              cached.scope = upd.resolvedScope;
              militaryCache.set(upd.id, cached);
            }
          }
        }

        summary.written += chunk.length;
        console.log(`   [Lote ${batchIndex}] ${summary.written}/${updatesQueue.length} documentos atualizados com sucesso.`);
      }
    }

    report.collections[collName] = summary;
    report.totalFound += summary.totalFound;
    report.totalAlreadyScoped += summary.alreadyScoped;
    report.totalNeedingEnrichment += summary.needsEnrichment;
    report.totalWritten += summary.written;
  }

  console.log(`\n======================================================`);
  console.log(`🏁 RESULTADO GERAL DO ENRIQUECIMENTO:`);
  console.log(`- Documentos avaliados: ${report.totalFound}`);
  console.log(`- Já em conformidade canônica: ${report.totalAlreadyScoped}`);
  console.log(`- Necessitam de escopo: ${report.totalNeedingEnrichment}`);
  console.log(`- Documentos gravados: ${report.totalWritten} (dryRun = ${dryRun})`);
  console.log(`======================================================\n`);

  return report;
}
