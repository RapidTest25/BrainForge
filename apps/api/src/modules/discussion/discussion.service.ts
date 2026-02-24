import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

const userSelect = { id: true, name: true, avatarUrl: true };

class DiscussionService {
  async create(teamId: string, userId: string, data: { title: string; content: string; category?: string }) {
    return prisma.discussion.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        content: data.content,
        category: data.category || 'general',
      },
      include: {
        creator: { select: userSelect },
        _count: { select: { replies: true } },
      },
    });
  }

  async findByTeam(teamId: string, category?: string) {
    const where: any = { teamId };
    if (category && category !== 'all') {
      where.category = category;
    }
    return prisma.discussion.findMany({
      where,
      include: {
        creator: { select: userSelect },
        _count: { select: { replies: true } },
        replies: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { user: { select: userSelect } },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findById(discussionId: string) {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        creator: { select: userSelect },
        replies: {
          include: { user: { select: userSelect } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
    });
    if (!discussion) throw new NotFoundError('Discussion not found');
    return discussion;
  }

  async update(discussionId: string, data: { title?: string; content?: string; category?: string; isPinned?: boolean; isClosed?: boolean }) {
    return prisma.discussion.update({
      where: { id: discussionId },
      data: { ...data, updatedAt: new Date() },
      include: {
        creator: { select: userSelect },
        _count: { select: { replies: true } },
      },
    });
  }

  async delete(discussionId: string) {
    await prisma.discussion.delete({ where: { id: discussionId } });
  }

  async addReply(discussionId: string, userId: string, data: { content: string }) {
    // Update discussion's updatedAt timestamp
    await prisma.discussion.update({
      where: { id: discussionId },
      data: { updatedAt: new Date() },
    });

    return prisma.discussionReply.create({
      data: {
        discussionId,
        userId,
        content: data.content,
      },
      include: { user: { select: userSelect } },
    });
  }

  async deleteReply(replyId: string) {
    await prisma.discussionReply.delete({ where: { id: replyId } });
  }

  async updateReply(replyId: string, data: { content: string }) {
    return prisma.discussionReply.update({
      where: { id: replyId },
      data: { content: data.content, updatedAt: new Date() },
      include: { user: { select: userSelect } },
    });
  }
}

export const discussionService = new DiscussionService();
