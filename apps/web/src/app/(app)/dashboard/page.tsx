'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, MessageSquare, GitBranch, Calendar,
  Zap, FileText, TrendingUp, Clock, ArrowRight, Plus,
  Target, BarChart3, Activity, Sparkles, BookOpen,
  Users, ChevronRight, Flame, Star,
} from 'lucide-react';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProjectIcon, PROJECT_ICON_MAP } from '@/components/shared/project-icon';

const PROJECT_COLORS = [
  '#7b68ee', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
  '#6366f1', '#84cc16',
];

const PROJECT_ICONS = Object.keys(PROJECT_ICON_MAP);

const PROJECT_DEPENDENT_HREFS = new Set(['/goals', '/tasks', '/brainstorm', '/diagrams', '/calendar', '/sprints', '/notes']);

export default function DashboardPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const teamId = activeTeam?.id;

  // Create project modal state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [cpName, setCpName] = useState('');
  const [cpDescription, setCpDescription] = useState('');
  const [cpColor, setCpColor] = useState(PROJECT_COLORS[0]);
  const [cpIcon, setCpIcon] = useState(PROJECT_ICONS[0]);

  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color: string; icon: string }) =>
      api.post(`/teams/${teamId}/projects`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
      setCpName('');
      setCpDescription('');
      setCpColor(PROJECT_COLORS[0]);
      setCpIcon(PROJECT_ICONS[0]);
      setShowCreateProject(false);
    },
  });

  function handleCreateProject() {
    if (!cpName.trim()) return;
    createProjectMutation.mutate({ name: cpName.trim(), description: cpDescription.trim() || undefined, color: cpColor, icon: cpIcon });
  }

  function openCreateProjectModal() {
    setCpName('');
    setCpDescription('');
    setCpColor(PROJECT_COLORS[0]);
    setCpIcon(PROJECT_ICONS[0]);
    setShowCreateProject(true);
  }

  const { data: projectsRes } = useQuery({
    queryKey: ['projects', teamId],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/projects'),
    enabled: !!teamId,
  });
  const projectList = projectsRes?.data || [];
  const hasProjects = projectList.length > 0;

  const { data: tasks } = useQuery({
    queryKey: ['tasks', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/tasks' + (activeProject?.id ? '?projectId=' + activeProject.id : '')),
    enabled: !!teamId,
  });

  const { data: brainstorms } = useQuery({
    queryKey: ['brainstorms', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/brainstorm' + (activeProject?.id ? '?projectId=' + activeProject.id : '')),
    enabled: !!teamId,
  });

  const { data: diagrams } = useQuery({
    queryKey: ['diagrams', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/diagrams' + (activeProject?.id ? '?projectId=' + activeProject.id : '')),
    enabled: !!teamId,
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/sprints' + (activeProject?.id ? '?projectId=' + activeProject.id : '')),
    enabled: !!teamId,
  });

  const { data: notes } = useQuery({
    queryKey: ['notes', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/notes' + (activeProject?.id ? '?projectId=' + activeProject.id : '')),
    enabled: !!teamId,
  });

  const { data: goals } = useQuery({
    queryKey: ['goals', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/goals' + (activeProject?.id ? '?projectId=' + activeProject.id : '')),
    enabled: !!teamId,
  });

  const taskList = tasks?.data || [];
  const todoCount = taskList.filter((t: any) => t.status === 'TODO').length;
  const inProgressCount = taskList.filter((t: any) => t.status === 'IN_PROGRESS').length;
  const inReviewCount = taskList.filter((t: any) => t.status === 'IN_REVIEW').length;
  const doneCount = taskList.filter((t: any) => t.status === 'DONE').length;
  const totalTasks = taskList.length;
  const completionPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const recentTasks = taskList.slice(0, 5);
  const urgentTasks = taskList.filter((t: any) => t.priority === 'URGENT' && t.status !== 'DONE');

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
    TODO: { text: 'To Do', color: '#6b7280', bg: '#6b728015' },
    IN_PROGRESS: { text: 'In Progress', color: '#3b82f6', bg: '#3b82f615' },
    IN_REVIEW: { text: 'In Review', color: '#f59e0b', bg: '#f59e0b15' },
    DONE: { text: 'Done', color: '#22c55e', bg: '#22c55e15' },
  };

  const priorityLabel: Record<string, { text: string; color: string }> = {
    URGENT: { text: 'Urgent', color: '#ef4444' },
    HIGH: { text: 'High', color: '#f97316' },
    MEDIUM: { text: 'Medium', color: '#f59e0b' },
    LOW: { text: 'Low', color: '#6b7280' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 px-1">
      {/* Welcome header - Enhanced */}
      <div className="bg-gradient-to-br from-[#7b68ee] via-[#8b7cf6] to-[#a78bfa] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {greeting}, {user?.name?.split(' ')[0] || 'User'} 👋
              </h1>
              <p className="text-sm text-white/70 mt-2 max-w-lg leading-relaxed">
                {activeTeam ? activeTeam.name + ' workspace' : 'Create a team to get started'}
                {activeProject ? ' · ' + activeProject.name : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/ai-chat')}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white/15 backdrop-blur-sm text-white text-sm font-medium rounded-xl hover:bg-white/25 transition-colors border border-white/10"
              >
                <Sparkles className="h-3.5 w-3.5" /> AI Chat
              </button>
              {hasProjects ? (
                <button
                  onClick={() => router.push('/tasks?new=true')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-xl hover:bg-white/30 transition-colors border border-white/10"
                >
                  <Plus className="h-3.5 w-3.5" /> New Task
                </button>
              ) : (
                <button
                  onClick={openCreateProjectModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-xl hover:bg-white/30 transition-colors border border-white/10"
                >
                  <Plus className="h-3.5 w-3.5" /> New Project
                </button>
              )}
            </div>
          </div>

          {/* Progress section in hero */}
          {totalTasks > 0 && (
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/90">Project Progress</span>
                <span className="text-2xl font-bold text-white">{completionPct}%</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-white/20">
                <div className="bg-white rounded-full transition-all duration-500" style={{ width: completionPct + '%' }} />
              </div>
              <div className="flex items-center gap-4 mt-2.5">
                <span className="text-xs text-white/60">{doneCount} of {totalTasks} tasks completed</span>
                {inProgressCount > 0 && <span className="text-xs text-white/60">· {inProgressCount} in progress</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats row - Enhanced */}
      {hasProjects && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks', value: totalTasks, icon: CheckSquare, color: '#7b68ee', change: inProgressCount > 0 ? inProgressCount + ' active' : undefined },
          { label: 'In Progress', value: inProgressCount, icon: Activity, color: '#3b82f6', change: inReviewCount > 0 ? inReviewCount + ' in review' : undefined },
          { label: 'Completed', value: doneCount, icon: TrendingUp, color: '#22c55e', change: completionPct > 0 ? completionPct + '% done' : undefined },
          { label: 'Notes', value: notes?.data?.length || 0, icon: FileText, color: '#8b5cf6', change: undefined },
        ].map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '12' }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </div>
            {change && (
              <div className="mt-3 pt-2.5 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground">{change}</span>
              </div>
            )}
          </div>
        ))}
      </div>}

      {/* Task distribution bar - Enhanced */}
      {hasProjects && totalTasks > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#7b68ee]" /> Task Distribution
            </h3>
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{totalTasks} total</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted gap-0.5">
            {todoCount > 0 && (
              <div className="bg-gray-400 rounded-full transition-all" style={{ width: (todoCount / totalTasks * 100) + '%' }} title={'To Do: ' + todoCount} />
            )}
            {inProgressCount > 0 && (
              <div className="bg-[#3b82f6] rounded-full transition-all" style={{ width: (inProgressCount / totalTasks * 100) + '%' }} title={'In Progress: ' + inProgressCount} />
            )}
            {inReviewCount > 0 && (
              <div className="bg-[#f59e0b] rounded-full transition-all" style={{ width: (inReviewCount / totalTasks * 100) + '%' }} title={'In Review: ' + inReviewCount} />
            )}
            {doneCount > 0 && (
              <div className="bg-[#22c55e] rounded-full transition-all" style={{ width: (doneCount / totalTasks * 100) + '%' }} title={'Completed: ' + doneCount} />
            )}
          </div>
          <div className="flex items-center gap-5 mt-3">
            {[
              { label: 'To Do', count: todoCount, color: '#9ca3af' },
              { label: 'In Progress', count: inProgressCount, color: '#3b82f6' },
              { label: 'In Review', count: inReviewCount, color: '#f59e0b' },
              { label: 'Completed', count: doneCount, color: '#22c55e' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-muted-foreground">{item.label} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No projects banner */}
      {!hasProjects && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-[#7b68ee]/10 flex items-center justify-center mb-4">
            <FolderKanban className="h-8 w-8 text-[#7b68ee]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Create Your First Project</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Create a project to start using Tasks, Brainstorm, Notes, Diagrams, Sprints, Calendar, and Goals.
          </p>
          <button
            onClick={openCreateProjectModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7b68ee] text-white text-sm font-medium rounded-xl hover:bg-[#6c5ce7] transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Project
          </button>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Tasks - wider */}
        {hasProjects && <div className="lg:col-span-3 space-y-4">
          {/* Urgent tasks alert */}
          {urgentTasks.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-red-500" />
                </div>
                <h3 className="text-sm font-semibold text-red-500">Urgent Tasks</h3>
                <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full">{urgentTasks.length}</span>
              </div>
              <div className="space-y-1.5">
                {urgentTasks.slice(0, 3).map((task: any) => {
                  const status = statusLabel[task.status] || statusLabel.TODO;
                  return (
                    <Link key={task.id} href="/tasks" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/5 transition-colors">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm text-foreground flex-1 truncate">{task.title}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: status.color, backgroundColor: status.bg }}>
                        {status.text}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent tasks */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[#7b68ee]" /> Recent Tasks
              </h3>
              <Link href="/tasks" className="text-[11px] text-[#7b68ee] hover:underline flex items-center gap-0.5 font-medium">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentTasks.length === 0 ? (
              <div className="text-center py-14 px-4">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <CheckSquare className="h-7 w-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No tasks yet</p>
                <p className="text-xs text-muted-foreground mb-4">Create your first task to get started</p>
                <button
                  onClick={() => router.push('/tasks?new=true')}
                  className="inline-flex items-center gap-1.5 text-xs text-[#7b68ee] hover:text-[#6c5ce7] font-medium px-3 py-1.5 bg-[#7b68ee]/10 rounded-lg transition-colors"
                >
                  <Plus className="h-3 w-3" /> Create Task
                </button>
              </div>
            ) : (
              <div>
                {recentTasks.map((task: any, i: number) => {
                  const status = statusLabel[task.status] || statusLabel.TODO;
                  const priority = priorityLabel[task.priority] || priorityLabel.MEDIUM;
                  return (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className={'flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors' + (i < recentTasks.length - 1 ? ' border-b border-border/40' : '')}
                    >
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: priority.color }} title={priority.text} />
                      <span className="text-sm text-foreground flex-1 truncate">{task.title}</span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ color: status.color, backgroundColor: status.bg }}
                      >
                        {status.text}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>}

        {/* Right column */}
        <div className={hasProjects ? 'lg:col-span-2 space-y-4' : 'lg:col-span-5 space-y-4'}>
          {/* Quick Access - Enhanced */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#f59e0b]" /> Quick Access
              </h3>
            </div>
            <div className="p-2">
              {[
                { label: 'Tasks', desc: totalTasks + ' total', href: '/tasks', icon: CheckSquare, color: '#7b68ee' },
                { label: 'Brainstorm', desc: (brainstorms?.data?.length || 0) + ' sessions', href: '/brainstorm', icon: MessageSquare, color: '#22c55e' },
                { label: 'Notes', desc: (notes?.data?.length || 0) + ' notes', href: '/notes', icon: BookOpen, color: '#8b5cf6' },
                { label: 'Diagrams', desc: (diagrams?.data?.length || 0) + ' diagrams', href: '/diagrams', icon: GitBranch, color: '#f59e0b' },
                { label: 'Sprints', desc: (sprints?.data?.length || 0) + ' sprints', href: '/sprints', icon: Zap, color: '#ef4444' },
                { label: 'AI Chat', desc: 'Ask anything', href: '/ai-chat', icon: Sparkles, color: '#7b68ee' },
                { label: 'Calendar', desc: 'View schedule', href: '/calendar', icon: Calendar, color: '#3b82f6' },
                { label: 'Goals', desc: (goals?.data?.length || 0) + ' goals', href: '/goals', icon: Target, color: '#f97316' },
              ].filter(({ href }) => hasProjects || !PROJECT_DEPENDENT_HREFS.has(href)).map(({ label, desc, href, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors group"
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: color + '12' }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* Workspace overview */}
          {hasProjects && <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-[#f59e0b]" /> Workspace Overview
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Brainstorms', count: brainstorms?.data?.length || 0, color: '#22c55e', icon: MessageSquare },
                { label: 'Notes', count: notes?.data?.length || 0, color: '#8b5cf6', icon: FileText },
                { label: 'Diagrams', count: diagrams?.data?.length || 0, color: '#f59e0b', icon: GitBranch },
                { label: 'Sprints', count: sprints?.data?.length || 0, color: '#ef4444', icon: Zap },
                { label: 'Goals', count: goals?.data?.length || 0, color: '#f97316', icon: Target },
              ].map(({ label, count, color, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded flex items-center justify-center" style={{ backgroundColor: color + '12' }}>
                      <Icon className="h-3 w-3" style={{ color }} />
                    </div>
                    <span className="text-[13px] text-muted-foreground">{label}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>}
        </div>
      </div>

      {/* Create Project Modal */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-accent/30">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${cpColor}18` }}>
                <ProjectIcon icon={cpIcon} className="h-5 w-5" style={{ color: cpColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{cpName || 'Project Name'}</p>
                <p className="text-xs text-muted-foreground truncate">{cpDescription || 'Description'}</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input placeholder="e.g., Mobile App, Marketing Site" value={cpName}
                onChange={e => setCpName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateProject()} autoFocus />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <Textarea placeholder="What is this project about?" value={cpDescription}
                onChange={e => setCpDescription(e.target.value)} rows={2} className="resize-none" />
            </div>

            {/* Icon picker */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_ICONS.map(i => (
                  <button key={i} onClick={() => setCpIcon(i)}
                    className={cn('h-9 w-9 rounded-lg flex items-center justify-center transition-all',
                      cpIcon === i ? 'bg-accent ring-2 ring-[#7b68ee] scale-110' : 'hover:bg-accent')}>
                    <ProjectIcon icon={i} className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setCpColor(c)}
                    className={cn('h-7 w-7 rounded-full transition-all',
                      cpColor === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110')}
                    style={{ backgroundColor: c, boxShadow: cpColor === c ? `0 0 0 2px ${c}` : undefined }} />
                ))}
              </div>
            </div>

            <Button onClick={handleCreateProject} disabled={!cpName.trim() || createProjectMutation.isPending}
              className="w-full bg-[#7b68ee] hover:bg-[#6c5ce7] text-white">
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
