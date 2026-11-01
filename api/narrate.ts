/**
 * Serverless API: /api/narrate
 * Fast-model trade-off and risk narration endpoint for What-If Elasticity and Risk Radar.
 * 
 * Uses GEMINI_MODEL_FAST FIRST (with ThinkingLevel.LOW) to preserve GEMINI_MODEL quota and minimize latency.
 * Gemini strictly writes concise 2-sentence trade-off commentary and risk advice based on
 * exact TypeScript-computed rupee deltas, never inventing numbers.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  NarrateRequestSchema,
  AiNarrationResponseSchema,
  geminiNarrationResponseSchema,
  withTimeout,
} from './_shared.ts';

export const maxDuration = 30;
export const config = { maxDuration: 30 };

const MODEL_TIMEOUT_MS = 25000; // 25 seconds per attempt

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // Validate Input with Zod
  const validation = NarrateRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid narration request payload',
      code: 'INVALID_REQUEST_PAYLOAD',
      details: validation.error.format(),
    });
  }

  const {
    guestCount,
    totalBudget,
    styleMultiplier,
    projectedDelta,
    isOverBudget,
    rebalancedCategories,
    topRisks,
    tradeOffFacts,
  } = validation.data;

  // Check API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_actual_ai_studio_api_key_here') {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in server environment.',
      code: 'MISSING_API_KEY',
    });
  }

  // Must read GEMINI_MODEL_FAST from process.env with zero hardcoded defaults
  const fastModel = process.env.GEMINI_MODEL_FAST;
  if (!fastModel) {
    return res.status(500).json({
      error: 'GEMINI_MODEL_FAST must be configured in server environment.',
      code: 'MISSING_MODEL_CONFIG',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Format deterministic facts for the model
    const categoryLines = rebalancedCategories
      .map(
        (c) =>
          `- ${c.label} (${c.priorityWeight} priority${c.isLocked ? ', LOCKED' : ''}): current ₹${c.currentSpend} -> projected ₹${c.projectedSpend} -> rebalanced ₹${c.rebalancedSpend} (delta: ${c.delta >= 0 ? '+' : ''}₹${c.delta})`
      )
      .join('\n');

    const riskLines = topRisks.length > 0
      ? topRisks.map((r) => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.description}`).join('\n')
      : 'No critical risks detected.';

    const narrationPrompt = `
You are analyzing deterministic What-If simulation results and risk factors for an Indian celebration:

SIMULATION PARAMETERS & FACTS:
- Target Guests: ${guestCount}
- Target Budget: ₹${totalBudget}
- Style Factor: ${styleMultiplier}x
- Overall Net Projected Rupee Delta: ${projectedDelta >= 0 ? '+' : ''}₹${projectedDelta}
- Status: ${isOverBudget ? 'Over Budget (Priority Deficit Absorption Applied)' : 'Balanced / Within Budget'}

EXACT COMPUTED RUPEE DELTAS (DO NOT CHANGE OR CONTRADICT THESE NUMBERS):
${categoryLines}

DETERMINISTIC FACTS:
${tradeOffFacts.join('\n')}

ACTIVE RISKS:
${riskLines}

TASK:
1. In "commentary", write exactly 2 concise, executive sentences explaining the financial trade-offs. Highlight which low-priority areas absorbed reductions or how locked/high-priority categories (like catering or photography) were shielded.
2. In "riskAdvice", write exactly 2 actionable sentences highlighting the single most pressing operational risk or timeline blocker and how the host should resolve it.
`;

    const systemInstruction = `You are a sharp financial and operational analyst for luxury Indian weddings.
- You write concise, high-signal executive summaries.
- You never invent numbers or disagree with the supplied rupee figures.
- Return strictly JSON matching the response schema.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: fastModel,
        contents: narrationPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: geminiNarrationResponseSchema,
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      MODEL_TIMEOUT_MS,
      `Fast narration model (${fastModel}) call timed out after ${MODEL_TIMEOUT_MS}ms`
    );

    const responseText = response.text;
    if (!responseText) {
      return res.status(502).json({
        error: 'Empty response received from Gemini narration model',
        code: 'EMPTY_AI_RESPONSE',
      });
    }

    const parsedJson = JSON.parse(responseText);
    const resultValidation = AiNarrationResponseSchema.safeParse(parsedJson);

    if (!resultValidation.success) {
      console.error('Narration validation errors:', resultValidation.error.format());
      return res.status(502).json({
        error: 'Narration output failed schema validation',
        code: 'SCHEMA_VALIDATION_ERROR',
        details: resultValidation.error.format(),
      });
    }

    return res.status(200).json({
      success: true,
      data: resultValidation.data,
      modelUsed: fastModel,
    });
  } catch (error: any) {
    console.error('Gemini API narrate error:', error);
    return res.status(502).json({
      error: error?.message || 'Upstream Gemini fast-model call failed',
      code: error?.code === 'TIMEOUT' ? 'GEMINI_TIMEOUT' : 'GEMINI_UPSTREAM_ERROR',
    });
  }
}
