import { prisma } from '../../lib/prisma.js';
import type { TeamRole } from '@prisma/client';

class ProjectService {
  async listProjects(teamId: string) {
    return prisma.project.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { tasks: true, brainstormSessions: true, diagrams: true, goals: true, notes: true, members: true },
        },
        creator: { select: { id: true, name: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          take: 5,
        },
      },
    });
  }

  async getProject(projectId: string) {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: { tasks: true, brainstormSessions: true, diagrams: true, goals: true, notes: true, sprintPlans: true, members: true },
        },
        creator: { select: { id: true, name: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
  }

  async createProject(teamId: string, userId: string, data: { name: string; description?: string; color?: string; icon?: string }) {
    // Create the project and auto-add the creator as OWNER member
    return prisma.project.create({
      data: {
        teamId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        color: data.color || '#7b68ee',
        icon: data.icon || 'folder',
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: {
        _count: {
          select: { tasks: true, brainstormSessions: true, diagrams: true, goals: true, notes: true, members: true },
        },
        creator: { select: { id: true, name: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
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

  // ── Project Member Management ──

  async getProjectMembers(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addProjectMember(projectId: string, userId: string, role: TeamRole = 'MEMBER') {
    // Check if user is already a member
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) throw new Error('User is already a member of this project');

    return prisma.projectMember.create({
      data: { projectId, userId, role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async updateProjectMemberRole(projectId: string, userId: string, role: TeamRole) {
    return prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async removeProjectMember(projectId: string, userId: string) {
    // Don't allow removing the last OWNER
    const owners = await prisma.projectMember.count({ where: { projectId, role: 'OWNER' } });
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (member?.role === 'OWNER' && owners <= 1) {
      throw new Error('Cannot remove the last owner of the project');
    }
    return prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async getAvailableTeamMembers(projectId: string, teamId: string) {
    // Get team members who are NOT already in this project
    const projectMemberIds = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });
    const existingIds = projectMemberIds.map(m => m.userId);

    return prisma.teamMember.findMany({
      where: {
        teamId,
        userId: { notIn: existingIds },
      },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }
}

export const projectService = new ProjectService();
