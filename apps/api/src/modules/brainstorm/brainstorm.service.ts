import { prisma } from '../../lib/prisma.js';
import { aiService } from '../../ai/ai.service.js';
import { NotFoundError } from '../../lib/errors.js';
import type { ChatMsg } from '../../ai/providers/base.js';

const MODE_PROMPTS: Record<string, string> = {
  BRAINSTORM: `You are a creative brainstorming partner. Help generate ideas, explore possibilities, and think outside the box. Be enthusiastic and build on the user's ideas. Use bullet points and organize thoughts clearly.`,
  DEBATE: `You are a critical thinking partner who challenges ideas constructively. Present counter-arguments, identify weaknesses, and play devil's advocate. Be respectful but thorough in your analysis. Always provide alternative perspectives.`,
  ANALYSIS: `You are an analytical assistant. Break down complex topics into components, identify patterns, create frameworks, and provide data-driven insights. Use structured formats like tables, lists, and clear categorizations.`,
  FREEFORM: `You are a helpful AI assistant. Engage naturally with the user's questions and ideas. Adapt your communication style to match the conversation context.`,
};

class BrainstormService {
  async createSession(teamId: string, userId: string, data: { title: string; mode: string; context?: string }) {
    return prisma.brainstormSession.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        mode: data.mode as any,
        context: data.context,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async findByTeam(teamId: string) {
    return prisma.brainstormSession.findMany({
      where: { teamId },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(sessionId: string) {
    const session = await prisma.brainstormSession.findUnique({
      where: { id: sessionId },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundError('Brainstorm session not found');
    return session;
  }

  async sendMessage(sessionId: string, userId: string, content: string, provider?: string, model?: string) {
    const session = await prisma.brainstormSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
    if (!session) throw new NotFoundError('Brainstorm session not found');

    // Save user message
    const userMessage = await prisma.brainstormMessage.create({
      data: { sessionId, role: 'USER', content },
    });

    // Build conversation context
    const systemPrompt = MODE_PROMPTS[session.mode] || MODE_PROMPTS.FREEFORM;
    const contextAddition = session.context ? `\n\nProject context: ${session.context}` : '';
    const messages: ChatMsg[] = [
      { role: 'system', content: systemPrompt + contextAddition },
      ...session.messages.map(m => ({
        role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content },
    ];

    // Get AI response
    const result = await aiService.chat(userId, provider || '', model || '', messages);

    // Save AI message
    const aiMessage = await prisma.brainstormMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: result.content,
      },
    });

    // Update session timestamp
    await prisma.brainstormSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });

    return { userMessage, aiMessage };
  }

  async *streamMessage(sessionId: string, userId: string, content: string, provider?: string, model?: string) {
    const session = await prisma.brainstormSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
    if (!session) throw new NotFoundError('Brainstorm session not found');

    // Save user message
    await prisma.brainstormMessage.create({
      data: { sessionId, role: 'USER', content },
    });

    const systemPrompt = MODE_PROMPTS[session.mode] || MODE_PROMPTS.FREEFORM;
    const contextAddition = session.context ? `\n\nProject context: ${session.context}` : '';
    const messages: ChatMsg[] = [
      { role: 'system', content: systemPrompt + contextAddition },
      ...session.messages.map(m => ({
        role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content },
    ];

    let fullContent = '';
    for await (const chunk of aiService.stream(userId, provider || '', model || '', messages)) {
      fullContent += chunk;
      yield chunk;
    }

    // Save complete AI message
    await prisma.brainstormMessage.create({
      data: { sessionId, role: 'ASSISTANT', content: fullContent },
    });
    await prisma.brainstormSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
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
      const role = msg.role === 'USER' ? '**User**' : '**AI**';
      markdown += `### ${role}\n\n${msg.content}\n\n---\n\n`;
    }
    return markdown;
  }

  async updateSession(sessionId: string, data: { title?: string }) {
    return prisma.brainstormSession.update({
      where: { id: sessionId },
      data,
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
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
}

export const brainstormService = new BrainstormService();
