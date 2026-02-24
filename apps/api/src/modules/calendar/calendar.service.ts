import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

class CalendarService {
  async create(teamId: string, userId: string, data: {
    title: string; type: string; startDate: string; endDate?: string;
    allDay?: boolean; color?: string; description?: string;
  }) {
    return prisma.calendarEvent.create({
      data: {
        teamId,
        createdBy: userId,
        title: data.title,
        type: data.type as any,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        allDay: data.allDay ?? false,
        color: data.color,
        description: data.description,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async findByTeam(teamId: string, start?: string, end?: string) {
    const where: any = { teamId };
    if (start && end) {
      where.startDate = { gte: new Date(start) };
      where.endDate = { lte: new Date(end) };
      // Also get events that overlap the range
      where.OR = [
        { startDate: { gte: new Date(start), lte: new Date(end) } },
        { endDate: { gte: new Date(start), lte: new Date(end) } },
        { AND: [{ startDate: { lte: new Date(start) } }, { endDate: { gte: new Date(end) } }] },
      ];
      delete where.startDate;
      delete where.endDate;
    }
    return prisma.calendarEvent.findMany({
      where,
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { startDate: 'asc' },
    });
  }

  async findById(eventId: string) {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!event) throw new NotFoundError('Calendar event not found');
    return event;
  }

  async update(eventId: string, data: any) {
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async delete(eventId: string) {
    await prisma.calendarEvent.delete({ where: { id: eventId } });
  }

  // Aggregated feed: events + task deadlines + sprint deadlines
  async getAggregatedFeed(teamId: string, start: string, end: string) {
    const [events, tasks, sprints] = await Promise.all([
      this.findByTeam(teamId, start, end),
      prisma.task.findMany({
        where: {
          teamId,
          dueDate: { gte: new Date(start), lte: new Date(end) },
        },
        select: { id: true, title: true, dueDate: true, priority: true, status: true },
      }),
      prisma.sprintPlan.findMany({
        where: {
          teamId,
          deadline: { gte: new Date(start), lte: new Date(end) },
        },
        select: { id: true, title: true, deadline: true, status: true },
      }),
    ]);

    const taskEvents = tasks.map(t => ({
      id: `task-${t.id}`,
      title: `📋 ${t.title}`,
      startDate: t.dueDate,
      endDate: t.dueDate,
      type: 'DEADLINE' as const,
      allDay: true,
      color: t.priority === 'CRITICAL' ? '#ef4444' : t.priority === 'HIGH' ? '#f97316' : '#3b82f6',
      meta: { type: 'task', id: t.id, status: t.status },
    }));

    const sprintEvents = sprints.map(s => ({
      id: `sprint-${s.id}`,
      title: `🏃 ${s.title}`,
      startDate: s.deadline,
      endDate: s.deadline,
      type: 'SPRINT' as const,
      allDay: true,
      color: '#8b5cf6',
      meta: { type: 'sprint', id: s.id, status: s.status },
    }));

    return [...events, ...taskEvents, ...sprintEvents];
  }
}

export const calendarService = new CalendarService();
