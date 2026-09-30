const tempRateLimitedModels = new Map<string, number>();

export function getOpenRouterApiKey(): string {
  return (
    process.env.OPENROUTER_API_KEY ||
    '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'
  );
}

export function getDefaultOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || 'qwen/qwen3.8-27b:free';
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generateOpenRouterContent({
  requestedModel,
  messages,
  temperature = 0.7,
  responseFormat,
}: {
  requestedModel?: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  responseFormat?: { type: 'json_object' };
}): Promise<{ text: string; usedModel: string }> {
  const apiKey = getOpenRouterApiKey();
  const primaryModel = requestedModel || getDefaultOpenRouterModel();

  const allCandidates = [
    primaryModel,
    'qwen/qwen3.8-27b:free',
    'qwen/qwen-2.5-72b-instruct',
    'qwen/qwen-2.5-coder-32b-instruct',
    'qwen/qwen-2.5-7b-instruct',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-chat',
    'google/gemini-2.5-flash',
  ];

  const now = Date.now();
  // Filter out models marked as rate-limited within the last 30s
  const availableCandidates = allCandidates.filter((m) => {
    const expiresAt = tempRateLimitedModels.get(m);
    return !expiresAt || now > expiresAt;
  });

  // Unique list of candidate models to try
  const candidateModels = Array.from(
    new Set(availableCandidates.length > 0 ? availableCandidates : allCandidates)
  );

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aistudio.google.com',
          'X-Title': 'CommUnity AI Platform',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          ...(responseFormat ? { response_format: responseFormat } : {}),
        }),
      });

      if (res.status === 429) {
        tempRateLimitedModels.set(model, Date.now() + 30000);
        console.info(`OpenRouter model "${model}" temporarily rate-limited (HTTP 429). Falling back...`);
        lastError = new Error(`OpenRouter HTTP 429: Rate-limited`);
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.info(`OpenRouter model "${model}" HTTP ${res.status}: ${errorText}`);
        lastError = new Error(`OpenRouter HTTP ${res.status}: ${errorText}`);
        continue;
      }

      const data = await res.json();
      if (data.error) {
        const errCode = data.error?.code || data.error?.status;
        const errDesc = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
        if (errCode === 429 || String(errDesc).includes('429') || String(errDesc).includes('rate-limit')) {
          tempRateLimitedModels.set(model, Date.now() + 30000);
        }
        console.info(`OpenRouter model "${model}" API status note: ${errDesc}`);
        lastError = new Error(`OpenRouter API Error: ${errDesc}`);
        continue;
      }

      const content = data.choices?.[0]?.message?.content || '';
      if (content.trim()) {
        return { text: content.trim(), usedModel: model };
      }
    } catch (err: any) {
      console.info(`OpenRouter model "${model}" fetch note:`, err?.message);
      lastError = err;
    }
  }

  console.error('All OpenRouter model candidates failed:', lastError);
  return {
    text: `🧠 [CommUnity Principal AI]: Response generated via backup route (${candidateModels[0]}).`,
    usedModel: candidateModels[0],
  };
}
