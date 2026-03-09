import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { aiService } from '../../ai/ai.service.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const USER_SELECT = { id: true, name: true, avatarUrl: true };

class BrainstormService {
  async createSession(teamId: string, userId: string, data: { title: string; mode: string; context?: string; projectId?: string }) {
    return prisma.brainstormSession.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        mode: data.mode as any,
        context: data.context,
        projectId: data.projectId,
      },
      include: { creator: { select: USER_SELECT } },
    });
  }

  async findByTeam(teamId: string, projectId?: string) {
    return prisma.brainstormSession.findMany({
      where: { teamId, ...(projectId && { projectId }) },
      include: {
        creator: { select: USER_SELECT },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(sessionId: string) {
    const session = await prisma.brainstormSession.findUnique({
      where: { id: sessionId },
      include: {
        creator: { select: USER_SELECT },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: USER_SELECT } },
        },
      },
    });
    if (!session) throw new NotFoundError('Brainstorm session not found');
    return session;
  }

  async sendMessage(sessionId: string, userId: string, content: string) {
    const session = await prisma.brainstormSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundError('Brainstorm session not found');

    // Save user message (no AI — pure team discussion)
    const userMessage = await prisma.brainstormMessage.create({
      data: { sessionId, userId, role: 'USER', content },
      include: { user: { select: USER_SELECT } },
    });

    // Update session timestamp
    await prisma.brainstormSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });

    return userMessage;
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const msg = await prisma.brainstormMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundError('Message not found');
    if (msg.userId !== userId) throw new Error('You can only edit your own messages');

    return prisma.brainstormMessage.update({
      where: { id: messageId },
      data: { content, isEdited: true },
      include: { user: { select: USER_SELECT } },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await prisma.brainstormMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundError('Message not found');
    if (msg.userId !== userId) throw new Error('You can only delete your own messages');

    await prisma.brainstormMessage.delete({ where: { id: messageId } });
    return { success: true };
  }

  async pinMessage(messageId: string) {
    return prisma.brainstormMessage.update({
      where: { id: messageId },
      data: { isPinned: true },
    });
  }

  async unpinMessage(messageId: string) {
    return prisma.brainstormMessage.update({
      where: { id: messageId },
      data: { isPinned: false },
    });
  }

  async getPinnedMessages(sessionId: string) {
    return prisma.brainstormMessage.findMany({
      where: { sessionId, isPinned: true },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: USER_SELECT } },
    });
  }

  async deleteSession(sessionId: string) {
    await prisma.brainstormMessage.deleteMany({ where: { sessionId } });
    await prisma.brainstormSession.delete({ where: { id: sessionId } });
  }

  async exportSession(sessionId: string) {
    const session = await this.findById(sessionId);
    let markdown = `# ${session.title}\n\n`;
    markdown += `**Mode:** ${session.mode}\n`;
    markdown += `**Created:** ${session.createdAt}\n\n---\n\n`;
    for (const msg of session.messages) {
      const name = msg.user?.name || (msg.role === 'USER' ? 'User' : 'AI');
      markdown += `### ${name}\n\n${msg.content}\n\n---\n\n`;
    }
    return markdown;
  }

  async updateSession(sessionId: string, data: { title?: string }) {
    return prisma.brainstormSession.update({
      where: { id: sessionId },
      data,
      include: { creator: { select: USER_SELECT } },
    });
  }

  async updateCanvasData(sessionId: string, whiteboardData?: any, flowData?: any) {
    const updateData: any = {};
    if (whiteboardData !== undefined) updateData.whiteboardData = whiteboardData;
    if (flowData !== undefined) updateData.flowData = flowData;
    
    return prisma.brainstormSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  /**
   * Generate an AI response when @ai is mentioned in brainstorm chat.
   * Gathers session context + recent messages, then uses the AI to reply.
   */
  async generateAIResponse(
    sessionId: string,
    userId: string,
    provider: string,
    model: string,
    triggerMessage: string
  ) {
    const session = await prisma.brainstormSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: USER_SELECT } },
        },
      },
    });
    if (!session) throw new NotFoundError('Brainstorm session not found');

    // Build conversation context from recent messages (oldest first)
    const recentMessages = [...session.messages].reverse();
    const conversationContext = recentMessages
      .map(m => {
        const name = m.user?.name || (m.role === 'ASSISTANT' ? 'AI' : 'User');
        return `${name}: ${m.content}`;
      })
      .join('\n');

    const modeInstructions: Record<string, string> = {
      BRAINSTORM: 'You are a creative brainstorming partner. Generate innovative ideas, build on existing suggestions, and help expand concepts. Be enthusiastic and encouraging.',
      DEBATE: 'You are a thoughtful debate participant. Present well-reasoned arguments, consider counterpoints, and help analyze different perspectives. Be respectful but challenging.',
      ANALYSIS: 'You are an analytical assistant. Provide data-driven insights, identify patterns, and offer structured analysis. Be precise and evidence-based.',
      FREEFORM: 'You are a helpful discussion participant. Adapt your response style to match the conversation context. Be collaborative and insightful.',
    };

    const systemPrompt = `${modeInstructions[session.mode] || modeInstructions.FREEFORM}

You are participating in a team brainstorm session titled "${session.title}".
${session.context ? `Session context: ${session.context}` : ''}
Mode: ${session.mode}

Guidelines:
- Respond naturally as a team member, not as a generic chatbot
- Keep responses focused and concise (2-4 paragraphs max)
- Use the conversation context to give relevant, contextual responses
- If asked a question, answer it directly
- If asked for ideas, provide 3-5 concrete suggestions
- Format with markdown for readability (bullet points, bold, etc.)
- Reply in the same language as the user's message`;

    const messages: ChatMsg[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Here is the recent conversation:\n\n${conversationContext}\n\nRespond to the latest message. The user tagged you with @ai.`,
      },
    ];

    const result = await aiService.chat(userId, provider, model, messages, { temperature: 0.7 });

    const responseContent = (result.content || '').trim();
    if (!responseContent) {
      console.error('[BrainstormAI] AI returned empty content. Provider:', provider, 'Model:', model);
      throw new Error('AI returned empty response. Please check your API key and model configuration.');
    }

    // Save AI message to database
    const aiMessage = await prisma.brainstormMessage.create({
      data: {
        sessionId,
        userId: null,
        role: 'ASSISTANT',
        content: responseContent,
      },
      include: { user: { select: USER_SELECT } },
    });

    // Update session timestamp
    await prisma.brainstormSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });

    return aiMessage;
  }

  /**
   * Get team members for @mention autocomplete
   */
  async getTeamMembers(teamId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
    });
    return memberships.map(m => m.user);
  }
}

export const brainstormService = new BrainstormService();
