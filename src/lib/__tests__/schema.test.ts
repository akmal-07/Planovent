import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AiGeneratedPlanSchema,
  AiRefinedPlanSchema,
  GenerateRequestSchema,
  RefineRequestSchema,
} from '../../schemas/geminiSchema';
import generateHandler from '../../../api/generate.ts';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: (...args: any[]) => mockGenerateContent(...args),
      };
    },
  };
});

function createMockReqRes(method: string, body: any) {
  const req = {
    method,
    body,
    headers: {},
  };
  let responseData: any = null;
  let statusCode = 200;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
  };
  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData,
  };
}

describe('Zod Boundary Tests (AiGeneratedPlanSchema & Schemas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('accepts empty ideas array (min 0) in AiGeneratedPlanSchema and AiRefinedPlanSchema', () => {
    const payloadWithEmptyIdeas = {
      ...validAiPayload,
      ideas: [],
    };
    const genResult = AiGeneratedPlanSchema.safeParse(payloadWithEmptyIdeas);
    expect(genResult.success).toBe(true);
    if (genResult.success) {
      expect(genResult.data.ideas).toEqual([]);
    }

    const refineResult = AiRefinedPlanSchema.safeParse(payloadWithEmptyIdeas);
    expect(refineResult.success).toBe(true);
    if (refineResult.success) {
      expect(refineResult.data.ideas).toEqual([]);
    }
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

  it('fails with a typed error (MISSING_MODEL_CONFIG) when GEMINI_MODEL or GEMINI_MODEL_FAST is missing from env', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    const origModel = process.env.GEMINI_MODEL;
    const origFast = process.env.GEMINI_MODEL_FAST;

    process.env.GEMINI_API_KEY = 'test_api_key_123';
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL_FAST;

    const { req, res, getStatusCode, getResponseData } = createMockReqRes('POST', {
      prompt: 'Plan wedding in Hyderabad',
    });

    await generateHandler(req, res);

    expect(getStatusCode()).toBe(500);
    expect(getResponseData()).toEqual({
      error: 'GEMINI_MODEL and GEMINI_MODEL_FAST must be configured in server environment.',
      code: 'MISSING_MODEL_CONFIG',
    });

    // Restore env
    process.env.GEMINI_API_KEY = origKey;
    process.env.GEMINI_MODEL = origModel;
    process.env.GEMINI_MODEL_FAST = origFast;
  });

  it('retries once on GEMINI_MODEL_FAST when primary model throws 429/503 and returns modelUsed', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    const origModel = process.env.GEMINI_MODEL;
    const origFast = process.env.GEMINI_MODEL_FAST;

    process.env.GEMINI_API_KEY = 'test_api_key_123';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    process.env.GEMINI_MODEL_FAST = 'gemini-3.5-flash-lite';

    // First call (primary) rejects with 429 Resource Exhausted
    // Second call (fast) resolves with validAiPayload string
    mockGenerateContent
      .mockRejectedValueOnce(new Error('429 Resource Exhausted / Rate limit exceeded'))
      .mockResolvedValueOnce({
        text: JSON.stringify(validAiPayload),
      });

    const { req, res, getStatusCode, getResponseData } = createMockReqRes('POST', {
      prompt: 'Plan traditional ceremony in Hyderabad',
    });

    await generateHandler(req, res);

    expect(getStatusCode()).toBe(200);
    const data = getResponseData();
    expect(data.success).toBe(true);
    expect(data.modelUsed).toBe('gemini-3.5-flash-lite');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);

    // Verify first call was with primary model
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-3.8-flash');
    // Verify retry call was with fast model and thinkingLevel LOW
    expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-3.5-flash-lite');
    expect(mockGenerateContent.mock.calls[1][0].config.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });

    // Restore env
    process.env.GEMINI_API_KEY = origKey;
    process.env.GEMINI_MODEL = origModel;
    process.env.GEMINI_MODEL_FAST = origFast;
  });

  describe('/api/narrate Fast-Model Handler', () => {
    const validNarratePayload = {
      guestCount: 250,
      totalBudget: 800000,
      styleMultiplier: 1.0,
      projectedDelta: 60000,
      isOverBudget: true,
      rebalancedCategories: [
        {
          key: 'venue',
          label: 'Venue',
          priorityWeight: 'medium',
          currentSpend: 280000,
          projectedSpend: 280000,
          rebalancedSpend: 260000,
          delta: -20000,
          isLocked: false,
        },
        {
          key: 'catering',
          label: 'Catering',
          priorityWeight: 'high',
          currentSpend: 260000,
          projectedSpend: 325000,
          rebalancedSpend: 325000,
          delta: 65000,
          isLocked: true,
        },
      ],
      topRisks: [
        {
          id: 'risk-1',
          rule: 'plan_over_budget',
          severity: 'critical' as const,
          title: 'Plan Over-Budget',
          description: 'Deficit detected.',
        },
      ],
      tradeOffFacts: ['Preserved locked Catering intact.', 'Reduced low-priority categories.'],
    };

    it('requires GEMINI_MODEL_FAST in environment and returns 500 MISSING_MODEL_CONFIG if absent', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFast = process.env.GEMINI_MODEL_FAST;

      process.env.GEMINI_API_KEY = 'test_api_key_123';
      delete process.env.GEMINI_MODEL_FAST;

      const { default: narrateHandler } = await import('../../../api/narrate.ts');
      const { req, res, getStatusCode, getResponseData } = createMockReqRes('POST', validNarratePayload);

      await narrateHandler(req, res);

      expect(getStatusCode()).toBe(500);
      expect(getResponseData()).toEqual({
        error: 'GEMINI_MODEL_FAST must be configured in server environment.',
        code: 'MISSING_MODEL_CONFIG',
      });

      process.env.GEMINI_API_KEY = origKey;
      process.env.GEMINI_MODEL_FAST = origFast;
    });

    it('successfully calls GEMINI_MODEL_FAST with thinkingLevel LOW and returns modelUsed', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFast = process.env.GEMINI_MODEL_FAST;

      process.env.GEMINI_API_KEY = 'test_api_key_123';
      process.env.GEMINI_MODEL_FAST = 'gemini-3.5-flash-lite';

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          commentary: 'High-priority Catering was protected at ₹3,25,000 while Venue was trimmed by ₹20,000. Low-priority categories absorbed the remaining deficit.',
          riskAdvice: 'Timeline risk is elevated due to pending catering contracts. Finalize tasting sessions immediately.',
        }),
      });

      const { default: narrateHandler } = await import('../../../api/narrate.ts');
      const { req, res, getStatusCode, getResponseData } = createMockReqRes('POST', validNarratePayload);

      await narrateHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getResponseData();
      expect(data.success).toBe(true);
      expect(data.modelUsed).toBe('gemini-3.5-flash-lite');
      expect(data.data.commentary).toContain('High-priority Catering was protected');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-3.5-flash-lite');
      expect(mockGenerateContent.mock.calls[0][0].config.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });

      process.env.GEMINI_API_KEY = origKey;
      process.env.GEMINI_MODEL_FAST = origFast;
    });
  });
});

