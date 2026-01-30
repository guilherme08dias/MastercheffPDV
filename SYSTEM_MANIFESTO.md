# SYSTEM MANIFESTO: XisMaster POS - Documentação Técnica 360º

> **Versão do Documento:** 1.0
> **Data:** 29/01/2025
> **Escopo:** Mapeamento total da infraestrutura, lógica e segurança.

---

## 1. TECH STACK (O Coração)

O sistema é construído sobre uma arquitetura moderna, reativa e serverless, priorizando performance e custo-benefício.

### Core Framework
- **Frontend Engine:** [React 19](https://react.dev/) (Versão estável mais recente)
- **Build Tool:** [Vite](https://vitejs.dev/) (Builds ultra-rápidos e HMR instantâneo)
- **Linguagem:** TypeScript (Tipagem estrita para segurança de código)

### UI & UX
- **Styling:** [Tailwind CSS v3](https://tailwindcss.com/) (Utility-first framework)
- **Icons:** [Lucide React](https://lucide.dev/) (Ícones vetoriais leves e consistentes)
- **Animations:** [Framer Motion](https://www.framer.com/motion/) (Transições fluidas e micro-interações)
- **Notifications:** `react-hot-toast` (Toasts empilháveis e elegantes tipo "Dynamic Island")

### Backend & Data
- **Backend-as-a-Service:** [Supabase](https://supabase.com/) (PostgreSQL Database, Auth, Realtime, Edge Functions)
- **Client:** `@supabase/supabase-js` v2.90+
- **Data Visualization:** `recharts` (Gráficos para o painel de Analytics)

---

## 2. ARQUITETURA DE ARQUIVOS (O Esqueleto)

A estrutura é organizada para separar responsabilidades entre UI, Lógica de Negócio e Infraestrutura de Dados.

### Árvore de Diretórios Principal
```
/
├── public/                 # Assets estáticos (sons, logos)
├── src/
│   ├── components/         # Componentes React (Blocos de construção)
│   ├── contexts/           # Context API (ThemeContext)
│   ├── hooks/              # Custom Hooks (useIsMobile, lógica reutilizável)
│   ├── lib/                # Configurações de serviços (supabase.ts)
│   ├── utils/              # Funções auxiliares (dateUtils, formatters)
│   └── types.ts            # Definições de Tipos TypeScript (Interfaces Globais)
├── database/               # Scripts SQL, Migrations e RPCs (O "Cérebro" do Banco)
├── print-server.html       # Servidor de Impressão Standalone (Arquivo Crítico)
└── schema.sql              # Schema base do banco de dados
```

### Componentes Chave
- **`App.tsx`**: O roteador central. Decide se renderiza o Login, PDV (`POS.tsx`), Admin (`AdminDashboard.tsx`) ou Cardápio Online (`Cardapio.tsx`) com base na rota e autenticação.
- **`POS.tsx`**: O cérebro operacional. Gerencia o estado do caixa, carrinho local, modais de produtos e escuta pedidos em tempo real (Realtime Subscriptions). Contém a lógica de abertura/fechamento de caixa.
- **`Cardapio.tsx`**: A face pública. Interface simplificada para clientes fazerem pedidos via link/QR Code. Envia pedidos via RPC `create_web_order`.
- **`SalesRanking.tsx`**: Módulo de inteligência. Analisa vendas com filtros de data, categoria e ordenação.
- **`MobileTabBar.tsx`**: Navegação flutuante para mobile, contendo o "Kill Switch" da impressora e acesso rápido aos módulos administrativos.

---

## 3. BANCO DE DADOS & SEGURANÇA (O Cofre)

O banco é PostgreSQL hospedado no Supabase, protegido por **RLS (Row Level Security)**.

### Estrutura de Dados (Schema)
| Tabela | Função | Relacionamentos Chave |
| :--- | :--- | :--- |
| **`orders`** | Tabela central de vendas. | `shift_id` (turnos), `neighborhood_id` (taxas) |
| **`order_items`** | Itens de cada pedido. | `order_id` (pai), `product_id` (produto) |
| **`shifts`** | Turnos de caixa. | Armazena `opened_at`, `closed_at`, saldos. |
| **`products`** | Catálogo de produtos. | Preço, Categoria, Disponibilidade. |
| **`stock_items`** | Inventário bruto. | Unidades (kg, un, L). |
| **`product_ingredients`** | Ficha técnica. | Liga Produto -> Item de Estoque (p/ baixa auto). |
| **`profiles`** | Perfis de usuários. | Define `role` ('admin', 'cashier'). |

### Segurança RLS (Row Level Security)
As políticas garantem que o frontend (cliente web) não possa destruir o banco.
1.  **Public Insert (`orders`, `order_items`)**: Qualquer pessoa (anônima) pode CRIAR um pedido.
2.  **Authenticated Select/Update**: Apenas staff logado pode VER e ATUALIZAR pedidos.
3.  **Admin Delete**: Apenas usuários com `role='admin'` na tabela `profiles` podem EXCLUIR registros.
    *   *Nota: Isso impede que um caixa apague histórico de vendas acidentalmente ou maliciosamente.*

### Funções RPC (Remote Procedure Calls)
Funções SQL que rodam no servidor para garantir integridade e performance.
-   **`create_web_order`**: Atômica. Cria o pedido, calcula o `daily_number` sequencial e insere os itens em uma única transação segura. Bypassa RLS para permitir que clientes criem pedidos complexos.
-   **`clear_print_queue`**: Emergência. Marca todos os pedidos pendentes como 'impresso' (`printed=true`). Usada quando a impressora trava.
-   **`mark_order_printed`**: Atualiza o status de impressão de forma segura.
-   **`get_sales_ranking`**: Gera o relatório de vendas agregando dados no servidor (performance).

---

## 4. FLUXO OPERACIONAL (A Lógica)

### Ciclo de Vida do Pedido
1.  **Criação**:
    *   **Local (POS)**: Criado diretamente pelo caixa. Status inicia como `completed`. Baixa estoque imediata.
    *   **Web (Cardapio)**: Criado pelo cliente via RPC. Status inicia como `pending`.
2.  **Recepção (POS)**:
    *   O `POS.tsx` escuta `INSERT` na tabela `orders`.
    *   Identifica origem `web` + status `pending`.
    *   Toca som de alerta e exibe modal de Aceite/Rejeite.
3.  **Confirmação**:
    *   Ao aceitar, POS atualiza status para `confirmed`.
    *   Envia mensagem WhatsApp para o cliente.
    *   Realiza a baixa de estoque dos ingredientes.
4.  **Impressão**:
    *   O `print-server.html` detecta o novo pedido (ou atualização de status).
    *   Verifica travas de segurança (Anti-loop).
    *   Envia comando `window.print()`.

### Sistema de Turnos (Shifts)
-   O sistema exige um turno aberto para processar vendas.
-   **Abertura**: Registra o fundo de troco (`initial_float`). Se já houver turno no dia, ele recupera/reabre.
-   **Fechamento**: Calcula totais por método de pagamento (Pix, Crédito, Débito, Dinheiro).
-   **Shift-Centric Analytics**: Relatórios financeiros são baseados no `shift_id`, permitindo múltiplos caixas por dia ou caixas que viram a noite.

---

## 5. INFRAESTRUTURA DE IMPRESSÃO (O Output)

A infraestrutura de impressão é desacoplada para robustez. Não roda dentro do app React principal.

### `print-server.html`
-   **O que é**: Um arquivo HTML/JS puro, autônomo.
-   **Como funciona**: Roda em segundo plano, conectado diretamente ao Supabase.
-   **Lógica Anti-Loop (Idempotência)**:
    1.  Mantém um cache local (`Set`) de IDs impressos na sessão.
    2.  Verifica a flag `printed` no banco de dados antes de processar.
    3.  Se falhar a impressão, remove do cache para permitir retry manual.
-   **Vias Automáticas**:
    *   **Delivery**: Imprime 2 vias (1 para cozinha, 1 destacada "VIA DO MOTOBOY" com endereço grande).
    *   **Balcão/Retirada**: Imprime 1 via única.
-   **Kill Switch**: Verifica a cada iteração se o pedido ainda está pendente. Se o usuário zerar a fila no meio do processo, a impressão é abortada.

---

## 6. AJUSTES RECENTES & POLIMENTOS (O Estado Atual)

### Mobile & UI
-   **Mobile Tab Bar**: Navegação inferior fixa com efeito "Dynamic Island" e acesso rápido ao Admin.
-   **Sales Ranking**:
    *   Filtros por Categoria (Lanches, Bebidas, etc.) em scroll horizontal.
    *   Ordenação "Mais/Menos Vendidos".
    *   Range de datas customizável.
-   **Responsividade**: Tabelas adaptadas para cards em telas pequenas.

### Correções Críticas
-   **Normalização de Categorias**: Lógica no frontend para agrupar "Xis Tudo", "Xis Bacon" sob a categoria mestre "Xis".
-   **Print Lock**: Implementação de verificação dupla (Server + Client) para evitar impressões fantasmas infinitas.

---

## 7. PONTOS DE ATENÇÃO (Roadmap Técnico)

### Arquivos de Críticos (Database Recovery)
Em caso de catástrofe, estes arquivos na pasta `database/` salvam o dia:
-   `setup_completo.sql`: Recria toda a estrutura do banco do zero.
-   `fix_permissions_emergency.sql`: Reseta as políticas RLS se ninguém conseguir acessar nada.
-   `clear_print_queue.sql`: Script manual para limpar a fila.

### Travas de Segurança Ativas
1.  **Block de Deleção**: Caixa não deleta pedido. Se precisar cancelar, muda status para `canceled` (mantendo para auditoria).
2.  **Pré-requisito de Taxas**: O sistema impede abertura de caixa se não houver taxas de entrega cadastradas (pois quebraria o checkout delivery).
3.  **Auditoria de Cancelamento**: No fechamento de caixa, exibe lista separada de pedidos cancelados e seus valores.
