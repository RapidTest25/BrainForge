// ═══════════════════════════════════════════
// Calendar Types
// ═══════════════════════════════════════════

export type EventType =
  | 'TASK_DEADLINE'
  | 'SPRINT_MILESTONE'
  | 'BRAINSTORM_SESSION'
  | 'CUSTOM_EVENT'
  | 'MEETING';

export interface CalendarEvent {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  description: string | null;
  type: EventType;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  color: string | null;
  taskId: string | null;
  sprintId: string | null;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

// FullCalendar-compatible event
export interface CalendarEventInput {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color?: string;
  extendedProps: {
    type: EventType;
    description?: string;
    taskId?: string;
    sprintId?: string;
  };
}
