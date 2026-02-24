import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const SPRINT_PROMPT = `You are an expert Agile/Scrum sprint planner. Generate a detailed sprint plan based on the project goal.

Output MUST be valid JSON with this structure:
{
  "sprintGoal": "Clear sprint goal statement",
  "duration": "2 weeks",
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "priority": "HIGH|MEDIUM|LOW",
      "estimatedHours": 4,
      "category": "frontend|backend|design|testing|devops",
      "dependencies": []
    }
  ],
  "milestones": [
    { "title": "Milestone name", "day": 3, "description": "What should be done" }
  ],
  "risks": [
    { "risk": "Risk description", "mitigation": "How to mitigate" }
  ],
  "dailyPlan": [
    { "day": 1, "focus": "Day focus", "tasks": ["Task title 1", "Task title 2"] }
  ]
}

Consider team size, deadline, and distribute tasks evenly.
ONLY output JSON, no other text.`;

class SprintService {
  async create(teamId: string, userId: string, data: { title: string; goal: string; deadline: string; teamSize?: number }) {
    return prisma.sprintPlan.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        goal: data.goal,
        deadline: new Date(data.deadline),
        teamSize: data.teamSize ?? 3,
        status: 'DRAFT',
        data: {},
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async findByTeam(teamId: string) {
    return prisma.sprintPlan.findMany({
      where: { teamId },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(sprintId: string) {
    const sprint = await prisma.sprintPlan.findUnique({
      where: { id: sprintId },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!sprint) throw new NotFoundError('Sprint plan not found');
    return sprint;
  }

  async update(sprintId: string, data: any) {
    const updateData: any = { ...data };
    if (data.deadline) updateData.deadline = new Date(data.deadline);
    return prisma.sprintPlan.update({
      where: { id: sprintId },
      data: updateData,
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async delete(sprintId: string) {
    await prisma.sprintPlan.delete({ where: { id: sprintId } });
  }

  async generateWithAI(
    userId: string,
    provider: string,
    model: string,
    goal: string,
    deadline: string,
    teamSize: number,
    context?: string
  ) {
    const messages: ChatMsg[] = [
      { role: 'system', content: SPRINT_PROMPT },
      {
        role: 'user',
        content: `Generate a sprint plan:
- Goal: ${goal}
- Deadline: ${deadline}
- Team size: ${teamSize} developers
${context ? `- Additional context: ${context}` : ''}

Output only valid JSON.`,
      },
    ];

    const result = await aiService.chat(userId, provider, model, messages, { temperature: 0.4, maxTokens: 8192 });

    let sprintData: any;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      sprintData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
    } catch {
      sprintData = { error: 'Failed to parse AI response', raw: result.content };
    }
    return sprintData;
  }

  async generateAndSave(
    teamId: string,
    userId: string,
    provider?: string,
    model?: string,
    title?: string,
    goal?: string,
    deadline?: string,
    teamSize?: number,
    context?: string
  ) {
    const sprintData = await this.generateWithAI(userId, provider || '', model || '', goal || '', deadline || '', teamSize || 1, context);

    return prisma.sprintPlan.create({
      data: {
        teamId,
        createdBy: userId,
        title: title || 'Sprint Plan',
        goal: goal || '',
        deadline: new Date(deadline || new Date()),
        teamSize: teamSize || 1,
        status: 'DRAFT',
        data: sprintData,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  // Convert sprint plan tasks to actual tasks
  async convertToTasks(sprintId: string, teamId: string, userId: string) {
    const sprint = await this.findById(sprintId);
    const sprintData = sprint.data as any;
    if (!sprintData?.tasks?.length) throw new Error('No tasks found in sprint plan');

    const tasks = [];
    for (let i = 0; i < sprintData.tasks.length; i++) {
      const t = sprintData.tasks[i];
      const task = await prisma.task.create({
        data: {
          teamId,
          createdBy: userId,
          sprintId,
          title: t.title,
          description: t.description || '',
          priority: (t.priority || 'MEDIUM').toUpperCase() as any,
          status: 'TODO',
          orderIndex: i,
        },
      });
      tasks.push(task);
    }

    await prisma.sprintPlan.update({
      where: { id: sprintId },
      data: { status: 'ACTIVE' },
    });

    return tasks;
  }
}

export const sprintService = new SprintService();
