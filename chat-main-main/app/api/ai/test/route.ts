import { NextRequest, NextResponse } from 'next/server';
import {
  generateOpenRouterContent,
  getDefaultOpenRouterModel,
} from '@/lib/openrouter-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { model, systemInstructions, prompt } = await req.json();

    const selectedModel = model || getDefaultOpenRouterModel();
    const testPrompt = prompt || 'Say hello and introduce yourself as the community assistant in two brief sentences.';

    const { text, usedModel } = await generateOpenRouterContent({
      requestedModel: selectedModel,
      messages: [
        {
          role: 'system',
          content: systemInstructions || 'You are CommUnity AI Assistant.',
        },
        {
          role: 'user',
          content: testPrompt,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      model: usedModel,
      reply: text,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'AI test call failed' },
      { status: 200 }
    );
  }
}
