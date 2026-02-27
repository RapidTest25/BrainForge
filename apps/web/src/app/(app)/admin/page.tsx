'use client';

import { useState, useEffect } from 'react';
import {
  Users, Building2, BarChart3, CheckSquare, MessageSquare,
  FileText, GitBranch, FolderKanban, Key, Bot,
  TrendingUp, UserPlus, Loader2, ArrowUpRight, Activity,
  ArrowDownRight, Calendar, Target, Zap,
} from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  totalTeams: number;
  totalProjects: number;
  totalTasks: number;
  totalAiKeys: number;
  totalBrainstorms: number;
  totalDiagrams: number;
  totalNotes: number;
  totalDiscussions?: number;
  totalGoals?: number;
  totalCalendarEvents?: number;
  totalSprintPlans?: number;
  totalAiChats?: number;
  newUsersThisMonth: number;
  aiUsage: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
  tasksByStatus?: { status: string; _count: number }[];
  tasksByPriority?: { priority: string; _count: number }[];
}

interface RecentActivity {
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
  recentTasks: { id: string; title: string; status: string; createdAt: string; creator: { name: string } }[];
  recentSessions: { id: string; title: string; mode: string; createdAt: string; creator: { name: string } }[];
}

interface GrowthData {
  users: { current: number; previous: number; changePercent: number };
  tasks: { current: number; previous: number; changePercent: number };
  brainstorms: { current: number; previous: number; changePercent: number };
  aiRequests: { current: number; previous: number; changePercent: number };
}

// ── Stat Card ──────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub, trend }: {
  icon: any; label: string; value: number | string; color: string; sub?: string; trend?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Quick Link ──────────────────────────────────────────
function QuickLink({ href, icon: Icon, label, description, color }: {
  href: string; icon: any; label: string; description: string; color: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-sm hover:border-border/80 transition-all"
    >
      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </a>
  );
}

// ── Growth Mini Card ──────────────────────────────────
function GrowthMini({ label, current, changePercent, icon: Icon, color }: {
  label: string; current: number; changePercent: number; icon: any; color: string;
}) {
  const isPositive = changePercent >= 0;
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{current}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
      {changePercent !== 0 && (
        <span className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
          isPositive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-red-600 bg-red-50 dark:bg-red-500/10'
        }`}>
          {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
          {Math.abs(changePercent).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  TODO: '#6b7280', IN_PROGRESS: '#3b82f6', IN_REVIEW: '#f59e0b', DONE: '#22c55e', CANCELLED: '#ef4444', BACKLOG: '#8b5cf6',
};

// ── Main Admin Overview Page ──────────────────────────
export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchActivity(), fetchGrowth()]).finally(() => setLoading(false));
  }, []);

  async function fetchStats() {
    try {
      const res: any = await api.get('/admin/stats');
      setStats(res.data);
    } catch {}
  }

  async function fetchActivity() {
    try {
      const res: any = await api.get('/admin/activity');
      setActivity(res.data);
    } catch {}
  }

  async function fetchGrowth() {
    try {
      const res: any = await api.get('/admin/growth');
      setGrowth(res.data);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Failed to load stats. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor your platform&apos;s health and activity at a glance.</p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#7b68ee" trend={stats.newUsersThisMonth > 0 ? `+${stats.newUsersThisMonth}` : undefined} sub="Active accounts" />
        <StatCard icon={Building2} label="Teams" value={stats.totalTeams} color="#3b82f6" sub="Active teams" />
        <StatCard icon={FolderKanban} label="Projects" value={stats.totalProjects} color="#22c55e" sub="Across all teams" />
        <StatCard icon={CheckSquare} label="Tasks" value={stats.totalTasks} color="#f59e0b" sub="Total created" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={MessageSquare} label="Brainstorms" value={stats.totalBrainstorms} color="#22c55e" />
        <StatCard icon={GitBranch} label="Diagrams" value={stats.totalDiagrams} color="#f59e0b" />
        <StatCard icon={FileText} label="Notes" value={stats.totalNotes} color="#8b5cf6" />
        <StatCard icon={Key} label="AI API Keys" value={stats.totalAiKeys} color="#ef4444" />
        {stats.totalAiChats !== undefined && (
          <StatCard icon={Bot} label="AI Chats" value={stats.totalAiChats} color="#7c3aed" />
        )}
      </div>

      {/* Growth + Task Status row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Panel */}
        {growth && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Growth (Last 30 Days)
              </h3>
              <a href="/admin/system" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Details <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <GrowthMini icon={Users} label="New Users" current={growth.users.current} changePercent={growth.users.changePercent} color="#3b82f6" />
              <GrowthMini icon={CheckSquare} label="New Tasks" current={growth.tasks.current} changePercent={growth.tasks.changePercent} color="#f59e0b" />
              <GrowthMini icon={MessageSquare} label="Brainstorms" current={growth.brainstorms.current} changePercent={growth.brainstorms.changePercent} color="#22c55e" />
              <GrowthMini icon={Bot} label="AI Requests" current={growth.aiRequests.current} changePercent={growth.aiRequests.changePercent} color="#8b5cf6" />
            </div>
          </div>
        )}

        {/* Task Status Breakdown */}
        {stats.tasksByStatus && stats.tasksByStatus.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                Task Status Breakdown
              </h3>
            </div>
            <div className="space-y-3">
              {stats.tasksByStatus.map(s => {
                const total = stats.tasksByStatus!.reduce((a, b) => a + b._count, 0);
                const pct = total > 0 ? (s._count / total) * 100 : 0;
                const color = STATUS_COLORS[s.status] || '#6b7280';
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{s.status.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-medium text-foreground">{s._count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI Usage + Activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Usage Panel */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-500" />
              AI Usage (Last 30 Days)
            </h3>
            <a href="/admin/ai-usage" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View details <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{stats.aiUsage.requests.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">API Requests</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">${stats.aiUsage.totalCost.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">Estimated Cost</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{stats.aiUsage.inputTokens > 1000 ? `${(stats.aiUsage.inputTokens / 1000).toFixed(1)}K` : stats.aiUsage.inputTokens}</p>
              <p className="text-xs text-muted-foreground">Input Tokens</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{stats.aiUsage.outputTokens > 1000 ? `${(stats.aiUsage.outputTokens / 1000).toFixed(1)}K` : stats.aiUsage.outputTokens}</p>
              <p className="text-xs text-muted-foreground">Output Tokens</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              Recent Activity
            </h3>
            <a href="/admin/activity" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          <div className="space-y-3">
            {activity?.recentUsers.slice(0, 3).map(u => (
              <div key={u.id} className="flex items-center gap-3 text-sm">
                <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{u.name}</span> joined the platform
                  </p>
                  <p className="text-[11px] text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {activity?.recentTasks.slice(0, 2).map(t => (
              <div key={t.id} className="flex items-center gap-3 text-sm">
                <div className="h-7 w-7 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                  <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{t.creator.name}</span> created &ldquo;{t.title}&rdquo;
                  </p>
                  <p className="text-[11px] text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {activity?.recentSessions.slice(0, 2).map(s => (
              <div key={s.id} className="flex items-center gap-3 text-sm">
                <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{s.creator.name}</span> started &ldquo;{s.title}&rdquo;
                  </p>
                  <p className="text-[11px] text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {!activity && <p className="text-xs text-muted-foreground">No recent activity</p>}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <QuickLink href="/admin/users" icon={Users} label="Manage Users" description="View, search, and manage accounts" color="#3b82f6" />
          <QuickLink href="/admin/teams" icon={Building2} label="Manage Teams" description="View team details and members" color="#22c55e" />
          <QuickLink href="/admin/activity" icon={Activity} label="Activity Log" description="Monitor platform activity" color="#f59e0b" />
          <QuickLink href="/admin/ai-usage" icon={Bot} label="AI Analytics" description="Usage stats by provider & model" color="#8b5cf6" />
        </div>
      </div>
    </div>
  );
}
