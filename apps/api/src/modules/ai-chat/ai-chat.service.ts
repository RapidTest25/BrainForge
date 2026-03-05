import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import type { ChatMsg } from '../../ai/providers/base.js';

class AiChatService {
  async listChats(teamId: string, userId: string, projectId?: string) {
    return prisma.aiChat.findMany({
      where: { teamId, createdBy: userId, ...(projectId && { projectId }) },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getChat(chatId: string) {
    return prisma.aiChat.findUnique({
      where: { id: chatId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async createChat(teamId: string, userId: string, title: string, projectId?: string) {
    return prisma.aiChat.create({
      data: { teamId, createdBy: userId, title, ...(projectId && { projectId }) },
      include: { _count: { select: { messages: true } } },
    });
  }

  async deleteChat(chatId: string, userId: string) {
    const chat = await prisma.aiChat.findUnique({ where: { id: chatId } });
    if (!chat || chat.createdBy !== userId) throw new Error('Not found');
    return prisma.aiChat.delete({ where: { id: chatId } });
  }

  async updateTitle(chatId: string, userId: string, title: string) {
    const chat = await prisma.aiChat.findUnique({ where: { id: chatId } });
    if (!chat || chat.createdBy !== userId) throw new Error('Not found');
    return prisma.aiChat.update({
      where: { id: chatId },
      data: { title },
    });
  }

  async applyUpdates(
    teamId: string,
    userId: string,
    projectId: string | undefined,
    suggestions: Array<{
      type: 'task' | 'goal' | 'note';
      title: string;
      description?: string;
      content?: string;
      priority?: string;
      status?: string;
    }>,
  ) {
    const results: Array<{ type: string; title: string; success: boolean; id?: string }> = [];

    for (const item of suggestions) {
      try {
        if (item.type === 'task') {
          const task = await prisma.task.create({
            data: {
              teamId,
              title: item.title,
              description: item.description || '',
              priority: (item.priority as any) || 'MEDIUM',
              status: (item.status as any) || 'TODO',
              createdBy: userId,
              ...(projectId && { projectId }),
            },
          });
          results.push({ type: 'task', title: item.title, success: true, id: task.id });
        } else if (item.type === 'goal') {
          const goal = await prisma.goal.create({
            data: {
              teamId,
              title: item.title,
              description: item.description || '',
              status: 'NOT_STARTED',
              progress: 0,
              createdBy: userId,
              ...(projectId && { projectId }),
            },
          });
          results.push({ type: 'goal', title: item.title, success: true, id: goal.id });
        } else if (item.type === 'note') {
          const note = await prisma.note.create({
            data: {
              teamId,
              title: item.title,
              content: item.content || item.description || '',
              createdBy: userId,
              ...(projectId && { projectId }),
            },
          });
          results.push({ type: 'note', title: item.title, success: true, id: note.id });
        }
      } catch (err: any) {
        results.push({ type: item.type, title: item.title, success: false });
      }
    }

    return results;
  }

  async sendMessage(
    chatId: string,
    userId: string,
    content: string,
    provider: string,
    model: string,
  ) {
    // Save user message
    await prisma.aiChatMessage.create({
      data: { chatId, role: 'USER', content },
    });

    // Get project context for AI
    const chat = await prisma.aiChat.findUnique({
      where: { id: chatId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!chat) throw new Error('Chat not found');

    const projectContext = await this.getProjectContext(chat.teamId);

    // Build messages list for AI
    const systemPrompt = `You are BrainForge AI Assistant — a smart project management helper.
You have access to the current project/workspace context below. Use it to provide helpful summaries, suggest next goals, analyze progress, and answer questions about the project.

=== PROJECT CONTEXT ===
${projectContext}
=== END CONTEXT ===

Guidelines:
- Be concise and actionable
- When summarizing, highlight key progress, blockers, and upcoming work
- When suggesting goals, base them on current task statuses and team activity
- Format responses with markdown for readability
- If asked to determine next steps, analyze incomplete tasks, goals, and recent brainstorm sessions

PROJECT UPDATE SUGGESTIONS:
When the user asks you to analyze, brainstorm, plan, or improve the project — AND the conversation leads to actionable changes (new tasks, new goals, or notes) — you SHOULD offer to update the project.

To suggest project updates, include a JSON block at the END of your response using this exact format:

\`\`\`brainforge-updates
{
  "suggestions": [
    { "type": "task", "title": "Task title", "description": "Description", "priority": "HIGH|MEDIUM|LOW", "status": "TODO" },
    { "type": "goal", "title": "Goal title", "description": "Description" },
    { "type": "note", "title": "Note title", "content": "Note content in markdown" }
  ],
  "summary": "Brief explanation of what these updates will do"
}
\`\`\`

Only include this block when the conversation naturally produces actionable items. Do NOT include it for simple Q&A or informational responses. The user will be able to review and apply these suggestions.`;

    const messages: ChatMsg[] = [
      { role: 'system', content: systemPrompt },
      ...chat.messages.map(m => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call AI
    const result = await aiService.chat(userId, provider, model, messages);

    // Save assistant response
    const aiMessage = await prisma.aiChatMessage.create({
      data: {
        chatId,
        role: 'ASSISTANT',
        content: result.content,
        provider,
        model,
      },
    });

    // Update chat timestamp
    await prisma.aiChat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return aiMessage;
  }

  async saveLocalMessages(
    chatId: string,
    userId: string,
    userContent: string,
    aiContent: string,
    model: string,
  ) {
    // Save user message
    await prisma.aiChatMessage.create({
      data: { chatId, role: 'USER', content: userContent },
    });

    // Save AI response (generated client-side)
    const aiMessage = await prisma.aiChatMessage.create({
      data: {
        chatId,
        role: 'ASSISTANT',
        content: aiContent,
        provider: 'BROWSER',
        model,
      },
    });

    // Update chat timestamp
    await prisma.aiChat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return aiMessage;
  }

  private async getProjectContext(teamId: string): Promise<string> {
    const [tasks, goals, brainstorms, sprints] = await Promise.all([
      prisma.task.findMany({
        where: { teamId },
        select: { title: true, status: true, priority: true, dueDate: true, description: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
      prisma.goal.findMany({
        where: { teamId },
        select: { title: true, status: true, progress: true, description: true, dueDate: true },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }),
      prisma.brainstormSession.findMany({
        where: { teamId },
        select: { title: true, mode: true, context: true, createdAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.sprintPlan.findMany({
        where: { teamId },
        select: { title: true, goal: true, status: true, deadline: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const sections: string[] = [];

    if (tasks.length) {
      const tasksByStatus: Record<string, number> = {};
      tasks.forEach(t => { tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1; });
      sections.push(`TASKS (${tasks.length} recent):\nStatus summary: ${Object.entries(tasksByStatus).map(([s, c]) => `${s}: ${c}`).join(', ')}\n${tasks.slice(0, 15).map(t => `- [${t.status}] ${t.title}${t.priority !== 'MEDIUM' ? ` (${t.priority})` : ''}${t.dueDate ? ` due ${new Date(t.dueDate).toLocaleDateString()}` : ''}`).join('\n')}`);
    }

    if (goals.length) {
      sections.push(`GOALS (${goals.length}):\n${goals.map(g => `- [${g.status}] ${g.title} (${g.progress}% done)${g.description ? `: ${g.description.slice(0, 100)}` : ''}`).join('\n')}`);
    }

    if (brainstorms.length) {
      sections.push(`BRAINSTORM SESSIONS (${brainstorms.length} recent):\n${brainstorms.map(b => `- ${b.title} (${b.mode})${b.context ? `: ${b.context.slice(0, 80)}` : ''}`).join('\n')}`);
    }

    if (sprints.length) {
      sections.push(`SPRINTS (${sprints.length}):\n${sprints.map(s => `- [${s.status}] ${s.title}: ${s.goal.slice(0, 100)} (deadline: ${new Date(s.deadline).toLocaleDateString()})`).join('\n')}`);
    }

    return sections.length ? sections.join('\n\n') : 'No project data yet. This is a fresh workspace.';
  }
}

export const aiChatService = new AiChatService();
