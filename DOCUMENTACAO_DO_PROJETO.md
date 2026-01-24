# Documentação Completa do Projeto: XisMaster POS

> **Objetivo deste documento:** Servir como base de conhecimento para a criação de um GEM (Assistente Personalizado) no Gemini. Ele contém detalhes técnicos, funcionais e operacionais do sistema.

---

## 1. Visão Geral do Sistema

**Nome:** XisMaster POS
**Tipo:** Aplicação Web (PWA) para Gestão de Food Truck
**Público-alvo:** Atendentes de caixa e gerentes de food trucks.
**Objetivo Principal:** Agilizar o processo de pedidos, controle de caixa e impressão automática de comandas em um ambiente de alta rotatividade.

---

## 2. Arquitetura e Tecnologias

O sistema foi construído com uma arquitetura moderna, focada em performance e baixo custo de manutenção.

*   **Frontend:** React 19 (via Vite) + TypeScript.
*   **Estilização:** Tailwind CSS (Design responsivo e customizável).
*   **Backend / Banco de Dados:** Supabase (PostgreSQL como serviço).
    *   Usa **Supabase Auth** para autenticação.
    *   Usa **Supabase Realtime** para sincronização instantânea de pedidos.
    *   Usa **Row Level Security (RLS)** para segurança dos dados.
*   **Hospedagem:** HostGator (Arquivos estáticos na pasta `public_html`).
*   **Impressão:** Servidor de Impressão Standalone (HTML + JS) rodando localmente em um notebook Windows conectado a uma impressora térmica Epson TM-T20 (Ethernet).

---

## 3. Funcionalidades Detalhadas

### 3.1. Ponto de Venda (POS)
*   **Interface Híbrida:** Funciona tanto em Desktop (com mouse) quanto em Mobile (touch).
*   **Grade de Produtos:** Produtos organizados por categorias (Xis, Dogs, Bebidas, etc.) com busca rápida.
*   **Carrinho Inteligente:**
    *   Adição rápida de itens.
    *   Personalização com observações (ex: "Sem cebola").
    *   Seleção de Bairro (para Delivery) com taxa de entrega automática.
    *   Seleção de Método de Pagamento (Dinheiro, PIX, Cartão).
*   **Modo Escuro (Dark Mode):** Interface adapta-se para ambientes noturnos (comum em food trucks).

### 3.2. Gestão de Caixa (Turnos)
*   **Abertura de Caixa:** Exige informar o valor inicial em dinheiro (fundo de troco).
*   **Controle de Turno:** Todos os pedidos são vinculados ao turno atual.
*   **Fechamento de Caixa:**
    *   Relatório detalhado de vendas por método de pagamento (Dinheiro, PIX, Cartão).
    *   Cálculo automático do valor esperado em gaveta.
    *   Histórico de turnos passados.

### 3.3. Servidor de Impressão Automática
*   **Solução Inovadora:** Em vez de depender de drivers complexos ou APIs pagas, criamos um arquivo HTML (`print-server.html`) que roda no navegador do notebook.
*   **Funcionamento:**
    1.  O servidor conecta no Supabase e "escuta" novos pedidos em tempo real.
    2.  Quando um pedido entra, ele gera um HTML formatado para impressora térmica (80mm).
    3.  Usa o modo `kiosk-printing` do Chrome para imprimir sem abrir janela de diálogo.
    4.  Atualiza o status do pedido no banco para "Impresso".
*   **Resiliência:** Possui lógica de reconexão automática e retry (tentar novamente) caso a internet oscile ou os itens demorem a carregar.

### 3.4. Painel Administrativo (Dashboard)
*   **Visão Geral:** Gráficos de vendas diárias e mensais.
*   **Gerenciamento:**
    *   **Produtos:** Criar, editar, ativar/desativar itens e preços.
    *   **Bairros:** Cadastrar taxas de entrega por região.
    *   **Despesas:** Lançar gastos (gelo, gás, embalagens) para controle de lucro líquido.

---

## 4. Fluxos de Trabalho (Workflows)

### Fluxo do Pedido (Caminho Feliz)
1.  **Atendente (Celular):** Abre o app > Seleciona produtos > Adiciona obs > Escolhe Pagamento > Finaliza.
2.  **Sistema:** Salva pedido no Supabase (Status: `pending`, Printed: `false`).
3.  **Servidor de Impressão (Notebook):** Detecta novo pedido via Realtime > Baixa os itens > Formata o cupom > Envia para impressora Epson.
4.  **Cozinha:** Recebe o papel impresso e prepara o lanche.
5.  **Sistema:** Marca pedido como `printed: true`.

### Fluxo de Fechamento
1.  **Atendente:** Clica em "Fechar Caixa".
2.  **Sistema:** Exibe resumo financeiro (Vendas + Fundo de Troco).
3.  **Atendente:** Confere o dinheiro físico.
4.  **Ação:** Confirma fechamento. O sistema gera um relatório final e bloqueia novos pedidos até nova abertura.

---

## 5. Pontos Fortes (Pros)

1.  **Custo-Benefício:**
    *   Usa o plano gratuito do Supabase (muito generoso).
    *   Hospedagem estática barata (HostGator).
    *   Não paga mensalidade de software de terceiros.
2.  **Performance:**
    *   Extremamente rápido (SPA - Single Page Application).
    *   Funciona como um app nativo no celular (PWA).
3.  **Independência de Hardware:**
    *   O sistema de pedidos roda em qualquer celular Android/iOS.
    *   A impressão é centralizada, liberando os garçons de carregarem impressoras.
4.  **Design Premium:**
    *   Interface moderna, modo escuro nativo, focado em usabilidade noturna.
5.  **Flexibilidade:**
    *   Código fonte próprio, permitindo qualquer alteração futura sem depender de fornecedor.

---

## 6. Limitações e Pontos de Atenção (Cons)

1.  **Dependência de Internet:**
    *   O sistema é "Cloud-First". Se a internet do Food Truck cair totalmente, o sistema para (não há modo offline completo para salvar pedidos localmente e sincronizar depois).
    *   *Mitigação:* O uso de dados é baixo, funciona bem no 4G/5G.
2.  **Servidor de Impressão Dedicado:**
    *   Exige um notebook ligado o tempo todo rodando o Chrome. Se o notebook desligar ou hibernar, a impressão para.
3.  **Impressão via Browser:**
    *   Depende do Chrome estar configurado corretamente (margens, impressora padrão). Atualizações do navegador podem, teoricamente, desconfigurar algo (embora raro).
4.  **Sem App Nativo nas Lojas:**
    *   É um Web App. Precisa ser acessado pelo navegador ou instalado na tela inicial manualmente.

---

## 7. Detalhes Técnicos para Manutenção

### Banco de Dados (Tabelas Principais)
*   `profiles`: Usuários e permissões (Admin/Caixa).
*   `products`: Cardápio (Nome, Preço, Categoria).
*   `orders`: Cabeçalho do pedido (Cliente, Total, Tipo, Status Impressão).
*   `order_items`: Itens do pedido (Produto, Qtd, Preço Histórico).
*   `shifts`: Turnos de caixa.
*   `expenses`: Despesas operacionais.

### Variáveis de Ambiente (.env)
*   `VITE_SUPABASE_URL`: URL do projeto Supabase.
*   `VITE_SUPABASE_ANON_KEY`: Chave pública para acesso via frontend.

### Comandos Úteis
*   `npm run dev`: Rodar localmente.
*   `npm run build`: Gerar versão de produção (pasta `dist`).

---

> **Dica para o GEM:** Ao configurar o assistente, instrua-o a agir como um "Engenheiro de Software Sênior especializado em React e Supabase". Ele deve priorizar a estabilidade da operação do Food Truck e sugerir soluções que minimizem o risco de paradas durante o atendimento.
