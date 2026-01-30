# PLANEJAMENTO TÉCNICO: Otimização de Infraestrutura e UX

> **Status:** Em Andamento
> **Data:** 29/01/2026
> **Objetivo:** Maximizar resiliência de rede, performance mobile e acessibilidade noturna.

---

## 1. ANÁLISE DO STACK ATUAL

| Componente | Versão | Status | Ação Necessária |
| :--- | :--- | :--- | :--- |
| **Vite** | `^6.2.0` | ✅ Latest | Configurar `manualChunks` para split de bundles. |
| **Supabase** | `^2.90.0` | ⚠️ Config Padrão | Ativar `persistSession` explicitamente. |
| **Tailwind** | `^3.4.1` | ⚠️ Contraste | Ajustar cores para padrão AAA (Fundo Amarelo + Texto Preto). |
| **PWA** | - | ❌ Ausente | Adicionar `manifest.json` para experiência "App-like". |

---

## 2. ESTRATÉGIA DE INFRAESTRUTURA

### 2.1 Separação de Bundles (Chunk Splitting)
Para garantir que o **Cardápio Digital** (acessado pelo cliente) carregue instantaneamente, separaremos o código pesado do sistema administrativo.

**Configuração Planejada (`vite.config.ts`):**
- **`vendor`**: Bibliotecas base (React, Framer Motion). Cacheado pelo navegador.
- **`client`**: Apenas arquivos do Cardápio e Login. Leve e rápido.
- **`pos`**: Sistema de Caixa. Carregado sob demanda após login.
- **`admin`**: Dashboards e Relatórios. Carregado sob demanda.

### 2.2 Resiliência de Rede (Sem Offline Mode)
Como não usamos cache offline (Service Workers) para evitar conflitos de dados, a transparência é crucial.

- **Componente `ConnectivityBadge`**:
    - Monitora conexão em tempo real (`navigator.onLine` + Supabase Ping).
    - **Offline**: Exibe banner vermelho fixo no topo. Bloqueia ações críticas (Finalizar Pedido).
    - **Online**: Discreto ou invisível.

### 2.3 Persistência de Sessão
Garantir que recarregar a página no mobile não deslogue o caixa.
- Configurar cliente Supabase com `auth: { persistSession: true, autoRefreshToken: true }`.

---

## 3. UI/UX & ACESSIBILIDADE (Yellow-Safety)

Auditoria detectou baixo contraste em botões da marca.

**Novas Regras de Design System:**
1.  **Fundos Amarelos (`brand-500`)**: OBRIGATÓRIO usar texto **PRETO**.
    *   *Antes:* Texto Branco (Falha AAA).
    *   *Depois:* Texto Preto (Passa AAA).
2.  **Dark Mode**:
    *   Fundo Base: `#1C1C1E` (Apple Gray 1).
    *   Cards: `#2C2C2E` (Apple Gray 2).
    *   Texto Primário: `#FFFFFF`.

---

## 4. PLANO DE IMPLEMENTAÇÃO

### Fase 1: Configuração Core
- [ ] **Vite**: Implementar `manualChunks` no `vite.config.ts`.
- [ ] **Supabase**: Atualizar `src/lib/supabase.ts` com tratamento de erro global e persistência.
- [ ] **Manifest**: Criar `public/manifest.json` com `display: standalone`.

### Fase 2: Interface & Componentes
- [ ] **Tailwind**: Atualizar paleta no `tailwind.config.js`.
- [ ] **Componentes**: Refatorar `Button.tsx` (se existir) ou classes de botões para forçar texto preto no amarelo.
- [ ] **Connectivity**: Criar componente `ConnectivityBadge.tsx` e inserir no `App.tsx`.

### Fase 3: Validação
- [ ] **Build**: Verificar se o tamanho do chunk `client` diminuiu.
- [ ] **Rede**: Simular "Offline" no DevTools e verificar bloqueio de ações.
- [ ] **Visual**: Teste visual de contraste em ambiente escuro.

---

## 5. ARQUIVOS AFETADOS
- `vite.config.ts`
- `src/lib/supabase.ts`
- `tailwind.config.js`
- `src/App.tsx`
- `src/components/ConnectivityBadge.tsx` (Novo)
- `public/manifest.json` (Novo)
