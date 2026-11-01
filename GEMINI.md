# Celebration Planner — Engineering Constitution & Rubric Guidelines

## 1. Architectural Boundaries (Code Quality & Efficiency)
- **Strict Separation**: Files inside `src/lib/` MUST be 100% pure TypeScript. Never import `react`, browser `window`/`localStorage`, or UI libraries inside `src/lib/`.
- **Single Type Authority**: All domain interfaces live exclusively in `src/types/plan.ts`.
- **Deterministic Math**: The LLM never calculates totals, remaining budget, or variances. All math is computed via `src/lib/calculations.ts`.
- **Efficiency**: Use `useMemo` for derived budget summaries, sorted task lists, and risk evaluations. Cancel stale API calls with `AbortController`.

## 2. State, Priority & Financial Rules (Problem Alignment)
- **Currency**: All monetary amounts are integer INR (no floats). Format with `formatINR()` (`en-IN` locale, `₹8,00,000`).
- **8 Budget Categories**: Always maintain the 8 core categories (`venue`, `catering`, `decor`, `photo_video`, `entertainment`, `invites`, `transport`, `misc`).
- **Priority-Aware Trade-Offs**: Every category has a user-configurable `priorityWeight: 'high' | 'medium' | 'low'`. Trade-off simulations and budget cuts must protect `'high'` priority categories (e.g., Food) and reduce `'low'` priority categories (e.g., Decor) first, never applying blind across-the-board cuts.
- **Task Dependencies**: Tasks may specify `dependsOnTaskId?: string`. A task whose dependency is not `done` is flagged as blocked.
- **Locking & Tombstones**:
  - User-created items have `source: 'user'` and `isLocked: true`.
  - Any manual edit automatically sets `isLocked: true`.
  - Deleting a task or vendor slot appends its ID to `plan.deletedIds`.
- **Zero Hallucinated Vendors**: Never invent business names, phone numbers, or contacts. Real vendor names only exist inside `VendorSlot.quotes[]` entered by the user.

## 3. Security, Testing & Accessibility (Grader Metrics)
- **Security**: Never expose `GEMINI_API_KEY` in client code (`VITE_*` env vars are forbidden for keys). Keys live exclusively in serverless `/api/*` routes with input length caps, Zod schema validation, and HTML/script sanitization.
- **Testing**: Every pure module in `src/lib/` must have a companion Vitest test suite in `src/lib/__tests__/`.
- **Accessibility (WCAG AA)**:
  - Every interactive icon button (especially padlock lock/unlock toggles, delete buttons, and status toggles) MUST have a descriptive `aria-label` and `aria-pressed` state where applicable.
  - All form inputs must have associated `<label htmlFor="...">` tags.
  - Use semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`).

## 4. Tech Stack Standards
- Frontend: React 18+, Vite, TypeScript (strict mode), Tailwind CSS, `lucide-react`, `zod`.
- AI SDK (Bit 2+): Official `@google/genai` SDK using `process.env.GEMINI_MODEL`.
