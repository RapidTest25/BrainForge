import { prisma } from '../../lib/prisma.js';

class ProjectService {
  async listProjects(teamId: string) {
    return prisma.project.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { tasks: true, brainstormSessions: true, diagrams: true, goals: true, notes: true },
        },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async getProject(projectId: string) {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: { tasks: true, brainstormSessions: true, diagrams: true, goals: true, notes: true, sprintPlans: true },
        },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async createProject(teamId: string, userId: string, data: { name: string; description?: string; color?: string; icon?: string }) {
    return prisma.project.create({
      data: {
        teamId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        color: data.color || '#7b68ee',
        icon: data.icon || 'folder',
      },
      include: {
        _count: {
          select: { tasks: true, brainstormSessions: true, diagrams: true, goals: true, notes: true },
        },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async updateProject(projectId: string, userId: string, data: { name?: string; description?: string; color?: string; icon?: string }) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');
    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
      },
    });
  }

  async deleteProject(projectId: string) {
    // First, disconnect all items from this project (set projectId to null)
    await Promise.all([
      prisma.task.updateMany({ where: { projectId }, data: { projectId: null } }),
      prisma.brainstormSession.updateMany({ where: { projectId }, data: { projectId: null } }),
      prisma.sprintPlan.updateMany({ where: { projectId }, data: { projectId: null } }),
      prisma.note.updateMany({ where: { projectId }, data: { projectId: null } }),
      prisma.diagram.updateMany({ where: { projectId }, data: { projectId: null } }),
      prisma.goal.updateMany({ where: { projectId }, data: { projectId: null } }),
      prisma.aiChat.updateMany({ where: { projectId }, data: { projectId: null } }),
    ]);
    return prisma.project.delete({ where: { id: projectId } });
  }
}

export const projectService = new ProjectService();
