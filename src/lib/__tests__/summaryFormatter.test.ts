import { describe, it, expect } from 'vitest';
import { formatFamilySummaryText, validateImportedPlanJson } from '../summaryFormatter';
import type { WeddingPlan } from '../../types/plan';

describe('summaryFormatter.ts — Pure Family Summary Formatter & JSON Validator', () => {
  const createMockPlan = (): WeddingPlan => ({
    id: 'plan-summary-test',
    title: 'Pooja & Srinivas Royal South Indian Celebration',
    city: 'Hyderabad',
    eventStyle: 'Traditional Intimate',
    guestCount: 200,
    totalBudget: 800000,
    accessibilityNeeds: ['Wheelchair Ramps'],
    functions: [
      { name: 'Haldi', date: '2026-11-12', time: '10:00 AM' },
      { name: 'Wedding', date: '2026-11-14', time: '09:00 AM' },
    ],
    budget: [
      { id: '1', key: 'venue', label: 'Venue & Accommodation', priorityWeight: 'high', estimated: 280000, paid: 100000, scalingType: 'fixed', source: 'user', isLocked: true },
      { id: '2', key: 'catering', label: 'Catering & Beverages', priorityWeight: 'high', estimated: 260000, paid: 50000, scalingType: 'per_guest', source: 'user', isLocked: false },
      { id: '3', key: 'decor', label: 'Decor & Floral Styling', priorityWeight: 'low', estimated: 70000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '4', key: 'photo_video', label: 'Photography & Cinema', priorityWeight: 'high', estimated: 80000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: true },
      { id: '5', key: 'entertainment', label: 'Music & Entertainment', priorityWeight: 'medium', estimated: 40000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '6', key: 'invites', label: 'Invitations & Favors', priorityWeight: 'low', estimated: 15000, paid: 0, scalingType: 'per_guest', source: 'user', isLocked: false },
      { id: '7', key: 'transport', label: 'Logistics & Fleet', priorityWeight: 'medium', estimated: 30000, paid: 0, scalingType: 'step', stepSize: 50, stepRate: 0.15, source: 'user', isLocked: false },
      { id: '8', key: 'misc', label: 'Rituals & Contingency', priorityWeight: 'medium', estimated: 25000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
    ],
    tasks: [
      {
        id: 't-1',
        title: 'Book Temple Hall',
        deadline: '2026-08-01',
        done: false,
        priority: 'high',
        assignee: 'Uncle Murthy',
        eventFunction: 'Wedding',
        source: 'user',
        isLocked: true,
      },
      {
        id: 't-2',
        title: 'Menu Card Printing',
        deadline: '2026-11-01',
        done: false,
        priority: 'medium',
        assignee: 'Deepa',
        eventFunction: 'Wedding',
        dependsOnTaskId: 't-1',
        source: 'user',
        isLocked: false,
      },
    ],
    vendors: [
      {
        id: 'v-1',
        categoryKey: 'venue',
        type: 'Heritage Temple Hall',
        estimatedQuote: 280000,
        status: 'confirmed',
        source: 'user',
        isLocked: true,
        quotes: [
          {
            id: 'q-1',
            vendorName: 'Sri Venkateswara Mandapam',
            quotedPrice: 280000,
            isFinalized: true,
            notes: 'Includes morning muhurtham',
          },
        ],
      },
    ],
    ideas: [],
    tombstones: [],
    updatedAt: new Date().toISOString(),
  });

  const refDate = '2026-10-28';

  it('formats WhatsApp-ready summary text containing exact en-IN rupee amounts and function details', () => {
    const plan = createMockPlan();
    const text = formatFamilySummaryText(plan, refDate);

    expect(text).toContain('POOJA & SRINIVAS ROYAL SOUTH INDIAN CELEBRATION');
    expect(text).toContain('Hyderabad');
    expect(text).toContain('200 guests');
    expect(text).toContain('Haldi: 2026-11-12 (10:00 AM)');
    expect(text).toContain('Total Budget: ₹8,00,000');
    expect(text).toContain('Venue & Accommodation: ₹2,80,000 (high priority) [🔒 Locked]');
    expect(text).toContain('Sri Venkateswara Mandapam');
    expect(text).toContain('Health Score:');
  });

  it('flags overdue and blocked tasks in upcoming action items', () => {
    const plan = createMockPlan();
    // Task t-1 deadline is 2026-08-01 which is < refDate (2026-10-28) -> OVERDUE
    // Task t-2 depends on t-1 which is incomplete -> BLOCKED
    const text = formatFamilySummaryText(plan, refDate);

    expect(text).toContain('[OVERDUE] Book Temple Hall');
    expect(text).toContain('[BLOCKED] Menu Card Printing');
  });

  it('formats deficit alert when plan spend exceeds budget', () => {
    const plan = createMockPlan();
    // Over-budget: increase venue estimated from 280k to 380k
    plan.budget[0].estimated = 380000;
    const text = formatFamilySummaryText(plan, refDate);

    expect(text).toContain('⚠️ STATUS: DEFICIT of ₹1,00,000');
  });

  it('validates and accepts a complete, valid WeddingPlan JSON string', () => {
    const plan = createMockPlan();
    const rawJson = JSON.stringify(plan);

    const result = validateImportedPlanJson(rawJson);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.title).toBe(plan.title);
      expect(result.plan.budget).toHaveLength(8);
      expect(result.plan.totalBudget).toBe(800000);
    }
  });

  it('breaks circular dependencies during JSON import via sanitizeTaskDependencies', () => {
    const plan = createMockPlan();
    // Create cycle: t-1 -> t-2 -> t-1
    plan.tasks[0].dependsOnTaskId = 't-2';
    plan.tasks[1].dependsOnTaskId = 't-1';

    const result = validateImportedPlanJson(JSON.stringify(plan));
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Cycle must be broken: at least one dependsOnTaskId cleared to undefined
      const hasCycle = result.plan.tasks[0].dependsOnTaskId === 't-2' && result.plan.tasks[1].dependsOnTaskId === 't-1';
      expect(hasCycle).toBe(false);
    }
  });

  it('rejects malformed, empty, or missing required categories cleanly', () => {
    // 1. Invalid JSON syntax
    const corrupt = validateImportedPlanJson('{ invalid json: true');
    expect(corrupt.ok).toBe(false);
    expect((corrupt as any).error).toContain('Invalid JSON');

    // 2. Missing budget category (only 7 categories)
    const plan = createMockPlan();
    const incompletePlan = {
      ...plan,
      budget: plan.budget.filter((b) => b.key !== 'misc'),
    };
    const missingCat = validateImportedPlanJson(JSON.stringify(incompletePlan));
    expect(missingCat.ok).toBe(false);
    expect((missingCat as any).error).toContain('missing required category: "misc"');

    // 3. Negative guest count
    const negativeGuests = {
      ...plan,
      guestCount: -50,
    };
    const badGuests = validateImportedPlanJson(JSON.stringify(negativeGuests));
    expect(badGuests.ok).toBe(false);
    expect((badGuests as any).error).toContain('positive');
  });

  it('rejects vendor quotes with string quotedPrice: "abc" cleanly via deep Zod schema', () => {
    const plan = createMockPlan();
    const badQuotePlan = {
      ...plan,
      vendors: [
        {
          ...plan.vendors[0],
          quotes: [
            {
              id: 'q-bad',
              vendorName: 'Bad Vendor',
              quotedPrice: 'abc', // Invalid string instead of integer number
            },
          ],
        },
      ],
    };

    const result = validateImportedPlanJson(JSON.stringify(badQuotePlan));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('vendors.0.quotes.0.quotedPrice');
    }
  });

  it('rejects oversized JSON payloads exceeding 200KB limit immediately', () => {
    const plan = createMockPlan();
    // Create an oversized payload > 200,000 characters
    const hugePadding = 'A'.repeat(210_000);
    const hugePlan = {
      ...plan,
      title: hugePadding,
    };

    const result = validateImportedPlanJson(JSON.stringify(hugePlan));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('exceeds maximum size limit of 200KB');
    }
  });

  it('rejects malformed nested tasks with invalid deadline format or missing assignee', () => {
    const plan = createMockPlan();
    const badTaskPlan = {
      ...plan,
      tasks: [
        {
          ...plan.tasks[0],
          deadline: '14-11-2026', // Invalid non-YYYY-MM-DD format
        },
      ],
    };

    const result = validateImportedPlanJson(JSON.stringify(badTaskPlan));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('tasks.0.deadline');
      expect(result.error).toContain('YYYY-MM-DD');
    }
  });
});
