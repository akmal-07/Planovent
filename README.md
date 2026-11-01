# Celebration Planner — AI-Assisted Wedding & Event Architecture

> 🌐 **Live Demo**: <LIVE_URL> | 🎥 **Walkthrough Video**: <VIDEO_URL>  
> **Prompt Wars Virtual Challenge 5 Submission**  
> Built with React 19, TypeScript (Strict), Tailwind CSS, Vite, Vitest, and the official Google GenAI SDK (`@google/genai`).

[![Tests](https://img.shields.io/badge/Vitest-73%20passed-emerald?style=flat-square&logo=vitest)](src/lib/__tests__)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%200%20errors-blue?style=flat-square&logo=typescript)](tsconfig.json)
[![Architecture](https://img.shields.io/badge/Architecture-3--Layer%20Deterministic-gold?style=flat-square)]()

---

## 1. Problem Statement Alignment (Prompt Wars Challenge 5)

Planning an Indian wedding is a complex, high-stakes optimization challenge balancing competing family expectations, fluctuating guest counts, strict dietary and cultural traditions, multi-day ceremonies, and tight financial constraints.

**Celebration Planner** is engineered with a **3-Layer Deterministic Architecture** that prevents AI drift, protects user decisions, and provides real-world event coordination:

- **Benchmark Scenario Preset**: Official **₹8,00,000 / 200 Guests / 4-Month** Hyderabad wedding preset featuring 5 multi-day functions (`Haldi`, `Mehndi`, `Sangeet`, `Wedding Ceremony`, `Reception`). Dynamic relative dates (`+120` to `+123` days) guarantee the preset never goes stale. The preset's initial 75 Health Score is illustrative example data staged with one intentionally overdue task and one blocked task to demonstrate the Risk Radar.
- **Priority-Aware Trade-Offs**: Categories carry user-defined priorities (`high`, `medium`, `low`). Non-negotiables (e.g., Food & Photography) are strictly shielded while flexible categories (e.g., Decor & Invites) absorb cuts first.
- **DAG Task Dependency Engine**: Directed Acyclic Graph tracking (`dependsOnTaskId`) with automatic cycle breaking (3-color DFS) and blocker warnings (`isTaskBlocked`).
- **Real Vendor Comparator**: Side-by-side quote comparison. Selecting a finalized quote synchronizes confirmed costs to category `actual` spend; the AI schema has no vendor-name or contact fields; real vendor names exist solely in user-entered quotes.
- **0ms Client-Side What-If Elasticity Simulator**: Instant client math for guest shifts (50–800) and budget changes (₹2L–₹50L) across `per_guest`, `step` (linear step-interval heuristic), and `fixed` scaling tiers.
- **Deterministic Risk Radar**: 6 automated diagnostic rules calculating a bounded Health Score (0–100) with 1-click action fixes. Opens with a balanced 75–85 ("Needs Attention") score demonstrating live diagnostics.
- **Family Sharing**: 1-click WhatsApp text brief formatting, clean unclipped PDF printable layouts (`@media print`), and deep Zod-validated JSON backup import/export (<200KB).

---

## 2. System Architecture & 3-Layer Separation

Celebration Planner enforces a strict architectural boundary where the UI, deterministic math, and AI layers never bleed into each other:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      REACTIVE PRESENTATION LAYER                       │
│    React 19 • Tailwind CSS • Lucide Icons • Semantic Landmarks & ARIA  │
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

## 3. Engineering Guarantees & Honest Boundaries

### A. Deterministic Math & Largest-Remainder Rupee Allocation
- **The LLM Never Calculates Rupees**: The LLM outputs integer percentage shares `sharePercent: 0-100` summing to 100%. All rupee allocations are computed deterministically in TypeScript using the **Hamilton–Hare Largest-Remainder Method**, guaranteeing category allocations sum to the **exact integer rupee budget** with zero rounding drift.
- **Normalized Share Proportions**: If user or AI shares sum to != 100% (e.g., 90% or 120%), the engine normalizes proportionally against unlocked shares. If all unlocked shares are 0%, the remaining pool is distributed equally across unlocked categories with Largest-Remainder integer rounding.
- **3-Number Budget Formula**: At any moment, every category evaluates:
  - `Effective Spend = actual ?? estimated`
  - `Balance Due = (actual ?? estimated) - paid`
  - `Remaining Budget = Total Budget - sum(actual ?? estimated)`

### B. Category Elasticity Scaling Models
- **`per_guest` (Proportional)**: Linearly scales with guest ratio (`targetGuests / baseGuests`). Ideal for Catering & Invites.
- **`step` (Linear Step-Interval Heuristic)**: Modeled honestly as a **discrete linear step-interval heuristic** (`Math.trunc((targetGuests - baseGuests) / stepSize) * stepRate`) rather than a full structural venue hall capacity or architectural floorplan simulator. Ideal for Venue guest-room blocks and Transport shuttle fleets.
- **`fixed` (Invariant)**: Unaffected by guest fluctuations; responds only to style tier multipliers. Ideal for Decor, Photography, and Music.

### C. Unified Priority-Weighted Deficit Absorption
- **Unified Pure Engine**: Both manual budget reductions (`cutBudgetByPercentage`) and elasticity deficit calculations (`runWhatIfSimulation`) call the shared pure function `absorbDeficitByPriority`:
  - Tier 1: Low priority absorbs reductions first.
  - Tier 2: Medium priority absorbs remaining deficit.
  - High priority categories (e.g., Catering, Photography) and user-locked categories are **100% strictly shielded**.
- **Unresolvable Deficit Flag**: If a simulated deficit is mathematically unresolvable without touching High-Priority or locked categories (e.g., ₹2L target budget with 800 guests), the engine calculates an explicit `unresolvableDeficit: number` and surfaces a clear warning banner.

### D. Zero Hallucinated Vendors (Safety Boundary)
- **Zero Real Business Contacts in Schema**: The AI schema strictly defines archetype `type` (e.g., *"Candid Photographer & Cinematographer"*) and `estimatedQuote: number`. It does **not** contain vendor names, phone numbers, addresses, or URLs. Real vendor names exist exclusively in user-entered `quotes[]`.
- **Honest AI Boundary**: Free-text creative fields (such as cultural ceremony tips in `ideas`) remain LLM-generated creative suggestions; all financial math, DAG scheduling, and risk evaluations are strictly deterministic.

### E. Non-Destructive Refinement & Structured Tombstones
- **User Lock Invariant**: User-created items default to `source: 'user'` and `isLocked: true`. Any manual edit automatically locks the item.
- **AI Refinement Protection**: Locked categories, user-entered vendor quotes, and completed tasks (`done: true`) are 100% immune to AI overwriting.
- **Structured Tombstone MatchKeys**: Deleted items generate `{ id, matchKey, label }` where `matchKey` is lowercase, whitespace-collapsed, and punctuation-stripped. The AI refinement prompt strictly forbids re-introducing tombstoned items or close synonyms.
- **DAG Cycle Sanitizer**: Task prerequisites are evaluated via a 3-color DFS cycle detector. If an AI refinement proposes circular dependencies (`A -> B -> A`), the engine automatically breaks the cycle before state ingestion.
- **Transactional Snapshot Management**: `lastSnapshot` enables a 1-click transactional undo. To prevent restoring stale states, `lastSnapshot` is automatically cleared (`null`) whenever the user makes any manual edit after an AI action.

### F. Dual-Model Resilience & Per-Attempt Timeouts
- **Zero Hardcoded Model Defaults**: `GEMINI_MODEL` (`gemini-3.8-flash`) and `GEMINI_MODEL_FAST` (`gemini-3.5-flash-lite`) are strictly configured via server environment variables.
- **Per-Attempt 12s Timeouts**: Each Gemini `generateContent` attempt has an enforced 12s timeout (`withTimeout`) against a 25s client-side abort limit (and 30s Vercel ceiling). If the primary model times out or errors, the serverless handler falls back to `GEMINI_MODEL_FAST` for a second 12s attempt, ensuring the combined round-trip stays safely within the 25s client boundary.
- **Fast-Model Narration**: Sliders in the What-If simulator update deterministic TypeScript math at 0ms. Narration calls `/api/narrate` using `GEMINI_MODEL_FAST` (`thinkingConfig: { thinkingLevel: 'LOW' }`) to preserve quota and minimize latency.
- **Zero Simulated Fallbacks**: If the API key is missing or both Gemini attempts fail, a typed error code (`MISSING_API_KEY`, `MISSING_MODEL_CONFIG`, `GEMINI_TIMEOUT`, `GEMINI_UPSTREAM_ERROR`) is returned and a non-blocking error banner is displayed. The existing plan remains 100% intact.

### G. Accessibility & Executive Print Layout
- **Accessibility Standards**: Built with semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), keyboard navigation, and explicit ARIA labels (`aria-label`, `aria-pressed`, `role="dialog"`, `aria-modal="true"`). We make no unverified automated certification claims.
- **Executive Print Layout**: A dedicated `<div className="hidden print:block">` executive layout renders the complete wedding brief cleanly on white paper with high-contrast tables. The dark interactive shell and modal backdrops are flagged with `print:hidden` to prevent print clipping in browser dialogs.

---

## 4. Verification & Vitest Test Suites

Every pure module in `src/lib/` has a companion Vitest test suite. Run the full test suite with:

```bash
npx vitest run
```

### Test Suite Summary (73 Unit Tests Across 6 Pure Suites)

| Test Suite | File | Tests | Coverage Scope |
| :--- | :--- | :---: | :--- |
| **Budget Calculations** | [`calculations.test.ts`](src/lib/__tests__/calculations.test.ts) | 25 | 3-Number budget math, largest-remainder rupee allocation, `sharePercent` edge cases (`sum === 90`, `sum === 120`, `all === 0`), `absorbDeficitByPriority` engine, auto-lock on edit, currency formatting (`formatINR`, `formatCompactINR`), DAG blocker detection. |
| **AI Schema Boundary** | [`schema.test.ts`](src/lib/__tests__/schema.test.ts) | 12 | Zod strict validation, rejection of floating share percents, rejection of extra hallucinated fields, ideas min 0 validation, input length caps, `/api/generate` fallback retry, `/api/narrate` fast-model requirement. |
| **Non-Destructive Merge** | [`mergeEngine.test.ts`](src/lib/__tests__/mergeEngine.test.ts) | 11 | Lock preservation, user quote persistence, tombstone rejection, 3-color DFS cycle breaking, actual spend synchronization, preservation of creative ideas when incoming ideas is empty. |
| **What-If Simulator** | [`simulator.test.ts`](src/lib/__tests__/simulator.test.ts) | 9 | `per_guest`, `step` (positive and negative increments), `fixed` category scaling, lock preservation, priority-weighted deficit absorption, unresolvable deficit detection, exact integer rupee totals. |
| **Risk Radar Engine** | [`riskEngine.test.ts`](src/lib/__tests__/riskEngine.test.ts) | 7 | Deterministic evaluation of all 6 rules (over-budget, actual overrun >15%, overdue tasks, blocked DAG tasks, unassigned tasks, pending/unquoted vendors near date), bounded Health Score (0–100). |
| **Family Summary & Validator** | [`summaryFormatter.test.ts`](src/lib/__tests__/summaryFormatter.test.ts) | 9 | Plain-text WhatsApp formatting, `en-IN` rupee strings, overdue/blocked task tags, deep Zod schema validation, 200KB payload cap, rejection of string `quotedPrice: "abc"`, malformed tasks. |
| **Total Test Count** | **6 Suites** | **73 / 73** | **100% Pass Rate (0 Failures)** |

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
   git clone https://github.com/<GITHUB_URL>/celebration-planner.git
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
3. The repository includes `vercel.json` configuring the Node runtime and a `maxDuration: 30` ceiling for serverless API routes.
4. In **Project Settings -> Environment Variables**, configure:
   - `GEMINI_API_KEY`: Your Google AI Studio API key
   - `GEMINI_MODEL`: `gemini-3.8-flash`
   - `GEMINI_MODEL_FAST`: `gemini-3.5-flash-lite`
5. Deploy. Vercel will compile the frontend bundle and serve `/api/*.ts` serverless routes.

---

## 7. Submission Dossier & Prompt Evolution

For complete details on prompt evolution across milestones, system trade-offs, and rubric alignment, see [`PROMPTS_AND_ARCHITECTURE.md`](file:///c:/Users/moham/Documents/AntiGravity/Planovent/PROMPTS_AND_ARCHITECTURE.md).
