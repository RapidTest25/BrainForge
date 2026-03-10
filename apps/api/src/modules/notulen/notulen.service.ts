import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { notificationService } from '../notification/notification.service.js';

class NotulenService {

  // ── Config ──

  async getConfig(teamId: string, userId: string) {
    let config = await prisma.notulenConfig.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!config) {
      config = await prisma.notulenConfig.create({
        data: { teamId, userId, isActive: false },
      });
    }
    return config;
  }

  async updateConfig(teamId: string, userId: string, data: {
    isActive?: boolean;
    provider?: string | null;
    model?: string | null;
  }) {
    return prisma.notulenConfig.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, ...data },
      update: data,
    });
  }

  // ── Entries ──

  async getEntries(teamId: string, options?: { projectId?: string; limit?: number; offset?: number }) {
    return prisma.notulenEntry.findMany({
      where: {
        teamId,
        ...(options?.projectId ? { projectId: options.projectId } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
      orderBy: { date: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async getEntry(id: string) {
    return prisma.notulenEntry.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
    });
  }

  async deleteEntry(id: string, userId: string) {
    const entry = await prisma.notulenEntry.findUnique({ where: { id } });
    if (!entry) throw new Error('Entry not found');
    if (entry.createdBy !== userId) throw new Error('Unauthorized');
    return prisma.notulenEntry.delete({ where: { id } });
  }

  // ── AI Summary Generation ──

  async generateSummary(teamId: string, userId: string, options: {
    provider: string;
    model: string;
    projectId?: string;
    customPrompt?: string;
  }) {
    // Gather recent activity data
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const [tasks, notes, brainstorms, goals, diagrams] = await Promise.all([
      prisma.task.findMany({
        where: {
          teamId,
          ...(options.projectId ? { projectId: options.projectId } : {}),
          updatedAt: { gte: since },
        },
        select: { title: true, status: true, priority: true, updatedAt: true, description: true },
        take: 50,
      }),
      prisma.note.findMany({
        where: {
          teamId,
          ...(options.projectId ? { projectId: options.projectId } : {}),
          updatedAt: { gte: since },
        },
        select: { title: true, content: true, updatedAt: true },
        take: 20,
      }),
      prisma.brainstormSession.findMany({
        where: {
          teamId,
          ...(options.projectId ? { projectId: options.projectId } : {}),
          updatedAt: { gte: since },
        },
        select: {
          title: true,
          mode: true,
          updatedAt: true,
          messages: {
            select: { content: true, role: true },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        take: 10,
      }),
      prisma.goal.findMany({
        where: {
          teamId,
          ...(options.projectId ? { projectId: options.projectId } : {}),
          updatedAt: { gte: since },
        },
        select: { title: true, status: true, progress: true, description: true },
        take: 20,
      }),
      prisma.diagram.findMany({
        where: {
          teamId,
          ...(options.projectId ? { projectId: options.projectId } : {}),
          updatedAt: { gte: since },
        },
        select: { title: true, type: true, updatedAt: true },
        take: 10,
      }),
    ]);

    const activityData = { tasks, notes, brainstorms, goals, diagrams };

    // Build summary prompt with rich data
    const activitySummary = [
      tasks.length > 0 ? `TASKS (${tasks.length}):\n${tasks.map(t => {
        let line = `- [${t.status}] ${t.title} (${t.priority})`;
        if (t.description) line += `\n  Description: ${t.description.slice(0, 200)}`;
        return line;
      }).join('\n')}` : '',
      notes.length > 0 ? `NOTES (${notes.length}):\n${notes.map(n => {
        let line = `- ${n.title}`;
        if (n.content) {
          const plain = n.content.replace(/<[^>]+>/g, '').slice(0, 200);
          if (plain.trim()) line += `\n  Content: ${plain}`;
        }
        return line;
      }).join('\n')}` : '',
      brainstorms.length > 0 ? `BRAINSTORM SESSIONS (${brainstorms.length}):\n${brainstorms.map(b => {
        let line = `- ${b.title} (${b.mode})`;
        if (b.messages && b.messages.length > 0) {
          line += '\n  Recent discussion:';
          b.messages.slice(0, 3).forEach((m: any) => {
            line += `\n    [${m.role}]: ${m.content.slice(0, 150)}`;
          });
        }
        return line;
      }).join('\n')}` : '',
      goals.length > 0 ? `GOALS (${goals.length}):\n${goals.map(g => {
        let line = `- [${g.status}] ${g.title} - ${g.progress}%`;
        if (g.description) line += `\n  Description: ${g.description.slice(0, 200)}`;
        return line;
      }).join('\n')}` : '',
      diagrams.length > 0 ? `DIAGRAMS (${diagrams.length}):\n${diagrams.map(d => `- ${d.title} (${d.type})`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');

    const hasActivity = tasks.length + notes.length + brainstorms.length + goals.length + diagrams.length > 0;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `You are a senior project manager creating a professional daily summary report (notulen/meeting notes).
Date: ${today}

Your output must be ONLY a valid JSON object with these fields:
- "title": string - A specific, descriptive title reflecting today's key achievements/themes (max 100 chars). NOT generic like "Daily Summary" — be specific.
- "summary": string - A well-structured comprehensive summary using markdown. Organize into sections:
  ## Key Accomplishments
  List completed work and progress made with context.
  ## Active Work
  What is currently in progress and its status.
  ## Discussions & Ideas
  Insights from brainstorm sessions and notes.
  ## Goals Progress
  Track goal movement with % changes.
  Include specific details: task names, descriptions, what changed, who's involved. Be thorough but concise.
- "conclusions": string - Insightful analysis in markdown:
  - **Velocity**: How productive was the team today?
  - **Patterns**: Any recurring themes or blockers?
  - **Wins**: What went well? Acknowledge achievements.
  - **Concerns**: What needs attention? Any risks?
- "recommendations": string - Specific, actionable next steps in markdown. Categorize by urgency and format as:
  ### 🔴 Urgent (Do Today/Tomorrow)
  1. **[Action]** — Why it matters. Suggest who should handle it.
  
  ### 🟡 Important (This Week)
  1. **[Action]** — Expected impact and measurable outcome.
  
  ### 🟢 Nice-to-Have (When Possible)
  1. **[Action]** — Long-term benefit.
  
  Each recommendation MUST include:
  - A concrete, specific action (not vague like "improve quality")
  - WHO should do it (based on task assignments or team context)
  - WHEN it should be done (today, tomorrow, this week, etc.)
  - WHY it matters (impact on project goals, deadlines, or team velocity)
  - SUCCESS METRIC: How to know the action was completed successfully

QUALITY RULES:
- Reference specific task/goal names — don't be vague.
- If descriptions or brainstorm content is provided, analyze and synthesize it, don't just repeat titles.
- Quantify progress where possible (e.g. "3 of 5 tasks completed", "progress went from 40% to 70%").
- Make conclusions insightful, not just restating facts.
- Make recommendations actionable and prioritized.

LANGUAGE (CRITICAL — MUST FOLLOW):
- Detect the language of the activity titles AND the user's custom prompt (if provided).
- Write ALL output in the SAME language as the input.
- If activity titles are in Indonesian (Bahasa Indonesia), write EVERYTHING in Indonesian.
- If the user's additional context/prompt is in Indonesian, write in Indonesian regardless of activity title language.
- Do NOT default to English. Always match the dominant language of the input.

OUTPUT: Only valid JSON, no markdown fences, no extra text.`;

    const userMessage = hasActivity
      ? `Here is the team's activity data from the last 24 hours:\n\n${activitySummary}${options.customPrompt ? `\n\nAdditional context from user: ${options.customPrompt}` : ''}`
      : `There was no recorded activity in the last 24 hours.${options.customPrompt ? `\n\nUser context: ${options.customPrompt}` : ''}\n\nPlease create a summary acknowledging the quiet period and suggest productive next steps.`;

    const result = await aiService.chat(userId, options.provider, options.model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], { temperature: 0.3, maxTokens: 4096 });

    // Parse response
    let parsed: any;
    try {
      let content = result.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const match = content.match(/\{[\s\S]*\}/);
      if (match) content = match[0];
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        title: `Daily Summary - ${new Date().toLocaleDateString()}`,
        summary: result.content,
        conclusions: '',
        recommendations: '',
      };
    }

    // Save entry
    const entry = await prisma.notulenEntry.create({
      data: {
        teamId,
        projectId: options.projectId || null,
        createdBy: userId,
        title: (parsed.title || `Daily Summary - ${new Date().toLocaleDateString()}`).slice(0, 200),
        summary: parsed.summary || '',
        conclusions: parsed.conclusions || null,
        recommendations: parsed.recommendations || null,
        activityData: activityData as any,
        provider: options.provider,
        model: options.model,
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
    });

    return entry;
  }

  // ── Cron: Daily auto-summary for all active configs ──

  async runDailySummaries() {
    const activeConfigs = await prisma.notulenConfig.findMany({
      where: { isActive: true, provider: { not: null }, model: { not: null } },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    const results: { teamId: string; userId: string; success: boolean; error?: string }[] = [];

    for (const config of activeConfigs) {
      try {
        const entry = await this.generateSummary(config.teamId, config.userId, {
          provider: config.provider!,
          model: config.model!,
        });

        // Create notification
        await notificationService.create({
          teamId: config.teamId,
          userId: config.userId,
          title: '📋 Daily AI Summary Ready',
          message: entry.title,
          type: 'notulen',
          link: '/notulen',
        });

        results.push({ teamId: config.teamId, userId: config.userId, success: true });
      } catch (err: any) {
        console.error(`Notulen cron failed for team ${config.teamId}:`, err.message);
        results.push({ teamId: config.teamId, userId: config.userId, success: false, error: err.message });
      }
    }

    return results;
  }
}

export const notulenService = new NotulenService();
