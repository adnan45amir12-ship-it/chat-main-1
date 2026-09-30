import { NextRequest, NextResponse } from 'next/server';
import {
  generateOpenRouterContent,
  getDefaultOpenRouterModel,
  OpenRouterMessage,
} from '@/lib/openrouter-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { uid, message, prompt, history, systemInstructions, aiSettings, model } = await req.json();

    const userMsg = (message || prompt || '').trim();
    if (!userMsg) {
      return NextResponse.json({ error: 'Message or prompt is required' }, { status: 400 });
    }

    const userId = uid || 'admin_user';
    const chosenModel = model || aiSettings?.model;
    const selectedModel = chosenModel && chosenModel.includes('/') ? chosenModel : getDefaultOpenRouterModel();
    const systemInstruction =
      systemInstructions ||
      aiSettings?.systemInstructions ||
      'You are CommUnity AI, an intelligent, friendly, and helpful personal assistant for the online community platform. Answer concisely, warmly, and accurately according to admin instructions.';

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemInstruction },
    ];

    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const item of recentHistory) {
        if (item.text) {
          messages.push({
            role: item.role === 'model' || item.isAi ? 'assistant' : 'user',
            content: item.text,
          });
        }
      }
    }

    messages.push({
      role: 'user',
      content: userMsg,
    });

    const { text, usedModel } = await generateOpenRouterContent({
      requestedModel: selectedModel,
      messages,
    });

    return NextResponse.json({
      reply: text || 'I could not generate a response. Please try again.',
      modelUsed: usedModel,
      isConfigured: true,
    });
  } catch (err: any) {
    console.error('Personal AI error:', err);
    return NextResponse.json(
      {
        error: err.message || 'AI generation failed',
        reply: `AI Assistant error: ${err.message || 'Unable to connect to OpenRouter'}. Please try again.`,
      },
      { status: 200 }
    );
  }
}
