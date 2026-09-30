import { NextRequest, NextResponse } from 'next/server';
import {
  generateOpenRouterContent,
  getDefaultOpenRouterModel,
  OpenRouterMessage,
} from '@/lib/openrouter-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userName = 'Member',
      userEmail = '',
      appealText = '',
      banReason = 'Community guideline violation or reported inappropriate messages',
      mistakeCount = 0,
    } = body;

    if (!appealText || !appealText.trim()) {
      return NextResponse.json(
        { error: 'Appeal text is required' },
        { status: 400 }
      );
    }

    const currentMistakes = Number(mistakeCount) || 0;

    // Strict Rule: If user has already made 5 mistakes, on the 6th time they are permanently blocked
    if (currentMistakes >= 5) {
      return NextResponse.json({
        approved: false,
        permanentBan: true,
        mistakeCount: currentMistakes,
        reason: '5 warning limit reached (حد ختم ہو چکی ہے)',
        aiReply:
          'آپ پہلے ہی 5 مرتبہ قوانین کی خلاف ورزی کر چکے ہیں۔ ہمارے حفاظتی نظام کے تحت 6ویں مرتبہ اکاؤنٹ مستقل (Permanently) بلاک کر دیا جاتا ہے۔ اے آئی اسسٹنٹ اب آپ کا اکاؤنٹ خودکار طور پر بحال نہیں کر سکتا۔ صرف ایڈمنسٹریٹر ہی خصوصی جائزہ لے سکتے ہیں۔',
      });
    }

    const prompt = `You are the CommUnity Safety & Appeals AI Evaluator.
A user whose account was temporarily suspended is requesting an automated unblock review.

--- USER DETAILS ---
User Name: ${userName}
Email: ${userEmail}
Current Warning/Mistake Count: ${currentMistakes} (Max allowed mistakes before permanent ban: 5)
Reason for Block: ${banReason}
User's Appeal/Explanation: "${appealText}"

--- EVALUATION GUIDELINES ---
1. Check if the user's appeal is sincere, apologetic, admits mistake, explains it was accidental, or promises to follow community safety rules (no NSFW/spam/harassment).
2. If the user is genuinely seeking forgiveness or explaining an honest mistake AND current mistake count is < 5:
   - DECISION: APPROVE with a Warning.
   - Explain why they were blocked, that their apology is accepted, and warn them that they have used ${currentMistakes + 1} of 5 allowed chances (on the 6th mistake, ban is permanent).
3. If the appeal is hostile, vulgar, insulting, or threatens the platform:
   - DECISION: REJECT.
   - Maintain block and explain that respectful conduct is mandatory.

--- RESPONSE FORMAT ---
Return a VALID JSON object ONLY:
{
  "approved": boolean,
  "confidence": number,
  "explanation": "Brief 2-3 sentence explanation in Urdu + English explaining the block reason, approval/rejection reason, and the 5-mistake policy",
  "warningNumber": ${currentMistakes + 1}
}`;

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: 'You are a precise JSON evaluator AI.' },
      { role: 'user', content: prompt },
    ];

    const { text: responseText } = await generateOpenRouterContent({
      requestedModel: getDefaultOpenRouterModel(),
      messages,
      responseFormat: { type: 'json_object' },
    });

    let resultJson: any = {};
    try {
      resultJson = JSON.parse(responseText.replace(/```json|```/g, '').trim());
    } catch {
      resultJson = {
        approved: true,
        explanation: `آپ کی درخواست قبول کر لی گئی ہے۔ آپ کو وارننگ (${currentMistakes + 1}/5) کے ساتھ بحال کیا جا رہا ہے۔ براہ کرم کمیونٹی کے اصولوں کا خیال رکھیں۔`,
      };
    }

    const isApproved = resultJson.approved === true;
    const newMistakeCount = isApproved ? currentMistakes + 1 : currentMistakes;

    return NextResponse.json({
      approved: isApproved,
      permanentBan: false,
      mistakeCount: newMistakeCount,
      aiReply: resultJson.explanation || (isApproved ? 'آپ کی اپیل منظور کر لی گئی ہے۔' : 'آپ کی اپیل مسترد کر دی گئی ہے۔'),
      reason: resultJson.reason || banReason,
    });
  } catch (error: any) {
    console.error('Error evaluating appeal:', error);
    return NextResponse.json(
      {
        approved: false,
        error: error.message || 'Failed to evaluate appeal',
        aiReply: 'معذرت، اے آئی سرور سے رابطہ نہیں ہو سکا۔ ایڈمن 24 گھنٹے کے اندر آپ کی درخواست کا دستی جائزہ لیں گے۔',
      },
      { status: 500 }
    );
  }
}
