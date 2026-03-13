'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Zap, Target, AlertTriangle, Calendar, CheckCircle2, Clock, ListChecks,
  ArrowRight, ArrowLeft, Trash2, Search, ChevronDown, Edit2, BarChart3,
  Users, Play, Archive, CircleDot, Circle, Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import {
  AIGenerateProgressModal, type AIStep,
} from '@/components/ai-progress-modal';

const PROVIDERS = ['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI', 'GROQ', 'COPILOT'];

export default function SprintsPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const [createForm, setCreateForm] = useState({
    title: '', goal: '', deadline: '', teamSize: 3,
  });

  const [genForm, setGenForm] = useState({
    title: '', goal: '', deadline: '', teamSize: 3, provider: 'OPENROUTER', model: 'google/gemini-2.5-flash-preview-05-20',
  });
  const [sprintModelSearch, setSprintModelSearch] = useState('');
  const [sprintModelOpen, setSprintModelOpen] = useState(false);

  const [editForm, setEditForm] = useState({ title: '', goal: '', deadline: '', teamSize: 3 });
  const [searchQuery, setSearchQuery] = useState('');

  // AI progress modal state
  const [aiProgressOpen, setAiProgressOpen] = useState(false);
  const [aiSteps, setAiSteps] = useState<AIStep[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResultId, setAiResultId] = useState<string | null>(null);
  const [aiStartedAt, setAiStartedAt] = useState<number | null>(null);
  const [aiItemTitle, setAiItemTitle] = useState('');

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
  }, [searchParams]);

  const { data: sprints } = useQuery({
    queryKey: ['sprints', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/sprints${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`),
    enabled: !!teamId,
  });

  const { data: models } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/sprints`, { ...data, projectId: activeProject?.id }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      setShowCreate(false);
      setCreateForm({ title: '', goal: '', deadline: '', teamSize: 3 });
      setSelectedSprint(data.data);
    },
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/sprints/ai-generate`, { ...data, projectId: activeProject?.id }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/sprints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      setSelectedSprint(null);
      toast.success('Sprint deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete sprint');
    },
  });

  const convertMutation = useMutation({
    mutationFn: (sprintId: string) => api.post(`/teams/${teamId}/sprints/${sprintId}/convert`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-tasks'] });
      toast.success('Tasks created from sprint plan');
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/teams/${teamId}/sprints/${selectedSprint?.id}`, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      setSelectedSprint(res.data);
      setShowEdit(false);
      toast.success('Sprint updated');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ sprintId, status }: { sprintId: string; status: string }) =>
      api.patch(`/teams/${teamId}/sprints/${sprintId}`, { status }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      setSelectedSprint(res.data);
      toast.success('Sprint status updated');
    },
  });

  // Fetch real tasks linked to this sprint
  const { data: sprintTasks } = useQuery({
    queryKey: ['sprint-tasks', teamId, selectedSprint?.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/tasks?sprintId=${selectedSprint?.id}`),
    enabled: !!teamId && !!selectedSprint?.id && selectedSprint?.status !== 'DRAFT',
  });

  const providerModels = models?.data?.[genForm.provider] || [];

  const formatDeadline = (date: string) => {
    if (!date) return '';
    return new Date(date).toISOString();
  };

  const handleCreate = () => {
    createMutation.mutate({
      title: createForm.title,
      goal: createForm.goal,
      deadline: formatDeadline(createForm.deadline),
      teamSize: createForm.teamSize,
    });
  };

  const handleGenerate = async () => {
    const initSteps: AIStep[] = [
      { label: 'Preparing request', status: 'active' },
      { label: 'Connecting to AI', status: 'pending' },
      { label: 'Generating sprint plan', status: 'pending' },
      { label: 'Saving to project', status: 'pending' },
    ];
    setAiSteps(initSteps);
    setAiError(null);
    setAiResultId(null);
    setAiItemTitle(genForm.title || genForm.goal.slice(0, 60));
    setAiStartedAt(Date.now());
    setShowGenerate(false);
    setAiProgressOpen(true);

    const updateStep = (idx: number, status: AIStep['status'], hint?: string) => {
      setAiSteps(prev => prev.map((s, i) => {
        if (i === idx) return { ...s, status, hint };
        if (i === idx + 1 && status === 'done' && s.status === 'pending') return { ...s, status: 'active' };
        return s;
      }));
    };

    const setStepError = (idx: number, msg: string) => {
      setAiSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: 'error', hint: msg } : s));
    };

    try {
      // Step 1: Preparing request
      await new Promise(r => setTimeout(r, 600));
      updateStep(0, 'done');

      // Step 2: Connecting to AI
      await new Promise(r => setTimeout(r, 800));
      updateStep(1, 'done');

      // Step 3: Generating sprint plan (actual API call)
      const result: any = await generateMutation.mutateAsync({
        title: genForm.title || genForm.goal.slice(0, 100),
        goal: genForm.goal,
        deadline: formatDeadline(genForm.deadline),
        teamSize: genForm.teamSize,
        provider: genForm.provider,
        model: genForm.model,
      });
      updateStep(2, 'done');

      // Step 4: Saving to project
      await new Promise(r => setTimeout(r, 500));
      updateStep(3, 'done');

      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      setAiResultId(result?.data?.id || 'done');
      setSelectedSprint(result?.data);
      setGenForm({ title: '', goal: '', deadline: '', teamSize: 3, provider: 'OPENROUTER', model: 'google/gemini-2.5-flash-preview-05-20' });
      toast.success('Sprint plan generated!');
    } catch (err: any) {
      setStepError(2, err.message || 'Generation failed');
      setAiError(err.message || 'Failed to generate sprint plan');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-muted text-muted-foreground';
      case 'ACTIVE': return 'bg-[#7b68ee]/10 text-[#7b68ee]';
      case 'COMPLETED': return 'bg-green-500/10 text-green-600';
      case 'ARCHIVED': return 'bg-amber-500/10 text-amber-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const tabs = [
    { key: 'tasks', label: 'Tasks', icon: ListChecks },
    { key: 'milestones', label: 'Milestones', icon: Target },
    { key: 'risks', label: 'Risks', icon: AlertTriangle },
    { key: 'daily', label: 'Daily Plan', icon: Calendar },
  ];

  // Progress calculation from real DB tasks (once converted)
  const realTasks = sprintTasks?.data || [];
  const totalRealTasks = realTasks.length;
  const doneTasks = realTasks.filter((t: any) => t.status === 'DONE').length;
  const inProgressTasks = realTasks.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length;
  const progressPercent = totalRealTasks > 0 ? Math.round((doneTasks / totalRealTasks) * 100) : 0;

  const getNextStatus = (current: string) => {
    switch (current) {
      case 'DRAFT': return { label: 'Start Sprint', next: 'ACTIVE', icon: Play };
      case 'ACTIVE': return { label: 'Complete Sprint', next: 'COMPLETED', icon: CheckCircle2 };
      case 'COMPLETED': return { label: 'Archive Sprint', next: 'ARCHIVED', icon: Archive };
      default: return null;
    }
  };

  const handleEditSprint = () => {
    if (!selectedSprint) return;
    setEditForm({
      title: selectedSprint.title || '',
      goal: selectedSprint.goal || '',
      deadline: selectedSprint.deadline ? new Date(selectedSprint.deadline).toISOString().split('T')[0] : '',
      teamSize: selectedSprint.teamSize || 3,
    });
    setShowEdit(true);
  };

  // ─── Sprint Detail View ───
  if (selectedSprint) {
    const plan = selectedSprint.data || selectedSprint.plan || selectedSprint;
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <button onClick={() => setSelectedSprint(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground mb-2 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sprints
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{selectedSprint.title || plan.sprintGoal || plan.goal}</h1>
              {selectedSprint.status && (
                <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap', getStatusStyle(selectedSprint.status))}>
                  {selectedSprint.status}
                </span>
              )}
            </div>
            {selectedSprint.goal && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedSprint.goal}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Edit button */}
            {selectedSprint.id && (
              <button
                onClick={handleEditSprint}
                className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-muted-foreground rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            {/* Status transition button */}
            {selectedSprint.id && getNextStatus(selectedSprint.status) && (() => {
              const ns = getNextStatus(selectedSprint.status)!;
              return (
                <button
                  onClick={() => statusMutation.mutate({ sprintId: selectedSprint.id, status: ns.next })}
                  disabled={statusMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
                >
                  <ns.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{ns.label}</span>
                </button>
              );
            })()}
            {selectedSprint.id && selectedSprint.status === 'DRAFT' && (
              <button
                onClick={() => convertMutation.mutate(selectedSprint.id)}
                disabled={convertMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#7b68ee] text-[#7b68ee] text-sm rounded-lg hover:bg-[#7b68ee]/10 disabled:opacity-50 transition-colors"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Convert to Tasks</span>
                <span className="sm:hidden">Convert</span>
              </button>
            )}
            {selectedSprint.id && (
              <button
                onClick={() => { setDeleteConfirm({ id: selectedSprint.id, title: selectedSprint.title || 'This sprint' }); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-red-500 text-sm rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Info bar + Progress */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {selectedSprint.deadline && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded-lg">
                <Calendar className="h-3 w-3" /> {new Date(selectedSprint.deadline).toLocaleDateString()}
              </span>
            )}
            {selectedSprint.teamSize && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded-lg">
                <Users className="h-3 w-3" /> Team: {selectedSprint.teamSize}
              </span>
            )}
            {plan.tasks?.length > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded-lg">
                <ListChecks className="h-3 w-3" /> {plan.tasks.length} planned tasks
              </span>
            )}
            {totalRealTasks > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded-lg">
                <BarChart3 className="h-3 w-3" /> {doneTasks}/{totalRealTasks} completed
              </span>
            )}
          </div>

          {/* Progress bar — show when sprint is active or completed */}
          {totalRealTasks > 0 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Sprint Progress</span>
                <span className="text-xs font-semibold text-[#7b68ee]">{progressPercent}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Circle className="h-2.5 w-2.5 text-gray-400" /> To Do: {totalRealTasks - doneTasks - inProgressTasks}</span>
                <span className="flex items-center gap-1"><CircleDot className="h-2.5 w-2.5 text-blue-500" /> In Progress: {inProgressTasks}</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> Done: {doneTasks}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border -mx-1 px-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === t.key
                  ? 'border-[#7b68ee] text-[#7b68ee]'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground'
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {/* Show real DB tasks if sprint has been converted */}
            {totalRealTasks > 0 ? (
              <>
                {realTasks.map((task: any) => {
                  const statusColors: Record<string, string> = {
                    TODO: 'bg-gray-500/10 text-gray-500',
                    IN_PROGRESS: 'bg-blue-500/10 text-blue-500',
                    IN_REVIEW: 'bg-amber-500/10 text-amber-500',
                    DONE: 'bg-green-500/10 text-green-500',
                    CANCELLED: 'bg-red-500/10 text-red-500',
                  };
                  return (
                    <div key={task.id} className="bg-card border border-border rounded-xl p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className={cn('h-4 w-4 shrink-0', task.status === 'DONE' ? 'text-green-500' : 'text-muted-foreground/60')} />
                            <h3 className={cn('font-medium text-sm', task.status === 'DONE' ? 'text-muted-foreground line-through' : 'text-foreground')}>{task.title}</h3>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 ml-6 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-6 sm:ml-0 shrink-0 flex-wrap">
                          <span className={cn('text-[11px] px-2 py-0.5 rounded font-medium', statusColors[task.status] || 'bg-muted text-muted-foreground')}>
                            {task.status?.replace('_', ' ')}
                          </span>
                          <span className={cn(
                            'text-[11px] px-2 py-0.5 rounded font-medium',
                            task.priority === 'URGENT' || task.priority === 'HIGH' ? 'bg-red-500/10 text-red-600' :
                            task.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'
                          )}>
                            {task.priority}
                          </span>
                          {task.assignees?.length > 0 && (
                            <div className="flex -space-x-1">
                              {task.assignees.slice(0, 3).map((a: any) => (
                                <div
                                  key={a.user?.id}
                                  className="h-5 w-5 rounded-full bg-[#7b68ee] text-white text-[9px] font-bold flex items-center justify-center border border-card"
                                  title={a.user?.name}
                                >
                                  {a.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              // Show plan tasks (before conversion)
              <>
                {(plan.tasks || []).map((task: any, i: number) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                      <h3 className="font-medium text-sm text-foreground truncate">{task.title}</h3>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 ml-6 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-6 sm:ml-0 shrink-0 flex-wrap">
                    <span className={cn(
                      'text-[11px] px-2 py-0.5 rounded font-medium',
                      task.priority === 'HIGH' || task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-600' :
                      task.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'
                    )}>
                      {task.priority || 'MEDIUM'}
                    </span>
                    {(task.estimatedHours || task.estimate) && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{task.estimatedHours || task.estimate}h
                      </span>
                    )}
                    {task.category && (
                      <span className="text-[11px] px-2 py-0.5 bg-[#7b68ee]/5 text-[#7b68ee] rounded">{task.category}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!plan.tasks || plan.tasks.length === 0) && (
              <p className="text-center text-muted-foreground text-sm py-8">No tasks in this sprint plan</p>
            )}
              </>
            )}
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(plan.milestones || []).map((m: any, i: number) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#7b68ee]/10 flex items-center justify-center shrink-0">
                  <Target className="h-4 w-4 text-[#7b68ee]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-foreground">{m.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>
                </div>
                {(m.date || m.day) && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 bg-muted rounded whitespace-nowrap shrink-0">
                    <Calendar className="h-3 w-3" />{m.date || `Day ${m.day}`}
                  </span>
                )}
              </div>
            ))}
            {(!plan.milestones || plan.milestones.length === 0) && (
              <p className="text-center text-muted-foreground text-sm py-8 col-span-full">No milestones defined</p>
            )}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(plan.risks || []).map((r: any, i: number) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-foreground">{r.risk || r.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{r.mitigation}</p>
                </div>
                <span className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0',
                  r.severity === 'HIGH' ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'
                )}>
                  {r.severity || 'MEDIUM'}
                </span>
              </div>
            ))}
            {(!plan.risks || plan.risks.length === 0) && (
              <p className="text-center text-muted-foreground text-sm py-8 col-span-full">No risks identified</p>
            )}
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(plan.dailyPlan || []).map((day: any, i: number) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-[#7b68ee] bg-[#7b68ee]/10 px-2 py-0.5 rounded">Day {day.day || i + 1}</span>
                  {day.focus && <span className="text-xs text-muted-foreground truncate">{day.focus}</span>}
                </div>
                <ul className="space-y-1.5">
                  {(day.tasks || day.activities || []).map((t: any, j: number) => (
                    <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ListChecks className="h-3 w-3 text-muted-foreground/60 mt-1 shrink-0" />
                      <span className="line-clamp-2">{typeof t === 'string' ? t : t.title || t.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {(!plan.dailyPlan || plan.dailyPlan.length === 0) && (
              <p className="text-center text-muted-foreground text-sm py-8 col-span-full">No daily plan defined</p>
            )}
          </div>
        )}

        {/* Edit Sprint Dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="bg-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-[#7b68ee]" /> Edit Sprint
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Title</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="border-border focus:border-[#7b68ee]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Goal</label>
                <Textarea
                  value={editForm.goal}
                  onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                  rows={3}
                  className="border-border focus:border-[#7b68ee]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-muted-foreground">Deadline</label>
                  <Input
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="border-border focus:border-[#7b68ee]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-muted-foreground">Team Size</label>
                  <Input
                    type="number" min={1} max={20}
                    value={editForm.teamSize}
                    onChange={(e) => setEditForm({ ...editForm, teamSize: parseInt(e.target.value) || 1 })}
                    className="border-border focus:border-[#7b68ee]"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={() => editMutation.mutate({
                  title: editForm.title,
                  goal: editForm.goal,
                  deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : undefined,
                  teamSize: editForm.teamSize,
                })}
                disabled={!editForm.title || editMutation.isPending}
                className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => { if (deleteConfirm) { deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); setSelectedSprint(null); } }}
          title="Delete Sprint"
          itemLabel={deleteConfirm?.title || ''}
          isPending={deleteMutation.isPending}
        />
      </div>
    );
  }

  const filteredSprints = (sprints?.data || []).filter((s: any) =>
    !searchQuery || (s.title || s.goal || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Sprint List View ───
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Sprint Planner</h1>
            {sprints?.data && <p className="text-xs text-muted-foreground">{sprints.data.length} sprint{sprints.data.length !== 1 ? 's' : ''}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground text-sm rounded-lg hover:bg-accent transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Sprint
          </button>
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            AI Generate
          </button>
        </div>
      </div>

      {/* Search */}
      {(sprints?.data || []).length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-border focus:border-[#7b68ee]"
          />
        </div>
      )}

      {/* Loading */}
      {!sprints && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Sprint List */}
      {sprints && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredSprints.map((sprint: any) => (
          <div
            key={sprint.id}
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-[#7b68ee]/20 hover:-translate-y-0.5 transition-all group"
            onClick={() => setSelectedSprint(sprint)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm text-foreground truncate">{sprint.title || sprint.goal}</h3>
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0', getStatusStyle(sprint.status))}>
                    {sprint.status}
                  </span>
                </div>
                {sprint.goal && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{sprint.goal}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              {sprint.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(sprint.deadline).toLocaleDateString()}
                </span>
              )}
              {sprint.teamSize && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{sprint.teamSize}</span>
              )}
              {sprint.data?.tasks?.length > 0 && (
                <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{sprint.data.tasks.length} tasks</span>
              )}
              <span className="ml-auto">{new Date(sprint.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>}

      {/* Empty State */}
      {sprints && sprints.data.length === 0 && (
        <div className="text-center py-16">
          <Zap className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="font-medium text-foreground mb-1">No Sprint Plans Yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Create a sprint manually or use AI to generate a complete plan with tasks, milestones, and daily schedules.
          </p>
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-border text-muted-foreground text-sm rounded-lg hover:bg-accent transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Create Sprint
            </button>
            <button
              onClick={() => setShowGenerate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
            >
              <Zap className="h-3.5 w-3.5" /> AI Generate
            </button>
          </div>
        </div>
      )}

      {/* ─── Create Sprint Dialog ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Title</label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Sprint 1 — MVP Launch"
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Goal</label>
              <Textarea
                value={createForm.goal}
                onChange={(e) => setCreateForm({ ...createForm, goal: e.target.value })}
                placeholder="What do you want to accomplish?"
                rows={3}
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Deadline</label>
                <Input
                  type="date"
                  value={createForm.deadline}
                  onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                  className="border-border focus:border-[#7b68ee]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Team Size</label>
                <Input
                  type="number" min={1} max={20}
                  value={createForm.teamSize}
                  onChange={(e) => setCreateForm({ ...createForm, teamSize: parseInt(e.target.value) || 1 })}
                  className="border-border focus:border-[#7b68ee]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!createForm.title || !createForm.goal || !createForm.deadline || createMutation.isPending}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Sprint'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AI Generate Sprint Dialog ─── */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#7b68ee]" /> AI Sprint Planner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Sprint Title</label>
              <Input
                value={genForm.title}
                onChange={(e) => setGenForm({ ...genForm, title: e.target.value })}
                placeholder="e.g. Sprint 1 — Auth & Dashboard"
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Sprint Goal</label>
              <Textarea
                value={genForm.goal}
                onChange={(e) => setGenForm({ ...genForm, goal: e.target.value })}
                placeholder="Describe what you want to accomplish in this sprint..."
                rows={3}
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Deadline</label>
                <Input
                  type="date"
                  value={genForm.deadline}
                  onChange={(e) => setGenForm({ ...genForm, deadline: e.target.value })}
                  className="border-border focus:border-[#7b68ee]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Team Size</label>
                <Input
                  type="number" min={1} max={20}
                  value={genForm.teamSize}
                  onChange={(e) => setGenForm({ ...genForm, teamSize: parseInt(e.target.value) || 1 })}
                  className="border-border focus:border-[#7b68ee]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">AI Provider</label>
                <Select value={genForm.provider} onValueChange={(v) => {
                  const m = models?.data?.[v] || [];
                  setGenForm({ ...genForm, provider: v, model: m[0]?.id || '' });
                  setSprintModelSearch('');
                  setSprintModelOpen(false);
                }}>
                  <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 relative">
                <label className="text-[13px] font-medium text-muted-foreground">Model</label>
                {(() => {
                  const allModels = providerModels;
                  const hasMany = allModels.length > 10;
                  const selectedModel = allModels.find((m: any) => m.id === genForm.model);
                  if (!hasMany) {
                    return (
                      <Select value={genForm.model} onValueChange={(v) => setGenForm({ ...genForm, model: v })}>
                        <SelectTrigger className="border-border"><SelectValue placeholder="Select model" /></SelectTrigger>
                        <SelectContent>
                          {allModels.map((m: any) => {
                            const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                            return <SelectItem key={m.id} value={m.id}>{m.name}{isFree ? ' ✦ Free' : ''}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    );
                  }
                  const filtered = sprintModelSearch
                    ? allModels.filter((m: any) => m.name.toLowerCase().includes(sprintModelSearch.toLowerCase()) || m.id.toLowerCase().includes(sprintModelSearch.toLowerCase()))
                    : allModels;
                  return (
                    <div className="relative">
                      <button type="button" onClick={() => setSprintModelOpen(!sprintModelOpen)}
                        className="flex items-center w-full h-9 px-3 text-sm border border-border rounded-md bg-background hover:bg-accent/50 transition-colors text-left">
                        <span className="truncate flex-1 text-foreground">{selectedModel?.name || genForm.model || 'Select model'}{selectedModel && selectedModel.costPer1kInput === 0 && selectedModel.costPer1kOutput === 0 ? ' ✦ Free' : ''}</span>
                        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', sprintModelOpen && 'rotate-180')} />
                      </button>
                      {sprintModelOpen && (
                        <div className="absolute z-50 top-10 left-0 right-0 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
                          <div className="relative border-b border-border">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input placeholder="Search models..." value={sprintModelSearch} onChange={(e) => setSprintModelSearch(e.target.value)}
                              className="w-full h-8 pl-8 pr-3 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground" autoFocus />
                          </div>
                          <div className="max-h-[200px] overflow-y-auto p-1">
                            {filtered.length === 0 ? (
                              <div className="text-center py-3 text-xs text-muted-foreground">No models found</div>
                            ) : filtered.slice(0, 50).map((m: any) => {
                              const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                              return (
                                <button key={m.id} type="button" onClick={() => { setGenForm({ ...genForm, model: m.id }); setSprintModelOpen(false); setSprintModelSearch(''); }}
                                  className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-md hover:bg-accent/60 transition-colors', genForm.model === m.id && 'bg-[#7b68ee]/10 text-[#7b68ee]')}>
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
            <button onClick={() => setShowGenerate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!genForm.goal || !genForm.deadline}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              Generate Plan
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Progress Modal */}
      <AIGenerateProgressModal
        open={aiProgressOpen}
        steps={aiSteps}
        error={aiError}
        resultId={aiResultId}
        onClose={() => { setAiProgressOpen(false); setAiSteps([]); setAiError(null); }}
        onMinimize={() => setAiProgressOpen(false)}
        onOpenResult={() => { setAiProgressOpen(false); }}
        onRetry={handleGenerate}
        startedAt={aiStartedAt}
        itemTitle={aiItemTitle}
        generatingTitle="Generating Sprint Plan"
        doneTitle="Sprint Plan Ready!"
        failedTitle="Generation Failed"
        generatingSubtitle="AI is creating tasks, milestones, risks, and daily schedules for your sprint."
        doneSubtitle="Your AI-generated sprint plan has been created and saved successfully."
        openResultLabel="View Sprint"
        accentColor="#7b68ee"
      />

      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) { deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); } }}
        title="Delete Sprint"
        itemLabel={deleteConfirm?.title || ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}