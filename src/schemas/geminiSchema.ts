/**
 * Celebration Planner — Gemini Schema Boundary (src/schemas/geminiSchema.ts)
 * 
 * Strict contract for Zod runtime validation and @google/genai responseSchema.
 * Enforces:
 * - Exactly the 8 core budget categories.
 * - Integer INR currency amounts.
 * - Priority-aware weights ('high' | 'medium' | 'low').
 * - Zero hallucinated real vendor details.
 * - Input length caps and prompt sanitization.
 */

import { z } from 'zod';
import { Type } from '@google/genai';

export const BUDGET_KEYS = [
  'venue',
  'catering',
  'decor',
  'photo_video',
  'entertainment',
  'invites',
  'transport',
  'misc',
] as const;

export const EVENT_FUNCTIONS = [
  'Haldi',
  'Mehndi',
  'Sangeet',
  'Wedding',
  'Reception',
  'General',
] as const;

export const PRIORITY_LEVELS = ['high', 'medium', 'low'] as const;
export const SCALING_TYPES = ['fixed', 'per_guest', 'step'] as const;

/**
 * 1. Zod Schema for Gemini Plan Generation & Refinement
 */
export const AiBudgetAllocationSchema = z.object({
  key: z.enum(BUDGET_KEYS),
  label: z.string().min(1),
  estimated: z.number().int().nonnegative(),
  priorityWeight: z.enum(PRIORITY_LEVELS),
  scalingType: z.enum(SCALING_TYPES),
  rationale: z.string().min(1),
});

export const AiTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  timeSlot: z.string().optional(),
  priority: z.enum(PRIORITY_LEVELS),
  assignee: z.string().min(1),
  eventFunction: z.enum(EVENT_FUNCTIONS),
  dependsOnTaskId: z.string().optional(),
});

export const AiVendorSlotSchema = z.object({
  id: z.string().min(1),
  categoryKey: z.enum(BUDGET_KEYS),
  type: z.string().min(1), // Archetype only, never fake company names
  estimatedQuote: z.number().int().nonnegative(),
});

export const AiIdeaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
});

export const AiFunctionScheduleSchema = z.object({
  name: z.enum(EVENT_FUNCTIONS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  time: z.string().optional(),
});

export const AiGeneratedPlanSchema = z.object({
  title: z.string().min(1),
  city: z.string().min(1),
  eventStyle: z.string().min(1),
  guestCount: z.number().int().positive(),
  totalBudget: z.number().int().positive(),
  accessibilityNeeds: z.array(z.string()),
  functions: z.array(AiFunctionScheduleSchema),
  budgetAllocations: z.array(AiBudgetAllocationSchema).length(8, 'Must include all 8 categories'),
  tasks: z.array(AiTaskSchema),
  vendors: z.array(AiVendorSlotSchema),
  ideas: z.array(AiIdeaSchema).min(2).max(6),
  aiSummary: z.string().min(10), // 2-3 sentence trade-off narrative
});

export type AiGeneratedPlan = z.infer<typeof AiGeneratedPlanSchema>;

/**
 * 2. @google/genai Response Schema for Strict JSON Output
 */
export const geminiPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    city: { type: Type.STRING },
    eventStyle: { type: Type.STRING },
    guestCount: { type: Type.INTEGER },
    totalBudget: { type: Type.INTEGER },
    accessibilityNeeds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    functions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            enum: [...EVENT_FUNCTIONS],
          },
          date: { type: Type.STRING },
          time: { type: Type.STRING },
        },
        required: ['name', 'date'],
      },
    },
    budgetAllocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: {
            type: Type.STRING,
            enum: [...BUDGET_KEYS],
          },
          label: { type: Type.STRING },
          estimated: { type: Type.INTEGER },
          priorityWeight: {
            type: Type.STRING,
            enum: [...PRIORITY_LEVELS],
          },
          scalingType: {
            type: Type.STRING,
            enum: [...SCALING_TYPES],
          },
          rationale: { type: Type.STRING },
        },
        required: ['key', 'label', 'estimated', 'priorityWeight', 'scalingType', 'rationale'],
      },
    },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          deadline: { type: Type.STRING },
          timeSlot: { type: Type.STRING },
          priority: {
            type: Type.STRING,
            enum: [...PRIORITY_LEVELS],
          },
          assignee: { type: Type.STRING },
          eventFunction: {
            type: Type.STRING,
            enum: [...EVENT_FUNCTIONS],
          },
          dependsOnTaskId: { type: Type.STRING },
        },
        required: ['id', 'title', 'deadline', 'priority', 'assignee', 'eventFunction'],
      },
    },
    vendors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          categoryKey: {
            type: Type.STRING,
            enum: [...BUDGET_KEYS],
          },
          type: { type: Type.STRING },
          estimatedQuote: { type: Type.INTEGER },
        },
        required: ['id', 'categoryKey', 'type', 'estimatedQuote'],
      },
    },
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ['id', 'title', 'description', 'category'],
      },
    },
    aiSummary: { type: Type.STRING },
  },
  required: [
    'title',
    'city',
    'eventStyle',
    'guestCount',
    'totalBudget',
    'accessibilityNeeds',
    'functions',
    'budgetAllocations',
    'tasks',
    'vendors',
    'ideas',
    'aiSummary',
  ],
};

/**
 * 3. Input Sanitization & Serverless Request Schemas
 */
export function sanitizePrompt(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[^\w\s.,!?'"₹\-/()&]/gi, '') // Keep safe chars
    .trim()
    .slice(0, 600); // Strict length cap
}

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(3).max(600).transform(sanitizePrompt),
  city: z.string().max(100).optional(),
  guestCount: z.number().int().positive().max(10000).optional(),
  totalBudget: z.number().int().positive().max(500000000).optional(),
});

export const RefineRequestSchema = z.object({
  prompt: z.string().min(3).max(600).transform(sanitizePrompt),
  currentPlan: z.object({
    id: z.string(),
    title: z.string(),
    city: z.string(),
    eventStyle: z.string(),
    guestCount: z.number(),
    totalBudget: z.number(),
    accessibilityNeeds: z.array(z.string()),
    functions: z.array(z.any()),
    budget: z.array(z.object({
      id: z.string(),
      key: z.enum(BUDGET_KEYS),
      label: z.string(),
      priorityWeight: z.enum(PRIORITY_LEVELS),
      estimated: z.number(),
      actual: z.number().optional(),
      paid: z.number(),
      scalingType: z.enum(SCALING_TYPES),
      isLocked: z.boolean(),
      source: z.enum(['user', 'ai']),
    })),
    tasks: z.array(z.any()),
    vendors: z.array(z.any()),
    deletedIds: z.array(z.string()),
  }),
});
