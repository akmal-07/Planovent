import { describe, it, expect } from 'vitest';
import { hydrateInitialPlan, mergeRefinedPlan } from '../mergeEngine';
import { computeBudgetSummary } from '../calculations';
import type { AiGeneratedPlan } from '../../schemas/geminiSchema';

describe('mergeEngine - Non-Destructive Invariants', () => {
  const createMockAiData = (overrides?: Partial<AiGeneratedPlan>): AiGeneratedPlan => ({
    title: 'Ananya & Rohan AI Wedding Plan',
    city: 'Hyderabad',
    eventStyle: 'Traditional Grand',
    guestCount: 220,
    totalBudget: 850000,
    accessibilityNeeds: ['Wheelchair Accessible Entrance', 'Pure Veg Jain Counter'],
    functions: [
      { name: 'Haldi', date: '2026-11-12' },
      { name: 'Wedding', date: '2026-11-14' },
    ],
    budgetAllocations: [
      { key: 'venue', label: 'Venue & Accommodation', estimated: 310000, priorityWeight: 'high', scalingType: 'fixed', rationale: 'Grand resort' },
      { key: 'catering', label: 'Catering & Beverages', estimated: 270000, priorityWeight: 'high', scalingType: 'per_guest', rationale: 'Gourmet live counters' },
      { key: 'decor', label: 'Decor & Floral Styling', estimated: 65000, priorityWeight: 'low', scalingType: 'fixed', rationale: 'Traditional marigold' },
      { key: 'photo_video', label: 'Photography & Cinema', estimated: 85000, priorityWeight: 'high', scalingType: 'fixed', rationale: 'Drone + candid stills' },
      { key: 'entertainment', label: 'Music & Entertainment', estimated: 45000, priorityWeight: 'medium', scalingType: 'fixed', rationale: 'DJ set' },
      { key: 'invites', label: 'Invitations & Favors', estimated: 15000, priorityWeight: 'low', scalingType: 'per_guest', rationale: 'Digital invites' },
      { key: 'transport', label: 'Logistics & Fleet', estimated: 35000, priorityWeight: 'medium', scalingType: 'step', rationale: 'Airport fleet' },
      { key: 'misc', label: 'Rituals & Contingency', estimated: 25000, priorityWeight: 'medium', scalingType: 'fixed', rationale: 'Emergency cushion' },
    ],
    tasks: [
      { id: 'task-1', title: 'Book Banquet Venue', deadline: '2026-08-01', priority: 'high', assignee: 'Rohan', eventFunction: 'Wedding' },
      { id: 'task-2', title: 'Schedule Catering Tasting', deadline: '2026-09-01', priority: 'high', assignee: 'Ananya', eventFunction: 'Wedding', dependsOnTaskId: 'task-1' },
      { id: 'task-3', title: 'Order Sangeet Fireworks', deadline: '2026-10-01', priority: 'low', assignee: 'Cousin', eventFunction: 'Sangeet' },
    ],
    vendors: [
      { id: 'vslot-1', categoryKey: 'venue', type: 'Heritage Palace Resort', estimatedQuote: 310000 },
      { id: 'vslot-2', categoryKey: 'catering', type: 'Live Mughlai Caterer', estimatedQuote: 270000 },
    ],
    ideas: [
      { id: 'idea-1', title: 'Live Shehnai Morning Welcome', description: 'Traditional acoustic welcome for guests.', category: 'entertainment' },
      { id: 'idea-2', title: 'Handcrafted Bangle Counter', description: 'Custom lac bangles for ladies during Haldi.', category: 'decor' },
    ],
    aiSummary: 'Plan scaled up slightly to 220 guests while protecting high-priority food and venue allocations.',
    ...overrides,
  });

  it('hydrateInitialPlan() converts raw AI payload into compliant WeddingPlan', () => {
    const aiData = createMockAiData();
    const plan = hydrateInitialPlan(aiData);

    expect(plan.title).toBe(aiData.title);
    expect(plan.guestCount).toBe(220);
    expect(plan.budget).toHaveLength(8);
    expect(plan.tasks).toHaveLength(3);
    expect(plan.vendors).toHaveLength(2);
    expect(plan.budget[0].source).toBe('ai');
    expect(plan.budget[0].isLocked).toBe(false);
    expect(plan.budget[0].paid).toBe(0);
    expect(plan.deletedIds).toEqual([]);
  });

  it('Invariant 1: Locked budget categories ignore AI budget changes during refinement', () => {
    const initialPlan = hydrateInitialPlan(createMockAiData());

    // Lock venue category with custom user budget
    initialPlan.budget = initialPlan.budget.map((b) =>
      b.key === 'venue' ? { ...b, estimated: 400000, isLocked: true, source: 'user' } : b
    );

    // AI suggests reducing venue to 250000
    const aiRefinement = createMockAiData({
      budgetAllocations: createMockAiData().budgetAllocations.map((a) =>
        a.key === 'venue' ? { ...a, estimated: 250000 } : a
      ),
    });

    const merged = mergeRefinedPlan(initialPlan, aiRefinement);
    const mergedVenue = merged.budget.find((b) => b.key === 'venue');

    // Must remain 400,000 because it was locked!
    expect(mergedVenue?.estimated).toBe(400000);
    expect(mergedVenue?.isLocked).toBe(true);
    expect(mergedVenue?.source).toBe('user');
  });

  it('Invariant 2: actual and paid amounts survive AI refinement untouched', () => {
    const initialPlan = hydrateInitialPlan(createMockAiData());

    // User finalized catering actual quote and made partial payment
    initialPlan.budget = initialPlan.budget.map((b) =>
      b.key === 'catering' ? { ...b, actual: 295000, paid: 150000 } : b
    );

    const aiRefinement = createMockAiData();
    const merged = mergeRefinedPlan(initialPlan, aiRefinement);
    const mergedCatering = merged.budget.find((b) => b.key === 'catering');

    expect(mergedCatering?.actual).toBe(295000);
    expect(mergedCatering?.paid).toBe(150000);
  });

  it('Invariant 3: Locked tasks and source: "user" tasks survive refinement untouched', () => {
    const initialPlan = hydrateInitialPlan(createMockAiData());

    // User adds custom locked task
    const userTask = {
      id: 'user-custom-1',
      title: 'Grandmother 80th Special Ritual',
      deadline: '2026-11-13',
      priority: 'high' as const,
      assignee: 'Uncle Murthy',
      done: true,
      eventFunction: 'Wedding' as const,
      source: 'user' as const,
      isLocked: true,
    };
    initialPlan.tasks.push(userTask);

    // AI refinement returns a totally different task list without Grandmother ritual
    const aiRefinement = createMockAiData({
      tasks: [
        { id: 'task-ai-new', title: 'Drone Permit', deadline: '2026-10-10', priority: 'medium', assignee: 'Photo lead', eventFunction: 'General' },
      ],
    });

    const merged = mergeRefinedPlan(initialPlan, aiRefinement);

    const foundUserTask = merged.tasks.find((t) => t.id === 'user-custom-1');
    expect(foundUserTask).toBeDefined();
    expect(foundUserTask?.title).toBe('Grandmother 80th Special Ritual');
    expect(foundUserTask?.done).toBe(true);
    expect(foundUserTask?.isLocked).toBe(true);
  });

  it('Invariant 4: Deleted tasks (deletedIds) are NEVER resurrected by AI refinement', () => {
    const initialPlan = hydrateInitialPlan(createMockAiData());

    // User deleted 'Order Sangeet Fireworks'
    initialPlan.deletedIds.push('task-3');
    initialPlan.deletedIds.push('order sangeet fireworks');
    initialPlan.tasks = initialPlan.tasks.filter((t) => t.id !== 'task-3');

    // AI refinement suggests re-adding fireworks
    const aiRefinement = createMockAiData({
      tasks: [
        { id: 'task-3', title: 'Order Sangeet Fireworks', deadline: '2026-10-15', priority: 'medium', assignee: 'DJ', eventFunction: 'Sangeet' },
      ],
    });

    const merged = mergeRefinedPlan(initialPlan, aiRefinement);
    const fireworksTask = merged.tasks.find((t) => t.title.toLowerCase().includes('fireworks'));

    expect(fireworksTask).toBeUndefined();
  });

  it('Invariant 5: User-entered VendorQuote[] inside VendorSlot survive AI refinement untouched', () => {
    const initialPlan = hydrateInitialPlan(createMockAiData());

    // User entered real vendor quote inside catering slot
    initialPlan.vendors = initialPlan.vendors.map((v) => {
      if (v.categoryKey === 'catering') {
        return {
          ...v,
          status: 'confirmed',
          quotes: [
            {
              id: 'quote-real-1',
              vendorName: 'Nizam Feast Royal Catering Co.',
              quotedPrice: 280000,
              notes: 'Chef special Dum Biryani & 8 dessert varieties',
              isFinalized: true,
            },
          ],
        };
      }
      return v;
    });

    // AI suggests altering catering slot
    const aiRefinement = createMockAiData({
      vendors: [
        { id: 'vslot-2', categoryKey: 'catering', type: 'Live Mughlai Caterer', estimatedQuote: 260000 },
      ],
    });

    const merged = mergeRefinedPlan(initialPlan, aiRefinement);
    const cateringSlot = merged.vendors.find((v) => v.categoryKey === 'catering');

    expect(cateringSlot?.quotes).toHaveLength(1);
    expect(cateringSlot?.quotes[0].vendorName).toBe('Nizam Feast Royal Catering Co.');
    expect(cateringSlot?.quotes[0].quotedPrice).toBe(280000);
    expect(cateringSlot?.status).toBe('confirmed');
  });

  it('Invariant 6: Task completion status (done: true) is preserved when task details update', () => {
    const initialPlan = hydrateInitialPlan(createMockAiData());

    // User checked off task-1
    initialPlan.tasks = initialPlan.tasks.map((t) =>
      t.id === 'task-1' ? { ...t, done: true } : t
    );

    // AI refinement updates the date of task-1
    const aiRefinement = createMockAiData({
      tasks: [
        { id: 'task-1', title: 'Book Banquet Venue', deadline: '2026-08-10', priority: 'high', assignee: 'Rohan', eventFunction: 'Wedding' },
      ],
    });

    const merged = mergeRefinedPlan(initialPlan, aiRefinement);
    const mergedTask = merged.tasks.find((t) => t.id === 'task-1');

    expect(mergedTask?.deadline).toBe('2026-08-10');
    expect(mergedTask?.done).toBe(true); // Must remain true!
  });

  it('Invariant 7: All math totals are deterministically computed via computeBudgetSummary()', () => {
    const initialPlan = hydrateInitialPlan(createMockAiData());

    // Set actual on decor
    initialPlan.budget = initialPlan.budget.map((b) =>
      b.key === 'decor' ? { ...b, actual: 70000, isLocked: true } : b
    );

    const merged = mergeRefinedPlan(initialPlan, createMockAiData());
    const summary = computeBudgetSummary(merged);

    // The math is 100% computed from merged state, not blindly trusted from LLM
    expect(summary.totalPlannedOrActual).toBeGreaterThan(0);
    expect(summary.remainingBudget).toBe(merged.totalBudget - summary.totalPlannedOrActual);
    expect(summary.isOverBudget).toBe(summary.remainingBudget < 0);
  });
});
