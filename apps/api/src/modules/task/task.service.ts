import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { notificationService } from '../notification/notification.service.js';
import type { CreateTaskInput, UpdateTaskInput, TaskFiltersInput } from '@brainforge/validators';
import type { Prisma } from '@prisma/client';

const TASK_INCLUDE = {
  assignees: {
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  },
  labels: { include: { label: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

export class TaskService {
  async create(teamId: string, input: CreateTaskInput, userId: string) {
    // Get max orderIndex
    const maxOrder = await prisma.task.aggregate({
      where: { teamId },
      _max: { orderIndex: true },
    });

    const task = await prisma.task.create({
      data: {
        teamId,
        title: input.title,
        description: input.description,
        status: input.status as any,
        priority: input.priority as any,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        estimation: input.estimation,
        sprintId: input.sprintId,
        createdBy: userId,
        orderIndex: (maxOrder._max.orderIndex ?? 0) + 1,
        assignees: input.assigneeIds
          ? { create: input.assigneeIds.map((uid) => ({ userId: uid })) }
          : undefined,
        labels: input.labelIds
          ? { create: input.labelIds.map((lid) => ({ labelId: lid })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    });

    // Log activity
    await prisma.taskActivity.create({
      data: { taskId: task.id, userId, action: 'created', newValue: task.title },
    });

    // Notify team members
    try {
      await notificationService.createForTeam(teamId, userId, {
        title: 'New Task Created',
        message: `"${task.title}" was created`,
        type: 'task',
        link: `/tasks?task=${task.id}`,
      });
    } catch {}

    return task;
  }

  async findByTeam(teamId: string, filters?: TaskFiltersInput) {
    const where: Prisma.TaskWhereInput = { teamId };

    if (filters?.status?.length) {
      where.status = { in: filters.status as any };
    }
    if (filters?.priority?.length) {
      where.priority = { in: filters.priority as any };
    }
    if (filters?.assigneeId) {
      where.assignees = { some: { userId: filters.assigneeId } };
    }
    if (filters?.labelId) {
      where.labels = { some: { labelId: filters.labelId } };
    }
    if (filters?.sprintId) {
      where.sprintId = filters.sprintId;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.TaskOrderByWithRelationInput = {};
    if (filters?.sortBy) {
      orderBy[filters.sortBy] = filters?.sortOrder ?? 'asc';
    } else {
      orderBy.orderIndex = 'asc';
    }

    return prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy,
    });
  }

  async findById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        ...TASK_INCLUDE,
        comments: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!task) throw new NotFoundError('Task');
    return task;
  }

  async update(taskId: string, input: UpdateTaskInput, userId: string) {
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) throw new NotFoundError('Task');

    const data: Prisma.TaskUpdateInput = {};
    const activities: { action: string; oldValue: string | null; newValue: string | null }[] = [];

    if (input.title !== undefined) {
      data.title = input.title;
      activities.push({ action: 'title_changed', oldValue: existing.title, newValue: input.title });
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) {
      data.status = input.status as any;
      activities.push({ action: 'status_changed', oldValue: existing.status, newValue: input.status });
      if (input.status === 'DONE') data.completedAt = new Date();
      else data.completedAt = null;
    }
    if (input.priority !== undefined) {
      data.priority = input.priority as any;
      activities.push({ action: 'priority_changed', oldValue: existing.priority, newValue: input.priority });
    }
    if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.estimation !== undefined) data.estimation = input.estimation;
    if (input.sprintId !== undefined) data.sprint = input.sprintId ? { connect: { id: input.sprintId } } : { disconnect: true };
    if (input.orderIndex !== undefined) data.orderIndex = input.orderIndex;

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: TASK_INCLUDE,
    });

    // Log activities
    if (activities.length > 0) {
      await prisma.taskActivity.createMany({
        data: activities.map((a) => ({ taskId, userId, ...a })),
      });

      // Notify team about important changes
      try {
        const statusChange = activities.find((a) => a.action === 'status_changed');
        if (statusChange) {
          await notificationService.createForTeam(existing.teamId, userId, {
            title: 'Task Updated',
            message: `"${task.title}" status changed to ${statusChange.newValue}`,
            type: 'task',
            link: `/tasks?task=${taskId}`,
          });
        }
      } catch {}
    }

    return task;
  }

  async updateAssignees(taskId: string, assigneeIds: string[], userId: string) {
    await prisma.taskAssignee.deleteMany({ where: { taskId } });
    if (assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: assigneeIds.map((uid) => ({ taskId, userId: uid })),
      });
    }
    return this.findById(taskId);
  }

  async delete(taskId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError('Task');
    await prisma.task.delete({ where: { id: taskId } });
  }

  async addComment(taskId: string, userId: string, content: string) {
    const comment = await prisma.taskComment.create({
      data: { taskId, userId, content },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await prisma.taskActivity.create({
      data: { taskId, userId, action: 'comment_added', newValue: content.slice(0, 200) },
    });

    // Notify team about comment
    try {
      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { teamId: true, title: true } });
      if (task) {
        await notificationService.createForTeam(task.teamId, userId, {
          title: 'New Comment',
          message: `Comment on "${task.title}": ${content.slice(0, 100)}`,
          type: 'comment',
          link: `/tasks?task=${taskId}`,
        });
      }
    } catch {}

    return comment;
  }

  async getComments(taskId: string) {
    return prisma.taskComment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reorder(tasks: { id: string; orderIndex: number; status?: string }[]) {
    await prisma.$transaction(
      tasks.map((t) =>
        prisma.task.update({
          where: { id: t.id },
          data: {
            orderIndex: t.orderIndex,
            ...(t.status ? { status: t.status as any } : {}),
          },
        }),
      ),
    );
  }

  // Labels
  async createLabel(teamId: string, name: string, color: string) {
    return prisma.label.create({ data: { teamId, name, color } });
  }

  async getLabels(teamId: string) {
    return prisma.label.findMany({ where: { teamId }, orderBy: { name: 'asc' } });
  }

  // My tasks across all teams
  async findMyTasks(userId: string) {
    return prisma.task.findMany({
      where: {
        assignees: { some: { userId } },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      include: {
        ...TASK_INCLUDE,
        team: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });
  }
}

export const taskService = new TaskService();
