'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Calendar as CalendarIcon, Clock, User, MessageSquare,
  CheckCircle2, ArrowUpCircle, Trash2, Loader2, Flag, AlignLeft,
  ChevronRight, PencilLine, Save, Send, Activity, GitCommitHorizontal,
  ArrowRightLeft, Type, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeamStore } from '@/stores/team-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { key: 'TODO', label: 'To Do', color: '#9ca3af', bg: '#9ca3af15' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6', bg: '#3b82f615' },
  { key: 'IN_REVIEW', label: 'In Review', color: '#f59e0b', bg: '#f59e0b15' },
  { key: 'DONE', label: 'Done', color: '#22c55e', bg: '#22c55e15' },
];

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent', color: '#ef4444', bg: '#ef444415' },
  { value: 'HIGH', label: 'High', color: '#f97316', bg: '#f9731615' },
  { value: 'MEDIUM', label: 'Medium', color: '#f59e0b', bg: '#f59e0b15' },
  { value: 'LOW', label: 'Low', color: '#6b7280', bg: '#6b728015' },
];

interface TaskDetailPanelProps {
  task: any;
  onClose: () => void;
  onUpdate: (taskId: string, data: any) => void;
  onDelete: (taskId: string) => void;
  isUpdating?: boolean;
}

export function TaskDetailPanel({ task, onClose, onUpdate, onDelete, isUpdating }: TaskDetailPanelProps) {
  const { activeTeam } = useTeamStore();
  const { user } = useAuthStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details');
  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setIsEditingTitle(false);
    setIsEditingDesc(false);
    setShowDeleteConfirm(false);
  }, [task.id, task.title, task.description]);

  // Fetch comments
  const { data: commentsData, isLoading: loadingComments } = useQuery({
    queryKey: ['task-comments', teamId, task.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/tasks/${task.id}/comments`),
    enabled: !!teamId && !!task.id,
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/teams/${teamId}/tasks/${task.id}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', teamId, task.id] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', teamId, task.id] });
      setCommentText('');
    },
  });

  // Fetch activities
  const { data: activitiesData, isLoading: loadingActivities } = useQuery({
    queryKey: ['task-activities', teamId, task.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/tasks/${task.id}/activities`),
    enabled: !!teamId && !!task.id,
  });

  const activities = activitiesData?.data || [];

  const comments = commentsData?.data || [];

  useEffect(() => {
    if (activeTab === 'comments') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, activeTab]);

  const statusInfo = STATUS_OPTIONS.find(s => s.key === task.status) || STATUS_OPTIONS[0];
  const priorityInfo = PRIORITY_OPTIONS.find(p => p.value === task.priority) || PRIORITY_OPTIONS[3];

  const handleSaveTitle = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDesc = () => {
    if (description !== (task.description || '')) {
      onUpdate(task.id, { description });
    }
    setIsEditingDesc(false);
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText.trim());
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Tasks</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-muted-foreground font-medium truncate max-w-[200px]">{task.title}</span>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 px-5 pt-3 pb-1">
        <button
          onClick={() => setActiveTab('details')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            activeTab === 'details'
              ? 'bg-[#7b68ee]/10 text-[#7b68ee]'
              : 'text-muted-foreground hover:text-muted-foreground hover:bg-accent'
          )}
        >
          <AlignLeft className="h-3.5 w-3.5" />
          Details
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            activeTab === 'comments'
              ? 'bg-[#7b68ee]/10 text-[#7b68ee]'
              : 'text-muted-foreground hover:text-muted-foreground hover:bg-accent'
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Discussion
          {comments.length > 0 && (
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-0.5">
              {comments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            activeTab === 'activity'
              ? 'bg-[#7b68ee]/10 text-[#7b68ee]'
              : 'text-muted-foreground hover:text-muted-foreground hover:bg-accent'
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          Activity
          {activities.length > 0 && (
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-0.5">
              {activities.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <div className="px-5 py-4 space-y-5">
            {/* Title */}
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg font-semibold border-border focus:border-[#7b68ee] rounded-xl"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') { setTitle(task.title); setIsEditingTitle(false); }
                    }}
                  />
                  <Button size="sm" onClick={handleSaveTitle} className="h-8 bg-[#7b68ee] hover:bg-[#6c5ce7] rounded-lg">
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-lg font-bold text-foreground hover:text-[#7b68ee] transition-colors text-left w-full group flex items-center gap-2"
                >
                  <span>{task.title}</span>
                  <PencilLine className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Status & Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Flag className="h-3 w-3" /> Status
                </label>
                <Select value={task.status} onValueChange={(v) => onUpdate(task.id, { status: v })}>
                  <SelectTrigger className="h-9 text-[13px] border-border rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusInfo.color }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.key} value={s.key} className="text-[13px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <ArrowUpCircle className="h-3 w-3" /> Priority
                </label>
                <Select value={task.priority} onValueChange={(v) => onUpdate(task.id, { priority: v })}>
                  <SelectTrigger className="h-9 text-[13px] border-border rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priorityInfo.color }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-[13px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <CalendarIcon className="h-3 w-3" /> Due Date
              </label>
              {task.dueDate ? (
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
                  new Date(task.dueDate) < new Date()
                    ? 'border-red-200 bg-red-500/10 text-red-600'
                    : 'border-border bg-muted text-foreground/80'
                )}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {new Date(task.dueDate).toLocaleDateString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                  })}
                  {new Date(task.dueDate) < new Date() && (
                    <Badge variant="secondary" className="ml-auto text-[10px] bg-red-100 text-red-600 border-0">
                      Overdue
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-3 py-2">No due date set</p>
              )}
            </div>

            {/* Assignee */}
            {task.assignee && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <User className="h-3 w-3" /> Assignee
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white">
                      {task.assignee.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground/80">{task.assignee.name}</span>
                </div>
              </div>
            )}

            <div className="border-t border-border" />

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <AlignLeft className="h-3 w-3" /> Description
                </label>
                {!isEditingDesc && (
                  <button onClick={() => setIsEditingDesc(true)} className="text-xs text-[#7b68ee] hover:underline font-medium">
                    Edit
                  </button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="min-h-[120px] text-sm border-border focus:border-[#7b68ee] rounded-xl"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveDesc} className="h-7 text-xs bg-[#7b68ee] hover:bg-[#6c5ce7] rounded-lg">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDescription(task.description || ''); setIsEditingDesc(false); }} className="h-7 text-xs">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className={cn(
                    'rounded-xl p-3 min-h-[80px] text-sm cursor-pointer transition-colors',
                    task.description
                      ? 'bg-muted text-foreground/80 hover:bg-accent'
                      : 'border border-dashed border-border text-muted-foreground hover:border-border'
                  )}
                >
                  {task.description || 'Click to add a description...'}
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Activity Summary */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Clock className="h-3 w-3" /> Timeline
              </label>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <span>Created {timeAgo(task.createdAt)}</span>
                </div>
                {task.updatedAt && task.updatedAt !== task.createdAt && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span>Updated {timeAgo(task.updatedAt)}</span>
                  </div>
                )}
                {activities.length > 0 && (
                  <button 
                    onClick={() => setActiveTab('activity')} 
                    className="text-[#7b68ee] hover:underline font-medium mt-1"
                  >
                    View {activities.length} activities →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comments/Discussion Tab */}
        {activeTab === 'comments' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingComments && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
                </div>
              )}
              {!loadingComments && comments.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No comments yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Start a discussion about this task</p>
                </div>
              )}
              {comments.map((comment: any) => {
                const isOwn = comment.user?.id === user?.id || comment.userId === user?.id;
                return (
                  <div key={comment.id} className={cn('flex gap-2.5', isOwn ? 'flex-row-reverse' : '')}>
                    <div className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                      isOwn ? 'bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7]' : 'bg-muted'
                    )}>
                      <span className={cn('text-[10px] font-bold', isOwn ? 'text-white' : 'text-muted-foreground')}>
                        {(comment.user?.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5',
                      isOwn
                        ? 'bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white'
                        : 'bg-muted text-foreground'
                    )}>
                      <p className={cn('text-[11px] font-semibold mb-0.5', isOwn ? 'text-white/80' : 'text-muted-foreground')}>
                        {comment.user?.name || 'User'}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      <p className={cn('text-[10px] mt-1.5', isOwn ? 'text-white/50' : 'text-muted-foreground')}>
                        {timeAgo(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment input */}
            <div className="px-5 py-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  className="border-border focus:border-[#7b68ee] rounded-xl text-sm"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-[#7b68ee] text-white hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
                >
                  {addCommentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="px-5 py-4">
            {loadingActivities && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
              </div>
            )}
            {!loadingActivities && activities.length === 0 && (
              <div className="text-center py-12">
                <Activity className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Changes to this task will appear here</p>
              </div>
            )}
            {activities.length > 0 && (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[13px] top-3 bottom-3 w-px bg-border" />
                <div className="space-y-4">
                  {activities.map((act: any) => {
                    const actionConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
                      'created': { icon: CheckCircle2, color: '#22c55e', bg: '#22c55e15', label: 'created this task' },
                      'status_changed': { icon: ArrowRightLeft, color: '#3b82f6', bg: '#3b82f615', label: 'changed status' },
                      'priority_changed': { icon: Flag, color: '#f59e0b', bg: '#f59e0b15', label: 'changed priority' },
                      'title_changed': { icon: Type, color: '#8b5cf6', bg: '#8b5cf615', label: 'renamed task' },
                      'comment_added': { icon: MessageSquare, color: '#7b68ee', bg: '#7b68ee15', label: 'commented' },
                      'assignee_changed': { icon: User, color: '#06b6d4', bg: '#06b6d415', label: 'changed assignee' },
                      'description_changed': { icon: AlignLeft, color: '#6b7280', bg: '#6b728015', label: 'updated description' },
                    };
                    const config = actionConfig[act.action] || { icon: GitCommitHorizontal, color: '#9ca3af', bg: '#9ca3af15', label: act.action?.replace(/_/g, ' ') || 'updated' };
                    const IconComp = config.icon;

                    const statusLabel = (val: string) => {
                      const s = STATUS_OPTIONS.find(s => s.key === val);
                      return s ? s.label : val;
                    };
                    const priorityLabel = (val: string) => {
                      const p = PRIORITY_OPTIONS.find(p => p.value === val);
                      return p ? p.label : val;
                    };

                    return (
                      <div key={act.id} className="flex gap-3 relative">
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 ring-2 ring-white"
                          style={{ backgroundColor: config.bg }}
                        >
                          <IconComp className="h-3.5 w-3.5" style={{ color: config.color }} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-foreground/80">
                              {act.user?.name || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">{config.label}</span>
                          </div>
                          {/* Show old → new values for changes */}
                          {act.action === 'status_changed' && act.oldValue && act.newValue && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_OPTIONS.find(s => s.key === act.oldValue)?.color || '#9ca3af' }} />
                                {statusLabel(act.oldValue)}
                              </span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ backgroundColor: STATUS_OPTIONS.find(s => s.key === act.newValue)?.bg || 'transparent', color: STATUS_OPTIONS.find(s => s.key === act.newValue)?.color || '#6b7280' }}>
                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_OPTIONS.find(s => s.key === act.newValue)?.color || '#9ca3af' }} />
                                {statusLabel(act.newValue)}
                              </span>
                            </div>
                          )}
                          {act.action === 'priority_changed' && act.oldValue && act.newValue && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
                                {priorityLabel(act.oldValue)}
                              </span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ backgroundColor: PRIORITY_OPTIONS.find(p => p.value === act.newValue)?.bg || 'transparent', color: PRIORITY_OPTIONS.find(p => p.value === act.newValue)?.color || '#6b7280' }}>
                                {priorityLabel(act.newValue)}
                              </span>
                            </div>
                          )}
                          {act.action === 'title_changed' && act.oldValue && act.newValue && (
                            <div className="mt-1 text-[11px]">
                              <span className="line-through text-muted-foreground">{act.oldValue}</span>
                              <span className="mx-1.5 text-muted-foreground/60">→</span>
                              <span className="text-muted-foreground font-medium">{act.newValue}</span>
                            </div>
                          )}
                          {act.action === 'comment_added' && act.newValue && (
                            <p className="mt-1 text-[11px] text-muted-foreground bg-muted rounded-lg px-2.5 py-1.5 border border-border line-clamp-2">
                              &ldquo;{act.newValue}&rdquo;
                            </p>
                          )}
                          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                            {timeAgo(act.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        {task.status !== 'DONE' ? (
          <Button
            size="sm"
            onClick={() => onUpdate(task.id, { status: 'DONE' })}
            className="h-8 text-xs bg-green-500 hover:bg-green-600 text-white gap-1.5 rounded-lg"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Done
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onUpdate(task.id, { status: 'TODO' })}
            variant="outline"
            className="h-8 text-xs gap-1.5 rounded-lg"
          >
            Reopen Task
          </Button>
        )}

        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 font-medium">Delete?</span>
            <Button size="sm" variant="ghost" onClick={() => { onDelete(task.id); onClose(); }} className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10">Yes</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="h-7 text-xs">No</Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-8 text-xs text-muted-foreground hover:text-red-500 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
