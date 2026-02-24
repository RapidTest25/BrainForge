// ═══════════════════════════════════════════
// Task Types (ClickUp-inspired)
// ═══════════════════════════════════════════

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskView = 'list' | 'board' | 'calendar' | 'timeline';
export type TaskGroupBy = 'status' | 'priority' | 'assignee' | 'label' | 'sprint';
export type TaskSortBy = 'priority' | 'dueDate' | 'createdAt' | 'title' | 'status';

export interface Task {
  id: string;
  teamId: string;
  sprintId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: string;
  estimation: number | null;
  timeSpent: number | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  assignees: TaskAssignee[];
  labels: TaskLabelInfo[];
  _count?: {
    comments: number;
  };
}

export interface TaskAssignee {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface Label {
  id: string;
  teamId: string;
  name: string;
  color: string;
}

export interface TaskLabelInfo {
  label: Label;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  labelId?: string;
  sprintId?: string;
  search?: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
  estimation?: number;
  sprintId?: string;
  assigneeIds?: string[];
  labelIds?: string[];
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  estimation?: number | null;
  sprintId?: string | null;
  orderIndex?: number;
}

// Grouped tasks for list view
export interface TaskGroup {
  key: string;
  label: string;
  tasks: Task[];
  color?: string;
}
