import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

const USER_SELECT = { id: true, name: true, avatarUrl: true };

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
      include: { creator: { select: USER_SELECT } },
    });
  }

  async findByTeam(teamId: string) {
    return prisma.brainstormSession.findMany({
      where: { teamId },
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
}

export const brainstormService = new BrainstormService();
