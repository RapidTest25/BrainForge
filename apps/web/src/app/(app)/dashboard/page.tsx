'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare, MessageSquare, GitBranch, Calendar,
  Zap, FileText, TrendingUp, Clock, ArrowRight, Plus,
  Target, BarChart3, Activity
} from 'lucide-react';
import { useTeamStore } from '@/stores/team-store';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { activeTeam } = useTeamStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const teamId = activeTeam?.id;

  const { data: tasks } = useQuery({
    queryKey: ['tasks', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/tasks`),
    enabled: !!teamId,
  });

  const { data: brainstorms } = useQuery({
    queryKey: ['brainstorms', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/brainstorm`),
    enabled: !!teamId,
  });

  const { data: diagrams } = useQuery({
    queryKey: ['diagrams', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/diagrams`),
    enabled: !!teamId,
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/sprints`),
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

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
    TODO: { text: 'To Do', color: '#6b7280', bg: '#f3f4f6' },
    IN_PROGRESS: { text: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
    IN_REVIEW: { text: 'In Review', color: '#f59e0b', bg: '#fffbeb' },
    DONE: { text: 'Done', color: '#22c55e', bg: '#f0fdf4' },
  };

  const priorityLabel: Record<string, { text: string; color: string }> = {
    URGENT: { text: 'Urgent', color: '#ef4444' },
    HIGH: { text: 'High', color: '#f97316' },
    MEDIUM: { text: 'Medium', color: '#f59e0b' },
    LOW: { text: 'Low', color: '#6b7280' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-[#7b68ee] via-[#8b7cf6] to-[#a78bfa] rounded-2xl p-5 md:p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {greeting}, {user?.name?.split(' ')[0] || 'User'} 👋
            </h1>
            <p className="text-sm text-white/70 mt-1">
              {activeTeam ? `${activeTeam.name} workspace` : 'Create a team to get started'}
              {totalTasks > 0 && ` · ${completionPct}% tasks completed`}
            </p>
          </div>
          <button
            onClick={() => router.push('/tasks?new=true')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-xl hover:bg-white/30 transition-colors border border-white/10"
          >
            <Plus className="h-3.5 w-3.5" /> New Task
          </button>
        </div>
        {totalTasks > 0 && (
          <div className="relative mt-4">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/20">
              <div className="bg-white/90 transition-all rounded-full" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks', value: totalTasks, icon: CheckSquare, color: '#7b68ee' },
          { label: 'In Progress', value: inProgressCount, icon: Clock, color: '#3b82f6' },
          { label: 'Completed', value: doneCount, icon: TrendingUp, color: '#22c55e' },
          { label: 'Brainstorms', value: brainstorms?.data?.length || 0, icon: MessageSquare, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1a1a2e]">{value}</p>
                <p className="text-[11px] text-gray-400">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Task distribution bar */}
      {totalTasks > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#1a1a2e]">Task Distribution</h3>
            <span className="text-[11px] text-gray-400">{totalTasks} total</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
            {todoCount > 0 && (
              <div className="bg-gray-400 transition-all" style={{ width: `${(todoCount / totalTasks) * 100}%` }} />
            )}
            {inProgressCount > 0 && (
              <div className="bg-[#3b82f6] transition-all" style={{ width: `${(inProgressCount / totalTasks) * 100}%` }} />
            )}
            {inReviewCount > 0 && (
              <div className="bg-[#f59e0b] transition-all" style={{ width: `${(inReviewCount / totalTasks) * 100}%` }} />
            )}
            {doneCount > 0 && (
              <div className="bg-[#22c55e] transition-all" style={{ width: `${(doneCount / totalTasks) * 100}%` }} />
            )}
          </div>
          <div className="flex items-center gap-5 mt-2.5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-[11px] text-gray-500">To Do ({todoCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[11px] text-gray-500">In Progress ({inProgressCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span className="text-[11px] text-gray-500">In Review ({inReviewCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
              <span className="text-[11px] text-gray-500">Completed ({doneCount})</span>
            </div>
          </div>
        </div>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Tasks - wider */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-[#1a1a2e]">Recent Tasks</h3>
            <Link href="/tasks" className="text-[11px] text-[#7b68ee] hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-3">No tasks yet</p>
              <button
                onClick={() => router.push('/tasks?new=true')}
                className="text-xs text-[#7b68ee] hover:underline"
              >
                Create your first task
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
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 transition-colors ${i < recentTasks.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: priority.color }} />
                    <span className="text-sm text-[#1a1a2e] flex-1 truncate">{task.title}</span>
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

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Access */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-4 py-3 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Quick Access</h3>
            </div>
            <div className="p-1.5">
              {[
                { label: 'Tasks', desc: `${totalTasks} total`, href: '/tasks', icon: CheckSquare, color: '#7b68ee' },
                { label: 'Brainstorm', desc: `${brainstorms?.data?.length || 0} sessions`, href: '/brainstorm', icon: MessageSquare, color: '#22c55e' },
                { label: 'Diagrams', desc: `${diagrams?.data?.length || 0} diagrams`, href: '/diagrams', icon: GitBranch, color: '#f59e0b' },
                { label: 'Sprints', desc: `${sprints?.data?.length || 0} sprints`, href: '/sprints', icon: Zap, color: '#ef4444' },
                { label: 'Calendar', desc: 'View schedule', href: '/calendar', icon: Calendar, color: '#3b82f6' },
                { label: 'Notes', desc: 'Write notes', href: '/notes', icon: FileText, color: '#8b5cf6' },
              ].map(({ label, desc, href, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}12` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a2e]">{label}</p>
                    <p className="text-[10px] text-gray-400">{desc}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-gray-300" />
                </Link>
              ))}
            </div>
          </div>

          {/* Workspace overview mini */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Workspace Overview</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Diagrams', count: diagrams?.data?.length || 0, color: '#f59e0b' },
                { label: 'Sprints', count: sprints?.data?.length || 0, color: '#ef4444' },
                { label: 'Brainstorm sessions', count: brainstorms?.data?.length || 0, color: '#22c55e' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[13px] text-gray-500">{label}</span>
                  </div>
                  <span className="text-[13px] font-medium text-[#1a1a2e]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
