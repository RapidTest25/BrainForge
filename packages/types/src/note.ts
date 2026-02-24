// ═══════════════════════════════════════════
// Note Types
// ═══════════════════════════════════════════

export interface Note {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface NoteHistory {
  id: string;
  noteId: string;
  content: string;
  version: number;
  editedBy: string;
  createdAt: string;
}
