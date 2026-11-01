/**
 * Celebration Planner — What-If Elasticity Simulator (src/lib/simulator.ts)
 * 
 * 100% PURE TYPESCRIPT MODULE (Zero React, Zero Browser/DOM dependencies).
 * Instant 0ms client-side guest & budget elasticity math with:
 * - per_guest, step, and fixed category scaling
 * - Lock protection invariance
 * - Priority-aware deficit rebalancing (cuts Low up to 40%, then Med up to 25%, shields High)
 * - Largest-Remainder rounding ensuring exact integer rupee sums
 */

import type {
  BudgetCategory,
  WeddingPlan,
  WhatIfSimulationParams,
  WhatIfSimulationResult,
  WhatIfCategoryResult,
} from '../types/plan';
import {
  formatINR,
  absorbDeficitByPriority,
  type DeficitCategoryInput,
} from './calculations';

/**
 * Scales a single category spend based on its scalingType (per_guest, step, fixed),
 * guest count ratio, and style tier multiplier.
 */
export function scaleCategory(
  category: BudgetCategory,
  baseGuests: number,
  targetGuests: number,
  styleMultiplier: number,
  respectLocks: boolean
): number {
  const baseSpend = category.actual !== undefined && category.actual !== null
    ? Math.round(category.actual)
    : Math.round(category.estimated || 0);

  // If locks are respected and category is locked, return baseSpend untouched
  if (respectLocks && category.isLocked) {
    return baseSpend;
  }

  const safeBaseGuests = Math.max(1, Math.round(baseGuests));
  const safeTargetGuests = Math.max(1, Math.round(targetGuests));
  const safeMultiplier = Math.max(0.1, styleMultiplier);

  if (category.scalingType === 'per_guest') {
    return Math.round(baseSpend * (safeTargetGuests / safeBaseGuests) * safeMultiplier);
  }

  if (category.scalingType === 'step') {
    const stepSize = Math.max(1, category.stepSize || 100);
    const stepRate = category.stepRate || 0.2;
    const steps = Math.trunc((safeTargetGuests - safeBaseGuests) / stepSize);
    const multiplier = Math.max(0.2, 1 + steps * stepRate);
    return Math.round(baseSpend * multiplier * safeMultiplier);
  }

  // category.scalingType === 'fixed'
  return Math.round(baseSpend * safeMultiplier);
}

/**
 * Runs a complete 0ms What-If elasticity simulation on the plan.
 * Evaluates projected spend per category, and if over-budget, applies
 * priority-aware deficit absorption using Largest-Remainder rounding.
 */
export function runWhatIfSimulation(
  plan: WeddingPlan,
  params: WhatIfSimulationParams
): WhatIfSimulationResult {
  const safeTargetGuests = Math.max(1, Math.round(params.guestCount));
  const safeTotalBudget = Math.max(0, Math.round(params.totalBudget));
  const safeMultiplier = Math.max(0.1, params.styleMultiplier);
  const baseGuests = Math.max(1, Math.round(plan.guestCount));

  // 1. Calculate current and projected spend for all 8 categories
  const categoryProjections = plan.budget.map((cat) => {
    const currentSpend = cat.actual !== undefined && cat.actual !== null
      ? Math.round(cat.actual)
      : Math.round(cat.estimated || 0);

    const projectedSpend = scaleCategory(
      cat,
      baseGuests,
      safeTargetGuests,
      safeMultiplier,
      params.respectLocks
    );

    return {
      cat,
      currentSpend,
      projectedSpend,
    };
  });

  const currentTotal = categoryProjections.reduce((sum, c) => sum + c.currentSpend, 0);
  const projectedTotal = categoryProjections.reduce((sum, c) => sum + c.projectedSpend, 0);
  const deficit = Math.max(0, projectedTotal - safeTotalBudget);
  const isOverBudget = deficit > 0;

  // 2. Compute rebalanced spend using unified pure priority absorption
  const deficitInputs: DeficitCategoryInput[] = categoryProjections.map((item) => ({
    key: item.cat.key,
    label: item.cat.label,
    priorityWeight: item.cat.priorityWeight,
    spend: item.projectedSpend,
    isLocked: item.cat.isLocked,
  }));

  const absorption = absorbDeficitByPriority(deficitInputs, deficit, params.respectLocks);
  const unresolvableDeficit = absorption.unresolvableDeficit;

  // 3. Assemble category results
  const categories: WhatIfCategoryResult[] = categoryProjections.map((item) => {
    const rebalancedSpend = absorption.rebalancedSpendByKey[item.cat.key] ?? item.projectedSpend;
    return {
      key: item.cat.key,
      label: item.cat.label,
      priorityWeight: item.cat.priorityWeight,
      scalingType: item.cat.scalingType,
      isLocked: item.cat.isLocked,
      currentSpend: item.currentSpend,
      projectedSpend: item.projectedSpend,
      rebalancedSpend,
      delta: rebalancedSpend - item.currentSpend,
    };
  });

  const rebalancedTotal = categories.reduce((sum, c) => sum + c.rebalancedSpend, 0);

  // 4. Generate deterministic trade-off facts
  const tradeOffFacts: string[] = [];

  if (safeTargetGuests !== baseGuests) {
    tradeOffFacts.push(
      `Guest capacity scaled from ${baseGuests} to ${safeTargetGuests} (${safeTargetGuests > baseGuests ? '+' : ''}${Math.round(((safeTargetGuests - baseGuests) / baseGuests) * 100)}%).`
    );
  }

  if (safeMultiplier !== 1.0) {
    const tierName = safeMultiplier < 1.0 ? 'Intimate / Cost-Effective' : 'Grand / Luxury Destination';
    tradeOffFacts.push(`Applied ${tierName} style factor (${safeMultiplier}x).`);
  }

  const lockedProtected = categories.filter((c) => params.respectLocks && c.isLocked);
  if (lockedProtected.length > 0) {
    tradeOffFacts.push(
      `Preserved ${lockedProtected.length} locked categories (${lockedProtected.map((c) => c.label).join(', ')}) intact.`
    );
  }

  if (isOverBudget) {
    const lowCuts = categories.filter((c) => c.priorityWeight === 'low' && c.rebalancedSpend < c.projectedSpend);
    const medCuts = categories.filter((c) => c.priorityWeight === 'medium' && c.rebalancedSpend < c.projectedSpend);
    const highShielded = categories.filter((c) => c.priorityWeight === 'high' && c.rebalancedSpend === c.projectedSpend);

    if (lowCuts.length > 0) {
      const totalLowCut = lowCuts.reduce((sum, c) => sum + (c.projectedSpend - c.rebalancedSpend), 0);
      tradeOffFacts.push(`Reduced low-priority categories (${lowCuts.map((c) => c.label).join(', ')}) by ${formatINR(totalLowCut)} first.`);
    }

    if (medCuts.length > 0) {
      const totalMedCut = medCuts.reduce((sum, c) => sum + (c.projectedSpend - c.rebalancedSpend), 0);
      tradeOffFacts.push(`Adjusted medium-priority categories by ${formatINR(totalMedCut)} to absorb deficit.`);
    }

    if (highShielded.length > 0) {
      tradeOffFacts.push(`Shielded non-negotiable High-Priority categories (${highShielded.map((c) => c.label).join(', ')}) from budget reductions.`);
    }

    if (unresolvableDeficit > 0) {
      tradeOffFacts.push(
        `⚠️ Unresolvable deficit of ${formatINR(unresolvableDeficit)}: High-priority categories and locked allocations were strictly protected. Adjust guest count or increase total budget to achieve balance.`
      );
    } else {
      tradeOffFacts.push(`Rebalanced spend totals ${formatINR(rebalancedTotal)} exactly meeting target budget.`);
    }
  } else {
    tradeOffFacts.push(
      `Projected total (${formatINR(projectedTotal)}) is within budget limit (${formatINR(safeTotalBudget)}). Surplus cushion: ${formatINR(safeTotalBudget - projectedTotal)}.`
    );
  }

  return {
    params,
    currentTotal,
    projectedTotal,
    rebalancedTotal,
    categories,
    deficit,
    unresolvableDeficit,
    isOverBudget,
    tradeOffFacts,
  };
}
