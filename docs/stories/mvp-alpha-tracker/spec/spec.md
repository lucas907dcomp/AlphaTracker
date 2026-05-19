# Spec: AlphaTracker — Sports Arbitrage & Matched Betting Tracker (MVP)

> **Story ID:** mvp-alpha-tracker
> **Complexity:** COMPLEX (score 19/25)
> **Generated:** 2026-05-18
> **Status:** Draft
> **Inputs:** requirements.json · complexity.json · research.json
> **Iteration:** 2 (Revision — aplicando autoFixes CRIT-1..CRIT-7 do critique.json)

---

## 1. Overview

AlphaTracker é uma aplicação web cloud-first para anotação rápida e cálculo de PnL (Profit and Loss) de operações de matched betting e arbitragem esportiva. O foco exclusivo do MVP é **data entry ultrarrápido no celular** e **cálculo correto de PnL** — sem calculadora de odds, sem integrações com bookmakers, sem relatórios avançados além dos agregados básicos.

_Derivado de: FR-1 a FR-12, CON-1, CON-2_

### 1.1 Goals

- Permitir registro instantâneo de Operações com múltiplas Apostas (Legs) via navegação Tab/Enter _(FR-6, NFR-1)_
- Calcular PnL corretamente para todos os cenários: simétrico, assimétrico, Freebet SNR e Duplo Green _(FR-5, FR-4, FR-8)_
- Suportar os 5 tipos de Operação do domínio _(FR-3)_
- Exibir dashboards de PnL diário, semanal e mensal _(FR-9)_
- Funcionar em mobile sem instalação, via browser _(CON-1, NFR-2)_
- Arquitetura multi-tenant desde o início para futura comercialização _(CON-4, FR-10)_

### 1.2 Non-Goals (MVP)

- Calculadora de stakes/odds _(CON-2, OQ-6)_
- Integração com APIs de bookmakers
- Notificações push ou alertas de jogos
- Exportação de relatórios (CSV, PDF)
- Suporte a Freebet SR (Stake Returned) _(ASM-3)_
- Rastreamento de taxas bancárias ou bônus de depósito _(ASM-5)_
- Modo offline / PWA _(NFR-5 trata apenas draft recovery via localStorage)_
- Colaboração entre usuários em tempo real _(research.json: Supabase Realtime excluído do MVP)_

---

## 2. Requirements Summary

### 2.1 Functional Requirements

| ID | Descrição | Priority |
|----|-----------|----------|
| FR-1 | CRUD de Casas de Aposta (Betano, Bet365, etc.) com soft delete | P0 |
| FR-2 | Registro de Operações com N Apostas/Legs (padrão 3, suporta 4-5) | P0 |
| FR-3 | 5 tipos de Operação: Freebet, Extração, SuperOdd, TentativaDuplo, Aposta | P0 |
| FR-4 | Regra Freebet SNR: `isFreebet=true` → custo=0, grossReturn informado pelo usuário | P0 |
| FR-5 | Cálculo de PnL: simétrico (valorPagoFixo) e assimétrico (grossReturn por leg) | P0 |
| FR-6 | Data entry via Tab/Enter, valorPagoFixo para propagação automática, PnL em tempo real | P0 |
| FR-7 | Suporte a Freebet assimétrica: grossReturn individual por leg | P0 |
| FR-8 | Duplo Green: `isDoubleGreen=true` dobra grossReturn efetivo da leg | P1 |
| FR-9 | Dashboards: PnL diário, semanal, mensal + filtro por tipo de operação | P0 |
| FR-10 | Autenticação (email/senha) e isolamento de dados por userId | P1 |
| FR-11 | Edição e exclusão de Apostas e Operações após criação | P1 |
| FR-12 | Marcação de resultado de Operações Pendentes; status Pendente → Concluída | P0 |

### 2.2 Non-Functional Requirements

| ID | Categoria | Requisito | Métrica |
|----|-----------|-----------|---------|
| NFR-1 | Usabilidade | Operação com 3–5 Legs via Tab/Enter | < 15 interações de campo |
| NFR-2 | Usabilidade | Interface responsiva mobile-first | Funcional em viewport 375px sem scroll horizontal |
| NFR-3 | Escalabilidade | Arquitetura multi-tenant | RLS no Supabase por `user_id` em todas as tabelas |
| NFR-4 | Performance | PnL calculado em tempo real | Atualização < 100ms (cálculo local, sem round-trip) |
| NFR-5 | Confiabilidade | Draft de Operação persistido | Recovery via localStorage ao reabrir a aba |

### 2.3 Constraints

| ID | Tipo | Constraint | Impacto |
|----|------|------------|---------|
| CON-1 | Técnico | Aplicação web cloud (não desktop/native) | Stack: SPA + Supabase Cloud + Vercel |
| CON-2 | Negócio | Sem campo de odds no MVP | PnL baseado em grossReturn informado diretamente |
| CON-3 | Técnico | Precisão decimal de até 2 casas | `decimal.js` obrigatório para aritmética |
| CON-4 | Negócio | Auth obrigatória, multi-tenant nativo | RLS em todas as tabelas desde a migration 001 |
| CON-5 | Técnico | SPA (React + Vite) não SSR | Frontend deployado na Vercel, sem servidor Node.js |

---

## 3. Technical Approach

_Derivado de: complexity.json arquitetura + research.json patterns_

### 3.1 Architecture Overview

```
┌─────────────────────────────────────┐
│         VERCEL (frontend)           │
│  React 18 + TypeScript + Vite       │
│  Tailwind CSS · react-hook-form     │
│  TanStack Query · Zustand           │
│  react-router-dom · decimal.js      │
└──────────────┬──────────────────────┘
               │ HTTPS (supabase-js client)
               ▼
┌─────────────────────────────────────┐
│         SUPABASE CLOUD              │
│  PostgreSQL (auth.users + tabelas)  │
│  Row Level Security (multi-tenant)  │
│  Auth (email/senha)                 │
└─────────────────────────────────────┘
```

**Fluxo de dados principal:**
`User action → React Hook Form → Zod validation → useMutation (TanStack Query) → supabase-js → Postgres (RLS verifica user_id) → onSuccess: invalidateQueries → UI atualiza`

_Derivado de: CON-5, research.json patterns Supabase + TanStack Query_

### 3.2 PnL Calculation Engine

**Localização:** `src/lib/pnl.ts` — cálculo 100% no cliente com `decimal.js` (CON-3, NFR-4).

#### Fórmula 1 — PnL Simétrico (standard matched betting)
```typescript
// grossReturn fixo para todas as legs
pnl = grossReturnFixo - Σ(stake_i) para legs onde isFreebet=false
```
_Derivado de: FR-5 AC-5.1, research.json pnlFormulaResearch formula 1_

#### Fórmula 2 — PnL Assimétrico (Freebet com casa da promoção)
```typescript
// Cada leg tem seu próprio grossReturn
pnl(leg_i ganha) = leg_i.grossReturn - Σ(stake_j) para legs onde isFreebet=false

// Exemplo (FR-7):
// Casa1: stake=100 grossReturn=200 | Casa2: stake=20 gr=85 | Casa3: stake=39 gr=85
// Se Casa1 ganha: 200 - 159 = +41
// Se Casa2 ganha:  85 - 159 = -74
// Se Casa3 ganha:  85 - 159 = -74
```
_Derivado de: FR-7, research.json pnlFormulaResearch formula 2_

#### Fórmula 3 — Freebet SNR
```typescript
// isFreebet=true: stake não entra no custo
// grossReturn = valor recebido (informado pelo usuário no MVP — sem odds)
custoReal(leg) = isFreebet ? 0 : stake
```
_Derivado de: FR-4 AC-4.1, AC-4.3, research.json pnlFormulaResearch formula 3_

#### Fórmula 4 — Duplo Green
```typescript
// isDoubleGreen=true: leg recebe pagamento duplo
grossReturnEfetivo(leg) = isDoubleGreen ? grossReturn * 2 : grossReturn
```
_Derivado de: FR-8, research.json pnlFormulaResearch formula 4_

#### Implementação com decimal.js (CON-3)
```typescript
import Decimal from 'decimal.js';

export function calcularCenariosPnL(apostas: Aposta[]): CenarioPnL[] {
  const totalCusto = apostas
    .filter(a => !a.isFreebet)
    .reduce((acc, a) => acc.plus(new Decimal(a.stake)), new Decimal(0));

  return apostas.map(leg => {
    const gr = leg.isDoubleGreen
      ? new Decimal(leg.grossReturn).times(2)
      : new Decimal(leg.grossReturn);
    return {
      casaId: leg.casaId,
      pnl: gr.minus(totalCusto).toDecimalPlaces(2).toNumber()
    };
  });
}
```
_Derivado de: CON-3, research.json recomendação "decimal.js obrigatório"_

### 3.3 Component Architecture

```
src/
├── pages/
│   ├── LoginPage.tsx           ← FR-10
│   ├── DashboardPage.tsx       ← FR-9
│   ├── OperacoesPage.tsx       ← FR-2, FR-12
│   ├── NovaOperacaoPage.tsx    ← FR-2, FR-3, FR-6
│   └── CasasPage.tsx           ← FR-1
├── components/
│   ├── operacoes/
│   │   ├── OperacaoForm.tsx    ← FR-2, FR-3, FR-6, FR-7 (useFieldArray)
│   │   ├── LegRow.tsx          ← FR-4, FR-6 (Tab/Enter, isFreebet toggle)
│   │   ├── PnLPreview.tsx      ← FR-5, NFR-4 (tempo real)
│   │   ├── OperacaoList.tsx    ← FR-2, FR-12
│   │   ├── OperacaoCard.tsx    ← FR-5, FR-8
│   │   └── ResultadoModal.tsx  ← FR-12
│   ├── casas/
│   │   ├── CasaForm.tsx        ← FR-1
│   │   └── CasaList.tsx        ← FR-1
│   ├── dashboard/
│   │   ├── PnLSummaryCard.tsx  ← FR-9
│   │   ├── PnLBarChart.tsx     ← FR-9 (recharts)
│   │   └── PeriodToggle.tsx    ← FR-9
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx           ← NFR-1 (focus handling)
│       └── Select.tsx
├── lib/
│   ├── supabase.ts             ← CON-4 (client singleton)
│   ├── pnl.ts                  ← FR-4, FR-5, FR-7, FR-8, CON-3
│   └── dates.ts                ← FR-9 (agregações)
├── stores/
│   └── operacaoDraftStore.ts   ← NFR-5 (zustand persist)
├── hooks/
│   ├── useAuth.ts              ← FR-10
│   ├── useCasas.ts             ← FR-1
│   ├── useOperacoes.ts         ← FR-2, FR-12
│   └── useDashboard.ts         ← FR-9
├── schemas/
│   ├── operacaoSchema.ts       ← zod, CON-3
│   └── casaSchema.ts           ← zod
└── types/
    └── index.ts                ← domainModel DM-1..DM-4
```

### 3.4 Database Schema (input para @data-engineer)

_Derivado de: domainModel DM-1..DM-4, CON-4 (RLS obrigatório)_

```sql
-- DM-2: Casa
CREATE TABLE casas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DM-3: Operacao
CREATE TABLE operacoes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('Freebet','Extracao','SuperOdd','TentativaDuplo','Aposta')),
  data             DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Concluida')),
  valor_pago_fixo  NUMERIC(10,2),        -- null se assimétrica
  pnl              NUMERIC(10,2),        -- null se Pendente
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DM-4: Aposta (Leg)
CREATE TABLE apostas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id     UUID NOT NULL REFERENCES operacoes(id) ON DELETE CASCADE,
  casa_id         UUID NOT NULL REFERENCES casas(id),
  stake           NUMERIC(10,2) NOT NULL,
  gross_return    NUMERIC(10,2) NOT NULL,
  is_freebet      BOOLEAN NOT NULL DEFAULT false,
  is_double_green BOOLEAN NOT NULL DEFAULT false,
  resultado       TEXT NOT NULL DEFAULT 'Pendente' CHECK (resultado IN ('Ganhou','Perdeu','Pendente')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (TODAS as tabelas — CON-4, NFR-3)
ALTER TABLE casas ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_casas" ON casas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_operacoes" ON operacoes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- apostas herdam via operacao.user_id
CREATE POLICY "users_own_apostas" ON apostas FOR ALL
  USING (
    EXISTS (SELECT 1 FROM operacoes WHERE id = apostas.operacao_id AND user_id = auth.uid())
  );
```

_**NOTA:** Schema acima é input para `@data-engineer *design-schema`. O data-engineer deve revisar índices, triggers e qualquer otimização antes da migration final._

> **Estrutura de migrations:** RLS policies são criadas na **mesma migration da tabela** (padrão Supabase recomendado — um único `supabase db push` aplica schema + RLS juntos). Não é necessário arquivo `004_rls_policies.sql` separado. Os 3 arquivos (001, 002, 003) listados na Section 5 são suficientes.

> **Convenção de naming:** Colunas SQL em `snake_case` (user_id, gross_return, is_freebet). Tipos TypeScript em `camelCase` (userId, grossReturn, isFreebet). O Supabase JS client retorna snake_case — usar `camelcase-keys` ou mapear manualmente nos hooks.

### 3.5 Auth Flow

_Derivado de: FR-10, research.json patterns Supabase Auth_

```
Usuário não autenticado
  → Acessa qualquer rota
  → AuthGuard redireciona para /login
  → Login com email/senha via supabase.auth.signInWithPassword()
  → onAuthStateChange dispara → session persistida
  → Redirect para /dashboard
```

---

## 4. Dependencies

_Derivado de: research.json dependencies_

### 4.1 Frontend

| Dependência | Versão | Propósito | Verificada |
|-------------|--------|-----------|------------|
| react | ^18.3.1 | UI framework | ✅ |
| typescript | ^5.5.0 | Type safety | ✅ |
| vite | ^5.3.0 | Build tool + dev server | ✅ |
| tailwindcss | ^3.4.4 | Styling mobile-first | ✅ |
| @tanstack/react-query | ^5.51.0 | Server state + cache | ✅ |
| zustand | ^4.5.4 | UI state + draft persist | ✅ |
| react-hook-form | ^7.52.0 | Forms + useFieldArray (Legs) | ✅ |
| zod | ^3.23.8 | Schema validation (stake > 0) | ✅ |
| decimal.js | ^10.4.3 | Aritmética financeira sem float errors | ✅ |
| react-router-dom | ^6.24.0 | SPA routing + AuthGuard | ✅ |
| recharts | ^2.12.7 | Gráficos de PnL (dashboard) | ✅ |
| date-fns | ^3.6.0 | Agregações diário/semanal/mensal | ✅ |
| sonner | ^1.5.0 | Toast notifications (feedback) | ✅ |

### 4.2 Backend / Infra

| Dependência | Versão | Propósito | Verificada |
|-------------|--------|-----------|------------|
| @supabase/supabase-js | ^2.44.0 | Auth + DB client | ✅ |
| @supabase/auth-helpers-react | — | Auth React integration | ⚠️ Validar: pode ser @supabase/ssr |
| Supabase Cloud | — | Postgres + Auth + RLS hosting | ✅ |
| Vercel | — | Frontend deploy | ✅ |

### 4.3 Dev Dependencies

| Dependência | Propósito |
|-------------|-----------|
| @vitejs/plugin-react | Vite plugin para React |
| @tailwindcss/forms | Reset de estilos de formulário |
| tailwind-merge + clsx | Composição de classes |
| vitest | Unit tests (especialmente PnL engine) |
| @testing-library/react | Component tests |
| playwright | E2E tests de navegação keyboard (Tab/Enter) e fluxos mobile |

---

## 5. Files to Create

_Derivado de: complexity.json scope=5 (20+ arquivos), domainModel DM-1..DM-4_

### 5.1 Novos Arquivos

| Arquivo | Propósito | FR/NFR |
|---------|-----------|--------|
| `src/main.tsx` | Entry point React + QueryClient + Router | — |
| `src/App.tsx` | Root component + AuthGuard wrapper | FR-10 |
| `src/router.tsx` | createBrowserRouter — rotas protegidas | FR-10 |
| `src/lib/supabase.ts` | Singleton do cliente Supabase | CON-4 |
| `src/lib/pnl.ts` | Motor de cálculo de PnL (4 fórmulas) | FR-4, FR-5, FR-7, FR-8, CON-3 |
| `src/lib/dates.ts` | Helpers de agregação de datas | FR-9 |
| `src/stores/operacaoDraftStore.ts` | Draft persist (zustand + localStorage) | NFR-5 |
| `src/types/index.ts` | Tipos TypeScript do domínio | DM-1..4 |
| `src/schemas/operacaoSchema.ts` | Zod schema de Operação + Apostas | CON-3 |
| `src/schemas/casaSchema.ts` | Zod schema de Casa | FR-1 |
| `src/hooks/useAuth.ts` | Auth state (useSession, signIn, signOut) | FR-10 |
| `src/hooks/useCasas.ts` | CRUD casas via TanStack Query | FR-1 |
| `src/hooks/useOperacoes.ts` | CRUD operações + marcação resultado | FR-2, FR-12 |
| `src/hooks/useDashboard.ts` | Agregações PnL por período | FR-9 |
| `src/pages/LoginPage.tsx` | Tela de login | FR-10 |
| `src/pages/DashboardPage.tsx` | Dashboard com gráficos | FR-9 |
| `src/pages/OperacoesPage.tsx` | Lista + filtro de operações | FR-2, FR-12 |
| `src/pages/NovaOperacaoPage.tsx` | Formulário de nova operação | FR-2, FR-3, FR-6 |
| `src/pages/CasasPage.tsx` | CRUD de casas | FR-1 |
| `src/components/operacoes/OperacaoForm.tsx` | Form principal com useFieldArray | FR-6, NFR-1 |
| `src/components/operacoes/LegRow.tsx` | Uma linha de Aposta (Tab/Enter) | FR-4, FR-6 |
| `src/components/operacoes/PnLPreview.tsx` | Preview de PnL em tempo real | FR-5, NFR-4 |
| `src/components/operacoes/OperacaoList.tsx` | Lista de operações com status | FR-12 |
| `src/components/operacoes/OperacaoCard.tsx` | Card individual de operação | FR-5, FR-8 |
| `src/components/operacoes/ResultadoModal.tsx` | Modal para marcar resultado | FR-12 |
| `src/components/casas/CasaForm.tsx` | Form de criação/edição de Casa | FR-1 |
| `src/components/casas/CasaList.tsx` | Lista de casas com ações | FR-1 |
| `src/components/dashboard/PnLSummaryCard.tsx` | Card de resumo PnL | FR-9 |
| `src/components/dashboard/PnLBarChart.tsx` | Gráfico de barras (recharts) | FR-9 |
| `src/components/dashboard/PeriodToggle.tsx` | Toggle Diário/Semanal/Mensal | FR-9 |
| `src/components/ui/Input.tsx` | Input com focus handling | NFR-1 |
| `src/components/ui/Button.tsx` | Button component | — |
| `src/components/ui/Select.tsx` | Select para casas | FR-2 |
| `supabase/migrations/001_create_casas.sql` | Schema + RLS casas | FR-1, CON-4 |
| `supabase/migrations/002_create_operacoes.sql` | Schema + RLS operações | FR-2, CON-4 |
| `supabase/migrations/003_create_apostas.sql` | Schema + RLS apostas | FR-2, CON-4 |
| `vite.config.ts` | Config do Vite | CON-5 |
| `tailwind.config.ts` | Config Tailwind | NFR-2 |
| `tsconfig.json` | Config TypeScript strict | — |
| `.env.example` | Template de variáveis de ambiente | CON-4 |

---

## 6. Testing Strategy

_Derivado de: FR-* acceptance criteria, research.json patterns_

### 6.1 Unit Tests — PnL Engine (CRÍTICO)

| Teste | Cobre | Prioridade |
|-------|-------|------------|
| `calcularPnL — simétrico básico` | FR-5 AC-5.1 | P0 |
| `calcularPnL — freebet SNR (custo=0)` | FR-4 AC-4.1, AC-4.3 | P0 |
| `calcularPnL — assimétrico 3 cenários` | FR-7 AC-7.2 | P0 |
| `calcularPnL — duplo green (grossReturn*2)` | FR-8 AC-8.2 | P0 |
| `calcularPnL — precisão decimal (sem float error)` | CON-3 | P0 |
| `calcularPnL — N legs (4 e 5 casas)` | FR-2 AC-2.1 | P1 |

### 6.2 Integration Tests

| Teste | Componentes | Cenário | Prioridade |
|-------|-------------|---------|------------|
| Criar operação simétrica | OperacaoForm + Supabase | Happy path completo | P0 |
| Tab/Enter flow com 3 legs | LegRow + OperacaoForm | Navegação sem mouse | P0 |
| Marcar resultado pendente | ResultadoModal + useOperacoes | FR-12 | P0 |
| Dashboard atualiza após nova operação | DashboardPage + useDashboard | Cache invalidation | P0 |
| RLS: usuário B não acessa dados usuário A | supabase.ts + Postgres | NFR-3 | P1 |

### 6.3 Acceptance Tests (Given-When-Then)

> **Nota de tooling:** Cenários de navegação Tab/Enter requerem testes e2e via Playwright. Executar `playwright test` durante CI para NFR-1 validation.

```gherkin
Feature: Cálculo de PnL — Freebet SNR

  Scenario: Leg marcada como isFreebet não afeta custo da operação
    Given uma operação com 3 Legs onde Leg-1 tem isFreebet=true, stake=100, grossReturn=200
    And Leg-2 tem isFreebet=false, stake=20, grossReturn=85
    And Leg-3 tem isFreebet=false, stake=39, grossReturn=85
    When o sistema calcula PnL para o cenário "Leg-1 ganha"
    Then pnl = 200 - (0 + 20 + 39) = 141.00
    And custo_real = 59.00 (apenas stakes das legs não-freebet)

Feature: Cálculo de PnL — Simétrico

  Scenario: Todas as legs retornam o mesmo valor fixo
    Given uma operação com valorPagoFixo=85
    And Leg-1: stake=20, Leg-2: stake=39
    When o sistema calcula PnL
    Then pnl = 85 - 59 = 26.00
    And PnLPreview exibe "R$ 26,00" em verde em tempo real

Feature: Cálculo de PnL — Duplo Green

  Scenario: Leg com isDoubleGreen=true dobra o retorno
    Given uma operação com Leg-1: grossReturn=85, isDoubleGreen=true
    And Leg-2: stake=20, Leg-3: stake=15
    When o sistema calcula PnL para o cenário "Leg-1 ganha"
    Then grossReturnEfetivo = 85 * 2 = 170
    And pnl = 170 - (stakes das legs não-freebet)

Feature: Data Entry ultrarrápido

  Scenario: Usuário registra operação com 3 legs via teclado
    Given o usuário está na tela "Nova Operação"
    When seleciona tipo "Extração" via dropdown
    And informa valorPagoFixo "85" e pressiona Tab
    And seleciona Casa "Betano", informa stake "20", pressiona Enter
    And seleciona Casa "Bet365", informa stake "39", pressiona Enter
    And seleciona Casa "Sportingbet", informa stake "26", pressiona Enter
    And pressiona Enter no botão Salvar
    Then a operação é salva com status Pendente
    And o sistema exibe PnL preview atualizado em cada pressão de Tab/Enter

Feature: Marcação de Resultado

  Scenario: Usuário marca resultado de operação pendente
    Given uma operação com status Pendente e 3 Legs
    When o usuário abre a operação na lista de pendentes
    And seleciona "Leg-2 ganhou"
    Then o sistema calcula pnl = leg2.grossReturn - totalCusto
    And status da operação muda para Concluída
    And o PnL aparece no dashboard do dia

Feature: Isolamento de dados por usuário (RLS)

  Scenario: Usuário B não acessa dados do Usuário A
    Given Usuário A tem 5 operações registradas
    And Usuário B faz login com conta diferente
    When Usuário B acessa a lista de operações
    Then vê apenas suas próprias operações (0 resultados iniciais)
    And nenhuma query retorna dados do Usuário A

Feature: CRUD de Casas (FR-1)

  Scenario: Criar nova Casa com nome único
    Given o usuário está autenticado
    When acessa a tela de Casas e cria uma Casa com nome 'Betano'
    Then 'Betano' aparece na lista de casas ativas
    And está disponível no dropdown ao criar uma Operação

  Scenario: Desativar Casa sem perder histórico
    Given a Casa 'Bet365' tem 3 Operações associadas
    When o usuário desativa 'Bet365'
    Then 'Bet365' não aparece no dropdown de novas Apostas
    And as 3 Operações históricas mantêm o nome 'Bet365' visível

Feature: Edição e Exclusão de Operações (FR-11)

  Scenario: Editar stake de uma Leg após criação
    Given uma Operação Concluída com Leg stake=20
    When o usuário edita a Leg e altera stake para 25
    Then o PnL recalcula automaticamente com stake=25

  Scenario: Excluir Operação com confirmação
    Given o usuário seleciona 'Excluir' em uma Operação
    When o modal de confirmação aparece e o usuário confirma
    Then a Operação e todas as suas Legs são removidas
    And o dashboard reflete o PnL atualizado sem a operação excluída

Feature: Dashboard — Agregação temporal de PnL (FR-9)

  Scenario: Dashboard Diário exibe apenas operações do dia
    Given o usuário tem operações concluídas em 3 datas distintas
    When visualiza o Dashboard no modo 'Diário' (hoje)
    Then exibe PnL apenas das operações com data = hoje
    And operações de outros dias não entram no total

  Scenario: Dashboard exclui Operações Pendentes do total
    Given o usuário tem 2 Operações Concluídas (PnL = +50) e 1 Pendente
    When visualiza o Dashboard Diário
    Then o total exibido é +50 (Pendente não contabilizada)
    And a Operação Pendente aparece sinalizada separadamente
```

---

## 7. Risks & Mitigations

_Derivado de: complexity.flags, research.unverifiedClaims_

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Aritmética JavaScript corrompe PnL (0.1+0.2 bug) | Alta | Crítico | `decimal.js` obrigatório em `src/lib/pnl.ts`. Testes unitários P0 para todas as fórmulas. |
| RLS policies com gap de segurança | Média | Crítico | `@data-engineer` revisa todas as policies antes de merge. Teste de integração RLS obrigatório antes de deploy. |
| Auth helper Supabase deprecado para Vite SPA | Média | Alto | Verificar `@supabase/ssr` vs `@supabase/auth-helpers-react` na documentação oficial ao iniciar Epic 1. |
| Tab/Enter navigation inconsistente entre browsers mobile | Média | Alto | Testar em Chrome/Safari mobile durante desenvolvimento do LegRow. Fallback: botão "+ Adicionar Casa" sempre disponível. |
| valorPagoFixo propagado para legs com grossReturn individual | Baixa | Alto | Validação Zod: se qualquer leg tem grossReturn manual, `valorPagoFixo` deve ser null. Documentar no schema. |
| Free tier Supabase insuficiente conforme usuários crescem | Baixa | Médio | Aceitável para MVP single-user. Monitorar uso antes de lançar acesso multi-usuário pago. |
| Bundle size excessivo para mobile (>300KB gzip) | Baixa | Médio | Lazy loading de páginas com `React.lazy()`. Recharts pode ser code-split. Medir no build final. |

---

## 8. Open Questions

_Derivado de: requirements.json openQuestions (OQ-3 a OQ-6)_

| ID | Questão | Blocking | Atribuído a |
|----|---------|----------|-------------|
| OQ-3 | Duplo Green UX: usuário marca `isDoubleGreen` manualmente ou via fluxo guiado? | Não | @ux-design-expert |
| OQ-4 | Existe Freebet SR (Stake Returned) nas operações? ASM-3 assumiu apenas SNR. | Não | @pm (confirmar com usuário) |
| OQ-5 | Draft recovery: restaurar automaticamente ou perguntar ao reabrir? | Não | @ux-design-expert |
| OQ-6 | Calculadora de stakes/odds: feature futura, spec pipeline próprio quando escopo estiver claro. | Não | @pm (próximo sprint) |

---

## 9. Epic Breakdown Recomendado

_Derivado de: complexity.json recommendedEpicBreakdown_

### Epic 1 — Fundação & Auth
**FRs:** FR-10, FR-1
**Deliverables:** Setup projeto (Vite + React + TS + Tailwind), client Supabase, auth flow (login/logout/sessão), CRUD de Casas, migrations 001 + RLS, deploy base Vercel.

### Epic 2 — Core de Operações
**FRs:** FR-2, FR-3, FR-4, FR-6
**Deliverables:** OperacaoForm com useFieldArray + Tab/Enter, 5 tipos de operação, isFreebet toggle, valorPagoFixo, draft persist (NFR-5), salvar operação.

### Epic 3 — PnL Engine & Resultados
**FRs:** FR-5, FR-7, FR-8, FR-12
**Deliverables:** `src/lib/pnl.ts` com 4 fórmulas + testes unitários, PnLPreview tempo real, PnL assimétrico (cenários), isDoubleGreen, ResultadoModal, marcação Pendente→Concluída.

### Epic 4 — Dashboards
**FRs:** FR-9, FR-11
**Deliverables:** Dashboard diário/semanal/mensal, filtro por tipo, gráfico de barras (recharts), edição/exclusão de apostas e operações.

---

## 10. Implementation Checklist

_Derivado de: FRs priorizados + complexity.flags_

**Epic 1:**
- [ ] Setup: `npm create vite@latest` com template react-ts
- [ ] Configurar Tailwind CSS + @tailwindcss/forms
- [ ] Criar cliente Supabase em `src/lib/supabase.ts`
- [ ] Implementar `useAuth.ts` com onAuthStateChange
- [ ] Criar `LoginPage.tsx` com supabase.auth.signInWithPassword
- [ ] Implementar `AuthGuard` component
- [ ] Migration 001: tabela `casas` + RLS
- [ ] Implementar `useCasas.ts` (TanStack Query)
- [ ] Criar `CasaForm.tsx` + `CasaList.tsx`
- [ ] Deploy base no Vercel

**Epic 2:**
- [ ] Definir tipos TypeScript em `src/types/index.ts`
- [ ] Criar `operacaoSchema.ts` (zod) com validação de stake > 0
- [ ] Migration 002: tabela `operacoes` + RLS
- [ ] Migration 003: tabela `apostas` + RLS
- [ ] Implementar `useOperacoes.ts`
- [ ] Criar `LegRow.tsx` com Tab/Enter navigation
- [ ] Criar `OperacaoForm.tsx` com useFieldArray
- [ ] Implementar draft persist em `operacaoDraftStore.ts`
- [ ] Testar Tab/Enter em Chrome mobile e Safari mobile

**Epic 3:**
- [ ] Implementar `src/lib/pnl.ts` com 4 fórmulas
- [ ] Escrever testes unitários P0 para todas as fórmulas
- [ ] Criar `PnLPreview.tsx` com cálculo em tempo real
- [ ] Implementar PnL assimétrico (cenários por leg)
- [ ] Implementar isDoubleGreen no cálculo
- [ ] Criar `ResultadoModal.tsx`
- [ ] Implementar marcação de resultado (Pendente→Concluída)

**Epic 4:**
- [ ] Implementar `useDashboard.ts` com agregações date-fns
- [ ] Criar `PnLBarChart.tsx` (recharts, cores verde/vermelho)
- [ ] Criar `PeriodToggle.tsx` (Diário/Semanal/Mensal)
- [ ] Implementar filtro por tipo de operação
- [ ] Implementar edição de Apostas após criação
- [ ] Implementar exclusão com confirmação

**Validação final:**
- [ ] Teste de RLS: usuário B não acessa dados de A
- [ ] Teste de bundle size (meta: < 300KB gzip)
- [ ] Teste de formulário em viewport 375px (iPhone SE)
- [ ] Verificar versão correta de auth helper Supabase para Vite (OQ não-blocking)

---

## Metadata

- **Generated by:** @pm via spec-write-spec
- **Inputs:** requirements.json (12 FRs, 5 NFRs, 5 CONs) · complexity.json (COMPLEX, 19/25) · research.json (14 deps)
- **Constitutional Gate:** Article IV (No Invention) — PASSED. Todos os claims rastreáveis a inputs.
- **Iteration:** 2 (Revision — autoFixes CRIT-1..CRIT-7 aplicados)
- **Next phase:** @qa *critique-spec mvp-alpha-tracker (critique_2)
