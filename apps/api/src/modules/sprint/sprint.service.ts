import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const SPRINT_PROMPT = `You are an expert Agile/Scrum sprint planner and project manager. Generate a highly detailed, realistic sprint plan based on the project goal.

LANGUAGE (CRITICAL — MUST FOLLOW):
- Detect the language of the Goal and Additional context.
- Write ALL output (sprintGoal, task titles, descriptions, milestones, risks, dailyPlan) in the SAME language as the input.
- If input is in Indonesian (Bahasa Indonesia), write EVERYTHING in Indonesian.
- If input is in English, write in English.
- Do NOT default to English. Always match the dominant language of the input.

Output MUST be valid JSON with this structure:
{
  "sprintGoal": "Clear, measurable sprint goal statement with success criteria",
  "duration": "N days/weeks based on the actual deadline",
  "tasks": [
    {
      "title": "Specific, actionable task title",
      "description": "Detailed description including: what needs to be done, acceptance criteria, technical approach. At least 2-3 sentences.",
      "priority": "URGENT|HIGH|MEDIUM|LOW",
      "estimatedHours": 4,
      "category": "frontend|backend|design|testing|devops|research|documentation",
      "dependencies": ["Other task title if dependent"]
    }
  ],
  "milestones": [
    { "title": "Milestone name", "day": 3, "description": "Clear deliverable and how to verify completion" }
  ],
  "risks": [
    { "risk": "Specific risk description", "mitigation": "Concrete mitigation strategy with actionable steps" }
  ],
  "dailyPlan": [
    { "day": 1, "focus": "Day theme/focus area", "tasks": ["Task title 1", "Task title 2"] }
  ]
}

PLANNING RULES:
1. Generate 10-25 tasks depending on team size and deadline. Each task should be completable in 2-8 hours.
2. Tasks must be specific and technical — NOT vague like "Implement features". Instead: "Create user registration API endpoint with email validation and password hashing"
3. Include ALL phases: research/planning, implementation, testing, documentation, deployment.
4. Task descriptions MUST include acceptance criteria (what "done" means).
5. Distribute tasks evenly across team members and days.
6. Order tasks logically — dependencies first, then dependent tasks.
7. Include at least 3 milestones spread across the timeline.
8. Include at least 3 realistic risks with specific mitigations.
9. DailyPlan should cover EVERY working day from start to deadline.
10. Priority distribution: ~10% URGENT, ~30% HIGH, ~40% MEDIUM, ~20% LOW.
11. Calculate duration from TODAY to the deadline date provided. Be realistic about what can be accomplished.
12. Add testing tasks for every major feature (unit tests, integration tests).

ONLY output JSON, no other text.`;

class SprintService {
  async create(teamId: string, userId: string, data: { title: string; goal: string; deadline: string; teamSize?: number; projectId?: string }) {
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
        projectId: data.projectId,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async findByTeam(teamId: string, projectId?: string) {
    return prisma.sprintPlan.findMany({
      where: { teamId, ...(projectId && { projectId }) },
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
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const messages: ChatMsg[] = [
      { role: 'system', content: SPRINT_PROMPT },
      {
        role: 'user',
        content: `Generate a comprehensive sprint plan:
- Today's date: ${today}
- Goal: ${goal}
- Deadline: ${deadline}
- Team size: ${teamSize} developer${teamSize > 1 ? 's' : ''}
- Available working hours per developer per day: ~6 hours (accounting for meetings, breaks, reviews)
${context ? `- Additional context: ${context}` : ''}

Generate a realistic, achievable plan. Output only valid JSON.`,
      },
    ];

    const result = await aiService.chat(userId, provider, model, messages, { temperature: 0.4, maxTokens: 8192 });

    let sprintData: any;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      sprintData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
    } catch {
      throw new Error('Failed to parse AI response. The model returned invalid JSON. Please try again or use a different model.');
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
    context?: string,
    projectId?: string
  ) {
    const sprintData = await this.generateWithAI(userId, provider || '', model || '', goal || '', deadline || '', teamSize || 1, context);

    return prisma.sprintPlan.create({
      data: {
        teamId,
        createdBy: userId,
        title: title || 'Sprint Plan',
        goal: goal || '',
        projectId: projectId || undefined,
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
