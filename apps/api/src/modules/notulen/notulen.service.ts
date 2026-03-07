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
        select: { title: true, mode: true, updatedAt: true },
        include: {
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

    // Build summary prompt
    const activitySummary = [
      tasks.length > 0 ? `TASKS (${tasks.length}):\n${tasks.map(t => `- [${t.status}] ${t.title} (${t.priority})`).join('\n')}` : '',
      notes.length > 0 ? `NOTES (${notes.length}):\n${notes.map(n => `- ${n.title}`).join('\n')}` : '',
      brainstorms.length > 0 ? `BRAINSTORM SESSIONS (${brainstorms.length}):\n${brainstorms.map(b => `- ${b.title} (${b.mode})`).join('\n')}` : '',
      goals.length > 0 ? `GOALS (${goals.length}):\n${goals.map(g => `- [${g.status}] ${g.title} - ${g.progress}%`).join('\n')}` : '',
      diagrams.length > 0 ? `DIAGRAMS (${diagrams.length}):\n${diagrams.map(d => `- ${d.title} (${d.type})`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');

    const hasActivity = tasks.length + notes.length + brainstorms.length + goals.length + diagrams.length > 0;

    const systemPrompt = `You are an AI project manager assistant creating a daily summary (notulen/meeting notes).
Your output must be ONLY a valid JSON object with these fields:
- "title": string - A concise title for today's summary (max 100 chars)
- "summary": string - A comprehensive summary of all activities in the last 24 hours. Use markdown formatting. Include what was done, what changed, and key decisions. If no activity, acknowledge it and suggest next steps.
- "conclusions": string - Key takeaways and conclusions based on the activity. What patterns do you see? What's going well? What needs attention?
- "recommendations": string - Actionable recommendations for what to do next. Be specific. Prioritize items. Suggest timeline if appropriate.

LANGUAGE: Write in the same language as the activity titles (if Indonesian, write in Indonesian; if English, write in English).
OUTPUT: Only valid JSON, no markdown fences, no extra text.`;

    const userMessage = hasActivity
      ? `Here is the team's activity data from the last 24 hours:\n\n${activitySummary}${options.customPrompt ? `\n\nAdditional context from user: ${options.customPrompt}` : ''}`
      : `There was no recorded activity in the last 24 hours.${options.customPrompt ? `\n\nUser context: ${options.customPrompt}` : ''}\n\nPlease create a summary acknowledging the quiet period and suggest productive next steps.`;

    const result = await aiService.chat(userId, options.provider, options.model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

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
