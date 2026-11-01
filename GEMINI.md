# Celebration Planner — Engineering Constitution & Rubric Guidelines

## 1. Architectural Boundaries (Code Quality & Efficiency)
- **Strict Separation**: Files inside `src/lib/` MUST be 100% pure TypeScript. Never import `react`, browser `window`/`localStorage`, or UI libraries inside `src/lib/`.
- **Pure Engine Modules**: All deterministic logic lives exclusively in `src/lib/`:
  - `calculations.ts`: Budget formulas, currency formatting, auto-lock triggers, and largest-remainder rupee allocation.
  - `mergeEngine.ts`: Non-destructive AI merging (protects locks, quotes, tombstones, and breaks DAG dependency cycles).
  - `simulator.ts`: 0ms client-side guest/budget elasticity math (`fixed`, `per_guest`, `step`).
  - `riskEngine.ts`: Deterministic DAG risk and timeline blocker evaluation.
- **Single Type Authority**: All domain interfaces live exclusively in `src/types/plan.ts`. Never redeclare duplicate inline types in components.
- **Deterministic Math**: The LLM never calculates totals, remaining budgets, or variances. All math is computed deterministically in `src/lib/`.
- **Efficiency**: Use `useMemo` for derived budget summaries, sorted task lists, and risk evaluations. Cancel stale API calls with `AbortController`.

## 2. State, Priority & Financial Rules (Problem Alignment)
- **Currency**: All monetary amounts are whole integer INR (no floats). Format with `formatINR()` (`en-IN` locale, `₹8,00,000`) and `formatCompactINR()` (`₹8 L`).
- **8 Budget Categories**: Always maintain strictly the 8 core categories (`venue`, `catering`, `decor`, `photo_video`, `entertainment`, `invites`, `transport`, `misc`). Never add or delete categories.
- **Priority-Aware Trade-Offs**: Every category has a user-configurable `priorityWeight: 'high' | 'medium' | 'low'`. Budget cut simulations must protect `'high'` priority categories (e.g., Food & Photography) and reduce `'low'` priority categories (e.g., Decor & Invites) first, never applying blind across-the-board cuts.
- **Task Dependencies & DAG Integrity**: Tasks may specify `dependsOnTaskId?: string`. Tasks whose prerequisites are incomplete are flagged as blocked via `isTaskBlocked()`. Any circular dependencies (`A -> B -> A`) must be automatically detected and broken during AI ingestion.
- **Locking & Structured Tombstones**:
  - User-created items have `source: 'user'` and `isLocked: true`.
  - Any manual edit automatically sets `isLocked: true`.
  - Tombstones use structured `{ id: string; matchKey: string; label: string }[]` where `matchKey` is normalized (lowercase, trimmed, whitespace-collapsed, punctuation-stripped title/type).
  - AI refinement MUST reject any incoming item matching a tombstone by `id` OR `matchKey`.
  - AI refinement MUST preserve user-entered `VendorSlot.quotes[]` intact.
- **Transactional Snapshot Management**:
  - Maintain `lastSnapshot: WeddingPlan | null` to support a 1-click transactional undo.
  - `lastSnapshot` must be cleared (`null`) whenever the user performs any manual edit after an AI action to prevent restoring stale states.
- **No Simulated/Demo Fallbacks**: Never simulate or fake AI output. Missing API keys or Gemini failures must return a typed error (`{ error: string, code: string }`), display a clear error banner in the UI, and leave the existing plan 100% untouched.
- **Zero Hallucinated Vendors**: Never invent business names, phone numbers, or contacts. Real vendor names only exist inside `VendorSlot.quotes[]` entered by the user.

## 3. Security, Testing & Accessibility (Grader Metrics)
- **Security**: Never expose `GEMINI_API_KEY` in client code (`VITE_*` env vars are forbidden for keys). Keys live exclusively in serverless `/api/*` routes with input length caps (max 600 chars), strict Zod schema validation, and HTML sanitization.
- **Testing**: Every pure module in `src/lib/` must have a companion Vitest test suite in `src/lib/__tests__/`.
- **Accessibility (WCAG AA)**:
  - Every interactive icon button (lock toggles, delete buttons, status toggles) MUST have descriptive `aria-label` and `aria-pressed` attributes.
  - All form inputs must have associated `<label htmlFor="...">` tags.
  - Use semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).

## 4. Tech Stack Standards & Verification Gates
- **Stack**: React 19 / 18+, Vite, TypeScript (strict mode), Tailwind CSS, `lucide-react`, `zod`, `@google/genai`.
- **Local Dev /api Handling**: Local dev server uses Vite middleware (`localApiMiddleware`) in `vite.config.ts` to route `/api/*` seamlessly without requiring `vercel dev`.
- **Milestone Gate**: Before marking any Bit complete, `npm run test` (`npx vitest run`) and `npm run build` (`tsc -b && vite build`) MUST pass with 0 errors and 0 warnings.
