import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { aiService } from '../../ai/ai.service.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const GOAL_INCLUDE = {
  creator: { select: { id: true, name: true, avatarUrl: true } },
};

class GoalService {
  async create(teamId: string, userId: string, data: {
    title: string;
    description?: string;
    dueDate?: string;
  }) {
    return prisma.goal.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: GOAL_INCLUDE,
    });
  }

  async findByTeam(teamId: string) {
    return prisma.goal.findMany({
      where: { teamId },
      include: GOAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(goalId: string) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: GOAL_INCLUDE,
    });
    if (!goal) throw new NotFoundError('Goal not found');
    return goal;
  }

  async update(goalId: string, data: {
    title?: string;
    description?: string;
    status?: string;
    progress?: number;
    dueDate?: string | null;
  }) {
    return prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.progress !== undefined && { progress: data.progress }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
      },
      include: GOAL_INCLUDE,
    });
  }

  async delete(goalId: string) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundError('Goal not found');
    await prisma.goal.delete({ where: { id: goalId } });
  }

  async generateWithAI(
    teamId: string,
    userId: string,
    provider: string,
    model: string,
    prompt: string
  ) {
    const systemPrompt = `You are a Goal-Setting AI assistant. Generate SMART goals based on the user's description.

Output MUST be valid JSON with this structure:
{
  "goals": [
    {
      "title": "Goal title (5-80 chars, starts with a verb)",
      "description": "Detailed description of the goal including key results or milestones",
      "dueDate": "YYYY-MM-DD or null"
    }
  ]
}

Rules:
- Generate 3-6 goals
- Goals must be Specific, Measurable, Achievable, Relevant, Time-bound
- Use the same language as the user's input
- Output ONLY valid JSON, no markdown, no code fences
- Each goal should include measurable key results in the description`;

    const messages: ChatMsg[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    const result = await aiService.chat(userId, provider, model, messages, { temperature: 0.4 });

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
      parsed = { goals: [] };
    }

    const createdGoals = [];
    if (parsed.goals && Array.isArray(parsed.goals)) {
      for (const goal of parsed.goals) {
        if (!goal.title) continue;
        try {
          const created = await prisma.goal.create({
            data: {
              teamId,
              createdBy: userId,
              title: goal.title.slice(0, 200),
              description: goal.description || '',
              dueDate: goal.dueDate ? new Date(goal.dueDate) : null,
            },
            include: GOAL_INCLUDE,
          });
          createdGoals.push(created);
        } catch (e: any) {
          console.error('Failed to create goal:', e.message);
        }
      }
    }

    return createdGoals;
  }
}

export const goalService = new GoalService();
