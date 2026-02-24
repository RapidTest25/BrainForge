// ═══════════════════════════════════════════
// Brainstorm Types
// ═══════════════════════════════════════════

export type BrainstormMode =
  | 'IDEA_GENERATOR'
  | 'FEATURE_BREAKDOWN'
  | 'PROJECT_ROADMAP'
  | 'ARCHITECTURE_LITE';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface BrainstormSession {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  mode: BrainstormMode;
  context: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  _count?: {
    messages: number;
  };
}

export interface BrainstormMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export interface BrainstormSessionWithMessages extends BrainstormSession {
  messages: BrainstormMessage[];
}
