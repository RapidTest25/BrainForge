// ═══════════════════════════════════════════
// Diagram Types
// ═══════════════════════════════════════════

export type DiagramType =
  | 'ERD'
  | 'FLOWCHART'
  | 'ARCHITECTURE'
  | 'SEQUENCE'
  | 'MINDMAP'
  | 'USERFLOW'
  | 'FREEFORM'
  | 'COMPONENT';

export interface Diagram {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  type: DiagramType;
  data: DiagramData;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  data?: Record<string, unknown>;
}

// ERD Node data
export interface ERDTableData {
  name: string;
  columns: ERDColumn[];
}

export interface ERDColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string;
  unique?: boolean;
  nullable?: boolean;
}
