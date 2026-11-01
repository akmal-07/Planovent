# Celebration Planner — Prompts, Architecture & Evaluation Dossier

## 1. System Architecture & 3-Layer Separation of Concerns
Celebration Planner enforces a strict 3-Layer separation to eliminate architectural drift and guarantee deterministic reliability:

```
[ Reactive UI Layer ] (React 18 + Tailwind CSS + Lucide Icons + WCAG AA Landmarks)
         │  ▲
   Actions │  │ Derived State via useMemo
         ▼  │
[ Pure Deterministic Engine ] (src/lib/calculations.ts, simulator.ts, riskEngine.ts, mergeEngine.ts)
   - Zero React imports, Zero browser DOM/localStorage
   - 100% integer INR math, 3-number budget invariant: effective = actual ?? estimated
   - Task dependency graph & auto-locking state invariants
         │
         ▼
[ AI Schema & API Boundary ] (/api/generate.ts, /api/refine.ts, src/schemas/geminiSchema.ts)
   - Serverless Gemini 2.5 / 3.x Flash with official @google/genai SDK
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
| **Bit 1** | Core types, pure calculation engine, Vitest unit test suites, WCAG AA static UI, and benchmark ₹8L/200-guest preset. | `vitest run` 100% pass, `tsc -b` 0 errors. |
| **Bit 2 (Completed)** | Serverless `/api/generate` & `/api/refine` with official `@google/genai` SDK, Zod schema boundary, non-destructive merge engine with lock & quote preservation, and 1-click snapshot rollback. | Test suites prove locked items and user quotes survive AI mutations. |
| **Bit 3 (Upcoming)** | 0ms Client-Side What-If Elasticity Simulator (`per_guest`, `step`, `fixed`) + Deterministic Risk Radar rule evaluator. Rapid slider movements debounced with `AbortController`. | 60fps slider updates, prioritized trade-off narration. |
| **Bit 4 (Final)** | Family Summary sheet (print/PDF layout), WhatsApp formatted text export, final UX polish, and submission assets. | Full end-to-end verification and documentation. |

---

## 4. Bit 2: Gemini Schema Boundary & Prompt Architecture

### Official SDK Usage: `@google/genai`
We intentionally use the current official SDK `@google/genai` (version `^2.31.0`) with `process.env.GEMINI_MODEL || 'gemini-2.5-flash'`. The deprecated `@google/generative-ai` package is strictly excluded.

### Strict Schema Boundary (`src/schemas/geminiSchema.ts`)
Dual validation ensures zero malformed data:
1. **Gemini Engine Level**: `@google/genai` `responseSchema` forces Gemini to output valid JSON with explicit types (`Type.OBJECT`, `Type.ARRAY`, `Type.INTEGER`, `Type.STRING`).
2. **Runtime Zod Validation**: `AiGeneratedPlanSchema.safeParse()` validates every inbound payload before merging.

### System Prompt Invariants
- **Integer INR Currency**: No floating point numbers or currencies other than INR.
- **Invariant 8 Categories**: `venue`, `catering`, `decor`, `photo_video`, `entertainment`, `invites`, `transport`, `misc`. Sum equals `totalBudget`.
- **Zero Hallucinated Vendors**: Only descriptive archetypes are generated (e.g., *"Candid Photographer & Cinematographer"*). No invented business names, URLs, or phone numbers.
- **Priority-Aware Allocation**: High-priority categories (Catering, Photography) are protected during cuts; low-priority categories (Decor, Invites) absorb reductions first.

---

## 5. Non-Destructive Merge Engine (`src/lib/mergeEngine.ts`)

| Domain Entity | Merge Behavior on AI Refinement |
| :--- | :--- |
| **Locked Categories** | If `isLocked === true`, AI `estimated` is completely ignored. Preserves user-set values. |
| **Category Actuals & Paid** | Existing `actual` quotes and `paid` payments are 100% preserved. |
| **User & Locked Tasks** | User-created (`source: 'user'`) or locked tasks are 100% immune from AI modifications. |
| **Deleted Items (Tombstones)** | Any task or vendor slot whose ID or normalized title is in `deletedIds` is rejected and never resurrected. |
| **Vendor Quotes** | User-entered `quotes: VendorQuote[]` are preserved intact during refinement. |
| **Task Completion** | Completed status (`done: true`) is retained when task dates or assignees update. |

---

## 6. Vite Local API Middleware vs. Vercel Serverless
To avoid the classic trap where `/api/*` routes 404 under plain Vite `npm run dev`:
- In `vite.config.ts`, a custom `localApiMiddleware` plugin intercepts `POST /api/generate` and `POST /api/refine` in development.
- It dynamically loads `.env` (`GEMINI_API_KEY`) and dispatches directly to the serverless handlers.
- In production, Vercel natively deploys `api/generate.ts` and `api/refine.ts` as serverless functions.
