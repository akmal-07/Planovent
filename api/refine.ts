/**
 * Serverless API: /api/refine
 * Refines an existing celebration plan while respecting user-locked items and priority weights.
 */

import { GoogleGenAI } from '@google/genai';
import {
  RefineRequestSchema,
  AiGeneratedPlanSchema,
  geminiPlanResponseSchema,
} from '../src/schemas/geminiSchema.ts';

// In-memory rate limiter: max 15 requests per minute per IP
const ipRateMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || now > entry.resetTime) {
    ipRateMap.set(ip, { count: 1, resetTime: now + 60 * 1000 });
    return true;
  }
  if (entry.count >= 15) {
    return false;
  }
  entry.count++;
  return true;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const clientIp = (req.headers && (req.headers['x-forwarded-for'] || req.socket?.remoteAddress)) || 'unknown';
  if (!checkRateLimit(String(clientIp))) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute before refining again.' });
  }

  // Validate Input with Zod
  const validation = RefineRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid refinement payload',
      details: validation.error.format(),
    });
  }

  const { prompt, currentPlan } = validation.data;

  // Check API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_actual_ai_studio_api_key_here') {
    return res.status(503).json({
      error: 'GEMINI_API_KEY not configured.',
      message: 'Please set your valid Gemini API key in .env or deployment environment variables.',
      demoAvailable: true,
    });
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Compact summary of current plan constraints
    const lockedCategories = currentPlan.budget
      .filter((b: any) => b.isLocked)
      .map((b: any) => `${b.label}: ₹${b.estimated} (LOCKED - DO NOT CHANGE)`);

    const unlockedCategories = currentPlan.budget
      .filter((b: any) => !b.isLocked)
      .map((b: any) => `${b.label}: ₹${b.estimated} (Priority: ${b.priorityWeight})`);

    const lockedTasks = currentPlan.tasks
      .filter((t: any) => t.isLocked || t.source === 'user')
      .map((t: any) => t.title);

    const deletedItems = currentPlan.deletedIds;

    const refinementContext = `
User Refinement Request: "${prompt}"

Current Plan Context:
- Celebration: ${currentPlan.title} (${currentPlan.city})
- Target Guests: ${currentPlan.guestCount}
- Total Budget: ₹${currentPlan.totalBudget} (Integer INR)
- Accessibility Needs: ${currentPlan.accessibilityNeeds.join(', ') || 'None specified'}

LOCKED CATEGORIES (You must preserve these exact amounts):
${lockedCategories.length > 0 ? lockedCategories.join('\n') : 'None currently locked.'}

UNLOCKED CATEGORIES (Adjust these based on priorities and user prompt):
${unlockedCategories.join('\n')}

LOCKED / USER TASKS (Preserve these):
${lockedTasks.slice(0, 10).join(', ')}

DELETED ITEMS (Tombstones - DO NOT resurrect or re-add these items):
${deletedItems.join(', ') || 'None'}

Refinement Instructions:
1. Respect all locked categories strictly.
2. If cutting budget, cut 'low' priority categories first. Protect 'high' priority categories (e.g. food/photo).
3. If adjusting menus or dietary needs, update catering, task checklist, and personalized ideas.
4. Output must match the exact response schema.
5. In aiSummary, write a 2-3 sentence explanation explaining the trade-offs made and how user priorities were respected.
`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: refinementContext,
      config: {
        systemInstruction: `You are an elite Indian wedding planner specializing in non-destructive plan refinement.
- You strictly obey locked constraints and user priority weights.
- When budget cuts are requested, you reduce low-priority areas first, never applying blind across-the-board cuts.
- You never invent real vendor names, phone numbers, or URLs.
- All monetary amounts must be whole integer INR (no floats).`,
        responseMimeType: 'application/json',
        responseSchema: geminiPlanResponseSchema,
        temperature: 0.2,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }

    const parsedJson = JSON.parse(responseText);
    const planValidation = AiGeneratedPlanSchema.safeParse(parsedJson);

    if (!planValidation.success) {
      console.error('Schema validation errors on refined plan:', planValidation.error.format());
      return res.status(422).json({
        error: 'Refined plan failed schema validation',
        details: planValidation.error.format(),
      });
    }

    return res.status(200).json({
      success: true,
      data: planValidation.data,
    });
  } catch (error: any) {
    console.error('Gemini API refine error:', error);
    return res.status(500).json({
      error: 'Failed to refine plan via Gemini API',
      message: error?.message || 'Upstream API failure',
    });
  }
}
