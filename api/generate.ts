/**
 * Serverless API: /api/generate
 * Generates initial celebration plan using official @google/genai SDK with strict JSON schema.
 */

import { GoogleGenAI } from '@google/genai';
import {
  GenerateRequestSchema,
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
    return res.status(429).json({ error: 'Too many requests. Please wait a minute before generating again.' });
  }

  // Validate Input with Zod
  const validation = GenerateRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: validation.error.format(),
    });
  }

  const { prompt, city, guestCount, totalBudget } = validation.data;

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

    const promptContext = `
Celebration Request: "${prompt}"
Context hints:
- City/Venue: ${city || 'Indian destination'}
- Target Guests: ${guestCount || 200}
- Target Total Budget: ₹${totalBudget || 800000} (Integer INR)

Task:
Generate a complete, culturally authentic Indian wedding plan adhering strictly to the response schema:
1. Exactly the 8 budget categories: venue, catering, decor, photo_video, entertainment, invites, transport, misc.
2. The sum of estimated amounts across all 8 categories MUST equal approximately ₹${totalBudget || 800000}.
3. Assign priorityWeight ('high' for non-negotiables like Catering & Photography, 'low' for flexible areas like Decor/Invites).
4. ZERO HALLUCINATED VENDORS: Provide archetypes only (e.g. 'Candid Wedding Photographer', 'Royal Mandap Stylist').
5. Multi-day functions (Haldi, Mehndi, Sangeet, Wedding, Reception) with realistic milestone dates and task dependencies (dependsOnTaskId).
6. 3-5 personalized celebration ideas.
7. Concise 2-3 sentence aiSummary explaining trade-offs.
`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptContext,
      config: {
        systemInstruction: `You are an elite Indian wedding architecture and celebration planning AI.
- All monetary amounts must be whole integer INR (no floats, no decimals).
- You strictly obey the response schema.
- You never invent real vendor business names, phone numbers, or addresses.
- You allocate budgets based on priorities, protecting high-priority categories.`,
        responseMimeType: 'application/json',
        responseSchema: geminiPlanResponseSchema,
        temperature: 0.2, // Low temperature for deterministic financial adherence
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }

    const parsedJson = JSON.parse(responseText);
    const planValidation = AiGeneratedPlanSchema.safeParse(parsedJson);

    if (!planValidation.success) {
      console.error('Schema validation errors on AI output:', planValidation.error.format());
      return res.status(422).json({
        error: 'AI generated response failed validation schema',
        details: planValidation.error.format(),
      });
    }

    return res.status(200).json({
      success: true,
      data: planValidation.data,
    });
  } catch (error: any) {
    console.error('Gemini API generateContent error:', error);
    return res.status(500).json({
      error: 'Failed to generate plan via Gemini API',
      message: error?.message || 'Upstream API failure',
    });
  }
}
