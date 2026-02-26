import { prisma } from '../../lib/prisma.js';

class NotificationService {
  async create(data: {
    teamId: string;
    userId: string;
    title: string;
    message?: string;
    type?: string;
    link?: string;
  }) {
    return prisma.notification.create({ data });
  }

  async createForTeam(teamId: string, excludeUserId: string, data: {
    title: string;
    message?: string;
    type?: string;
    link?: string;
  }) {
    const members = await prisma.teamMember.findMany({
      where: { teamId, userId: { not: excludeUserId } },
      select: { userId: true },
    });

    if (members.length === 0) return [];

    await prisma.notification.createMany({
      data: members.map((m) => ({
        teamId,
        userId: m.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        link: data.link,
      })),
    });

    return prisma.notification.findMany({
      where: { teamId, userId: { in: members.map((m) => m.userId) } },
      orderBy: { createdAt: 'desc' },
      take: members.length,
    });
  }

  async findByUser(teamId: string, userId: string) {
    return prisma.notification.findMany({
      where: { teamId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(teamId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { teamId, userId, read: false },
      data: { read: true },
    });
  }

  async delete(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }
}

export const notificationService = new NotificationService();
