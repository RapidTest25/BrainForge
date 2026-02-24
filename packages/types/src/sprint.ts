// ═══════════════════════════════════════════
// Sprint Types
// ═══════════════════════════════════════════

export type SprintStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface SprintPlan {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  goal: string;
  deadline: string;
  teamSize: number;
  status: SprintStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}
