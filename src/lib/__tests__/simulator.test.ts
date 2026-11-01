import { describe, it, expect } from 'vitest';
import { scaleCategory, runWhatIfSimulation } from '../simulator';
import type { BudgetCategory, WeddingPlan } from '../../types/plan';

describe('simulator.ts — Pure 0ms Elasticity Math', () => {
  const createMockCategory = (overrides?: Partial<BudgetCategory>): BudgetCategory => ({
    id: 'cat-test',
    key: 'catering',
    label: 'Catering & Beverages',
    priorityWeight: 'high',
    estimated: 200000,
    paid: 0,
    scalingType: 'per_guest',
    source: 'user',
    isLocked: false,
    ...overrides,
  });

  const createMockPlan = (): WeddingPlan => ({
    id: 'plan-benchmark',
    title: 'Benchmark ₹8L Wedding',
    city: 'Hyderabad',
    eventStyle: 'Traditional Intimate',
    guestCount: 200,
    totalBudget: 800000,
    accessibilityNeeds: [],
    functions: [],
    budget: [
      { id: '1', key: 'venue', label: 'Venue', priorityWeight: 'medium', estimated: 280000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '2', key: 'catering', label: 'Catering', priorityWeight: 'high', estimated: 260000, paid: 0, scalingType: 'per_guest', source: 'user', isLocked: false },
      { id: '3', key: 'decor', label: 'Decor', priorityWeight: 'low', estimated: 70000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '4', key: 'photo_video', label: 'Photo/Video', priorityWeight: 'high', estimated: 80000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '5', key: 'entertainment', label: 'Entertainment', priorityWeight: 'medium', estimated: 40000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '6', key: 'invites', label: 'Invites', priorityWeight: 'low', estimated: 15000, paid: 0, scalingType: 'per_guest', source: 'user', isLocked: false },
      { id: '7', key: 'transport', label: 'Transport', priorityWeight: 'medium', estimated: 30000, paid: 0, scalingType: 'step', stepSize: 50, stepRate: 0.15, source: 'user', isLocked: false },
      { id: '8', key: 'misc', label: 'Misc', priorityWeight: 'medium', estimated: 25000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
    ],
    tasks: [],
    vendors: [],
    ideas: [],
    tombstones: [],
    updatedAt: new Date().toISOString(),
  });

  describe('scaleCategory()', () => {
    it('scales per_guest category proportionally when doubling and halving guests', () => {
      const cat = createMockCategory({ scalingType: 'per_guest', estimated: 200000 });

      // Doubling guests from 200 to 400 with 1.0x style
      const doubled = scaleCategory(cat, 200, 400, 1.0, false);
      expect(doubled).toBe(400000);

      // Halving guests from 200 to 100 with 1.0x style
      const halved = scaleCategory(cat, 200, 100, 1.0, false);
      expect(halved).toBe(100000);
    });

    it('scales step category with discrete step increments (positive and negative)', () => {
      const transportCat = createMockCategory({
        scalingType: 'step',
        estimated: 30000,
        stepSize: 50,
        stepRate: 0.15,
      });

      // Increase guests by +100 (+2 steps of 50). Multiplier: 1 + 2 * 0.15 = 1.30
      const steppedUp = scaleCategory(transportCat, 200, 300, 1.0, false);
      expect(steppedUp).toBe(39000); // 30,000 * 1.30

      // Decrease guests by -100 (-2 steps of 50). Multiplier: 1 - 2 * 0.15 = 0.70
      const steppedDown = scaleCategory(transportCat, 200, 100, 1.0, false);
      expect(steppedDown).toBe(21000); // 30,000 * 0.70
    });

    it('scales fixed category purely by style multiplier ignoring guest changes', () => {
      const decorCat = createMockCategory({ scalingType: 'fixed', estimated: 100000 });

      // Changing guests from 200 to 500 does NOT change fixed category with 1.0x style
      const guestChangeOnly = scaleCategory(decorCat, 200, 500, 1.0, false);
      expect(guestChangeOnly).toBe(100000);

      // Style multiplier 1.25x (Grand) increases fixed spend by 25%
      const grandStyle = scaleCategory(decorCat, 200, 500, 1.25, false);
      expect(grandStyle).toBe(125000);
    });

    it('preserves locked category spend untouched when respectLocks === true', () => {
      const lockedCat = createMockCategory({
        scalingType: 'per_guest',
        estimated: 200000,
        actual: 225000,
        isLocked: true,
      });

      // When respectLocks is true, returns actual spend untouched even if guests triple
      const preserved = scaleCategory(lockedCat, 200, 600, 1.25, true);
      expect(preserved).toBe(225000);

      // When respectLocks is false, scaling applies
      const scaled = scaleCategory(lockedCat, 200, 600, 1.0, false);
      expect(scaled).toBe(675000); // 225000 * 3
    });
  });

  describe('runWhatIfSimulation()', () => {
    it('returns projected spend directly when within budget (no deficit)', () => {
      const plan = createMockPlan();
      // Reduced guests to 150 with standard ₹8L budget -> surplus cushion
      const result = runWhatIfSimulation(plan, {
        guestCount: 150,
        totalBudget: 800000,
        styleMultiplier: 1.0,
        respectLocks: true,
      });

      expect(result.isOverBudget).toBe(false);
      expect(result.deficit).toBe(0);
      expect(result.rebalancedTotal).toBe(result.projectedTotal);
      expect(result.rebalancedTotal).toBeLessThan(800000);
      expect(result.tradeOffFacts.some((f) => f.includes('within budget'))).toBe(true);
    });

    it('prioritizes cutting low-priority categories before medium while shielding high-priority', () => {
      const plan = createMockPlan();
      // Increase guests to 300 with standard ₹8L budget -> causes deficit
      const result = runWhatIfSimulation(plan, {
        guestCount: 300,
        totalBudget: 800000,
        styleMultiplier: 1.0,
        respectLocks: true,
      });

      expect(result.isOverBudget).toBe(true);
      expect(result.deficit).toBeGreaterThan(0);

      const decorResult = result.categories.find((c) => c.key === 'decor'); // low
      const cateringResult = result.categories.find((c) => c.key === 'catering'); // high
      const photoResult = result.categories.find((c) => c.key === 'photo_video'); // high

      // Low priority categories take a significant percentage cut from projected
      const decorCutPct = (decorResult!.projectedSpend - decorResult!.rebalancedSpend) / decorResult!.projectedSpend;
      const cateringCutPct = (cateringResult!.projectedSpend - cateringResult!.rebalancedSpend) / cateringResult!.projectedSpend;

      expect(decorCutPct).toBeGreaterThan(cateringCutPct);
      // Photo is fixed and high priority -> 100% shielded
      expect(photoResult?.rebalancedSpend).toBe(photoResult?.projectedSpend);
    });

    it('lands on exact integer rupee totalBudget via Largest-Remainder rounding during deficit rebalancing', () => {
      const plan = createMockPlan();
      const targetBudget = 750000;

      const result = runWhatIfSimulation(plan, {
        guestCount: 280,
        totalBudget: targetBudget,
        styleMultiplier: 1.1,
        respectLocks: true,
      });

      expect(result.isOverBudget).toBe(true);
      // Sum of rebalanced spend across all 8 categories must match targetBudget exactly
      expect(result.rebalancedTotal).toBe(targetBudget);

      const sumAll = result.categories.reduce((sum, c) => sum + c.rebalancedSpend, 0);
      expect(sumAll).toBe(targetBudget);

      // All values must be whole integers (no cents or fractions)
      for (const cat of result.categories) {
        expect(Number.isInteger(cat.rebalancedSpend)).toBe(true);
      }
    });

    it('shields user-locked categories and flags unresolvableDeficit when high/locked exceed budget', () => {
      const plan = createMockPlan();
      // Lock venue at 300,000
      plan.budget = plan.budget.map((b) =>
        b.key === 'venue' ? { ...b, isLocked: true, estimated: 300000 } : b
      );

      const result = runWhatIfSimulation(plan, {
        guestCount: 350,
        totalBudget: 800000,
        styleMultiplier: 1.0,
        respectLocks: true,
      });

      const venueResult = result.categories.find((c) => c.key === 'venue');
      // Locked venue must not change
      expect(venueResult?.rebalancedSpend).toBe(300000);
      expect(venueResult?.projectedSpend).toBe(300000);
      // High priority Catering (455k) + Photo (80k) + Locked Venue (300k) = 835,000 > 800,000
      expect(result.unresolvableDeficit).toBe(35000);
      expect(result.rebalancedTotal).toBe(835000);
    });

    it('shields user-locked categories and resolves deficit completely when low/med have capacity', () => {
      const plan = createMockPlan();
      // Lock venue at 280,000
      plan.budget = plan.budget.map((b) =>
        b.key === 'venue' ? { ...b, isLocked: true, estimated: 280000 } : b
      );

      // Moderate guest increase: 220 guests
      const result = runWhatIfSimulation(plan, {
        guestCount: 220,
        totalBudget: 800000,
        styleMultiplier: 1.0,
        respectLocks: true,
      });

      const venueResult = result.categories.find((c) => c.key === 'venue');
      expect(venueResult?.rebalancedSpend).toBe(280000);
      expect(result.unresolvableDeficit).toBe(0);
      expect(result.rebalancedTotal).toBe(800000);
    });
  });
});
