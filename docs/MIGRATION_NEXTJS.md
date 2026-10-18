# 🚀 Guia de Migração: CONEXÃO-BRAVO ➔ Next.js (App Router)

Este documento mapeia exatamente como a base de código do **CONEXÃO-BRAVO** se conecta à arquitetura moderna do **Next.js 15 (App Router)**.

---

## 🏛️ 1. Mapeamento de Rotas (React Router ➔ Next.js App Router)

Todas as telas do aplicativo foram divididas em grupos lógicos `(auth)` e `(dashboard)` para manter o layout, cabeçalho e navegação fluidos.

| Rota Atual (Vite / React Router) | Rota Next.js (App Router) | Componente Principal |
| :--- | :--- | :--- |
| `/` | `app/(dashboard)/page.tsx` | [`HomePortal.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/HomePortal.tsx) |
| `/login` | `app/(auth)/login/page.tsx` | [`Login.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/Login.tsx) |
| `/permutas` | `app/(dashboard)/permutas/page.tsx` | [`PermutaModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/PermutaModule.tsx) + [`PermutaBoard.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/PermutaBoard.tsx) |
| `/ras` | `app/(dashboard)/ras/page.tsx` | [`RasClientModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/RasClientModule.tsx) & [`RasManagerModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/RasManagerModule.tsx) |
| `/escalante-gerenciar` | `app/(dashboard)/escalante/page.tsx` | [`EscalaEspelhoModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/EscalaEspelhoModule.tsx) |
| `/efetivo` | `app/(dashboard)/efetivo/page.tsx` | [`EfetivoPanel.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/EfetivoPanel.tsx) |
| `/ferias` | `app/(dashboard)/ferias/page.tsx` | [`VacationModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/features/ferias/VacationModule.tsx) |
| `/expediente` | `app/(dashboard)/expediente/page.tsx` | [`ExpedienteScheduler.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/features/expediente/ExpedienteScheduler.tsx) |
| `/grd` | `app/(dashboard)/grd/page.tsx` | [`GrdModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/GrdModule.tsx) |
| `/patrimonio` | `app/(dashboard)/patrimonio/page.tsx` | [`PatrimonyModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/features/patrimonio/PatrimonyModule.tsx) |
| `/refeitorio` | `app/(dashboard)/refeitorio/page.tsx` | [`RefeitorioModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/RefeitorioModule.tsx) |
| `/aprovisionamento` | `app/(dashboard)/aprovisionamento/page.tsx` | [`AprovisionamentoModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/features/aprovisionamento/AprovisionamentoModule.tsx) |
| `/translado` | `app/(dashboard)/translado/page.tsx` | [`TransladoModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/features/translado/TransladoModule.tsx) |
| `/perfil` | `app/(dashboard)/perfil/page.tsx` | [`MilitaryProfile.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/MilitaryProfile.tsx) |
| `/configuracoes` | `app/(dashboard)/configuracoes/page.tsx` | [`ConfiguracoesModule.tsx`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/components/ConfiguracoesModule.tsx) |

---

## 📂 2. Árvore de Diretórios Sugerida no Next.js

```text
CONEXAO-BRAVO/
├── app/
│   ├── layout.tsx                     # Root Layout (HTML, Body, Fontes, globals.css)
│   ├── providers.tsx                  # "use client" (ConfigProvider, MilitarProvider)
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx               # Tela de Login do CBMERJ
│   ├── (dashboard)/
│   │   ├── layout.tsx                 # Layout autenticado (contém <Header /> e seletor OBM)
│   │   ├── page.tsx                   # Portal Inicial (HomePortal)
│   │   ├── permutas/
│   │   │   └── page.tsx               # Módulo de Permutas & Assinaturas
│   │   ├── ras/
│   │   │   └── page.tsx               # Módulo de RAS (Client & Escalante)
│   │   ├── escalante/
│   │   │   └── page.tsx               # Painel da Escala 24h & Espelho
│   │   ├── efetivo/
│   │   │   └── page.tsx               # Quadro Geral de Efetivo
│   │   ├── ferias/
│   │   │   └── page.tsx               # DGP & Afastamentos
│   │   ├── expediente/
│   │   │   └── page.tsx               # Escala de Expediente
│   │   └── ...
│   └── api/
│       ├── military/
│       │   └── route.ts               # Migrado de src/server/routes/military.routes.ts
│       ├── services/
│       │   └── route.ts               # Migrado de src/server/routes/services.routes.ts
│       └── dgp/
│           └── route.ts               # Sincronização DGP
├── src/
│   ├── components/                    # Componentes de UI puros
│   ├── features/                      # Módulos desacoplados (escala24h, permutas, etc.)
│   ├── hooks/                         # Hooks de negócio (useConflitosOperacionais, etc.)
│   ├── lib/                           # Regras centrais (conflitosOperacionais, utils, firebase)
│   └── types.ts                       # Tipagem TypeScript
```

---

## ⚡ 3. Migração da API Express ➔ Next.js Route Handlers

O arquivo Express atual (`src/server/server.ts` e rotas em `src/server/routes/`) mapeia diretamente para os **Route Handlers** do Next.js:

### Exemplo: `app/api/military/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { getMilitariesFromDb } from '@/lib/serverDb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const obm = searchParams.get('obm');
  
  // Mesma lógica de cache e filtragem de OBM que já construímos
  const militars = await getMilitariesFromDb(obm);
  return NextResponse.json(militars);
}
```

---

## 🔒 4. O Que Já Deixamos 100% Compatível e Pronto:

1. **Separação de Camadas:**
   - As regras de validação de conflitos estão puras em [`src/lib/conflitosOperacionais.ts`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/lib/conflitosOperacionais.ts). Elas rodam tanto no Node.js/Edge (Server Components / Route Handlers) quanto no cliente.
2. **Isolamento de OBM:**
   - A função [`getUserObmAccess`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/lib/utils.ts) e [`normalizeObm`](file:///home/helios/Projects-berhartes/CBMERJ/CONEXAO-BRAVO/src/lib/utils.ts) não têm dependências do navegador (`window` ou `localStorage`), prontas para SSR.
3. **Diretiva `"use client"`:**
   - Todos os componentes interativos do Firebase (`onSnapshot`, animações `motion/react`) só precisarão da tag `"use client";` no topo do arquivo.
4. **Sem Pacotes Obsoletos:**
   - Código totalmente tipado com **TypeScript 5.8** e compatível com **React 19**.
