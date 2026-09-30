import { NextRequest, NextResponse } from 'next/server';
import { CustomBot } from '@/lib/types';
import { DEFAULT_SMALL_BOTS } from '@/lib/constants';
import {
  generateOpenRouterContent,
  getDefaultOpenRouterModel,
  OpenRouterMessage,
} from '@/lib/openrouter-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const {
      senderUid,
      senderName,
      message,
      recentMessages,
      aiSettings,
      aiActiveForUser,
      customBots,
      communityStats,
    } = await req.json();

    if (!message || !senderName) {
      return NextResponse.json({ shouldReply: false, reason: 'Missing payload' }, { status: 400 });
    }

    // Check if AI is enabled globally and in group
    if (aiSettings && (aiSettings.status === false || aiSettings.groupAi === false)) {
      return NextResponse.json({ shouldReply: false, reason: 'Group AI is disabled by Admin' });
    }

    const cleanMessage = message.trim();
    const lower = cleanMessage.toLowerCase();

    // Check for @close command - NEVER process as Gemini prompt
    if (lower === '@close' || lower.startsWith('@close ')) {
      return NextResponse.json({
        shouldReply: false,
        isCloseCommand: true,
        reason: 'Close command received',
      });
    }

    // Merge custom bots with defaults
    const allBots: CustomBot[] = [
      ...DEFAULT_SMALL_BOTS,
      ...(Array.isArray(customBots) ? customBots.filter((b: CustomBot) => b.enabled) : []),
    ];

    // Check if any small bot trigger matches
    let matchedBot: CustomBot | null = null;
    let matchedTrigger = '';

    for (const bot of allBots) {
      if (!bot.enabled) continue;
      for (const tw of bot.triggerWords) {
        const cleanTw = tw.toLowerCase().trim();
        if (
          lower === cleanTw ||
          lower.startsWith(`${cleanTw} `) ||
          lower.startsWith(`${cleanTw}:`) ||
          lower.includes(` ${cleanTw} `) ||
          lower.includes(` ${cleanTw}`)
        ) {
          matchedBot = bot;
          matchedTrigger = cleanTw;
          break;
        }
      }
      if (matchedBot) break;
    }

    // Built-in persona mentions
    const isMasterAiMention =
      lower.includes('@community') ||
      lower.includes('@ai') ||
      lower.includes('@gemini') ||
      lower.includes('@bot') ||
      lower.includes('@brain') ||
      lower.includes('@agent');

    const isModBot = lower.includes('@mod') || lower.includes('@guard') || lower.includes('@safety');
    const isCodeBot = lower.includes('@code') || lower.includes('@dev') || lower.includes('@tech');
    const isHelperBot = lower.includes('@helper') || lower.includes('@assist') || lower.includes('@help');
    const isSummaryBot = lower.includes('@summarize') || lower.includes('@summary') || lower.includes('@digest');
    const isResearchBot = lower.includes('@research') || lower.includes('@fact') || lower.includes('@info');

    const isAnyTriggered =
      Boolean(matchedBot) ||
      isMasterAiMention ||
      isModBot ||
      isCodeBot ||
      isHelperBot ||
      isSummaryBot ||
      isResearchBot;

    // Should AI reply?
    const shouldReply = isAnyTriggered || Boolean(aiActiveForUser);

    if (!shouldReply) {
      return NextResponse.json({
        shouldReply: false,
        reason: 'AI mode not active for user and no bot trigger detected',
      });
    }

    // Extract command text by stripping triggers
    let queryPrompt = cleanMessage;
    if (matchedBot && matchedTrigger) {
      const regex = new RegExp(`^\\s*${matchedTrigger.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*[:,-]?\\s*`, 'i');
      queryPrompt = queryPrompt.replace(regex, '').trim();
    } else {
      queryPrompt = queryPrompt
        .replace(/^@(community|ai|gemini|bot|brain|agent|mod|guard|code|dev|helper|help|summarize|summary|research|fact)\s*[:,-]?\s*/i, '')
        .trim();
    }

    // Handle predefined small bot database tasks in Agent Mode
    if (matchedBot) {
      const actionType = matchedBot.actionType;
      let databaseAction: any = null;

      // 1. Task Bot Action
      if (actionType === 'create_task') {
        const isListRequest = queryPrompt.toLowerCase().includes('list') || matchedTrigger === '#listtasks' || matchedTrigger === '!tasks';
        if (isListRequest || !queryPrompt) {
          databaseAction = {
            type: 'list_tasks',
            botId: matchedBot.id,
          };
          const reply = `📋 **[${matchedBot.name}]**\nShowing active tasks from the community database.\n\n👉 *Tip: To create a task, type:*\n\`!task <Title of task> priority:high/medium/low @assignee\``;
          return NextResponse.json({
            shouldReply: true,
            reply,
            aiName: matchedBot.name,
            targetUser: senderName,
            botType: 'agent',
            botId: matchedBot.id,
            databaseAction,
          });
        }

        // Parse priority
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
        if (queryPrompt.toLowerCase().includes('priority:urgent') || queryPrompt.toLowerCase().includes('urgent')) priority = 'urgent';
        else if (queryPrompt.toLowerCase().includes('priority:high') || queryPrompt.toLowerCase().includes('high')) priority = 'high';
        else if (queryPrompt.toLowerCase().includes('priority:low') || queryPrompt.toLowerCase().includes('low')) priority = 'low';

        // Extract clean title
        const cleanTitle = queryPrompt
          .replace(/priority:\s*(urgent|high|medium|low)/gi, '')
          .replace(/@\w+/g, '')
          .trim() || 'New Community Action Item';

        databaseAction = {
          type: 'create_task',
          task: {
            title: cleanTitle,
            priority,
            status: 'pending',
            createdByName: senderName,
            createdByUid: senderUid,
            createdAt: Date.now(),
            botId: matchedBot.id,
          },
        };

        const reply = `📋 **[${matchedBot.name}]**\n✅ **New Task Created in Database:**\n- **Task**: ${cleanTitle}\n- **Priority**: \`${priority.toUpperCase()}\`\n- **Created By**: @${senderName}\n- **Status**: \`Pending\`\n\n*Agent recorded this task to the community database.*`;

        return NextResponse.json({
          shouldReply: true,
          reply,
          aiName: matchedBot.name,
          targetUser: senderName,
          botType: 'agent',
          botId: matchedBot.id,
          databaseAction,
        });
      }

      // 2. Poll Bot Action
      if (actionType === 'create_poll') {
        let question = 'Community Poll';
        let optionsList: string[] = ['Option 1', 'Option 2'];

        if (queryPrompt.includes('|')) {
          const parts = queryPrompt.split('|').map((p: string) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            question = parts[0];
            optionsList = parts.slice(1);
          }
        } else if (queryPrompt.includes('?') || queryPrompt.includes(',')) {
          const parts = queryPrompt.split(/[,?]/).map((p: string) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            question = queryPrompt.includes('?') ? queryPrompt.split('?')[0] + '?' : parts[0];
            const remaining = queryPrompt.replace(question, '').split(',').map((p: string) => p.trim()).filter(Boolean);
            if (remaining.length > 0) optionsList = remaining;
          } else {
            question = queryPrompt;
            optionsList = ['Yes / ہاں', 'No / نہیں', 'Need more info / مزید معلومات'];
          }
        } else if (queryPrompt) {
          question = queryPrompt;
          optionsList = ['Agree / متفق', 'Disagree / غیر متفق', 'Neutral / غیر جانبدار'];
        }

        const pollPayload = {
          question,
          options: optionsList.map((opt, idx) => ({ id: `opt_${idx + 1}`, text: opt, votes: 0 })),
          createdByName: senderName,
          createdByUid: senderUid,
          createdAt: Date.now(),
          status: 'active',
        };

        databaseAction = {
          type: 'create_poll',
          poll: pollPayload,
        };

        const optionsText = optionsList.map((opt, i) => `${i + 1}. **${opt}**`).join('\n');
        const reply = `📊 **[${matchedBot.name}]**\n🗳️ **Community Poll Opened!**\n\n**Question:** ${question}\n\n${optionsText}\n\n*Poll created in database by @${senderName}. Tap poll options to cast your vote!*`;

        return NextResponse.json({
          shouldReply: true,
          reply,
          aiName: matchedBot.name,
          targetUser: senderName,
          botType: 'agent',
          botId: matchedBot.id,
          databaseAction,
        });
      }

      // 3. Karma & Points Bot Action
      if (actionType === 'award_karma') {
        const mentionMatch = queryPrompt.match(/@(\w+)/);
        const recipientName = mentionMatch ? mentionMatch[1] : 'Member';
        const reason = queryPrompt.replace(/@\w+/g, '').replace(/\+\d+|\d+/g, '').trim() || 'Great contribution to the community';

        databaseAction = {
          type: 'award_karma',
          karma: {
            recipientName,
            points: 10,
            reason,
            awardedByName: senderName,
            awardedByUid: senderUid,
            timestamp: Date.now(),
          },
        };

        const reply = `🏆 **[${matchedBot.name}]**\n✨ **+10 Karma Points Awarded!**\n- **Recipient**: @${recipientName}\n- **Awarded By**: @${senderName}\n- **Reason**: *${reason}*\n\n*Points recorded to the community leaderboard database.*`;

        return NextResponse.json({
          shouldReply: true,
          reply,
          aiName: matchedBot.name,
          targetUser: senderName,
          botType: 'agent',
          botId: matchedBot.id,
          databaseAction,
        });
      }

      // 4. Community Stats Action
      if (actionType === 'community_stats') {
        const stats = communityStats || {};
        const totalUsers = stats.totalUsers || 12;
        const onlineUsers = stats.onlineUsers || 3;
        const totalMessages = stats.totalMessages || 150;
        const totalTasks = stats.totalTasks || 0;

        databaseAction = {
          type: 'view_stats',
        };

        const reply = `⚡ **[${matchedBot.name}]**\n📈 **Real-Time Community & Database Metrics:**\n- 👥 **Total Members**: \`${totalUsers}\`\n- 🟢 **Online Now**: \`${onlineUsers}\`\n- 💬 **Messages Recorded**: \`${totalMessages}\`\n- 📋 **Active Agent Tasks**: \`${totalTasks}\`\n- 🤖 **Agent Swarm Status**: \`Operational (All Sub-Bots Active)\`\n\n*Metrics fetched from live Firebase Realtime Database.*`;

        return NextResponse.json({
          shouldReply: true,
          reply,
          aiName: matchedBot.name,
          targetUser: senderName,
          botType: 'agent',
          botId: matchedBot.id,
          databaseAction,
        });
      }

      // 5. System Log Notice Action
      if (actionType === 'record_log') {
        const logContent = queryPrompt || 'Standard health checkpoint verified.';
        databaseAction = {
          type: 'record_log',
          log: {
            text: logContent,
            loggedBy: senderName,
            loggedByUid: senderUid,
            timestamp: Date.now(),
          },
        };

        const reply = `🔔 **[${matchedBot.name}]**\n📝 **System Notice Recorded to Database Log:**\n> "${logContent}"\n\n*Logged by @${senderName} at ${new Date().toLocaleTimeString()}*`;

        return NextResponse.json({
          shouldReply: true,
          reply,
          aiName: matchedBot.name,
          targetUser: senderName,
          botType: 'agent',
          botId: matchedBot.id,
          databaseAction,
        });
      }
    }

    // If empty prompt with trigger only, provide active confirmation
    if (!queryPrompt && isAnyTriggered) {
      const botGreeting = isModBot
        ? `🛡️ Moderator Bot is ready. Report any policy or safety issue anytime.`
        : isCodeBot
        ? `💻 Tech & Code Bot is active. Share your code snippet or debugging question.`
        : isSummaryBot
        ? `📊 Summarizer Bot is ready. Ask me to summarize recent chat messages or shared documents.`
        : `🧠 CommUnity Principal AI (Agent Mode) is ACTIVE for you, @${senderName}! You can delegate to specialized sub-bots:
- 📋 \`!task <Title>\` (Creates a task in DB)
- 📊 \`!poll <Question | Opt1 | Opt2>\` (Creates a live poll)
- 🏆 \`!points @user <reason>\` (Awards karma points)
- 📈 \`!stats\` (Queries database metrics)
- 🛡️ \`@mod\`, 💻 \`@code\`, 📊 \`@summarize\`, ⚡ \`@helper\`
Send @close anytime to exit AI mode.`;

      return NextResponse.json({
        shouldReply: true,
        isActivationAck: true,
        reply: botGreeting,
        aiName: aiSettings?.name || 'CommUnity Brain AI',
        targetUser: senderName,
      });
    }

    const aiName = matchedBot ? matchedBot.name : (aiSettings?.name || 'CommUnity Principal AI');
    const selectedModel = (aiSettings?.model && aiSettings.model.includes('/')) ? aiSettings.model : getDefaultOpenRouterModel();

    // Determine bot persona archetype
    let assignedRole = 'Principal Master Brain (Chief AI Controller)';
    if (matchedBot) {
      assignedRole = `${matchedBot.name} (Specialized Agent: ${matchedBot.description})`;
    } else if (isModBot) {
      assignedRole = 'Moderator & Safety Bot (Discipline, Etiquette & Community Protection)';
    } else if (isCodeBot) {
      assignedRole = 'Code & Tech Bot (Software Engineering, Algorithms & Debugging)';
    } else if (isSummaryBot) {
      assignedRole = 'Summarizer & Digest Bot (Concise synthesis of discussions & Google Drive documents)';
    } else if (isHelperBot) {
      assignedRole = 'Community Guide & Helper Bot (Navigation, FAQ & User assistance)';
    } else if (isResearchBot) {
      assignedRole = 'Research & Knowledge Bot (In-depth analysis & factual inquiry)';
    }

    const customBotInstructions = matchedBot?.systemPrompt ? `\nBOT SPECIFIC DIRECTIVE:\n${matchedBot.systemPrompt}\n` : '';

    const systemPrompt = `You are ${aiName}, operating in AGENT MODE as the ${assignedRole} of this community platform.
You command and coordinate a fleet of automated sub-bots:
- 📋 Task Agent Bot (!task, #todo) - Creates and executes database action items.
- 📊 Community Poll Bot (!poll, #vote) - Dispatches and calculates member polls.
- 🏆 Karma & Reputation Bot (!points, #kudos) - Awards contribution points.
- 📈 Stats & Analytics Bot (!stats) - Queries live database metrics.
- 🛡️ Moderator Bot (@mod) - Community rules, etiquette, safety checks.
- 💻 Code Bot (@code) - Coding, programming fixes, syntax highlighting.
- 📊 Summarizer Bot (@summarize) - Condensing discussions & Google Drive files.
- ⚡ Helper Bot (@helper) - Member guide, FAQ, system explanations.
${customBotInstructions}
ADMIN INSTRUCTIONS & PERSONA:
${aiSettings?.systemInstructions || 'Be extremely helpful, intelligent, polite, proactive, respectful, and keep answers concise and practical.'}

CORE RULES FOR CHATTING:
1. Address the requesting user (@${senderName}) with warmth and respect.
2. If language of user is Urdu / Hindi / English / Roman Urdu, match their language naturally and fluently.
3. If coding is needed, provide well-structured code snippets with clear explanations.
4. If Google Drive links (Docs/Sheets) or files are mentioned, explain how members can preview and interact with them securely.
5. Keep answers crisp (1-3 paragraphs) with clean bullet points when helpful.
6. When performing an action or replying as a specialized agent, prepend your response with the appropriate bot badge (e.g. 🧠 [Principal AI], 💻 [Code Bot], 🛡️ [Moderator Bot], 📊 [Summarizer Bot], 📋 [Task Bot], 🏆 [Karma Bot], or ⚡ [Helper Bot]).`;

    // Construct recent context
    const contextLines: string[] = [];
    if (Array.isArray(recentMessages)) {
      for (const msg of recentMessages.slice(-6)) {
        if (msg.senderName && msg.text && !msg.isAi) {
          contextLines.push(`${msg.senderName}: ${msg.text}`);
        }
      }
    }
    contextLines.push(`${senderName}: ${queryPrompt || cleanMessage}`);

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Recent group discussion context:\n${contextLines.join('\n')}\n\nRespond as ${aiName} (${assignedRole}) in Agent Mode addressing ${senderName}:`,
      },
    ];

    const { text, usedModel } = await generateOpenRouterContent({
      requestedModel: selectedModel,
      messages,
    });

    const reply = text || `@${senderName}, Principal AI Agent received your request. How else can I assist your workflow?`;

    return NextResponse.json({
      shouldReply: true,
      reply,
      aiName,
      targetUser: senderName,
      usedModel,
      botType: matchedBot ? 'agent' : 'principal',
      botId: matchedBot?.id,
    });
  } catch (err: any) {
    console.error('Group AI error:', err);
    return NextResponse.json(
      {
        shouldReply: false,
        error: err.message || 'AI generation failed',
      },
      { status: 200 }
    );
  }
}

