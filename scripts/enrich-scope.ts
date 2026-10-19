/**
 * CONEXÃO BRAVO — Script de Linha de Comando para Enriquecimento de Escopo
 * 
 * Uso:
 *   npx tsx scripts/enrich-scope.ts              (Roda em modo DRY-RUN seguro)
 *   npx tsx scripts/enrich-scope.ts --dry-run    (Explícito)
 *   npx tsx scripts/enrich-scope.ts --execute    (Executa a gravação em lotes)
 *   npx tsx scripts/enrich-scope.ts --collection=militaries
 */

import path from 'path';
import fs from 'fs';
import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { enrichDatabaseScope } from '../src/server/lib/scope-enricher';

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const dryRun = !isExecute;

  const collectionArg = args.find(a => a.startsWith('--collection='));
  const collections = collectionArg ? [collectionArg.split('=')[1]] : undefined;

  const limitArg = args.find(a => a.startsWith('--limit='));
  const limitPerCollection = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  // Carrega configuração do Firebase
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ Arquivo firebase-applet-config.json não encontrado.');
    process.exit(1);
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const targetDbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : '(default)';

  let adminDb: any = null;
  let clientDb: any = null;
  let isDbHealthy = false;

  // 1. Tenta inicializar com Service Account (Admin SDK)
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const saFile = path.join(process.cwd(), 'service-account.json');

  if (saEnv || fs.existsSync(saFile)) {
    try {
      const sa = saEnv ? JSON.parse(saEnv) : JSON.parse(fs.readFileSync(saFile, 'utf8'));
      if (sa.private_key) {
        sa.private_key = sa.private_key.replace(/\\n/g, '\n');
      }
      const app = initAdminApp({
        credential: cert(sa),
        projectId: sa.project_id
      });
      adminDb = getAdminFirestore(app, targetDbId);
      isDbHealthy = true;
      console.log('✅ Conectado via Firebase Admin SDK com Service Account.');
    } catch (e: any) {
      console.warn('⚠️ Falha ao inicializar Admin SDK:', e.message);
    }
  }

  // 2. Se Admin SDK não estiver disponível, inicializa Client SDK autenticado
  if (!isDbHealthy) {
    try {
      const clientApp = initializeApp(firebaseConfig);
      clientDb = initializeFirestore(clientApp, { experimentalForceLongPolling: true }, targetDbId);
      const auth = getAuth(clientApp);
      await signInAnonymously(auth);
      console.log('✅ Conectado via Firebase Client SDK (Sessão Anônima Autenticada).');
    } catch (e: any) {
      console.error('❌ Falha ao conectar via Client SDK:', e.message);
      process.exit(1);
    }
  }

  try {
    const report = await enrichDatabaseScope({
      db: adminDb,
      clientDb,
      isDbHealthy,
      dryRun,
      collections,
      limitPerCollection
    });

    console.log('\nRelatório Resumido:');
    console.table(
      Object.entries(report.collections).map(([name, s]) => ({
        Coleção: name,
        Total: s.totalFound,
        'Já Escopados': s.alreadyScoped,
        'A Enriquecer': s.needsEnrichment,
        Gravados: s.written
      }))
    );

    for (const [coll, summary] of Object.entries(report.collections)) {
      console.log(`\n📌 Distribuição de subunidades em /${coll}:`);
      console.table(
        Object.entries(summary.scopeBreakdown).map(([subunitId, count]) => ({
          Subunidade: subunitId,
          Total: count
        }))
      );
      if (summary.sampleTransformations.length > 0) {
        console.log(`Amorstragem de transformações em /${coll}:`);
        summary.sampleTransformations.forEach(st => {
          console.log(`   • ID: ${st.id} | OBM Original: "${st.rawObm}" => unitId: ${st.resolvedScope.unitId}, subunitId: ${st.resolvedScope.subunitId}`);
        });
      }
    }

    if (dryRun) {
      console.log('\n💡 Para efetivar as alterações no banco de dados, execute:');
      console.log('   npx tsx scripts/enrich-scope.ts --execute\n');
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro durante o enriquecimento:', err.message);
    process.exit(1);
  }
}

main();
