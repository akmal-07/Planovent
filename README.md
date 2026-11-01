# Celebration Planner — AI-Assisted Wedding & Event Architecture

> **Prompt Wars Virtual Challenge 5 Submission**  
> Built with React 19, TypeScript (Strict), Tailwind CSS, Vite, Vitest, and the official Google GenAI SDK (`@google/genai`).

[![Tests](https://img.shields.io/badge/Vitest-62%20passed-emerald?style=flat-square&logo=vitest)](file:///c:/Users/moham/Documents/AntiGravity/Planovent/src/lib/__tests__)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%200%20errors-blue?style=flat-square&logo=typescript)](file:///c:/Users/moham/Documents/AntiGravity/Planovent/tsconfig.json)
[![Architecture](https://img.shields.io/badge/Architecture-3--Layer%20Deterministic-gold?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-stone?style=flat-square)](file:///c:/Users/moham/Documents/AntiGravity/Planovent/LICENSE)

---

## 1. Problem Statement Alignment (Prompt Wars Challenge 5)

Planning an Indian wedding is a complex, high-stakes optimization challenge balancing competing family expectations, fluctuating guest counts, strict dietary and cultural traditions, multi-day ceremonies, and tight financial constraints.

Most AI wedding tools fail in production because they:
1. Invent fake vendor contact details and hallucinate prices.
2. Clumsily overwrite user-confirmed details during AI regeneration.
3. Fail basic arithmetic (hallucinating budget totals that do not sum to the user's budget).
4. Apply blind, across-the-board cuts rather than protecting non-negotiable family priorities.

**Celebration Planner** is engineered with a **3-Layer Deterministic Architecture** that prevents AI drift, protects user decisions, and provides real-world event coordination:

- **Benchmark Scenario Preset**: Official **₹8,00,000 / 200 Guests / 4-Month** Hyderabad wedding preset featuring 5 multi-day functions (`Haldi`, `Mehndi`, `Sangeet`, `Wedding Ceremony`, `Reception`).
- **Priority-Aware Trade-Offs**: Categories carry user-defined priorities (`high`, `medium`, `low`). Non-negotiables (e.g., Food & Photography) are strictly shielded while flexible categories (e.g., Decor & Invites) absorb cuts first.
- **DAG Task Dependency Engine**: Directed Acyclic Graph tracking (`dependsOnTaskId`) with automatic cycle breaking (3-color DFS) and blocker warnings (`isTaskBlocked`).
- **Real Vendor Comparator**: Side-by-side quote comparison. Selecting a finalized quote synchronizes confirmed costs to category `actual` spend while strictly forbidding the LLM from hallucinating real businesses.
- **0ms Client-Side What-If Elasticity Simulator**: Instant client math for guest shifts (50–800) and budget changes (₹2L–₹50L) across `per_guest`, `step`, and `fixed` scaling tiers.
- **Deterministic Risk Radar**: 6 automated diagnostic rules calculating a bounded Health Score (0–100) with 1-click action fixes.
- **Family Sharing**: 1-click WhatsApp text brief formatting, PDF printable sheets (`@media print`), and schema-validated JSON backup import/export.

---

## 2. System Architecture & 3-Layer Separation

Celebration Planner enforces a strict architectural boundary where the UI, deterministic math, and AI layers never bleed into each other:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      REACTIVE PRESENTATION LAYER                       │
│    React 19 • Tailwind CSS • Lucide Icons • WCAG AA Landmarks & ARIA    │
│    useWeddingPlan Hook • WhatIfWorkspace • RiskRadar • FamilySummary   │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Actions & UI Events
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
│ • summaryFormatter.ts → WhatsApp Text Brief, JSON Import Validator     │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Validated Prompts & Plan Context
                                  │ Zod Validated Schemas
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   SERVERLESS AI & SCHEMA BOUNDARY                      │
│                  (/api/*.ts & src/schemas/*.ts)                        │
│                                                                        │
│ • /api/generate     → GEMINI_MODEL primary (₹ integer % allocations)   │
│ • /api/refine       → Respects isLocked, quotes, and matchKey tombstones│
│ • /api/narrate      → GEMINI_MODEL_FAST (ThinkingLevel.LOW) commentary  │
│ • Dual-Model Route  → 1x automatic retry on fast model on 429/5xx      │
│ • Zod Strict Schemas→ Strict JSON responseSchema; no vendor contact AI │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Engineering Guarantees & Honest Boundaries

### A. Deterministic Math & Largest-Remainder Rupee Allocation
- **The LLM Never Calculates Rupees**: The LLM outputs integer percentage shares `sharePercent: 0-100` summing to 100%. All rupee allocations are computed deterministically in TypeScript using the **Hamilton–Hare Largest-Remainder Method**, guaranteeing category allocations sum to the **exact integer rupee budget** with zero rounding drift.
- **3-Number Budget Formula**: At any moment, every category evaluates:
  $$\text{Effective Spend} = \text{actual} \mathbin{??} \text{estimated}$$
  $$\text{Balance Due} = (\text{actual} \mathbin{??} \text{estimated}) - \text{paid}$$
  $$\text{Remaining Budget} = \text{Total Budget} - \sum (\text{actual} \mathbin{??} \text{estimated})$$

### B. Non-Destructive Refinement & Structured Tombstones
- **User Lock Invariant**: User-created items default to `source: 'user'` and `isLocked: true`. Any manual edit automatically locks the item.
- **AI Refinement Protection**: The AI refinement engine is non-destructive—locked categories, user-entered vendor quotes, and task statuses (`done: true`) are 100% immune to AI overwriting.
- **Structured Tombstone MatchKeys**: Deleted items generate `{ id, matchKey, label }` where `matchKey` is lowercase, whitespace-collapsed, and punctuation-stripped. The AI refinement prompt strictly forbids re-introducing tombstoned items or close synonyms.
- **DAG Cycle Sanitizer**: Task prerequisites are evaluated via a 3-color DFS cycle detector. If an AI refinement proposes circular dependencies (`A -> B -> A`), the engine automatically breaks the cycle before state ingestion.
- **Transactional Snapshot Management**: `lastSnapshot` enables a 1-click transactional undo. To prevent restoring stale states, `lastSnapshot` is automatically cleared (`null`) whenever the user makes any manual edit after an AI action.

### C. Zero Hallucinated Vendors (Safety Boundary)
- **Zero Real Business Contacts in Schema**: The AI schema strictly defines `type` (e.g., *"Candid Photographer & Cinematographer"*) and `estimatedQuote: number`. It does **not** contain vendor names, phone numbers, addresses, or URLs. Real vendor names only exist inside `VendorSlot.quotes[]` entered directly by the user.
- **Honest AI Boundary**: Free-text creative fields (such as cultural ceremony tips in `ideas`) remain LLM-generated creative suggestions; all financial math and scheduling logic is strictly deterministic.

### D. Dual-Model Resilience & Quota-Safe Narration
- **Zero Hardcoded Model Defaults**: `GEMINI_MODEL` (`gemini-3.8-flash`) and `GEMINI_MODEL_FAST` (`gemini-3.5-flash-lite`) are strictly configured via server environment variables.
- **Automatic 1x Retry**: If the primary model encounters rate limits (`429`) or server errors (`5xx`), it retries once on `GEMINI_MODEL_FAST` and returns `modelUsed`.
- **Fast-Model Narration**: Sliders in the What-If simulator update deterministic TypeScript math at 0ms. Narration calls `/api/narrate` using `GEMINI_MODEL_FAST` (`thinkingConfig: { thinkingLevel: 'LOW' }`) to preserve quota and minimize latency.
- **Manual / Quota-Safe Toggle**: Auto-narration is toggleable (defaults to manual click), ensuring a user dragging sliders rapidly never exhausts free-tier API quotas.
- **Zero Simulated Fallbacks**: If the API key is missing or both Gemini attempts fail, a typed error code (`MISSING_API_KEY`, `MISSING_MODEL_CONFIG`, `GEMINI_UPSTREAM_ERROR`) is returned and a non-blocking error banner is displayed. The existing plan remains 100% intact.

---

## 4. Verification & Vitest Test Suites

Every pure module in `src/lib/` has a companion Vitest test suite. Run the full test suite with:

```bash
npx vitest run
```

### Test Suite Summary (62 Unit Tests Across 6 Pure Suites)

| Test Suite | File | Tests | Coverage Scope |
| :--- | :--- | :---: | :--- |
| **Budget Calculations** | [`calculations.test.ts`](file:///c:/Users/moham/Documents/AntiGravity/Planovent/src/lib/__tests__/calculations.test.ts) | 20 | 3-Number budget math, largest-remainder rupee allocation, auto-lock on edit, currency formatting (`formatINR`, `formatCompactINR`), DAG blocker detection. |
| **AI Schema Boundary** | [`schema.test.ts`](file:///c:/Users/moham/Documents/AntiGravity/Planovent/src/lib/__tests__/schema.test.ts) | 11 | Zod strict validation, rejection of floating share percents, rejection of extra hallucinated fields, input length caps, `/api/generate` fallback retry, `/api/narrate` fast-model requirement. |
| **Non-Destructive Merge** | [`mergeEngine.test.ts`](file:///c:/Users/moham/Documents/AntiGravity/Planovent/src/lib/__tests__/mergeEngine.test.ts) | 10 | Lock preservation, user quote persistence, tombstone rejection, 3-color DFS cycle breaking, actual spend synchronization. |
| **What-If Simulator** | [`simulator.test.ts`](file:///c:/Users/moham/Documents/AntiGravity/Planovent/src/lib/__tests__/simulator.test.ts) | 8 | `per_guest`, `step` (positive and negative increments), `fixed` category scaling, lock preservation, priority-weighted deficit absorption, exact integer rupee totals. |
| **Risk Radar Engine** | [`riskEngine.test.ts`](file:///c:/Users/moham/Documents/AntiGravity/Planovent/src/lib/__tests__/riskEngine.test.ts) | 7 | Deterministic evaluation of all 6 rules (over-budget, actual overrun >15%, overdue tasks, blocked DAG tasks, unassigned tasks, pending/unquoted vendors near date), bounded Health Score (0–100). |
| **Family Summary & Validator** | [`summaryFormatter.test.ts`](file:///c:/Users/moham/Documents/AntiGravity/Planovent/src/lib/__tests__/summaryFormatter.test.ts) | 6 | Plain-text WhatsApp formatting, `en-IN` rupee strings, overdue/blocked task tags, JSON backup import validation, rejection of corrupt JSON/missing categories. |
| **Total Test Count** | **6 Suites** | **62 / 62** | **100% Pass Rate (0 Failures)** |

To verify strict TypeScript compilation and Vite production bundling:

```bash
npm run build
```

---

## 5. Getting Started & Local Development

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22)
- npm or pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/celebration-planner.git
   cd celebration-planner
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Google AI Studio API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.8-flash
   GEMINI_MODEL_FAST=gemini-3.5-flash-lite
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

> [!NOTE]
> **Vite Local API Middleware**: In local development (`npm run dev`), a custom Vite middleware in `vite.config.ts` intercepts `/api/generate`, `/api/refine`, and `/api/narrate` requests and routes them directly to the serverless handlers with `.env` loaded, without requiring `vercel dev`.

---

## 6. Vercel Deployment Guide

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. In **Project Settings $\rightarrow$ Environment Variables**, configure:
   - `GEMINI_API_KEY`: Your Google AI Studio API key
   - `GEMINI_MODEL`: `gemini-3.8-flash`
   - `GEMINI_MODEL_FAST`: `gemini-3.5-flash-lite`
4. Deploy. Vercel will automatically compile the frontend bundle and serve `/api/*.ts` as serverless functions.

---

## 7. Submission Dossier & Prompt Evolution

For complete details on prompt evolution across milestones, system trade-offs, and rubric alignment, see [`PROMPTS_AND_ARCHITECTURE.md`](file:///c:/Users/moham/Documents/AntiGravity/Planovent/PROMPTS_AND_ARCHITECTURE.md).
