'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Zap, Target, AlertTriangle, Calendar, CheckCircle2, Clock, ListChecks,
  ArrowRight, ArrowLeft, Trash2,
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
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PROVIDERS = ['openai', 'claude', 'gemini', 'groq', 'openrouter'];

export default function SprintsPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tasks');

  const [createForm, setCreateForm] = useState({
    title: '', goal: '', deadline: '', teamSize: 3,
  });

  const [genForm, setGenForm] = useState({
    title: '', goal: '', deadline: '', teamSize: 3, provider: 'openai', model: '',
  });

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
  }, [searchParams]);

  const { data: sprints } = useQuery({
    queryKey: ['sprints', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/sprints`),
    enabled: !!teamId,
  });

  const { data: models } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/sprints`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      setShowCreate(false);
      setCreateForm({ title: '', goal: '', deadline: '', teamSize: 3 });
      setSelectedSprint(data.data);
    },
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/sprints/ai-generate`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', teamId] });
      setShowGenerate(false);
      setGenForm({ title: '', goal: '', deadline: '', teamSize: 3, provider: 'openai', model: '' });
      setSelectedSprint(data.data);
    },
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
    },
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

  const handleGenerate = () => {
    generateMutation.mutate({
      title: genForm.title || genForm.goal.slice(0, 100),
      goal: genForm.goal,
      deadline: formatDeadline(genForm.deadline),
      teamSize: genForm.teamSize,
      provider: genForm.provider,
      model: genForm.model,
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-600';
      case 'ACTIVE': return 'bg-[#7b68ee]/10 text-[#7b68ee]';
      case 'COMPLETED': return 'bg-green-50 text-green-600';
      case 'ARCHIVED': return 'bg-amber-50 text-amber-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const tabs = [
    { key: 'tasks', label: 'Tasks', icon: ListChecks },
    { key: 'milestones', label: 'Milestones', icon: Target },
    { key: 'risks', label: 'Risks', icon: AlertTriangle },
    { key: 'daily', label: 'Daily Plan', icon: Calendar },
  ];

  // ─── Sprint Detail View ───
  if (selectedSprint) {
    const plan = selectedSprint.data || selectedSprint.plan || selectedSprint;
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <button onClick={() => setSelectedSprint(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sprints
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold text-[#1a1a2e] truncate">{selectedSprint.title || plan.sprintGoal || plan.goal}</h1>
              {selectedSprint.status && (
                <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap', getStatusStyle(selectedSprint.status))}>
                  {selectedSprint.status}
                </span>
              )}
            </div>
            {selectedSprint.goal && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{selectedSprint.goal}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedSprint.id && selectedSprint.status === 'DRAFT' && (
              <button
                onClick={() => convertMutation.mutate(selectedSprint.id)}
                disabled={convertMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Convert to Tasks</span>
                <span className="sm:hidden">Convert</span>
              </button>
            )}
            {selectedSprint.id && (
              <button
                onClick={() => { if (confirm('Delete this sprint?')) deleteMutation.mutate(selectedSprint.id); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-red-500 text-sm rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Info bar */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          {selectedSprint.deadline && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-100 rounded-lg">
              <Calendar className="h-3 w-3" /> {new Date(selectedSprint.deadline).toLocaleDateString()}
            </span>
          )}
          {selectedSprint.teamSize && (
            <span className="px-2.5 py-1 bg-white border border-gray-100 rounded-lg">
              Team: {selectedSprint.teamSize}
            </span>
          )}
          {plan.tasks?.length > 0 && (
            <span className="px-2.5 py-1 bg-white border border-gray-100 rounded-lg">
              {plan.tasks.length} tasks
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 -mx-1 px-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === t.key
                  ? 'border-[#7b68ee] text-[#7b68ee]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
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
            {(plan.tasks || []).map((task: any, i: number) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-300 shrink-0" />
                      <h3 className="font-medium text-sm text-[#1a1a2e] truncate">{task.title}</h3>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-400 mt-1 ml-6 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-6 sm:ml-0 shrink-0 flex-wrap">
                    <span className={cn(
                      'text-[11px] px-2 py-0.5 rounded font-medium',
                      task.priority === 'HIGH' || task.priority === 'CRITICAL' ? 'bg-red-50 text-red-600' :
                      task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                    )}>
                      {task.priority || 'MEDIUM'}
                    </span>
                    {(task.estimatedHours || task.estimate) && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
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
              <p className="text-center text-gray-400 text-sm py-8">No tasks in this sprint plan</p>
            )}
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(plan.milestones || []).map((m: any, i: number) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#7b68ee]/10 flex items-center justify-center shrink-0">
                  <Target className="h-4 w-4 text-[#7b68ee]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-[#1a1a2e]">{m.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{m.description}</p>
                </div>
                {(m.date || m.day) && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded whitespace-nowrap shrink-0">
                    <Calendar className="h-3 w-3" />{m.date || `Day ${m.day}`}
                  </span>
                )}
              </div>
            ))}
            {(!plan.milestones || plan.milestones.length === 0) && (
              <p className="text-center text-gray-400 text-sm py-8 col-span-full">No milestones defined</p>
            )}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(plan.risks || []).map((r: any, i: number) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-[#1a1a2e]">{r.risk || r.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{r.mitigation}</p>
                </div>
                <span className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0',
                  r.severity === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
                )}>
                  {r.severity || 'MEDIUM'}
                </span>
              </div>
            ))}
            {(!plan.risks || plan.risks.length === 0) && (
              <p className="text-center text-gray-400 text-sm py-8 col-span-full">No risks identified</p>
            )}
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(plan.dailyPlan || []).map((day: any, i: number) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-[#7b68ee] bg-[#7b68ee]/10 px-2 py-0.5 rounded">Day {day.day || i + 1}</span>
                  {day.focus && <span className="text-xs text-gray-400 truncate">{day.focus}</span>}
                </div>
                <ul className="space-y-1.5">
                  {(day.tasks || day.activities || []).map((t: any, j: number) => (
                    <li key={j} className="text-sm text-gray-500 flex items-start gap-2">
                      <ListChecks className="h-3 w-3 text-gray-300 mt-1 shrink-0" />
                      <span className="line-clamp-2">{typeof t === 'string' ? t : t.title || t.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {(!plan.dailyPlan || plan.dailyPlan.length === 0) && (
              <p className="text-center text-gray-400 text-sm py-8 col-span-full">No daily plan defined</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Sprint List View ───
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-semibold text-[#1a1a2e]">Sprint Planner</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
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

      {/* Sprint List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(sprints?.data || []).map((sprint: any) => (
          <div
            key={sprint.id}
            className="bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all group"
            onClick={() => setSelectedSprint(sprint)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm text-[#1a1a2e] truncate">{sprint.title || sprint.goal}</h3>
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0', getStatusStyle(sprint.status))}>
                    {sprint.status}
                  </span>
                </div>
                {sprint.goal && (
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{sprint.goal}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
              {sprint.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(sprint.deadline).toLocaleDateString()}
                </span>
              )}
              {sprint.teamSize && (
                <span>{sprint.teamSize} members</span>
              )}
              <span className="ml-auto">{new Date(sprint.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {(!sprints?.data || sprints.data.length === 0) && (
        <div className="text-center py-16">
          <Zap className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h3 className="font-medium text-[#1a1a2e] mb-1">No Sprint Plans Yet</h3>
          <p className="text-sm text-gray-400 mb-5 max-w-md mx-auto">
            Create a sprint manually or use AI to generate a complete plan with tasks, milestones, and daily schedules.
          </p>
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
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
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a2e]">Create Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Title</label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Sprint 1 — MVP Launch"
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Goal</label>
              <Textarea
                value={createForm.goal}
                onChange={(e) => setCreateForm({ ...createForm, goal: e.target.value })}
                placeholder="What do you want to accomplish?"
                rows={3}
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Deadline</label>
                <Input
                  type="date"
                  value={createForm.deadline}
                  onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                  className="border-gray-200 focus:border-[#7b68ee]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Team Size</label>
                <Input
                  type="number" min={1} max={20}
                  value={createForm.teamSize}
                  onChange={(e) => setCreateForm({ ...createForm, teamSize: parseInt(e.target.value) || 1 })}
                  className="border-gray-200 focus:border-[#7b68ee]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
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
        <DialogContent className="bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a2e] flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#7b68ee]" /> AI Sprint Planner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Sprint Title</label>
              <Input
                value={genForm.title}
                onChange={(e) => setGenForm({ ...genForm, title: e.target.value })}
                placeholder="e.g. Sprint 1 — Auth & Dashboard"
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Sprint Goal</label>
              <Textarea
                value={genForm.goal}
                onChange={(e) => setGenForm({ ...genForm, goal: e.target.value })}
                placeholder="Describe what you want to accomplish in this sprint..."
                rows={3}
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Deadline</label>
                <Input
                  type="date"
                  value={genForm.deadline}
                  onChange={(e) => setGenForm({ ...genForm, deadline: e.target.value })}
                  className="border-gray-200 focus:border-[#7b68ee]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Team Size</label>
                <Input
                  type="number" min={1} max={20}
                  value={genForm.teamSize}
                  onChange={(e) => setGenForm({ ...genForm, teamSize: parseInt(e.target.value) || 1 })}
                  className="border-gray-200 focus:border-[#7b68ee]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">AI Provider</label>
                <Select value={genForm.provider} onValueChange={(v) => setGenForm({ ...genForm, provider: v, model: '' })}>
                  <SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Model</label>
                <Select value={genForm.model} onValueChange={(v) => setGenForm({ ...genForm, model: v })}>
                  <SelectTrigger className="border-gray-200"><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>
                    {providerModels.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowGenerate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!genForm.goal || !genForm.deadline || generateMutation.isPending}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Plan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}