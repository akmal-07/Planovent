# Celebration Planner — Prompts, Architecture & Evaluation Dossier

> **Prompt Wars Virtual Challenge 5: AI-Powered Celebration Planner**  
> Complete record of system architecture, prompt engineering evolution, and deterministic engineering invariants.

---

## 1. System Architecture & 3-Layer Separation of Concerns

To prevent architectural drift and eliminate hallucinations, Celebration Planner enforces a strict 3-Layer separation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      REACTIVE PRESENTATION LAYER                       │
│    React 19 • Tailwind CSS • Lucide Icons • Semantic Landmarks & ARIA  │
│    useWeddingPlan Hook • WhatIfWorkspace • RiskRadar • FamilySummary   │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Actions & User Events
                                  │ Derived state via useMemo
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       PURE DETERMINISTIC ENGINE                        │
│                           (src/lib/*.ts)                               │
│      100% Pure TypeScript • Zero React • Zero Browser / DOM / Storage  │
│                                                                        │
│ • calculations.ts   → 3-Number Budget, Integer INR, Largest-Remainder │
│ • simulator.ts      → 0ms Elasticity (per_guest, step, fixed), Shields │
│ • riskEngine.ts     → 6 Deterministic Rules, Health Score (0-100)      │
│ • mergeEngine.ts    → Non-Destructive Ingestion, DFS Cycle Breaker     │
│ • summaryFormatter.ts → Deep Zod Validation (200KB), WhatsApp Brief    │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Validated Prompts & Plan Context
                                  │ Zod Validated Schemas
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   SERVERLESS AI & SCHEMA BOUNDARY                      │
│                  (/api/*.ts & api/_shared.ts)                          │
│                                                                        │
│ • /api/generate     → GEMINI_MODEL primary (12s per-attempt timeout)   │
│ • /api/refine       → Respects isLocked, quotes, and matchKey tombstones│
│ • /api/narrate      → GEMINI_MODEL_FAST (ThinkingLevel.LOW) commentary  │
│ • Dual-Model Route  → 1x automatic retry on fast model on 429/5xx      │
│ • Zod Strict Schemas→ Strict JSON responseSchema; no vendor contact AI │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rubric Alignment & Challenge 5 Benchmark

| Rubric Evaluation Dimension | Implementation in Celebration Planner |
| :--- | :--- |
| **Problem Statement Alignment** | Benchmark **₹8,00,000 / 200 Guests / 4-Month** Hyderabad celebration preset. 5 distinct multi-day functions (`Haldi`, `Mehndi`, `Sangeet`, `Wedding Ceremony`, `Reception`). Multi-attribute prioritization (`high`, `medium`, `low`). Dynamic relative dates (`+120` to `+123` days) prevent stale presets. |
| **Budget Transparency** | Strict 3-Number Formula: $\text{Effective} = \text{actual} \mathbin{??} \text{estimated}$. Clear tracking of committed spend, paid amounts, balance due, and buffer cushion in `en-IN` formatting (`formatINR`, `formatCompactINR`). |
| **Priority-Aware Trade-Offs** | When budget cuts or elasticity deficits are applied, flexible `'low'` priority categories (Decor, Invites) absorb reductions first, while non-negotiable `'high'` priority categories (Catering, Photography) are shielded. Unresolvable deficits are flagged when High/Locked exceed target. |
| **Real Vendor Comparator** | Archetype-based slots comparing real user quotes. Side-by-side quote comparison immediately visible on initial load. Finalizing a vendor quote synchronizes confirmed pricing into the category's `actual` spend while strictly forbidding the LLM from inventing fake business names. |
| **What-If Elasticity Modeling** | Instant 0ms client-side math for guest counts (50–800), target budgets (₹2L–₹50L), and celebration style tiers (`0.85x`, `1.0x`, `1.25x`) with Hamilton–Hare Largest-Remainder integer rupee allocation. |
| **Category Scaling Heuristics** | `per_guest` (linear guest ratio), `step` (discrete linear step-interval heuristic: `Math.trunc(delta / stepSize)`), and `fixed` (invariant to guests). |
| **Operational Risk Radar** | 6 deterministic diagnostic rules evaluating over-budget conditions, category overruns (>15%), overdue milestones, blocked DAG tasks, unassigned leads, and pending vendors with 1-click action fixes. Opens with balanced 75–85 ("Needs Attention") health score. |
| **Family Collaboration** | 1-click WhatsApp plain-text brief copying, dedicated unclipped multi-page executive printable layout (`@media print`), and schema-validated JSON plan backups (<200KB) for cross-device sharing. |
| **Code Quality & Testing** | **71 Vitest unit tests** passing with 100% pass rate. Pure TypeScript engine in `src/lib/`. Built with semantic HTML landmarks, keyboard navigation, and explicit ARIA labels (`aria-label`, `aria-pressed`, `role="dialog"`). |

---

## 3. Milestone Prompt Evolution (Bits 1 through 4.5)

### Bit 1: Deterministic Engine & Presentation Foundations
- **Objective**: Establish the core domain model in `src/types/plan.ts`, pure calculation engine in `src/lib/calculations.ts`, and accessible component tree.
- **Key Decision**: Banned all floats. All currency math is whole integer INR. Established the Largest-Remainder rupee distribution so proportional splits always sum to the exact integer total.
- **Grader Invariant**: 20 Vitest unit tests passing; zero React imports in `src/lib/`.

### Bit 2: Serverless AI Copilot & Non-Destructive Ingestion
- **Objective**: Connect Google Gemini using the official `@google/genai` SDK with dual schema validation (Gemini `responseSchema` + Zod `AiGeneratedPlanSchema`).
- **Prompt Strategy**: Gemini generates integer percentage shares (`sharePercent: 0-100`) rather than rupees; TypeScript computes exact rupees.
- **Key Decision**: Built `localApiMiddleware` in `vite.config.ts` so developers running `npm run dev` don't face `404` errors on `/api/*` routes.
- **Grader Invariant**: Proved that user-locked categories and user-entered vendor quotes survive AI refinement without being overwritten.

### Bit 2.5: Hardening, Normalized Tombstones, and Dual-Model Routing
- **Objective**: Eliminate all mock/demo fallbacks, harden environment variables, and prevent AI resurrection of deleted items.
- **Key Decision 1 (Zero Hardcoded Models)**: Read `GEMINI_MODEL` and `GEMINI_MODEL_FAST` strictly from `process.env`. If either is missing, return a typed 500 error `MISSING_MODEL_CONFIG`.
- **Key Decision 2 (Structured Tombstone MatchKeys)**: Replaced string IDs with structured `{ id, matchKey, label }` where `matchKey` is normalized (lowercase, trimmed, punctuation-stripped). The AI prompt forbids re-introducing tombstoned items or close synonyms.
- **Key Decision 3 (DAG Cycle Breaking)**: Implemented 3-color DFS in `mergeEngine.ts` to detect and break circular dependencies (`A -> B -> A`).
- **Key Decision 4 (Dual-Model Fallback)**: On 429/5xx errors, automatically retries once on `GEMINI_MODEL_FAST` with `thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }`.

### Bit 3: 0ms What-If Elasticity Simulator, Risk Radar, and Fast-Model Narrator
- **Objective**: Provide instantaneous client-side guest & budget elasticity math and deterministic risk evaluation.
- **Key Decision 1 (Client Math at 0ms)**: Dragging guest count (50–800) or budget sliders executes in 0ms client-side via `scaleCategory` (`per_guest`, `step`, `fixed`).
- **Key Decision 2 (Fast Model Narration)**: `/api/narrate` strictly uses `GEMINI_MODEL_FAST` (`gemini-3.5-flash-lite`) with `ThinkingLevel.LOW` to produce 2-sentence executive trade-off summaries based exclusively on the computed rupee deltas.
- **Key Decision 3 (Deterministic Risk Radar)**: 6 automated rules compute a bounded Health Score (0–100) and provide 1-click fixes (`+7 Days Deadline`, `Complete Prerequisite`, inline `Assign Lead`, `1-Click Priority Rebalance`).

### Bit 4: Family Sharing, JSON Export/Import, Print Stylesheet, and Alignment
- **Objective**: Enable real family collaboration, backup portability, and submission documentation.
- **Key Decision 1 (WhatsApp Brief Formatter)**: Pure, unit-tested `formatFamilySummaryText()` creates an emoji-structured, high-signal brief ready to paste in family groups.
- **Key Decision 2 (Quota Protection)**: Added an explicit `autoNarrate` toggle in `WhatIfWorkspace.tsx` (defaults to OFF), allowing users to drag sliders freely without burning API quotas.

### Bit 4.5: Pre-Deploy Production Hardening
- **Objective**: Full Vercel serverless compatibility, per-attempt timeouts, deep Zod import validation, unified priority deficit math, and unclipped printing.
- **Key Decision 1 (Vercel Serverless Resolution)**: Co-located shared schemas and timeout helpers in `api/_shared.ts` to eliminate `ERR_MODULE_NOT_FOUND` across serverless bundlers, paired with `vercel.json` (`maxDuration: 30`).
- **Key Decision 2 (12s Per-Attempt Timeouts)**: Wrapped each model call in a 12s timeout (`withTimeout`), guaranteeing primary + fast fallback completes within 24s.
- **Key Decision 3 (Deep Zod Validation & 200KB Cap)**: Added `WeddingPlanImportSchema` enforcing 200KB limits, integer amounts, valid dates, and all 8 categories during JSON import and `localStorage` hydration.
- **Key Decision 4 (Unified Deficit Math & Unresolvable Deficit)**: Unified `cutBudgetByPercentage` and `runWhatIfSimulation` via `absorbDeficitByPriority`. Mathematically unresolvable deficits surface an explicit warning banner while strictly protecting High-Priority categories.
- **Key Decision 5 (Relative Preset Dates & Initial Radar Score)**: Dynamic relative dates (`getRelativeDate(offset)`) ensure the 4-month preset never goes stale, opening with realistic side-by-side quotes and a 75–85 ("Needs Attention") health score.
- **Key Decision 6 (Unclipped Print Layout)**: Added a top-level `<div className="hidden print:block">` executive layout, hiding the interactive shell and modal backdrops on print to eliminate clipping.

---

## 4. Gemini Schema Boundary & Prompt Invariants

### Response Schema Enforcement (`@google/genai`)
We use `@google/genai` (version `^2.31.0`) with `responseMimeType: 'application/json'` and `responseSchema: geminiPlanResponseSchema`.

```typescript
export const geminiPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    city: { type: Type.STRING },
    eventStyle: { type: Type.STRING },
    guestCount: { type: Type.INTEGER },
    totalBudget: { type: Type.INTEGER },
    accessibilityNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
    functions: { /* array of name, date, time */ },
    budgetAllocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING, enum: [...BUDGET_KEYS] },
          label: { type: Type.STRING },
          sharePercent: { type: Type.INTEGER },
          priorityWeight: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          scalingType: { type: Type.STRING, enum: ['fixed', 'per_guest', 'step'] },
          rationale: { type: Type.STRING },
        },
        required: ['key', 'label', 'sharePercent', 'priorityWeight', 'scalingType', 'rationale'],
      },
    },
    tasks: { /* id, title, deadline, priority, assignee, eventFunction */ },
    vendors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          categoryKey: { type: Type.STRING, enum: [...BUDGET_KEYS] },
          type: { type: Type.STRING }, // Archetype only, NO vendor names or contacts
          estimatedQuote: { type: Type.INTEGER },
        },
        required: ['id', 'categoryKey', 'type', 'estimatedQuote'],
      },
    },
    ideas: { /* title, description, category */ },
    aiSummary: { type: Type.STRING },
  },
  required: [
    'title', 'city', 'eventStyle', 'guestCount', 'totalBudget',
    'accessibilityNeeds', 'functions', 'budgetAllocations',
    'tasks', 'vendors', 'ideas', 'aiSummary'
  ],
};
```

### Prompt Engineering Directives
1. **Integer INR Invariant**: All values must be whole integer rupees.
2. **8 Core Categories**: The 8 categories (`venue`, `catering`, `decor`, `photo_video`, `entertainment`, `invites`, `transport`, `misc`) must always be present.
3. **Priority Protection**: Non-negotiable high-priority categories (food, photography) are shielded from cuts during budget reductions; low-priority categories (decor, invites) absorb reductions first.
4. **Zero Vendor Hallucinations**: Real vendor names, phone numbers, and URLs are strictly forbidden in the AI schema. Real vendor contacts only exist in user-entered quotes.
5. **No Canned Output**: Never simulate or fake AI output. Failures return typed error codes and keep the existing plan intact.

---

## 5. Non-Destructive Merge Engine Invariants (`src/lib/mergeEngine.ts`)

| Domain Entity | Ingestion Behavior on AI Refinement |
| :--- | :--- |
| **Locked Categories (`isLocked: true`)** | AI proposed allocations are completely discarded. User-configured amount is 100% preserved. |
| **Confirmed Quotes (`VendorSlot.quotes`)** | User-entered vendor proposals and finalized quotes are strictly preserved. |
| **Category Actuals & Paid** | `actual` and `paid` tracking fields are preserved untouched. |
| **User Tasks (`source: 'user'` or `isLocked`)** | User-created or manually locked tasks are immune from AI modification. |
| **Tombstones (`tombstones`)** | Incoming items matching any tombstone by `id` or normalized `matchKey` are rejected. |
| **Task Dependencies (DAG)** | Inbound dependencies are passed through a 3-color DFS cycle detector to break cycles before ingestion. |
| **Completed Tasks (`done: true`)** | Completed task status is preserved when task dates or titles are refined. |

---

## 6. Verification Summary (71 Vitest Tests Passing)

```
Test Files  6 passed (6)
     Tests  71 passed (71)
  Duration  1.64s

✓ src/lib/__tests__/calculations.test.ts (25 tests)
✓ src/lib/__tests__/schema.test.ts (11 tests)
✓ src/lib/__tests__/mergeEngine.test.ts (10 tests)
✓ src/lib/__tests__/simulator.test.ts (9 tests)
✓ src/lib/__tests__/summaryFormatter.test.ts (9 tests)
✓ src/lib/__tests__/riskEngine.test.ts (7 tests)
```

Built with 0 TypeScript errors (`tsc -b`) and 0 Vite bundling warnings.
