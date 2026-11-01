/**
 * Celebration Planner — Pure Calculation & Dependency Engine (src/lib/calculations.ts)
 * 
 * STRICT ARCHITECTURAL BOUNDARY:
 * Pure TypeScript only. Zero React, zero DOM, zero localStorage.
 * Deterministic financial math adhering to the 3-Number Budget Formula,
 * DAG task dependency evaluation, and Largest-Remainder budget allocation.
 */

import type {
  WeddingPlan,
  BudgetCategory,
  BudgetCategoryKey,
  BudgetSummary,
  TaskItem,
} from '../types/plan';

export const BUDGET_CATEGORY_KEYS: readonly BudgetCategoryKey[] = [
  'venue',
  'catering',
  'decor',
  'photo_video',
  'entertainment',
  'invites',
  'transport',
  'misc',
] as const;

export const CATEGORY_LABELS: Record<BudgetCategoryKey, string> = {
  venue: 'Venue & Accommodation',
  catering: 'Catering & Beverages',
  decor: 'Decor & Floral Styling',
  photo_video: 'Photography & Cinema',
  entertainment: 'Music & Entertainment',
  invites: 'Invitations & Favors',
  transport: 'Logistics & Fleet',
  misc: 'Rituals & Contingency',
};

/**
 * Format any integer INR value to standard Indian numbering locale (₹8,00,000)
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rounded);
}

/**
 * Format large INR amounts into human-readable Indian lakhs (L) and crores (Cr)
 */
export function formatCompactINR(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';

  if (abs >= 1_00_00_000) {
    const val = Number((abs / 1_00_00_000).toFixed(2));
    return `${sign}₹${val} Cr`;
  }
  if (abs >= 1_00_000) {
    const val = Number((abs / 1_00_000).toFixed(2));
    return `${sign}₹${val} L`;
  }
  if (abs >= 1_000) {
    const val = Number((abs / 1_000).toFixed(1));
    return `${sign}₹${val}k`;
  }
  return formatINR(rounded);
}

/**
 * Deterministic Budget Calculation Engine
 * 
 * Formula:
 * - totalEstimated = Σ(estimated)
 * - totalPlannedOrActual = Σ(actual ?? estimated)
 * - totalPaid = Σ(paid)
 * - totalDue = Σ(actual ?? estimated) - Σ(paid)
 * - remainingBudget = totalBudget - Σ(actual ?? estimated)
 * - isOverBudget = remainingBudget < 0
 * - overBudgetAmount = Math.max(0, Σ(actual ?? estimated) - totalBudget)
 */
export function computeBudgetSummary(plan: WeddingPlan): BudgetSummary {
  let totalEstimated = 0;
  let totalPlannedOrActual = 0;
  let totalPaid = 0;

  for (const item of plan.budget) {
    const estimated = Math.round(item.estimated || 0);
    const effectiveSpend = item.actual !== undefined && item.actual !== null
      ? Math.round(item.actual)
      : estimated;
    const paid = Math.round(item.paid || 0);

    totalEstimated += estimated;
    totalPlannedOrActual += effectiveSpend;
    totalPaid += paid;
  }

  const roundedBudget = Math.round(plan.totalBudget || 0);
  const totalDue = Math.max(0, totalPlannedOrActual - totalPaid);
  const remainingBudget = roundedBudget - totalPlannedOrActual;
  const isOverBudget = remainingBudget < 0;
  const overBudgetAmount = Math.max(0, totalPlannedOrActual - roundedBudget);

  return {
    totalEstimated,
    totalPlannedOrActual,
    totalPaid,
    totalDue,
    remainingBudget,
    isOverBudget,
    overBudgetAmount,
  };
}

/**
 * Applies patch to an item and sets isLocked: true unless isLocked was explicitly specified in patch.
 */
export function updateWithAutoLock<T extends { isLocked: boolean }>(
  item: T,
  patch: Partial<T>
): T {
  const isLockedExplicit = patch.isLocked !== undefined;
  return {
    ...item,
    ...patch,
    isLocked: isLockedExplicit ? patch.isLocked! : true,
  };
}

/**
 * DAG Task Dependency Evaluator:
 * Returns true if task.dependsOnTaskId is set and the referenced prerequisite task exists and has done === false.
 */
export function isTaskBlocked(task: TaskItem, allTasks: TaskItem[]): boolean {
  if (!task.dependsOnTaskId) return false;
  const prerequisite = allTasks.find((t) => t.id === task.dependsOnTaskId);
  if (!prerequisite) return false;
  return !prerequisite.done;
}

/**
 * Returns the effective spend for a category: actual ?? estimated
 */
export function getEffectiveSpend(cat: BudgetCategory): number {
  if (cat.actual !== undefined && cat.actual !== null) {
    return Math.round(cat.actual);
  }
  return Math.round(cat.estimated || 0);
}

/**
 * Calculate days remaining between two calendar dates
 */
export function calculateDaysRemaining(targetDateISO: string, referenceDateISO?: string): number {
  if (!targetDateISO) return 0;
  const target = new Date(targetDateISO);
  const ref = referenceDateISO ? new Date(referenceDateISO) : new Date();

  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const utcRef = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

  const diffMs = utcTarget - utcRef;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Normalizes text for robust match-key comparison:
 * Lowercase, trimmed, punctuation stripped, whitespace collapsed.
 */
export function toMatchKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface CategoryAllocationInput {
  key: BudgetCategoryKey;
  isLocked: boolean;
  lockedSpend: number;
  sharePercent: number; // integer 0-100
}

/**
 * Distributes remaining budget pool across unlocked categories proportionally using
 * the Largest-Remainder (Hamilton–Hare) method so integer rupee sums match remainingPool exactly.
 */
export function allocateBudgetBySharePercent(
  totalBudget: number,
  categories: CategoryAllocationInput[]
): Record<BudgetCategoryKey, number> {
  const result = {} as Record<BudgetCategoryKey, number>;
  const roundedTotalBudget = Math.max(0, Math.round(Number.isFinite(totalBudget) ? totalBudget : 0));

  let lockedTotal = 0;
  const unlockedCategories: CategoryAllocationInput[] = [];

  for (const cat of categories) {
    if (cat.isLocked) {
      const lockedVal = Math.max(0, Math.round(Number.isFinite(cat.lockedSpend) ? cat.lockedSpend : 0));
      result[cat.key] = lockedVal;
      lockedTotal += lockedVal;
    } else {
      unlockedCategories.push(cat);
    }
  }

  const remainingPool = Math.max(0, roundedTotalBudget - lockedTotal);

  if (unlockedCategories.length === 0) {
    return result;
  }

  if (remainingPool === 0) {
    for (const cat of unlockedCategories) {
      result[cat.key] = 0;
    }
    return result;
  }

  const totalUnlockedShares = unlockedCategories.reduce(
    (sum, c) => sum + Math.max(0, c.sharePercent),
    0
  );

  interface UnlockedCalc {
    key: BudgetCategoryKey;
    floor: number;
    remainder: number;
    index: number;
  }

  const calculations: UnlockedCalc[] = unlockedCategories.map((cat, idx) => {
    const share = totalUnlockedShares > 0
      ? Math.max(0, cat.sharePercent) / totalUnlockedShares
      : 1 / unlockedCategories.length;
    const exact = share * remainingPool;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return {
      key: cat.key,
      floor,
      remainder,
      index: idx,
    };
  });

  const sumFloors = calculations.reduce((sum, c) => sum + c.floor, 0);
  let remainderRupees = remainingPool - sumFloors;

  // Sort descending by fractional remainder; use stable index as tie-breaker
  calculations.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return a.index - b.index;
  });

  // Allocate 1 rupee to each highest remainder until remainderRupees === 0
  for (let i = 0; i < calculations.length; i++) {
    const extra = remainderRupees > 0 ? 1 : 0;
    if (extra > 0) {
      remainderRupees--;
    }
    result[calculations[i].key] = calculations[i].floor + extra;
  }

  return result;
}

/**
 * Deterministic pure function to reduce budget by X%.
 * Cuts 'low' priority unlocked categories first, then 'medium', strictly shielding 'high'.
 * All locked categories are 100% preserved.
 * Integer rupee allocations guaranteed to sum exactly to new total budget.
 */
export function cutBudgetByPercentage(
  plan: WeddingPlan,
  cutPercent: number
): WeddingPlan {
  const percent = Math.max(0, Math.min(100, cutPercent));
  if (percent === 0) return plan;

  const currentTotal = Math.max(0, Math.round(plan.totalBudget));
  const newTotalBudget = Math.max(0, Math.round(currentTotal * (1 - percent / 100)));
  const targetReduction = currentTotal - newTotalBudget;

  if (targetReduction <= 0) return plan;

  // Separate locked and unlocked categories
  let lockedSum = 0;
  for (const cat of plan.budget) {
    if (cat.isLocked) {
      lockedSum += Math.max(0, Math.round(cat.actual ?? cat.estimated));
    }
  }

  const remainingPool = Math.max(0, newTotalBudget - lockedSum);
  const unlocked = plan.budget.filter((b) => !b.isLocked);

  if (unlocked.length === 0) {
    return {
      ...plan,
      totalBudget: newTotalBudget,
      updatedAt: new Date().toISOString(),
    };
  }

  // Group unlocked by priority
  const lowCats = unlocked.filter((b) => b.priorityWeight === 'low');
  const medCats = unlocked.filter((b) => b.priorityWeight === 'medium');
  const highCats = unlocked.filter((b) => b.priorityWeight === 'high');

  const sumLow = lowCats.reduce((sum, c) => sum + Math.max(0, c.estimated), 0);
  const sumMed = medCats.reduce((sum, c) => sum + Math.max(0, c.estimated), 0);
  const sumHigh = highCats.reduce((sum, c) => sum + Math.max(0, c.estimated), 0);
  const sumUnlocked = sumLow + sumMed + sumHigh;

  const newEstimates: Record<string, number> = {};

  if (sumUnlocked === 0 || remainingPool === 0) {
    for (const cat of unlocked) {
      newEstimates[cat.id] = 0;
    }
  } else if (targetReduction <= sumLow && sumLow > 0) {
    // 100% of reduction absorbed by 'low' priority; 'high' and 'medium' 100% shielded
    for (const cat of highCats) newEstimates[cat.id] = cat.estimated;
    for (const cat of medCats) newEstimates[cat.id] = cat.estimated;

    const lowRatio = Math.max(0, (sumLow - targetReduction) / sumLow);
    for (const cat of lowCats) {
      newEstimates[cat.id] = Math.round(cat.estimated * lowRatio);
    }
  } else if (targetReduction <= sumLow + sumMed && sumMed > 0) {
    // 'low' priority reduced to 0; remainder absorbed by 'medium'; 'high' 100% shielded
    for (const cat of highCats) newEstimates[cat.id] = cat.estimated;
    for (const cat of lowCats) newEstimates[cat.id] = 0;

    const remainingToCutFromMed = targetReduction - sumLow;
    const medRatio = Math.max(0, (sumMed - remainingToCutFromMed) / sumMed);
    for (const cat of medCats) {
      newEstimates[cat.id] = Math.round(cat.estimated * medRatio);
    }
  } else {
    // Extreme cut: low and med are 0, remaining taken from high
    for (const cat of lowCats) newEstimates[cat.id] = 0;
    for (const cat of medCats) newEstimates[cat.id] = 0;

    const remainingToCutFromHigh = targetReduction - sumLow - sumMed;
    const highRatio = sumHigh > 0 ? Math.max(0, (sumHigh - remainingToCutFromHigh) / sumHigh) : 0;
    for (const cat of highCats) {
      newEstimates[cat.id] = Math.round(cat.estimated * highRatio);
    }
  }

  // Adjust difference to ensure exact remainingPool sum
  const sumFloors = unlocked.reduce((s, c) => s + (newEstimates[c.id] || 0), 0);
  let diff = remainingPool - sumFloors;

  const sortedUnlocked = [...unlocked].sort((a, b) => (newEstimates[b.id] || 0) - (newEstimates[a.id] || 0));
  if (sortedUnlocked.length > 0) {
    let i = 0;
    while (diff !== 0 && i < 1000) {
      const cat = sortedUnlocked[i % sortedUnlocked.length];
      if (diff > 0) {
        newEstimates[cat.id] = (newEstimates[cat.id] || 0) + 1;
        diff--;
      } else if (diff < 0 && (newEstimates[cat.id] || 0) > 0) {
        newEstimates[cat.id] = (newEstimates[cat.id] || 0) - 1;
        diff++;
      }
      i++;
    }
  }

  const updatedBudget = plan.budget.map((cat) => {
    if (cat.isLocked) return cat;
    return {
      ...cat,
      estimated: newEstimates[cat.id] ?? 0,
    };
  });

  return {
    ...plan,
    totalBudget: newTotalBudget,
    budget: updatedBudget,
    updatedAt: new Date().toISOString(),
  };
}
