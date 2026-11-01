# Celebration Planner — Prompts, Architecture & Evaluation Dossier

## 1. System Architecture & 3-Layer Separation of Concerns
Celebration Planner enforces a strict 3-Layer separation to eliminate architectural drift and guarantee deterministic reliability:

```
[ Reactive UI Layer ] (React 18 + Tailwind CSS + Lucide Icons + WCAG AA Landmarks)
         │  ▲
   Actions │  │ Derived State via useMemo
         ▼  │
[ Pure Deterministic Engine ] (src/lib/calculations.ts, simulator.ts, riskEngine.ts)
   - Zero React imports, Zero browser DOM/localStorage
   - 100% integer INR math, 3-number budget invariant: effective = actual ?? estimated
   - Task dependency graph & auto-locking state invariants
         │
         ▼
[ AI Schema & API Boundary ] (/api/generate.ts, /api/refine.ts, src/schemas/)
   - Serverless Gemini 2.5 / 3.x Flash with @google/genai SDK
   - Strict Zod validation & JSON responseSchema enforcement
   - Non-destructive merging: preserves isLocked items, user quotes, respects deletedIds
   - Zero hallucinated vendors: AI generates archetypes & budget brackets only
```

---

## 2. Rubric Alignment & Benchmark Scenario
- **Target Scenario**: 4-Month Wedding Plan, **₹8,00,000 Total Budget**, **200 Guests**, multi-day functions (`Haldi`, `Mehndi`, `Sangeet`, `Wedding`, `Reception`).
- **Priority-Aware Trade-Offs**: Categories have user-defined `priorityWeight: 'high' | 'medium' | 'low'`. High priorities (e.g. Catering & Photography) are shielded during budget cuts; low priorities (e.g. Decor & Invites) take reductions first.
- **Task Dependencies**: Prerequisite tracking via `dependsOnTaskId`. Blocked tasks are flagged with warnings when prerequisites are incomplete.
- **Accessibility (WCAG AA)**: Semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<section>`), explicit `aria-label` and `aria-pressed` on all icon controls, associated form labels, and high-contrast color systems.

---

## 3. Milestone Prompt Evolution
| Milestone | Focus & Prompt Strategy | Grader Invariant |
| --- | --- | --- |
| **Bit 1 (Current)** | Core types, pure calculation engine, Vitest unit test suites, WCAG AA static UI, and benchmark ₹8L/200-guest preset. | `vitest run` 100% pass, `tsc -b` 0 errors. |
| **Bit 2 (Upcoming)** | Serverless `/api/generate` & `/api/refine` with official `@google/genai` SDK, Zod schema boundary, non-destructive merge engine with lock & quote preservation, and 1-click snapshot rollback. | Test suites prove locked items and user quotes survive AI mutations. |
| **Bit 3 (Upcoming)** | 0ms Client-Side What-If Elasticity Simulator (`per_guest`, `step`, `fixed`) + Deterministic Risk Radar rule evaluator. Rapid slider movements debounced with `AbortController`. | 60fps slider updates, prioritized trade-off narration. |
| **Bit 4 (Final)** | Family Summary sheet (print/PDF layout), WhatsApp formatted text export, final UX polish, and submission assets. | Full end-to-end verification and documentation. |
