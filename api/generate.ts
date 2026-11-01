/**
 * Serverless API: /api/generate
 * Generates initial celebration plan using official @google/genai SDK with strict JSON schema
 * and per-attempt 12s timeouts.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  GenerateRequestSchema,
  AiGeneratedPlanSchema,
  geminiPlanResponseSchema,
  withTimeout,
} from './_shared.ts';

// Quota and rate limiting are enforced at the Gemini API key / provider boundary.
export const maxDuration = 30;
export const config = { maxDuration: 30 };

const MODEL_TIMEOUT_MS = 12000; // 12 seconds per attempt

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // Validate Input with Zod
  const validation = GenerateRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      code: 'INVALID_REQUEST_PAYLOAD',
      details: validation.error.format(),
    });
  }

  const { prompt, city, guestCount, totalBudget } = validation.data;

  // Check API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_actual_ai_studio_api_key_here') {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in server environment.',
      code: 'MISSING_API_KEY',
    });
  }

  const primaryModel = process.env.GEMINI_MODEL;
  const fastModel = process.env.GEMINI_MODEL_FAST;

  if (!primaryModel || !fastModel) {
    return res.status(500).json({
      error: 'GEMINI_MODEL and GEMINI_MODEL_FAST must be configured in server environment.',
      code: 'MISSING_MODEL_CONFIG',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const promptContext = `
Celebration Request: "${prompt}"
Context hints:
- City/Venue: ${city || 'Indian destination'}
- Target Guests: ${guestCount || 200}
- Target Total Budget: ₹${totalBudget || 800000} (Integer INR)

Task:
Generate a complete, culturally authentic Indian wedding plan adhering strictly to the response schema:
1. Exactly the 8 budget categories: venue, catering, decor, photo_video, entertainment, invites, transport, misc.
2. The sharePercent across all 8 categories MUST sum to approximately 100%.
3. Assign priorityWeight ('high' for non-negotiables like Catering & Photography, 'low' for flexible areas like Decor/Invites).
4. ZERO HALLUCINATED VENDORS: Provide archetypes only (e.g. 'Candid Wedding Photographer', 'Royal Mandap Stylist'). Do NOT include business names, contact details, or extra fields.
5. Multi-day functions (Haldi, Mehndi, Sangeet, Wedding, Reception) with realistic milestone dates and task dependencies (dependsOnTaskId).
6. 3-5 personalized celebration ideas.
7. Concise 2-3 sentence aiSummary explaining trade-offs.
`;

    const systemInstruction = `You are an elite Indian wedding architecture and celebration planning AI.
- All monetary amounts must be whole integer INR (no floats, no decimals).
- You strictly obey the response schema.
- You never invent real vendor business names, phone numbers, or addresses.
- You allocate budgets based on priorities, protecting high-priority categories.`;

    let responseText: string | undefined;
    let modelUsed = primaryModel;

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: primaryModel,
          contents: promptContext,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: geminiPlanResponseSchema,
            temperature: 0.2,
          },
        }),
        MODEL_TIMEOUT_MS,
        `Primary model (${primaryModel}) call timed out after ${MODEL_TIMEOUT_MS}ms`
      );
      responseText = response.text;
    } catch (primaryError: any) {
      console.warn(`Primary model (${primaryModel}) failed or timed out, retrying once on fast model (${fastModel}):`, primaryError?.message);
      modelUsed = fastModel;
      const retryResponse = await withTimeout(
        ai.models.generateContent({
          model: fastModel,
          contents: promptContext,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: geminiPlanResponseSchema,
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        MODEL_TIMEOUT_MS,
        `Fast model (${fastModel}) call timed out after ${MODEL_TIMEOUT_MS}ms`
      );
      responseText = retryResponse.text;
    }

    if (!responseText) {
      return res.status(502).json({
        error: 'Empty response received from Gemini API',
        code: 'EMPTY_AI_RESPONSE',
      });
    }

    const parsedJson = JSON.parse(responseText);
    const planValidation = AiGeneratedPlanSchema.safeParse(parsedJson);

    if (!planValidation.success) {
      console.error('Schema validation errors on AI output:', planValidation.error.format());
      return res.status(502).json({
        error: 'AI generated response failed validation schema',
        code: 'SCHEMA_VALIDATION_ERROR',
        details: planValidation.error.format(),
      });
    }

    return res.status(200).json({
      success: true,
      data: planValidation.data,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Gemini API generateContent error:', error);
    return res.status(502).json({
      error: error?.message || 'Upstream Gemini API call failed',
      code: error?.code === 'TIMEOUT' ? 'GEMINI_TIMEOUT' : 'GEMINI_UPSTREAM_ERROR',
    });
  }
}
