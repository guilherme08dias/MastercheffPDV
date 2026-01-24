# 📚 Guia Completo de Estrutura - Antigravity Kit

> Explicação detalhada de todos os arquivos e suas finalidades

---

## 🎯 O QUE É O ANTIGRAVITY KIT?

O **Antigravity Kit** é um sistema de **templates para assistentes de IA** (como eu, o Gemini/Claude/ChatGPT) que melhora a qualidade do código gerado através de:

1. **Agentes Especializados** - "Personas" de especialistas (frontend, backend, security, etc.)
2. **Skills** - Conhecimento estruturado sobre tecnologias e padrões
3. **Workflows** - Comandos prontos para tarefas comuns
4. **Scripts** - Ferramentas de validação e auditoria

**Analogia:** É como dar "superpoderes" para o assistente de IA, transformando-o de um desenvolvedor genérico em uma equipe de especialistas.

---

## 📂 ESTRUTURA GERAL DO PROJETO

```
antigravity-kit-main/
├── 📁 .agent/              ← NÚCLEO DO SISTEMA
│   ├── 📁 agents/          ← Especialistas (10 agentes)
│   ├── 📁 skills/          ← Conhecimentos (40+ skills)
│   ├── 📁 workflows/       ← Comandos prontos (11 workflows)
│   ├── 📁 scripts/         ← Ferramentas de validação
│   ├── 📁 rules/           ← Regras globais (GEMINI.md)
│   └── 📄 ARCHITECTURE.md  ← Documentação do sistema
│
├── 📁 web/                 ← Site de documentação (Next.js)
├── 📄 package.json         ← Metadados do projeto npm
├── 📄 LICENSE              ← Licença MIT
└── 📄 README.md            ← Instruções de uso
```

---

## 🤖 1. AGENTES (`.agent/agents/`)

**O que são:** "Personas" de especialistas que definem como o assistente de IA deve pensar e responder.

### Lista de Agentes:

| Agente | Arquivo | Finalidade |
|--------|---------|------------|
| **Backend Specialist** | `backend-specialist.md` | API design, banco de dados, arquitetura de servidor |
| **Debugger** | `debugger.md` | Depuração sistemática de bugs e problemas |
| **Frontend Specialist** | `frontend-specialist.md` | UI/UX design, React, CSS, componentes |
| **Game Developer** | `game-developer.md` | Desenvolvimento de jogos (Unity, Godot, etc.) |
| **Mobile Developer** | `mobile-developer.md` | Apps móveis (React Native, Flutter, iOS, Android) |
| **Orchestrator** | `orchestrator.md` | Coordena múltiplos agentes em tarefas complexas |
| **Product Manager** | `product-manager.md` | Planejamento de produto, roadmap, requisitos |
| **Project Planner** | `project-planner.md` | Metodologia de 4 fases para planejamento |
| **Security Auditor** | `security-auditor.md` | Auditoria de segurança, OWASP, vulnerabilidades |
| **Tech Lead** | `tech-lead.md` | Decisões arquiteturais, code review, mentoria |

### Como Funcionam:

**Sem Antigravity Kit:**
```
Você: "Crie uma API REST"
IA: [gera código genérico sem estrutura definida]
```

**Com Antigravity Kit:**
```
Você: "Crie uma API REST"
IA: 🤖 Aplicando @backend-specialist...
    [gera código seguindo padrões RESTful, validação, documentação OpenAPI,
     tratamento de erros, testes, princípios SOLID]
```

---

## 🎓 2. SKILLS (`.agent/skills/`)

**O que são:** Módulos de conhecimento estruturado sobre tecnologias, padrões e boas práticas.

### Categorias de Skills:

#### 🏗️ **Arquitetura & Planejamento**
- **`architecture`** - Framework para decisões arquiteturais (trade-offs, ADRs)
- **`plan-writing`** - Estruturação de tarefas e planos de implementação
- **`brainstorming`** - Questionamento socrático antes de implementar

#### 💻 **Desenvolvimento**
- **`react-patterns`** - Padrões React modernos (hooks, composição, performance)
- **`nextjs-best-practices`** - Next.js App Router, Server Components
- **`nodejs-best-practices`** - Node.js, async patterns, segurança
- **`python-patterns`** - Python, frameworks, type hints
- **`tailwind-patterns`** - Tailwind CSS v4, design tokens

#### 🎨 **Design & UX**
- **`frontend-design`** - Psicologia de design, cores, tipografia, layouts
- **`mobile-design`** - Design para mobile (touch, performance, plataformas)
- **`seo-fundamentals`** - SEO, E-E-A-T, Core Web Vitals
- **`geo-fundamentals`** - Otimização para AI search engines

#### 🔒 **Segurança**
- **`vulnerability-scanner`** - OWASP Top 10, supply chain, varredura de secrets
- **`red-team-tactics`** - Táticas de penetração (MITRE ATT&CK)

#### 🗄️ **Backend & Dados**
- **`api-patterns`** - REST vs GraphQL vs tRPC, versionamento, paginação
- **`database-design`** - Schema design, indexação, ORMs
- **`nodejs-best-practices`** - Frameworks Node, arquitetura

#### 🧪 **Testes & Qualidade**
- **`testing-patterns`** - Unit, integration, mocking, pirâmide de testes
- **`tdd-workflow`** - Test-Driven Development (RED-GREEN-REFACTOR)
- **`webapp-testing`** - E2E com Playwright, auditorias profundas

#### 📊 **Performance**
- **`performance-profiling`** - Medição, análise, otimização

#### 🔧 **DevOps & Infraestrutura**
- **`deployment-procedures`** - Deploy seguro, rollback, verificação
- **`server-management`** - Gestão de processos, monitoring, scaling

#### 🌐 **Cross-Platform**
- **`i18n-localization`** - Internacionalização, traduções, RTL

#### 🎮 **Especialidades**
- **`game-development`** - Desenvolvimento de jogos
- **`mcp-builder`** - Model Context Protocol servers

#### 🛠️ **Ferramentas**
- **`bash-linux`** - Comandos Linux/macOS
- **`powershell-windows`** - PowerShell para Windows
- **`systematic-debugging`** - Metodologia de debug em 4 fases

#### 🏗️ **Meta**
- **`app-builder`** - Orquestrador principal para criar aplicações
- **`behavioral-modes`** - Modos de operação (brainstorm, implement, debug, etc.)
- **`intelligent-routing`** - Seleção automática de agentes
- **`parallel-agents`** - Coordenação de múltiplos agentes

### Estrutura de uma Skill:

```markdown
📁 skills/react-patterns/
├── 📄 SKILL.md              ← Índice e documentação principal
├── 📄 checklists.md         ← Listas de verificação
├── 📄 examples.md           ← Exemplos práticos
└── 📁 scripts/
    └── react_validator.py   ← Script de validação automática
```

**Exemplo - `SKILL.md`:**
```yaml
---
name: react-patterns
description: Modern React patterns and principles
allowed-tools: Read, Glob, Grep
---

# React Patterns

## Core Principles
- Composition over inheritance
- Hooks for state and side effects
- ...
```

---

## ⚙️ 3. WORKFLOWS (`.agent/workflows/`)

**O que são:** Comandos prontos (/slash commands) que executam sequências de ações.

### Lista de Workflows:

| Comando | Arquivo | Finalidade |
|---------|---------|------------|
| **`/brainstorm`** | `brainstorm.md` | Explorar opções antes de implementar |
| **`/create`** | `create.md` | Criar nova feature ou app |
| **`/debug`** | `debug.md` | Debug sistemático de problemas |
| **`/deploy`** | `deploy.md` | Deploy para produção (checklist) |
| **`/enhance`** | `enhance.md` | Melhorar código existente |
| **`/orchestrate`** | `orchestrate.md` | Coordenar múltiplos agentes |
| **`/plan`** | `plan.md` | Criar plano detalhado de implementação |
| **`/preview`** | `preview.md` | Iniciar servidor de preview local |
| **`/status`** | `status.md` | Status do projeto e progresso |
| **`/test`** | `test.md` | Gerar e executar testes |
| **`/ui-ux-pro-max`** | `ui-ux-pro-max.md` | Design avançado com 50 estilos |

### Como Usar:

```
Você: /brainstorm sistema de autenticação

IA: 🤖 Iniciando brainstorming...
    
    Vou fazer algumas perguntas para entender melhor:
    
    1. Quais métodos de autenticação você precisa?
       - Email/senha
       - OAuth (Google, GitHub)
       - Magic link
       - 2FA
    
    2. Onde os dados de usuário serão armazenados?
    
    3. Qual o volume esperado de usuários?
```

---

## 🔧 4. SCRIPTS (`.agent/scripts/` e `skills/*/scripts/`)

**O que são:** Ferramentas Python para validar automaticamente o código.

### Scripts Principais:

#### **Orquestração:**
- **`checklist.py`** - Executa validações em ordem de prioridade
- **`verify_all.py`** - Suite completa de validação (deploy)
- **`auto_preview.py`** - Gerencia servidor de preview local
- **`session_manager.py`** - Analisa estado do projeto

#### **Skills Scripts (18 no total):**

| Script | Skill | Valida |
|--------|-------|--------|
| `security_scan.py` | vulnerability-scanner | Secrets, dependências, OWASP |
| `lint_runner.py` | lint-and-validate | ESLint, Prettier, formatação |
| `test_runner.py` | testing-patterns | Testes unitários e integração |
| `lighthouse_audit.py` | performance-profiling | Core Web Vitals, performance |
| `seo_checker.py` | seo-fundamentals | Meta tags, structured data |
| `ux_audit.py` | frontend-design | Leis de UX, acessibilidade |
| `accessibility_checker.py` | frontend-design | WCAG compliance |
| `mobile_audit.py` | mobile-design | Performance mobile |
| `playwright_runner.py` | webapp-testing | Testes E2E |
| `schema_validator.py` | database-design | Schema de banco de dados |
| `api_validator.py` | api-patterns | Endpoints, contratos API |
| `i18n_checker.py` | i18n-localization | Hardcoded strings |
| `geo_checker.py` | geo-fundamentals | Otimização para AI engines |
| `type_coverage.py` | lint-and-validate | TypeScript coverage |

### Exemplo de Uso:

```bash
# Rodar checklist de validação
python .agent/scripts/checklist.py .

# Saída:
🔄 Running: Security Scan
✅ Security Scan: PASSED
🔄 Running: Lint Check
✅ Lint Check: PASSED
...

📊 CHECKLIST SUMMARY
✅ Passed: 6
❌ Failed: 0
```

---

## 📋 5. REGRAS GLOBAIS (`.agent/rules/`)

**O que é:** Arquivo de configuração principal que define o comportamento da IA.

### **`GEMINI.md`** - Arquivo de Regras P0 (Prioridade Máxima)

Este arquivo contém:

#### **Tier 0 - Regras Universais:**
- Idioma (responder no idioma do usuário)
- Clean Code (princípios SOLID, sem over-engineering)
- Dependency Awareness (atualizar arquivos dependentes)
- System Map (estrutura de agentes/skills)

#### **Tier 1 - Regras de Código:**
- Routing de projeto (mobile → mobile-developer)
- Socratic Gate (perguntar antes de implementar)
- Final Checklist Protocol (rodar `checklist.py` antes de finalizar)

#### **Tier 2 - Regras de Design:**
- Referências para agentes especializados
- Purple Ban (sem cores roxas/violeta)
- Template Ban (sem layouts genéricos)

#### **Mapeamento de Modos:**
```yaml
plan: project-planner → 4 fases, sem código antes da Fase 4
ask: foco em entender, fazer perguntas
edit: orchestrator → executar, verificar task.md
```

---

## 🌐 6. SITE DE DOCUMENTAÇÃO (`web/`)

**O que é:** Aplicação Next.js com a documentação online do Antigravity Kit.

```
web/
├── 📁 src/
│   ├── 📁 app/              ← Páginas Next.js (App Router)
│   ├── 📁 components/       ← Componentes React
│   ├── 📁 hooks/            ← Custom hooks
│   └── 📁 lib/              ← Utilitários
├── 📄 package.json          ← Dependências do site
├── 📄 next.config.ts        ← Configuração Next.js
└── 📄 tailwind.config.ts    ← Configuração Tailwind CSS
```

**Dependências:**
- **Next.js 16** - Framework React
- **React 19** - Biblioteca UI
- **Tailwind CSS 4** - Estilização
- **Lucide React** - Ícones
- **TypeScript** - Type safety

**URL:** https://antigravity-kit.vercel.app/

---

## 📄 7. ARQUIVOS RAIZ

### **`package.json`** (Raiz)
```json
{
  "name": "antigravity-kit",
  "version": "2.0.0",
  "description": "AI Agent templates - Skills, Agents, and Workflows"
}
```
- **Finalidade:** Metadados do projeto npm
- **Permite:** Instalar via `npx @vudovn/ag-kit init`

### **`LICENSE`**
- **Tipo:** MIT License
- **Permite:** Uso comercial, modificação, distribuição
- **Copyright:** VUDOVN (2026)

### **`README.md`**
- **Conteúdo:** Instruções de instalação e uso
- **Comandos principais:**
  - `npx @vudovn/ag-kit init` - Instalar
  - `ag-kit update` - Atualizar
  - `ag-kit status` - Verificar instalação

### **`CHANGELOG.md`**
- **Finalidade:** Histórico de versões e mudanças

### **`.gitignore`**
```
node_modules/
.next/
dist/
```
- **Finalidade:** Excluir arquivos do Git

### **`.editorconfig`**
```ini
indent_style = space
indent_size = 2
```
- **Finalidade:** Padronização de formatação entre editores

---

## 🔄 COMO TUDO FUNCIONA JUNTO

### Fluxo de Uma Requisição:

```mermaid
graph TD
    A[Usuário: "Crie uma API REST"] --> B{Intelligent Routing}
    B --> C[Seleciona: @backend-specialist]
    C --> D[Carrega Skills]
    D --> E[api-patterns]
    D --> F[nodejs-best-practices]
    D --> G[clean-code]
    E --> H[Gera Código]
    F --> H
    G --> H
    H --> I[Roda Validação]
    I --> J[security_scan.py]
    I --> K[lint_runner.py]
    J --> L{Passou?}
    K --> L
    L -->|Sim| M[Entrega ao Usuário]
    L -->|Não| N[Corrige e Retesta]
```

### Exemplo Prático:

**1. Você pede:**
```
Você: "Preciso adicionar autenticação JWT na minha API Node.js"
```

**2. Sistema detecta automaticamente:**
- **Agente:** `@backend-specialist` (API/servidor)
- **Skills:** 
  - `nodejs-best-practices` (Node.js)
  - `api-patterns` (REST/autenticação)
  - `vulnerability-scanner` (segurança JWT)
  - `testing-patterns` (testes de auth)

**3. IA responde seguindo princípios:**
```
🤖 Aplicando @backend-specialist...

Vou implementar JWT auth com as melhores práticas:

1. Instalação:
   npm install jsonwebtoken bcrypt

2. Implementação segura:
   - Secret keys em .env (NUNCA hardcoded)
   - Tokens com expiração
   - Refresh tokens
   - Password hashing (bcrypt rounds >= 10)
   
3. Middleware de validação
4. Testes unitários
5. Documentação OpenAPI

Posso prosseguir? Alguma preferência específica?
```

**4. Após implementação:**
```bash
# IA roda automaticamente:
python .agent/scripts/checklist.py .

✅ Security Scan: PASSED (sem secrets hardcoded)
✅ Lint Check: PASSED (código formatado)
✅ Test Runner: PASSED (100% coverage em auth)
```

---

## 🎯 CASOS DE USO

### 1. **Iniciante em uma Tecnologia**
```
Você: "Como criar uma API em Node.js? Nunca fiz"

IA com Antigravity Kit:
- Carrega: nodejs-best-practices
- Ensina: Express vs Fastify vs Nest.js (trade-offs)
- Gera: Código com estrutura profissional
- Valida: Security, testes, documentação
```

### 2. **Mudança de Plataforma**
```
Você: "Preciso migrar de web para mobile"

IA:
- Detecta: projeto web React
- Rota: @mobile-developer
- Carrega: mobile-design, react-patterns
- Sugere: React Native ou Expo
- Adapta: componentes web → mobile
```

### 3. **Auditoria de Segurança**
```
Você: "Verifique se meu código está seguro"

IA:
- Ativa: @security-auditor
- Roda: security_scan.py
- Verifica: OWASP Top 10, secrets, dependências
- Reporta: vulnerabilidades com fixes
```

### 4. **Planejamento de Feature Grande**
```
Você: /plan adicionar sistema de pagamentos

IA:
- Ativa: @project-planner
- Método: 4 fases (Análise → Planning → Solution → Implementation)
- Cria: task.md com breakdown completo
- Solicita: aprovação antes de codificar
```

---

## 🚀 VANTAGENS DO ANTIGRAVITY KIT

### Sem Antigravity Kit:
❌ Código genérico  
❌ Falta de padrões  
❌ Sem validação  
❌ Resposta única  
❌ Precisa explicar tudo  

### Com Antigravity Kit:
✅ Código profissional  
✅ Padrões da indústria  
✅ Validação automática  
✅ Múltiplas perspectivas (agents)  
✅ Contexto inteligente  

---

## 📈 ESTATÍSTICAS DO PROJETO

- **10 Agentes** especializados
- **40+ Skills** de conhecimento
- **11 Workflows** prontos
- **18 Scripts** de validação
- **~160 arquivos** de templates
- **Licença:** MIT (Open Source)
- **Autor:** @vudovn

---

## 🔗 LINKS ÚTEIS

- **GitHub:** https://github.com/vudovn/antigravity-kit
- **Documentação:** https://antigravity-kit.vercel.app/
- **npm:** `@vudovn/ag-kit`

---

## ❓ PERGUNTAS FREQUENTES

### **Q: O Antigravity Kit escreve código sozinho?**
**R:** Não. Ele **melhora como a IA escreve código**, fornecendo contexto, padrões e validações.

### **Q: Preciso saber programar para usar?**
**R:** Sim. Ele é uma ferramenta para **desenvolvedores**, não substitui conhecimento.

### **Q: Funciona com qualquer IA?**
**R:** Sim! Gemini, ChatGPT, Claude - qualquer assistente que leia arquivos markdown.

### **Q: É gratuito?**
**R:** Sim! Licença MIT - uso comercial permitido.

### **Q: Os scripts Python são seguros?**
**R:** Sim! Veja o arquivo `AUDITORIA_SEGURANCA.md` para auditoria completa.

---

**Criado por:** Security Auditor + Documentation Specialist  
**Data:** 2026-01-23  
**Versão:** 2.0.0
