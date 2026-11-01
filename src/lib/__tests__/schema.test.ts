import { describe, it, expect } from 'vitest';
import {
  AiGeneratedPlanSchema,
  GenerateRequestSchema,
  RefineRequestSchema,
} from '../../schemas/geminiSchema';

describe('Zod Boundary Tests (AiGeneratedPlanSchema & Schemas)', () => {
  const validAiPayload = {
    title: 'Pooja & Srinivas Royal South Indian Wedding',
    city: 'Hyderabad',
    eventStyle: 'Traditional Intimate',
    guestCount: 200,
    totalBudget: 800000,
    accessibilityNeeds: [
      'Wheelchair Accessible Venue & Entrance Ramps',
      'Pure Vegetarian & Jain Counter Separation',
    ],
    functions: [
      { name: 'Haldi', date: '2026-11-12', time: '10:00 AM' },
      { name: 'Wedding', date: '2026-11-14', time: '09:00 AM' },
    ],
    budgetAllocations: [
      { key: 'venue', label: 'Venue & Accommodation', sharePercent: 35, priorityWeight: 'high', scalingType: 'fixed', rationale: 'Heritage hall' },
      { key: 'catering', label: 'Catering & Beverages', sharePercent: 30, priorityWeight: 'high', scalingType: 'per_guest', rationale: 'Pure veg banquet' },
      { key: 'decor', label: 'Decor & Floral Styling', sharePercent: 8, priorityWeight: 'low', scalingType: 'fixed', rationale: 'Marigold mandap' },
      { key: 'photo_video', label: 'Photography & Cinema', sharePercent: 10, priorityWeight: 'high', scalingType: 'fixed', rationale: 'Candid photographer' },
      { key: 'entertainment', label: 'Music & Entertainment', sharePercent: 6, priorityWeight: 'medium', scalingType: 'fixed', rationale: 'Nadaswaram & Shehnai' },
      { key: 'invites', label: 'Invitations & Favors', sharePercent: 3, priorityWeight: 'low', scalingType: 'per_guest', rationale: 'Traditional invites' },
      { key: 'transport', label: 'Logistics & Fleet', sharePercent: 5, priorityWeight: 'medium', scalingType: 'step', rationale: 'Airport fleet' },
      { key: 'misc', label: 'Rituals & Contingency', sharePercent: 3, priorityWeight: 'medium', scalingType: 'fixed', rationale: 'Pooja items buffer' },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Book Traditional Temple Hall',
        deadline: '2026-08-01',
        timeSlot: '09:00',
        priority: 'high',
        assignee: 'Uncle Murthy',
        eventFunction: 'Wedding',
      },
    ],
    vendors: [
      {
        id: 'vslot-1',
        categoryKey: 'venue',
        type: 'Heritage Temple Hall',
        estimatedQuote: 280000,
      },
    ],
    ideas: [
      {
        id: 'idea-1',
        title: 'Brass Urli Floral Welcome',
        description: 'Floating marigolds with brass lamps at entrance.',
        category: 'decor',
      },
      {
        id: 'idea-2',
        title: 'Live South Indian Filter Coffee Cart',
        description: 'Traditional brass tumbler filter coffee live counter for morning rituals.',
        category: 'catering',
      },
    ],
    aiSummary: 'Allocated budget protecting high-priority catering and photography while optimizing decor.',
  };

  it('passes validation with a 100% compliant, culturally authentic AI payload', () => {
    const result = AiGeneratedPlanSchema.safeParse(validAiPayload);
    expect(result.success).toBe(true);
  });

  it('rejects floating-point sharePercent (must be integer percentage)', () => {
    const invalidPayload = {
      ...validAiPayload,
      budgetAllocations: validAiPayload.budgetAllocations.map((b) =>
        b.key === 'catering' ? { ...b, sharePercent: 32.75 } : b
      ),
    };

    const result = AiGeneratedPlanSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('sharePercent'));
      expect(issue).toBeDefined();
    }
  });

  it('rejects missing budget category keys (must have all 8 categories)', () => {
    const invalidPayload = {
      ...validAiPayload,
      // Only 7 categories (missing misc)
      budgetAllocations: validAiPayload.budgetAllocations.filter((b) => b.key !== 'misc'),
    };

    const result = AiGeneratedPlanSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('rejects unexpected extra vendor fields (e.g. hallucinated vendorName) due to strict() schema', () => {
    const invalidPayload = {
      ...validAiPayload,
      vendors: [
        {
          id: 'vslot-hallucinated',
          categoryKey: 'venue',
          type: 'Grand Heritage Palace',
          estimatedQuote: 300000,
          vendorName: 'Hallucinated Royal Palace Pvt Ltd', // Hallucinated vendor name!
          phone: '+91 98765 43210',                        // Hallucinated phone!
        },
      ],
    };

    const result = AiGeneratedPlanSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorStr = JSON.stringify(result.error.issues);
      expect(errorStr).toMatch(/unrecognized_keys/i);
    }
  });

  it('rejects truncated or malformed payload', () => {
    const truncatedPayload = {
      title: 'Incomplete Plan',
      // missing required fields
    };

    const result = AiGeneratedPlanSchema.safeParse(truncatedPayload);
    expect(result.success).toBe(false);
  });

  it('validates GenerateRequestSchema and caps max length', () => {
    const valid = GenerateRequestSchema.safeParse({
      prompt: 'Plan an intimate 200 guest wedding in Hyderabad',
      city: 'Hyderabad',
      guestCount: 200,
      totalBudget: 800000,
    });
    expect(valid.success).toBe(true);

    const oversized = GenerateRequestSchema.safeParse({
      prompt: 'a'.repeat(601),
    });
    expect(oversized.success).toBe(false);
  });

  it('validates RefineRequestSchema', () => {
    const valid = RefineRequestSchema.safeParse({
      prompt: 'Cut 15% budget',
      currentPlan: {
        id: 'plan-123',
        title: 'Wedding',
        city: 'Hyderabad',
        eventStyle: 'Traditional Intimate',
        guestCount: 200,
        totalBudget: 800000,
        accessibilityNeeds: [],
        functions: [],
        budget: [],
        tasks: [],
        vendors: [],
        tombstones: [],
      },
    });
    expect(valid.success).toBe(true);
  });
});
