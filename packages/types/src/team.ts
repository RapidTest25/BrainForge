// ═══════════════════════════════════════════
// Team Types
// ═══════════════════════════════════════════

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
  };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
}
