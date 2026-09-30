import { GoogleGenAI } from '@google/genai';

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function getDefaultModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

export async function generateContentWithFallback({
  ai,
  requestedModel,
  contents,
  config,
}: {
  ai: GoogleGenAI;
  requestedModel?: string;
  contents: any;
  config?: any;
}): Promise<{ text: string; usedModel: string }> {
  // Ordered candidate list for graceful automatic quota fallback with Gemini 2.5 primary
  const candidateModels = Array.from(
    new Set([
      requestedModel || 'gemini-2.5-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ])
  );

  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      const text = response.text || '';
      return { text, usedModel: model };
    } catch (err: any) {
      lastError = err;
      const errMsg = (err?.message || '').toLowerCase();
      const isQuotaOrRateLimit =
        errMsg.includes('resource_exhausted') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate_limit') ||
        errMsg.includes('rate limit') ||
        err?.status === 429;

      if (!isQuotaOrRateLimit) {
        // If it's another non-quota error, still try the next model once before giving up
        console.warn(`Model ${model} encounter error:`, err?.message);
      } else {
        console.warn(`Model ${model} quota exhausted, trying next model in pool...`);
      }
    }
  }

  // Graceful response if all models are momentarily throttled
  console.error('All Gemini model candidates exhausted:', lastError);
  return {
    text: `🧠 [CommUnity Principal AI]: I received your message! The API quota for the active Gemini model is currently busy. Please send your query again in a few seconds or ask an Admin to update the model in AI Settings.`,
    usedModel: candidateModels[0],
  };
}

