import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatCompactINR,
  computeBudgetSummary,
  updateWithAutoLock,
  isTaskBlocked,
  getEffectiveSpend,
  calculateDaysRemaining,
  toMatchKey,
  allocateBudgetBySharePercent,
  cutBudgetByPercentage,
  absorbDeficitByPriority,
} from '../calculations';
import type { BudgetCategory, TaskItem, WeddingPlan } from '../../types/plan';

describe('formatINR() & formatCompactINR()', () => {
  it('formats amounts into Indian locale standard INR string without floats', () => {
    expect(formatINR(800000)).toBe('₹8,00,000');
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(1250000)).toBe('₹12,50,000');
  });

  it('rounds floating numbers strictly to nearest integer rupees', () => {
    expect(formatINR(799999.6)).toBe('₹8,00,000');
    expect(formatINR(50000.25)).toBe('₹50,000');
  });

  it('formats compact INR for dashboard metrics', () => {
    expect(formatCompactINR(800000)).toBe('₹8 L');
    expect(formatCompactINR(15000000)).toBe('₹1.5 Cr');
    expect(formatCompactINR(45000)).toBe('₹45k');
  });
});

describe('computeBudgetSummary()', () => {
  const createTestPlan = (budgetOverrides: Partial<BudgetCategory>[] = [], totalBudget = 800000): WeddingPlan => {
    const baseBudget: BudgetCategory[] = [
      { id: '1', key: 'venue', label: 'Venue', priorityWeight: 'high', estimated: 300000, actual: 320000, paid: 150000, scalingType: 'fixed', source: 'user', isLocked: true },
      { id: '2', key: 'catering', label: 'Catering', priorityWeight: 'high', estimated: 250000, actual: undefined, paid: 100000, scalingType: 'per_guest', source: 'ai', isLocked: false },
      { id: '3', key: 'decor', label: 'Decor', priorityWeight: 'low', estimated: 80000, actual: 75000, paid: 75000, scalingType: 'fixed', source: 'user', isLocked: true },
      { id: '4', key: 'photo_video', label: 'Photo/Video', priorityWeight: 'high', estimated: 70000, actual: undefined, paid: 20000, scalingType: 'fixed', source: 'ai', isLocked: false },
      { id: '5', key: 'entertainment', label: 'Entertainment', priorityWeight: 'medium', estimated: 40000, actual: undefined, paid: 10000, scalingType: 'fixed', source: 'ai', isLocked: false },
      { id: '6', key: 'invites', label: 'Invites', priorityWeight: 'low', estimated: 15000, actual: undefined, paid: 15000, scalingType: 'per_guest', source: 'ai', isLocked: false },
      { id: '7', key: 'transport', label: 'Transport', priorityWeight: 'medium', estimated: 25000, actual: undefined, paid: 10000, scalingType: 'step', source: 'ai', isLocked: false },
      { id: '8', key: 'misc', label: 'Misc', priorityWeight: 'medium', estimated: 20000, actual: undefined, paid: 0, scalingType: 'fixed', source: 'ai', isLocked: false },
    ];

    const budget = baseBudget.map((item, idx) => ({
      ...item,
      ...(budgetOverrides[idx] || {}),
    }));

    return {
      id: 'test-benchmark',
      title: 'Benchmark ₹8L Wedding',
      city: 'Hyderabad',
      eventStyle: 'Traditional Intimate',
      guestCount: 200,
      totalBudget,
      accessibilityNeeds: ['Wheelchair Accessible Venue', 'Elderly Ground-Floor Seating'],
      functions: [
        { name: 'Haldi', date: '2026-11-10' },
        { name: 'Wedding', date: '2026-11-12' },
      ],
      budget,
      tasks: [],
      vendors: [],
      ideas: [],
      tombstones: [],
      updatedAt: new Date().toISOString(),
    };
  };

  it('accurately resolves actual ?? estimated and calculates remaining/due balances', () => {
    const plan = createTestPlan();
    const summary = computeBudgetSummary(plan);

    // Estimated sum: 300k + 250k + 80k + 70k + 40k + 15k + 25k + 20k = 8,00,000
    expect(summary.totalEstimated).toBe(800000);

    // PlannedOrActual sum:
    // venue: 320k (actual)
    // catering: 250k (estimated)
    // decor: 75k (actual)
    // photo: 70k (estimated)
    // entertainment: 40k (estimated)
    // invites: 15k (estimated)
    // transport: 25k (estimated)
    // misc: 20k (estimated)
    // total: 8,15,000
    expect(summary.totalPlannedOrActual).toBe(815000);

    // Paid sum: 150k + 100k + 75k + 20k + 10k + 15k + 10k + 0 = 3,80,000
    expect(summary.totalPaid).toBe(380000);

    // Total Due: 8,15,000 - 3,80,000 = 4,35,000
    expect(summary.totalDue).toBe(435000);

    // Remaining Budget: 8,00,000 - 8,15,000 = -15,000
    expect(summary.remainingBudget).toBe(-15000);
    expect(summary.isOverBudget).toBe(true);
    expect(summary.overBudgetAmount).toBe(15000);
  });

  it('flags isOverBudget as false when totalPlannedOrActual <= totalBudget', () => {
    const plan = createTestPlan([], 900000);
    const summary = computeBudgetSummary(plan);
    expect(summary.isOverBudget).toBe(false);
    expect(summary.remainingBudget).toBe(85000);
    expect(summary.overBudgetAmount).toBe(0);
  });
});

describe('updateWithAutoLock()', () => {
  it('automatically sets isLocked: true when updating an item without explicit lock flag', () => {
    const item: BudgetCategory = {
      id: 'cat-1',
      key: 'catering',
      label: 'Catering',
      priorityWeight: 'high',
      estimated: 200000,
      paid: 0,
      scalingType: 'per_guest',
      source: 'ai',
      isLocked: false,
    };

    const updated = updateWithAutoLock(item, { estimated: 220000 });
    expect(updated.estimated).toBe(220000);
    expect(updated.isLocked).toBe(true);
  });

  it('respects explicitly provided isLocked boolean', () => {
    const item = { id: 'test', isLocked: true };
    const unlocked = updateWithAutoLock(item, { isLocked: false });
    expect(unlocked.isLocked).toBe(false);
  });
});

describe('isTaskBlocked() DAG dependency engine', () => {
  const tasks: TaskItem[] = [
    {
      id: 'task-venue',
      title: 'Finalize and book venue',
      deadline: '2026-08-01',
      priority: 'high',
      assignee: 'Rohan',
      done: false,
      eventFunction: 'Wedding',
      source: 'user',
      isLocked: true,
    },
    {
      id: 'task-invites',
      title: 'Print and send wedding cards with venue map',
      deadline: '2026-09-01',
      priority: 'medium',
      assignee: 'Ananya',
      done: false,
      eventFunction: 'General',
      dependsOnTaskId: 'task-venue', // Prerequisite is task-venue
      source: 'ai',
      isLocked: false,
    },
  ];

  it('flags task as blocked when prerequisite task is incomplete', () => {
    const blocked = isTaskBlocked(tasks[1], tasks);
    expect(blocked).toBe(true);
  });

  it('unblocks task when prerequisite task is marked done', () => {
    const completedTasks = tasks.map((t) => (t.id === 'task-venue' ? { ...t, done: true } : t));
    const blocked = isTaskBlocked(completedTasks[1], completedTasks);
    expect(blocked).toBe(false);
  });

  it('returns false if task has no dependency', () => {
    expect(isTaskBlocked(tasks[0], tasks)).toBe(false);
  });
});

describe('calculateDaysRemaining() & getEffectiveSpend()', () => {
  it('calculates days between two calendar dates', () => {
    expect(calculateDaysRemaining('2026-11-20', '2026-11-10')).toBe(10);
    expect(calculateDaysRemaining('2026-11-10', '2026-11-10')).toBe(0);
  });

  it('resolves getEffectiveSpend', () => {
    expect(getEffectiveSpend({ estimated: 100000, actual: 120000 } as BudgetCategory)).toBe(120000);
    expect(getEffectiveSpend({ estimated: 100000, actual: undefined } as BudgetCategory)).toBe(100000);
  });
});

describe('toMatchKey()', () => {
  it('normalizes string: lowercases, strips punctuation, collapses whitespace, and trims', () => {
    expect(toMatchKey('  Catering & Food Service!  ')).toBe('catering food service');
    expect(toMatchKey('Mandap Decor (Royal-Style)')).toBe('mandap decor royalstyle');
    expect(toMatchKey('PHOTOGRAPHY / CINEMA - 4K')).toBe('photography cinema 4k');
    expect(toMatchKey('DJ & Dhol Players   2026')).toBe('dj dhol players 2026');
  });
});

describe('allocateBudgetBySharePercent() with Largest-Remainder Rounding', () => {
  it('distributes remaining budget pool exactly with zero lost rupee in normal distribution', () => {
    const totalBudget = 800000;
    const categories = [
      { key: 'venue' as const, isLocked: true, lockedSpend: 280000, sharePercent: 35 },
      { key: 'catering' as const, isLocked: false, lockedSpend: 0, sharePercent: 30 },
      { key: 'decor' as const, isLocked: false, lockedSpend: 0, sharePercent: 12 },
      { key: 'photo_video' as const, isLocked: false, lockedSpend: 0, sharePercent: 10 },
      { key: 'entertainment' as const, isLocked: false, lockedSpend: 0, sharePercent: 5 },
      { key: 'invites' as const, isLocked: false, lockedSpend: 0, sharePercent: 3 },
      { key: 'transport' as const, isLocked: false, lockedSpend: 0, sharePercent: 3 },
      { key: 'misc' as const, isLocked: false, lockedSpend: 0, sharePercent: 2 },
    ];

    const allocation = allocateBudgetBySharePercent(totalBudget, categories);

    // Locked category preserves exact spend
    expect(allocation.venue).toBe(280000);

    // Sum of unlocked allocations must equal remainingPool: 800,000 - 280,000 = 520,000
    const unlockedSum =
      allocation.catering +
      allocation.decor +
      allocation.photo_video +
      allocation.entertainment +
      allocation.invites +
      allocation.transport +
      allocation.misc;

    expect(unlockedSum).toBe(520000);

    // Total sum across all categories must equal totalBudget exactly
    const totalSum = Object.values(allocation).reduce((sum, v) => sum + v, 0);
    expect(totalSum).toBe(800000);

    // All allocated amounts must be whole integers
    for (const val of Object.values(allocation)) {
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('preserves all locked spend and sets remaining pool to 0 when all categories are locked', () => {
    const totalBudget = 800000;
    const categories = [
      { key: 'venue' as const, isLocked: true, lockedSpend: 300000, sharePercent: 35 },
      { key: 'catering' as const, isLocked: true, lockedSpend: 300000, sharePercent: 35 },
      { key: 'decor' as const, isLocked: true, lockedSpend: 200000, sharePercent: 30 },
    ];

    const allocation = allocateBudgetBySharePercent(totalBudget, categories);
    expect(allocation.venue).toBe(300000);
    expect(allocation.catering).toBe(300000);
    expect(allocation.decor).toBe(200000);

    const totalSum = Object.values(allocation).reduce((sum, v) => sum + v, 0);
    expect(totalSum).toBe(800000);
  });

  it('handles locked spend exceeding totalBudget safely without allocating negative values', () => {
    const totalBudget = 500000;
    const categories = [
      { key: 'venue' as const, isLocked: true, lockedSpend: 400000, sharePercent: 50 },
      { key: 'catering' as const, isLocked: true, lockedSpend: 250000, sharePercent: 30 }, // 400k + 250k = 650k > 500k
      { key: 'decor' as const, isLocked: false, lockedSpend: 0, sharePercent: 20 },
    ];

    const allocation = allocateBudgetBySharePercent(totalBudget, categories);
    expect(allocation.venue).toBe(400000);
    expect(allocation.catering).toBe(250000);
    expect(allocation.decor).toBe(0); // Unlocked gets 0 because remainingPool is 0
  });

  it('accurately resolves odd remainder distributions (e.g. 1 rupee remainder) with largest-remainder rounding', () => {
    // 3 unlocked categories each with 33.33% share of 100 rupees
    const totalBudget = 100;
    const categories = [
      { key: 'venue' as const, isLocked: false, lockedSpend: 0, sharePercent: 33 },
      { key: 'catering' as const, isLocked: false, lockedSpend: 0, sharePercent: 33 },
      { key: 'decor' as const, isLocked: false, lockedSpend: 0, sharePercent: 33 },
    ];

    const allocation = allocateBudgetBySharePercent(totalBudget, categories);
    const sum = allocation.venue + allocation.catering + allocation.decor;
    expect(sum).toBe(100);
    // At least one category receives 34 while others receive 33
    const values = [allocation.venue, allocation.catering, allocation.decor].sort();
    expect(values).toEqual([33, 33, 34]);
  });

  it('normalizes proportionally when unlocked sharePercent sum is 90 (!= 100)', () => {
    const totalBudget = 900000;
    const categories = [
      { key: 'venue' as const, isLocked: false, lockedSpend: 0, sharePercent: 45 },
      { key: 'catering' as const, isLocked: false, lockedSpend: 0, sharePercent: 30 },
      { key: 'decor' as const, isLocked: false, lockedSpend: 0, sharePercent: 15 },
    ]; // Sum = 90

    const allocation = allocateBudgetBySharePercent(totalBudget, categories);
    const sum = allocation.venue + allocation.catering + allocation.decor;
    expect(sum).toBe(900000);
    // 45/90 = 50% -> 450,000, 30/90 = 33.33% -> 300,000, 15/90 = 16.67% -> 150,000
    expect(allocation.venue).toBe(450000);
    expect(allocation.catering).toBe(300000);
    expect(allocation.decor).toBe(150000);
  });

  it('normalizes proportionally when unlocked sharePercent sum is 120 (!= 100)', () => {
    const totalBudget = 600000;
    const categories = [
      { key: 'venue' as const, isLocked: false, lockedSpend: 0, sharePercent: 60 },
      { key: 'catering' as const, isLocked: false, lockedSpend: 0, sharePercent: 40 },
      { key: 'decor' as const, isLocked: false, lockedSpend: 0, sharePercent: 20 },
    ]; // Sum = 120

    const allocation = allocateBudgetBySharePercent(totalBudget, categories);
    const sum = allocation.venue + allocation.catering + allocation.decor;
    expect(sum).toBe(600000);
    // 60/120 = 50% -> 300,000, 40/120 = 33.33% -> 200,000, 20/120 = 16.67% -> 100,000
    expect(allocation.venue).toBe(300000);
    expect(allocation.catering).toBe(200000);
    expect(allocation.decor).toBe(100000);
  });

  it('distributes remainingPool equally when all unlocked categories have sharePercent === 0', () => {
    const totalBudget = 100000;
    const categories = [
      { key: 'venue' as const, isLocked: false, lockedSpend: 0, sharePercent: 0 },
      { key: 'catering' as const, isLocked: false, lockedSpend: 0, sharePercent: 0 },
      { key: 'decor' as const, isLocked: false, lockedSpend: 0, sharePercent: 0 },
    ]; // All 0

    const allocation = allocateBudgetBySharePercent(totalBudget, categories);
    const sum = allocation.venue + allocation.catering + allocation.decor;
    expect(sum).toBe(100000);
    // 100000 / 3 = 33333 with 1 remainder allocated via Largest-Remainder
    const values = [allocation.venue, allocation.catering, allocation.decor].sort();
    expect(values).toEqual([33333, 33333, 33334]);
  });
});

describe('cutBudgetByPercentage() deterministic priority budget cutter', () => {
  const createMockCutPlan = (): WeddingPlan => ({
    id: 'plan-cut-test',
    title: 'Cut Test Plan',
    city: 'Hyderabad',
    eventStyle: 'Traditional',
    guestCount: 200,
    totalBudget: 800000,
    accessibilityNeeds: [],
    functions: [],
    budget: [
      { id: '1', key: 'venue', label: 'Venue', priorityWeight: 'high', estimated: 300000, paid: 0, scalingType: 'fixed', source: 'ai', isLocked: false },
      { id: '2', key: 'catering', label: 'Catering', priorityWeight: 'high', estimated: 250000, paid: 0, scalingType: 'per_guest', source: 'ai', isLocked: false },
      { id: '3', key: 'decor', label: 'Decor', priorityWeight: 'low', estimated: 80000, paid: 0, scalingType: 'fixed', source: 'ai', isLocked: false },
      { id: '4', key: 'photo_video', label: 'Photo', priorityWeight: 'high', estimated: 70000, paid: 0, scalingType: 'fixed', source: 'ai', isLocked: false },
      { id: '5', key: 'entertainment', label: 'Music', priorityWeight: 'medium', estimated: 40000, paid: 0, scalingType: 'fixed', source: 'ai', isLocked: false },
      { id: '6', key: 'invites', label: 'Invites', priorityWeight: 'low', estimated: 20000, paid: 0, scalingType: 'per_guest', source: 'ai', isLocked: false },
      { id: '7', key: 'transport', label: 'Transport', priorityWeight: 'medium', estimated: 25000, paid: 0, scalingType: 'step', source: 'ai', isLocked: false },
      { id: '8', key: 'misc', label: 'Misc', priorityWeight: 'medium', estimated: 15000, paid: 0, scalingType: 'fixed', source: 'ai', isLocked: false },
    ],
    tasks: [],
    vendors: [],
    ideas: [],
    tombstones: [],
    updatedAt: new Date().toISOString(),
  });

  it('cuts low priority categories first while strictly shielding high priority categories', () => {
    const plan = createMockCutPlan();
    // 10% cut of 800,000 = 80,000 reduction. Total sum of low priority (decor: 80k + invites: 20k) is 100k.
    // The 80k reduction is absorbed entirely by low priority!
    const reducedPlan = cutBudgetByPercentage(plan, 10);

    expect(reducedPlan.totalBudget).toBe(720000);

    const venue = reducedPlan.budget.find((b) => b.key === 'venue');
    const catering = reducedPlan.budget.find((b) => b.key === 'catering');
    const photo = reducedPlan.budget.find((b) => b.key === 'photo_video');
    const entertainment = reducedPlan.budget.find((b) => b.key === 'entertainment');
    const decor = reducedPlan.budget.find((b) => b.key === 'decor');
    const invites = reducedPlan.budget.find((b) => b.key === 'invites');

    // High priority categories are 100% shielded
    expect(venue?.estimated).toBe(300000);
    expect(catering?.estimated).toBe(250000);
    expect(photo?.estimated).toBe(70000);

    // Medium priority is 100% shielded because low priority absorbed the full cut
    expect(entertainment?.estimated).toBe(40000);

    // Low priority absorbed the cut
    expect((decor?.estimated || 0) + (invites?.estimated || 0)).toBe(20000);

    // Sum of all categories equals new total budget exactly
    const totalEstimated = reducedPlan.budget.reduce((s, b) => s + b.estimated, 0);
    expect(totalEstimated).toBe(720000);
  });

  it('cascades to medium priority when cut exceeds low priority sum, still shielding high', () => {
    const plan = createMockCutPlan();
    // 15% cut of 800,000 = 120,000 reduction.
    // Low priority total is 100,000 (decor 80k + invites 20k).
    // Remaining 20,000 must come from medium priority (entertainment 40k + transport 25k + misc 15k = 80k).
    const reducedPlan = cutBudgetByPercentage(plan, 15);

    expect(reducedPlan.totalBudget).toBe(680000);

    const decor = reducedPlan.budget.find((b) => b.key === 'decor');
    const invites = reducedPlan.budget.find((b) => b.key === 'invites');
    const venue = reducedPlan.budget.find((b) => b.key === 'venue');
    const catering = reducedPlan.budget.find((b) => b.key === 'catering');
    const photo = reducedPlan.budget.find((b) => b.key === 'photo_video');

    // Low priority is reduced to 0
    expect(decor?.estimated).toBe(0);
    expect(invites?.estimated).toBe(0);

    // High priority categories are still 100% shielded!
    expect(venue?.estimated).toBe(300000);
    expect(catering?.estimated).toBe(250000);
    expect(photo?.estimated).toBe(70000);

    // Total sum equals 680,000 exactly
    const totalEstimated = reducedPlan.budget.reduce((s, b) => s + b.estimated, 0);
    expect(totalEstimated).toBe(680000);
  });

  it('preserves locked categories completely during budget cuts', () => {
    const plan = createMockCutPlan();
    // User locked decor at 80,000
    plan.budget = plan.budget.map((b) => (b.key === 'decor' ? { ...b, isLocked: true } : b));

    const reducedPlan = cutBudgetByPercentage(plan, 10);
    const decor = reducedPlan.budget.find((b) => b.key === 'decor');

    // Locked decor cannot be cut!
    expect(decor?.estimated).toBe(80000);
    expect(decor?.isLocked).toBe(true);

    const totalEstimated = reducedPlan.budget.reduce((s, b) => s + b.estimated, 0);
    expect(totalEstimated).toBe(720000);
  });
});

describe('absorbDeficitByPriority() shared priority deficit engine', () => {
  const categories = [
    { key: 'venue' as const, label: 'Venue', priorityWeight: 'high' as const, spend: 300000, isLocked: true },
    { key: 'catering' as const, label: 'Catering', priorityWeight: 'high' as const, spend: 250000, isLocked: false },
    { key: 'decor' as const, label: 'Decor', priorityWeight: 'low' as const, spend: 80000, isLocked: false },
    { key: 'photo_video' as const, label: 'Photo', priorityWeight: 'high' as const, spend: 70000, isLocked: false },
    { key: 'entertainment' as const, label: 'DJ', priorityWeight: 'medium' as const, spend: 40000, isLocked: false },
    { key: 'invites' as const, label: 'Invites', priorityWeight: 'low' as const, spend: 20000, isLocked: false },
    { key: 'transport' as const, label: 'Fleet', priorityWeight: 'medium' as const, spend: 25000, isLocked: false },
    { key: 'misc' as const, label: 'Rituals', priorityWeight: 'medium' as const, spend: 15000, isLocked: false },
  ];

  it('cuts low priority first (up to 40%) before touching medium priority', () => {
    // Low priority total = 100,000. 40% of low = 40,000.
    const result = absorbDeficitByPriority(categories, 30000, true);

    expect(result.unresolvableDeficit).toBe(0);
    expect(result.lowCutTotal).toBe(30000);
    expect(result.medCutTotal).toBe(0);
    expect(result.highCutTotal).toBe(0);
    expect(result.rebalancedSpendByKey.venue).toBe(300000); // Locked
    expect(result.rebalancedSpendByKey.catering).toBe(250000); // High shielded
  });

  it('shields high priority completely and returns unresolvableDeficit if deficit exceeds low/med capacity', () => {
    // Total low = 100k, total med = 80k. Max cut on low/med without touching high is 100k*1.0 + 80k*0.80 = 164,000.
    // If deficit is 300,000:
    const result = absorbDeficitByPriority(categories, 300000, true);

    expect(result.unresolvableDeficit).toBeGreaterThan(0);
    expect(result.highCutTotal).toBe(0);
    expect(result.rebalancedSpendByKey.venue).toBe(300000); // 100% shielded
    expect(result.rebalancedSpendByKey.catering).toBe(250000); // 100% shielded
    expect(result.rebalancedSpendByKey.photo_video).toBe(70000); // 100% shielded
  });
});
