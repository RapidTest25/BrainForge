'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target, Plus, CheckCircle2, Circle, Clock, TrendingUp,
  MoreHorizontal, Trash2, Edit2, ChevronRight, Sparkles, Loader2, Search, ChevronDown,
  Calendar, BarChart3, Flag, ArrowUpRight, X, Save,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { useProjectSocket } from '@/hooks/use-project-socket';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

type Goal = {
  id: string;
  title: string;
  description?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  progress: number;
  dueDate?: string;
  createdAt: string;
  creator?: { id: string; name: string; avatarUrl?: string };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  NOT_STARTED: { label: 'Not Started', color: '#6b7280', bg: '#6b728012', icon: Circle },
  IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: '#3b82f612', icon: Clock },
  COMPLETED: { label: 'Completed', color: '#22c55e', bg: '#22c55e12', icon: CheckCircle2 },
  ON_HOLD: { label: 'On Hold', color: '#f59e0b', bg: '#f59e0b12', icon: Clock },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', bg: '#ef444412', icon: X },
};

const STATUS_OPTIONS = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] as const;

function getProgressColor(progress: number) {
  if (progress >= 100) return '#22c55e';
  if (progress >= 60) return '#3b82f6';
  if (progress >= 30) return '#f59e0b';
  return '#7b68ee';
}

function getDueDateInfo(dueDate: string) {
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: '#ef4444' };
  if (diffDays === 0) return { text: 'Due today', color: '#f59e0b' };
  if (diffDays <= 7) return { text: `${diffDays}d left`, color: '#f59e0b' };
  return { text: due.toLocaleDateString(), color: '#6b7280' };
}

export default function GoalsPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { emitEntityChange } = useProjectSocket(activeProject?.id);
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', dueDate: '' });
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [aiForm, setAiForm] = useState({ prompt: '', provider: 'COPILOT', model: 'gpt-4o' });
  const [goalModelSearch, setGoalModelSearch] = useState('');
  const [goalModelOpen, setGoalModelOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: goalsRes } = useQuery({
    queryKey: ['goals', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: Goal[] }>(`/teams/${teamId}/goals${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`),
    enabled: !!teamId,
  });

  const { data: keysData } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: { provider: string; isActive: boolean }[] }>('/ai/keys'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/goals`, { ...data, projectId: activeProject?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', teamId] });
      setShowCreate(false);
      setNewGoal({ title: '', description: '', dueDate: '' });
      emitEntityChange('goal', 'create');
      toast.success('Goal created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/teams/${teamId}/goals/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', teamId] });
      emitEntityChange('goal', 'update');
      if (selectedGoal && selectedGoal.id === variables.id) {
        setSelectedGoal((prev) => prev ? { ...prev, ...variables } : null);
      }
      if (isEditing) {
        setIsEditing(false);
        toast.success('Goal updated!');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', teamId] });
      setSelectedGoal(null);
      toast.success('Goal deleted');
      emitEntityChange('goal', 'delete');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete goal');
    },
  });

  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const aiGenerateMutation = useMutation({
    mutationFn: (data: { prompt: string; provider: string; model: string }) =>
      api.post(`/teams/${teamId}/goals/ai-generate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', teamId] });
      setShowAIGenerate(false);
      setAiForm({ prompt: '', provider: aiForm.provider, model: aiForm.model });
      toast.success('Goals generated by AI!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'AI generation failed');
    },
  });

  const goals = goalsRes?.data || [];

  const connectedProviders = useMemo(() => {
    const set = new Set<string>();
    (keysData?.data || []).forEach((k) => { if (k.isActive) set.add(k.provider); });
    return set;
  }, [keysData]);

  const filteredGoals = useMemo(() => {
    let result = goals;
    if (filterStatus !== 'ALL') {
      result = result.filter((g) => g.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g) => g.title.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q));
    }
    return result;
  }, [goals, filterStatus, searchQuery]);

  const completedCount = goals.filter((g) => g.status === 'COMPLETED').length;
  const inProgressCount = goals.filter((g) => g.status === 'IN_PROGRESS').length;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / goals.length) : 0;
  const overdueCount = goals.filter((g) => {
    if (!g.dueDate || g.status === 'COMPLETED') return false;
    return new Date(g.dueDate) < new Date();
  }).length;

  const stats = [
    { label: 'Total Goals', value: goals.length, color: '#7b68ee', icon: Target },
    { label: 'In Progress', value: inProgressCount, color: '#3b82f6', icon: TrendingUp },
    { label: 'Completed', value: completedCount, color: '#22c55e', icon: CheckCircle2 },
    { label: 'Avg Progress', value: `${avgProgress}%`, color: '#f59e0b', icon: BarChart3 },
  ];

  const openDetail = (goal: Goal) => {
    setSelectedGoal(goal);
    setEditGoal({ ...goal });
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (!editGoal) return;
    updateMutation.mutate({
      id: editGoal.id,
      title: editGoal.title,
      description: editGoal.description || '',
      status: editGoal.status,
      progress: editGoal.progress,
      dueDate: editGoal.dueDate || null,
    });
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-[#7b68ee]" />
            Goals
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track objectives, key results, and team milestones.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAIGenerate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#7b68ee]/20 text-[#7b68ee] text-sm rounded-lg hover:bg-[#7b68ee]/5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Generate
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Goal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}12` }}
                >
                  <Icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                {overdueCount > 0 && stat.label === 'Total Goals' && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">
                    {overdueCount} overdue
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search goals..."
            className="pl-9 h-9 text-sm border-border"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1">
          {['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                filterStatus === s
                  ? 'bg-[#7b68ee] text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Goals list */}
      <div className="space-y-2">
        {filteredGoals.map((goal) => {
          const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.NOT_STARTED;
          const StatusIcon = statusCfg.icon;
          const dueDateInfo = goal.dueDate ? getDueDateInfo(goal.dueDate) : null;
          const progressColor = getProgressColor(goal.progress || 0);

          return (
            <div
              key={goal.id}
              className="group bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-[#7b68ee]/20 transition-all cursor-pointer"
              onClick={() => openDetail(goal)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextStatus = goal.status === 'COMPLETED' ? 'NOT_STARTED'
                        : goal.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
                      const nextProgress = nextStatus === 'COMPLETED' ? 100 : nextStatus === 'IN_PROGRESS' ? Math.max(goal.progress || 0, 10) : 0;
                      updateMutation.mutate({ id: goal.id, status: nextStatus, progress: nextProgress });
                    }}
                  >
                    <StatusIcon className="h-5 w-5" style={{ color: statusCfg.color }} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      'text-sm font-medium leading-snug',
                      goal.status === 'COMPLETED' ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}>
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                      >
                        {statusCfg.label}
                      </span>
                      {dueDateInfo && (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: dueDateInfo.color }}>
                          <Calendar className="h-3 w-3" />
                          {dueDateInfo.text}
                        </span>
                      )}
                      {goal.creator?.name && (
                        <span className="text-[11px] text-muted-foreground/60">
                          by {goal.creator.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none"
                        stroke={progressColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${(goal.progress || 0) * 0.942} 94.2`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                      {goal.progress || 0}%
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-[#7b68ee] transition-colors" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredGoals.length === 0 && goals.length > 0 && (
          <div className="text-center py-12">
            <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No goals match your filter.</p>
            <button onClick={() => { setFilterStatus('ALL'); setSearchQuery(''); }} className="text-xs text-[#7b68ee] mt-1 hover:underline">
              Clear filters
            </button>
          </div>
        )}

        {goals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#7b68ee]/10 flex items-center justify-center mb-4">
              <Target className="h-7 w-7 text-[#7b68ee]" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No Goals Yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">Set goals to track your team&apos;s progress, milestones, and key results.</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowAIGenerate(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#7b68ee]/20 text-[#7b68ee] text-sm rounded-lg hover:bg-[#7b68ee]/5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" /> AI Generate
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Create Goal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Goal Detail Panel ── */}
      <Sheet open={!!selectedGoal} onOpenChange={(o) => { if (!o) { setSelectedGoal(null); setIsEditing(false); } }}>
        <SheetContent side="right" className="w-full sm:w-[420px] md:w-[480px] p-0 border-l border-border overflow-y-auto">
          {selectedGoal && (() => {
            const goal = isEditing && editGoal ? editGoal : selectedGoal;
            const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.NOT_STARTED;
            const StatusIcon = statusCfg.icon;
            const progressColor = getProgressColor(goal.progress || 0);

            return (
              <>
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <Input
                          value={editGoal?.title || ''}
                          onChange={(e) => setEditGoal(prev => prev ? { ...prev, title: e.target.value } : null)}
                          className="text-lg font-semibold border-border focus:border-[#7b68ee] mb-1"
                          autoFocus
                        />
                      ) : (
                        <h2 className="text-lg font-semibold text-foreground leading-snug pr-8">{goal.title}</h2>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                          style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                        {goal.dueDate && (() => {
                          const info = getDueDateInfo(goal.dueDate);
                          return (
                            <span className="text-[11px] flex items-center gap-1" style={{ color: info.color }}>
                              <Calendar className="h-3 w-3" />
                              {info.text}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => { setEditGoal({ ...selectedGoal }); setIsEditing(true); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: goal.id, title: goal.title })}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#7b68ee] text-white text-xs font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
                          >
                            {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="px-6 pb-4">
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[12px] font-medium text-muted-foreground">Progress</span>
                      <span className="text-sm font-bold" style={{ color: progressColor }}>
                        {goal.progress || 0}%
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={editGoal?.progress || 0}
                          onChange={(e) => setEditGoal(prev => prev ? { ...prev, progress: parseInt(e.target.value) } : null)}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, ${progressColor} ${editGoal?.progress || 0}%, #e5e7eb ${editGoal?.progress || 0}%)`,
                          }}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${goal.progress || 0}%`, backgroundColor: progressColor }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="px-6 pb-4 space-y-4">
                  {isEditing && (
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">Status</label>
                      <Select value={editGoal?.status || ''} onValueChange={(v) => {
                        const progress = v === 'COMPLETED' ? 100 : v === 'NOT_STARTED' ? 0 : editGoal?.progress || 0;
                        setEditGoal(prev => prev ? { ...prev, status: v as Goal['status'], progress } : null);
                      }}>
                        <SelectTrigger className="border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[s]?.color }} />
                                {STATUS_CONFIG[s]?.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isEditing && (
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">Due Date</label>
                      <Input
                        type="date"
                        value={editGoal?.dueDate ? new Date(editGoal.dueDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditGoal(prev => prev ? { ...prev, dueDate: e.target.value || undefined } : null)}
                        className="border-border h-9 text-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground">Description</label>
                    {isEditing ? (
                      <Textarea
                        value={editGoal?.description || ''}
                        onChange={(e) => setEditGoal(prev => prev ? { ...prev, description: e.target.value } : null)}
                        rows={5}
                        className="border-border focus:border-[#7b68ee] text-sm"
                        placeholder="Add a description..."
                      />
                    ) : (
                      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/50 rounded-lg p-3 min-h-15 border border-border/50">
                        {goal.description || <span className="text-muted-foreground italic">No description</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      Created {new Date(goal.createdAt).toLocaleDateString()}
                    </span>
                    {goal.creator?.name && (
                      <span className="text-[11px] text-muted-foreground">
                        by {goal.creator.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Status Actions */}
                {!isEditing && (
                  <div className="px-6 pb-6">
                    <div className="flex gap-2">
                      {goal.status !== 'IN_PROGRESS' && goal.status !== 'COMPLETED' && (
                        <button
                          onClick={() => updateMutation.mutate({
                            id: goal.id,
                            status: 'IN_PROGRESS',
                            progress: Math.max(goal.progress || 0, 10)
                          })}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-500/5 border border-blue-500/15 rounded-lg hover:bg-blue-500/10 transition-colors"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          Start Progress
                        </button>
                      )}
                      {goal.status !== 'COMPLETED' && (
                        <button
                          onClick={() => updateMutation.mutate({ id: goal.id, status: 'COMPLETED', progress: 100 })}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-green-600 bg-green-500/5 border border-green-500/15 rounded-lg hover:bg-green-500/10 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Complete
                        </button>
                      )}
                      {goal.status === 'COMPLETED' && (
                        <button
                          onClick={() => updateMutation.mutate({ id: goal.id, status: 'NOT_STARTED', progress: 0 })}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30 border border-border rounded-lg hover:bg-accent transition-colors"
                        >
                          <Circle className="h-3.5 w-3.5" />
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-[#7b68ee]" />
              New Goal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Title</label>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g., Launch v2.0"
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Description (optional)</label>
              <Textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Describe the goal, key results, and milestones..."
                rows={4}
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Due Date (optional)</label>
              <Input
                type="date"
                value={newGoal.dueDate}
                onChange={(e) => setNewGoal({ ...newGoal, dueDate: e.target.value })}
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate(newGoal)}
              disabled={!newGoal.title || createMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create Goal
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showAIGenerate} onOpenChange={setShowAIGenerate}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#7b68ee]" />
              AI Generate Goals
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Describe your goals</label>
              <Textarea
                value={aiForm.prompt}
                onChange={(e) => setAiForm({ ...aiForm, prompt: e.target.value })}
                placeholder="e.g., We're building a SaaS project management tool. Generate goals for our Q1 launch including product, marketing, and engineering milestones..."
                rows={4}
                className="border-border focus:border-[#7b68ee]"
              />
              <p className="text-[11px] text-muted-foreground">Tip: Write in your preferred language — the AI will respond in the same language.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Provider</label>
                <Select value={aiForm.provider} onValueChange={(v) => {
                  const models = modelsData?.data?.[v] || [];
                  setAiForm({ ...aiForm, provider: v, model: models[0]?.id || '' });
                  setGoalModelSearch('');
                  setGoalModelOpen(false);
                }}>
                  <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(modelsData?.data || {}).map(p => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          {p}
                          {connectedProviders.has(p) && <span className="text-[9px] font-bold text-green-500">CONNECTED</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 relative">
                <label className="text-[13px] font-medium text-muted-foreground">Model</label>
                {(() => {
                  const allModels = modelsData?.data?.[aiForm.provider] || [];
                  const hasMany = allModels.length > 10;
                  const selectedModel = allModels.find((m: any) => m.id === aiForm.model);
                  if (!hasMany) {
                    return (
                      <Select value={aiForm.model} onValueChange={(v) => setAiForm({ ...aiForm, model: v })}>
                        <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allModels.map((m: any) => {
                            const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                            return <SelectItem key={m.id} value={m.id}>{m.name}{isFree ? ' ✦ Free' : ''}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    );
                  }
                  const filtered = goalModelSearch
                    ? allModels.filter((m: any) => m.name.toLowerCase().includes(goalModelSearch.toLowerCase()) || m.id.toLowerCase().includes(goalModelSearch.toLowerCase()))
                    : allModels;
                  return (
                    <div className="relative">
                      <button type="button" onClick={() => setGoalModelOpen(!goalModelOpen)}
                        className="flex items-center w-full h-9 px-3 text-sm border border-border rounded-md bg-background hover:bg-accent/50 transition-colors text-left">
                        <span className="truncate flex-1 text-foreground">{selectedModel?.name || aiForm.model || 'Select model'}{selectedModel && selectedModel.costPer1kInput === 0 && selectedModel.costPer1kOutput === 0 ? ' ✦ Free' : ''}</span>
                        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', goalModelOpen && 'rotate-180')} />
                      </button>
                      {goalModelOpen && (
                        <div className="absolute z-50 top-10 left-0 right-0 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
                          <div className="relative border-b border-border">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input placeholder="Search models..." value={goalModelSearch} onChange={(e) => setGoalModelSearch(e.target.value)}
                              className="w-full h-8 pl-8 pr-3 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground" autoFocus />
                          </div>
                          <div className="max-h-50 overflow-y-auto p-1">
                            {filtered.length === 0 ? (
                              <div className="text-center py-3 text-xs text-muted-foreground">No models found</div>
                            ) : filtered.slice(0, 50).map((m: any) => {
                              const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                              return (
                                <button key={m.id} type="button" onClick={() => { setAiForm({ ...aiForm, model: m.id }); setGoalModelOpen(false); setGoalModelSearch(''); }}
                                  className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-md hover:bg-accent/60 transition-colors', aiForm.model === m.id && 'bg-[#7b68ee]/10 text-[#7b68ee]')}>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{m.name}{isFree && <span className="ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded bg-green-500/10 text-green-500">FREE</span>}</div>
                                    <div className="text-[10px] text-muted-foreground/60 truncate font-mono">{m.id}</div>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">{(m.contextWindow / 1000).toFixed(0)}K</span>
                                </button>
                              );
                            })}
                            {filtered.length > 50 && <div className="text-center py-2 text-[10px] text-muted-foreground">Showing 50 of {filtered.length} — refine your search</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowAIGenerate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              onClick={() => aiGenerateMutation.mutate(aiForm)}
              disabled={!aiForm.prompt || aiGenerateMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              {aiGenerateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Goals
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteMutation.mutate(deleteConfirm.id);
            if (selectedGoal?.id === deleteConfirm.id) setSelectedGoal(null);
            setDeleteConfirm(null);
          }
        }}
        title="Delete Goal"
        itemLabel={deleteConfirm?.title || ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
