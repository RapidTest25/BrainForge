import { randomBytes } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import type { CreateTeamInput, UpdateTeamInput, InviteMemberInput } from '@brainforge/validators';

export class TeamService {
  async create(input: CreateTeamInput, userId: string) {
    const team = await prisma.team.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count: { select: { members: true } },
      },
    });
    return team;
  }

  async autoCreatePersonalTeam(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return prisma.team.create({
      data: {
        name: `${user?.name || 'My'}'s Team`,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });
  }

  async findUserTeams(userId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.team, role: m.role }));
  }

  async findById(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true } },
      },
    });
    if (!team) throw new NotFoundError('Team');
    return team;
  }

  async update(teamId: string, input: UpdateTeamInput) {
    return prisma.team.update({
      where: { id: teamId },
      data: input,
      include: { _count: { select: { members: true } } },
    });
  }

  async delete(teamId: string, userId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundError('Team');
    if (team.ownerId !== userId) throw new ForbiddenError('Only team owner can delete');
    await prisma.team.delete({ where: { id: teamId } });
  }

  async invite(teamId: string, input: InviteMemberInput, inviterId: string) {
    // Check if already member
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      const existingMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: existingUser.id } },
      });
      if (existingMember) throw new ConflictError('User is already a team member');
    }

    // Check pending invite
    const pendingInvite = await prisma.teamInvitation.findFirst({
      where: { teamId, email: input.email, status: 'PENDING' },
    });
    if (pendingInvite) throw new ConflictError('Invitation already sent');

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return prisma.teamInvitation.create({
      data: {
        teamId,
        email: input.email,
        invitedBy: inviterId,
        role: input.role as any,
        token,
        expiresAt,
      },
    });
  }

  async generateInviteLink(teamId: string, inviterId: string, role: string = 'MEMBER') {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email: `invite-link-${token.slice(0, 8)}@open`,
        invitedBy: inviterId,
        role: role as any,
        token,
        expiresAt,
      },
    });

    return { token: invitation.token, expiresAt: invitation.expiresAt };
  }

  async acceptInvite(token: string, userId: string) {
    const invitation = await prisma.teamInvitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundError('Invitation');
    if (invitation.status !== 'PENDING') throw new ConflictError('Invitation is no longer valid');
    if (invitation.expiresAt < new Date()) throw new ConflictError('Invitation has expired');

    const isOpenInvite = invitation.email.endsWith('@open');

    if (!isOpenInvite) {
      // Check user email matches for email-specific invites
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.email !== invitation.email) {
        throw new ForbiddenError('This invitation is for a different email');
      }
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: invitation.teamId, userId } },
    });
    if (existingMember) throw new ConflictError('You are already a member of this team');

    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId,
          role: invitation.role,
        },
      }),
      // Only mark as accepted for email-specific invites; open links stay PENDING for reuse
      ...(isOpenInvite ? [] : [
        prisma.teamInvitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        }),
      ]),
    ]);

    return this.findById(invitation.teamId);
  }

  async removeMember(teamId: string, targetUserId: string, requesterId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundError('Team');
    if (targetUserId === team.ownerId) throw new ForbiddenError('Cannot remove team owner');

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
  }

  async updateMemberRole(teamId: string, targetUserId: string, role: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundError('Team');
    if (targetUserId === team.ownerId) throw new ForbiddenError('Cannot change owner role');

    return prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      data: { role: role as any },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }
}

export const teamService = new TeamService();
