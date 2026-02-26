'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  List, LayoutGrid, Plus, Search, MoreHorizontal, Calendar as CalendarIcon,
  Trash2, ArrowUpCircle, ArrowRightCircle, CheckCircle2, X, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { TaskDetailPanel } from '@/components/task-detail-panel';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_COLUMNS = [
  { key: 'TODO', label: 'To Do', color: '#9ca3af', dotColor: '#9ca3af' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6', dotColor: '#3b82f6' },
  { key: 'IN_REVIEW', label: 'In Review', color: '#f59e0b', dotColor: '#f59e0b' },
  { key: 'DONE', label: 'Done', color: '#22c55e', dotColor: '#22c55e' },
];

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent', color: '#ef4444' },
  { value: 'HIGH', label: 'High', color: '#f97316' },
  { value: 'MEDIUM', label: 'Medium', color: '#f59e0b' },
  { value: 'LOW', label: 'Low', color: '#6b7280' },
];

export default function TasksPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'board'>('board');
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'MEDIUM', status: 'TODO' });
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreateDialog(true);
  }, [searchParams]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', teamId, search],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/tasks${search ? `?search=${search}` : ''}`),
    enabled: !!teamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      setShowCreateDialog(false);
      setNewTask({ title: '', description: '', priority: 'MEDIUM', status: 'TODO' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      api.patch(`/teams/${teamId}/tasks/${taskId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      if (selectedTask && selectedTask.id === variables.taskId) {
        setSelectedTask((prev: any) => prev ? { ...prev, ...variables.data } : null);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => api.delete(`/teams/${teamId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      setSelectedTask(null);
      toast.success('Task deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });

  const taskList = tasks?.data || [];

  // Sync selectedTask with latest data
  useEffect(() => {
    if (selectedTask) {
      const updated = taskList.find((t: any) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [taskList]);

  const getTasksByStatus = (status: string) =>
    taskList.filter((t: any) => t.status === status);

  const getPriorityColor = (priority: string) =>
    PRIORITY_OPTIONS.find(p => p.value === priority)?.color || '#6b7280';

  const handleTaskClick = (task: any, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) return;
    setSelectedTask(task);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#1a1a2e]">Tasks</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              className="pl-8 h-8 w-40 sm:w-52 text-[13px] bg-white border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={cn(
                'h-8 w-8 flex items-center justify-center transition-colors',
                view === 'list' ? 'bg-[#7b68ee]/8 text-[#7b68ee]' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('board')}
              className={cn(
                'h-8 w-8 flex items-center justify-center border-l border-gray-200 transition-colors',
                view === 'board' ? 'bg-[#7b68ee]/8 text-[#7b68ee]' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="sm"
            className="h-8 text-xs bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Board View */}
      {view === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 h-[calc(100vh-10rem)] overflow-x-auto">
          {STATUS_COLUMNS.map(({ key, label, color, dotColor }) => (
            <div key={key} className="flex flex-col rounded-xl bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
                <span className="text-[13px] font-medium text-gray-700">{label}</span>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-auto">
                  {getTasksByStatus(key).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {getTasksByStatus(key).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={(e) => handleTaskClick(task, e)}
                    className={cn(
                      'bg-white rounded-lg border p-3 hover:shadow-md transition-all group relative cursor-pointer',
                      selectedTask?.id === task.id
                        ? 'border-[#7b68ee] ring-1 ring-[#7b68ee]/20 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200'
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-[#1a1a2e] flex-1 pr-2">{task.title}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            data-dropdown-trigger
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-[13px]">
                              <ArrowRightCircle className="h-3.5 w-3.5 mr-2" /> Move to
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {STATUS_COLUMNS.filter(s => s.key !== task.status).map(s => (
                                <DropdownMenuItem
                                  key={s.key}
                                  className="text-[13px]"
                                  onClick={() => updateMutation.mutate({ taskId: task.id, data: { status: s.key } })}
                                >
                                  <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: s.dotColor }} />
                                  {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-[13px]">
                              <ArrowUpCircle className="h-3.5 w-3.5 mr-2" /> Priority
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {PRIORITY_OPTIONS.filter(p => p.value !== task.priority).map(p => (
                                <DropdownMenuItem
                                  key={p.value}
                                  className="text-[13px]"
                                  onClick={() => updateMutation.mutate({ taskId: task.id, data: { priority: p.value } })}
                                >
                                  <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                                  {p.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {task.status !== 'DONE' && (
                            <DropdownMenuItem
                              className="text-[13px]"
                              onClick={() => updateMutation.mutate({ taskId: task.id, data: { status: 'DONE' } })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> Mark Done
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-[13px] text-red-500 focus:text-red-600"
                            onClick={() => deleteMutation.mutate(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          color: getPriorityColor(task.priority),
                          backgroundColor: `${getPriorityColor(task.priority)}12`
                        }}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5',
                          new Date(task.dueDate) < new Date() ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-100'
                        )}>
                          <CalendarIcon className="h-2.5 w-2.5" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  className="w-full py-1.5 text-[12px] text-gray-400 hover:text-[#7b68ee] hover:bg-[#7b68ee]/5 rounded-lg transition-colors flex items-center justify-center gap-1"
                  onClick={() => {
                    setNewTask({ ...newTask, status: key });
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Add task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="grid-cols-[1fr_110px_90px_110px_40px] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:grid">
            <span>Task</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Due Date</span>
            <span></span>
          </div>
          {taskList.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No tasks yet</p>
            </div>
          ) : (
            taskList.map((task: any) => {
              return (
                <div
                  key={task.id}
                  onClick={(e) => handleTaskClick(task, e)}
                  className={cn(
                    'grid grid-cols-1 md:grid-cols-[1fr_110px_90px_110px_40px] gap-2 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors items-center cursor-pointer',
                    selectedTask?.id === task.id && 'bg-[#7b68ee]/5 border-l-2 border-l-[#7b68ee]'
                  )}
                >
                  <div>
                    <p className="text-sm text-[#1a1a2e]">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-400 truncate max-w-sm">{task.description}</p>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={task.status}
                      onValueChange={(v) => updateMutation.mutate({ taskId: task.id, data: { status: v } })}
                    >
                      <SelectTrigger className="h-7 text-[11px] border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_COLUMNS.map(s => (
                          <SelectItem key={s.key} value={s.key} className="text-[13px]">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full w-fit"
                    style={{
                      color: getPriorityColor(task.priority),
                      backgroundColor: `${getPriorityColor(task.priority)}12`
                    }}
                  >
                    {task.priority}
                  </span>
                  <span className="text-xs text-gray-400">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-[13px]">
                            <ArrowUpCircle className="h-3.5 w-3.5 mr-2" /> Priority
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {PRIORITY_OPTIONS.filter(p => p.value !== task.priority).map(p => (
                              <DropdownMenuItem
                                key={p.value}
                                className="text-[13px]"
                                onClick={() => updateMutation.mutate({ taskId: task.id, data: { priority: p.value } })}
                              >
                                <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                                {p.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {task.status !== 'DONE' && (
                          <DropdownMenuItem
                            className="text-[13px]"
                            onClick={() => updateMutation.mutate({ taskId: task.id, data: { status: 'DONE' } })}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> Mark Done
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-[13px] text-red-500 focus:text-red-600"
                          onClick={() => deleteMutation.mutate(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Task Detail Side Panel */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <SheetContent side="right" hideClose className="w-full sm:w-[420px] md:w-[480px] p-0 border-l border-gray-200">
          {selectedTask && (
            <TaskDetailPanel
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onUpdate={(taskId, data) => updateMutation.mutate({ taskId, data })}
              onDelete={(taskId) => deleteMutation.mutate(taskId)}
              isUpdating={updateMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a2e] flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-[#7b68ee]/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-[#7b68ee]" />
              </div>
              Create Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-600">Title</label>
              <Input
                placeholder="e.g. Implement user dashboard"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="border-gray-200 focus:border-[#7b68ee] rounded-xl h-11 text-sm"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-600">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <Textarea
                placeholder="Describe the task in detail..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="border-gray-200 focus:border-[#7b68ee] rounded-xl min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Status & Priority row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-600">Status</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_COLUMNS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setNewTask({ ...newTask, status: s.key })}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-medium rounded-xl border-2 transition-all',
                        newTask.status === s.key
                          ? 'border-[#7b68ee] bg-[#7b68ee]/5'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-600">Priority</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setNewTask({ ...newTask, priority: p.value })}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-medium rounded-xl border-2 transition-all',
                        newTask.priority === p.value
                          ? 'border-[#7b68ee] bg-[#7b68ee]/5'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-600">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
              <Input
                type="date"
                value={(newTask as any).dueDate || ''}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value } as any)}
                className="border-gray-200 focus:border-[#7b68ee] rounded-xl h-10"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowCreateDialog(false)} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => createMutation.mutate(newTask)}
              disabled={!newTask.title || createMutation.isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Task
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
