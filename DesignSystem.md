# XisMaster Design System (Night Premium)

## 1. Core Principles
- **Atmosphere**: "Night Premium" / "Dark Mode First".
- **Source of Truth**: This document and `tailwind.config.js`.
- **Aesthetics**: Glassmorphism, Neon/Action Accents, Elevated Greys.

## 2. Design Tokens

### Colors
| Semântica | Hex | Variável Tailwind | Descrição |
|-----------|-----|-------------------|-----------|
| **Primary Background** | `#1C1C1E` | `bg-primary-bg` | Fundo principal da aplicação (Night Carbon). |
| **Surface/Card** | `#2C2C2E` | `bg-surface` | Elementos elevados, cards, modais (Elevated Grey). |
| **Action/Accent** | `#FFCC00` | `text-action` / `bg-action` | Botões de ação, destaques, foco (Safety Yellow). |
| **Success/Status** | `#10B981` | `text-success` / `bg-success` | Feedback positivo, status online (Emerald Green). |

### Border Radius
- **Cards/Containers**: `rounded-2xl`
- **Buttons/Pills**: `rounded-full`

### Typography (Tailwind Defaults)
- **Title**: `font-bold` used sparsely.
- **Body**: `text-zinc-400` for secondary text.

## 3. Navigation Architecture

### A. ADMIN MODE
- **Layout**: Mobile-first fixed bottom bar.
- **Components**:
    - Icons: Dashboard, Cardápio, Financeiro.
    - Active state: Yellow (`text-action`).
    - Inactive state: Grey (`text-zinc-500`).

### B. POS MODE (Desktop)
- **Layout**:
    - **Top Bar**: Tabs de categoria (Lanches, Bebidas, etc.).
    - **Main Area**: Grid de produtos.
    - **Right Sidebar**: Carrinho fixo lateral.

### C. AUTO/WHATSAPP MODE
- **Interface**: "App-like" mobile experience.
- **Navigation**: "Triple Action Pill" flutuante na base da tela (`z-50`).
- **Actions**:
    1. **Left**: Buscar (Expandable Search).
    2. **Center**: Categorias (Sheet/Drawer).
    3. **Right**: Carrinho (Sheet/Drawer).
- **Style**: `bg-surface/80` with `backdrop-blur-md`, `border border-white/10`.

## 4. Component Standards

### Product Card (Mobile)
- **Background**: `bg-surface` (or transparent if in list).
- **Structure**:
    - **Image**: Left or Top (context dependent).
    - **Title**: `text-white font-medium`.
    - **Desc**: `text-zinc-400 text-sm line-clamp-2`.
    - **Price**: `text-action font-bold`.
    - **Action**: Button `rounded-full`, `bg-action` text-black (Contrast).

### Modais & Sheets
- **Backdrop**: `backdrop-blur-md bg-black/60`.
- **Content**: `bg-surface` (`#2C2C2E`).
- **Header**: Sticky top with Close button.

### Inputs
- **Base**: `bg-black/30` or `bg-surface`.
- **Border**: `border-zinc-700`.
- **Focus**: `ring-1 ring-action border-action`.
