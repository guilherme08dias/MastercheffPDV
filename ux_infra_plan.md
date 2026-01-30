# UX & Infrastructure Optimization Plan

> **Objective:** Maximize resilience and visibility while keeping the architecture server-dependent (Online-Only).

## 1. Vite Split Chunks Strategy

To speed up the initial load of the "Cardápio" (Client View), we will separate the heavy Admin/POS code from the public view.

| Chunk Name | Content | Rationale |
| :--- | :--- | :--- |
| **`vendor`** | `react`, `react-dom`, `framer-motion`, `lucide-react` | Core libs needed everywhere. Cached aggressively. |
| **`client`** | `Cardapio.tsx`, `LoginScreen.tsx` | The only things a customer needs to load. Lightweight. |
| **`pos`** | `POS.tsx`, `SimplePOS.tsx`, `CartSidebar.tsx` | Heavy logic for staff. Loaded only after login. |
| **`admin`** | `AdminDashboard.tsx`, `SalesReports.tsx`, `ExpenseManager.tsx` | Heavy charts and tables. Loaded only for Admins. |

**Configuration:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
        admin: ['./src/components/AdminDashboard.tsx', './src/components/SalesReports.tsx'],
        // ... mapped by import path
      }
    }
  }
}
```

## 2. "Yellow-Safety" Contrast Rules

Accessibility audit found that White text on our Brand Yellow (#FFCC00) fails AAA standards.

**New Rule:**
- **Primary Buttons (Yellow):** MUST use **Black** text (`text-black`).
- **Warnings/Alerts (Yellow):** MUST use **Black** text.
- **Dark Mode Backgrounds:** Keep `apple.gray1` (#1C1C1E) as base.
- **Success/Green:** Ensure it contrasts well against the dark gray background.

## 3. Network Resilience (ConnectivityBadge)

Since we are blocking "Offline Mode" (Service Workers), we must be extremely transparent about connection status.

**Component Logic:**
1.  Listen to `supabase.channel('system')` or standard `window.addEventListener('offline')`.
2.  **State 'Online':** Hidden or subtle green dot (optional).
3.  **State 'Offline':** Prominent Red/Orange Banner at the top: "SEM CONEXÃO - Não feche esta tela".
4.  **Action:** Block "Finalizar Pedido" buttons while offline to prevent data loss or sync errors.

## 4. Session Persistence

**Problem:** Mobile browsers aggressively clear memory tabs. A refresh shouldn't log the user out.
**Fix:** Explicitly configure Supabase to use `localStorage` and recover session automatically on reload.
