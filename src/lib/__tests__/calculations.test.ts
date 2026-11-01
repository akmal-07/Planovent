import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatCompactINR,
  computeBudgetSummary,
  updateWithAutoLock,
  isTaskBlocked,
  getEffectiveSpend,
  calculateDaysRemaining,
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
      deletedIds: [],
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
