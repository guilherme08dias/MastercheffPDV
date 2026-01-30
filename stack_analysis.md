# Tech Stack Analysis & Optimization Report

> **Date:** 29/01/2026
> **Scope:** Performance, Offline Capabilities, and Accessibility.

## 1. Dependencies Snapshot (`package.json`)

| Package | Current Version | Status | Notes |
| :--- | :--- | :--- | :--- |
| **React** | `^19.2.3` | ✅ Bleeding Edge | Using React 19 stable. |
| **Vite** | `^6.2.0` | ✅ Latest | Excellent for build speed. |
| **Supabase JS** | `^2.90.0` | ✅ Latest | v2 sdk is robust. |
| **Tailwind CSS** | `^3.4.1` | ⚠️ v3 | Tailwind v4 is out, consider upgrade or keep stable v3. |
| **Framer Motion** | `^12.27.1` | ✅ Latest | Good for micro-interactions. |
| **Lucide React** | `^0.561.0` | ✅ Latest | Standard icon set. |

**Missing Critical Packages:**
- `vite-plugin-pwa`: Essential for "Install App" experience and offline asset caching.
- `@types/supabase`: Currently using `any` or loose types. Need generation.

## 2. Vite Configuration (`vite.config.ts`)

**Current State:** Basic React setup.
```typescript
plugins: [react()],
```

**Issues:**
1.  **No Chunk Splitting**: The entire app (POS, Admin, Landing) might be bundled together. Usually leads to large initial load.
2.  **No PWA**: The app behaves like a website, not a native app. No service worker for offline asset caching.
3.  **Aliases**: Only `@` mapping to root `.` is configured.

**Optimization Plan:**
- Implement `manualChunks` to split `vendor` (react, supabase) from application code.
- Add `VitePWA` plugin for offline fallback and "Add to Home Screen".

## 3. Supabase Configuration (`lib/supabase.ts`)

**Current State:**
```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**Issues:**
1.  **Implicit Persistence**: While default is `localStorage`, explicitly setting `auth.persistSession: true` prevents ambiguity.
2.  **No Network Recovery**: No global configuration for `autoRefreshToken` behavior in poor networks (although default is usually fine, tweaking timeouts helps).
3.  **Global Error Handling**: There is no wrapper to catch "Failed to fetch" globally, which is critical for POS stability.

## 4. UI/UX & Accessibility (`tailwind.config.js`)

**Colors:**
- `apple.gray1` (#1C1C1E) vs White Text (#FFFFFF): **Contrast 15.6:1 (AAA Pass)**.
- `branded.500` (#FFCC00) vs Black Text (#000000): **Contrast 13.7:1 (AAA Pass)**.
- `branded.500` (#FFCC00) vs White Text (#FFFFFF): **Contrast 1.5:1 (FAIL)**. *Action: Ensure buttons using Brand Color ALWAYS have Black text.*

**Dark Mode:** Configured as `class`. Correct.

## Summary of Next Steps
1.  **Vite**: Add PWA plugin + Manual Chunks.
2.  **Supabase**: Add explicit auth config + Global Error boundary.
3.  **Tailwind**: Enforce Black text on Yellow backgrounds.
