'use client';

import { useState, useEffect } from 'react';
import {
  Database, Server, Globe, Clock, Cpu, HardDrive,
  Loader2, RefreshCw, CheckCircle2, Shield, TrendingUp,
  TrendingDown, Users, FolderKanban, CheckSquare, MessageSquare,
  FileText, GitBranch, Key, Bot, ArrowUpRight, ArrowDownRight,
  Calendar, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface HealthData {
  status: string;
  timestamp?: string;
  [key: string]: any;
}

interface SystemStats {
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
  tasksByStatus?: { status: string; _count: number }[];
  tasksByPriority?: { priority: string; _count: number }[];
}

interface GrowthData {
  users: { current: number; previous: number; changePercent: number };
  tasks: { current: number; previous: number; changePercent: number };
  brainstorms: { current: number; previous: number; changePercent: number };
  aiRequests: { current: number; previous: number; changePercent: number };
  dailyRegistrations: { date: string; count: number }[];
}

function InfoRow({ label, value, icon: Icon, status }: {
  label: string; value: string; icon?: any; status?: 'ok' | 'warning' | 'error';
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{value}</span>
        {status === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
      </div>
    </div>
  );
}

function GrowthCard({ icon: Icon, label, current, changePercent, color }: {
  icon: any; label: string; current: number; changePercent: number; color: string;
}) {
  const isPositive = changePercent >= 0;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {changePercent !== 0 && (
          <span className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositive
              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'
              : 'text-red-600 bg-red-50 dark:bg-red-500/10'
          }`}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(changePercent).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-foreground">{current}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label} (30d)</p>
    </div>
  );
}

function DbRecordRow({ label, count, icon: Icon, color }: {
  label: string; count: number; icon: any; color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{count.toLocaleString()}</span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  TODO: '#6b7280',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#f59e0b',
  DONE: '#22c55e',
  CANCELLED: '#ef4444',
  BACKLOG: '#8b5cf6',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  URGENT: '#ef4444',
  NONE: '#6b7280',
};

export default function AdminSystemPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [statsRes, growthRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: null })),
        api.get('/admin/growth').catch(() => ({ data: null })),
      ]) as any[];
      setHealth({ status: statsRes.data ? 'ok' : 'unknown' });
      setStats(statsRes.data);
      setGrowth(growthRes.data);
    } catch {} finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }

  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform health, growth analytics, and infrastructure info.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health Status Banner */}
      <div className={`rounded-xl p-4 border flex items-center gap-3 ${
        isHealthy
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
          : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
      }`}>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
          isHealthy ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-red-100 dark:bg-red-500/20'
        }`}>
          {isHealthy ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Server className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
        </div>
        <div>
          <p className={`text-sm font-semibold ${isHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {isHealthy ? 'All Systems Operational' : 'System Status Unknown'}
          </p>
          <p className={`text-xs ${isHealthy ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-red-600/70 dark:text-red-400/70'}`}>
            Last checked: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Growth Analytics */}
      {growth && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Growth (Last 30 Days vs Previous 30 Days)
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GrowthCard icon={Users} label="New Users" current={growth.users.current} changePercent={growth.users.changePercent} color="#3b82f6" />
            <GrowthCard icon={CheckSquare} label="New Tasks" current={growth.tasks.current} changePercent={growth.tasks.changePercent} color="#f59e0b" />
            <GrowthCard icon={MessageSquare} label="Brainstorms" current={growth.brainstorms.current} changePercent={growth.brainstorms.changePercent} color="#22c55e" />
            <GrowthCard icon={Bot} label="AI Requests" current={growth.aiRequests.current} changePercent={growth.aiRequests.changePercent} color="#8b5cf6" />
          </div>

          {/* Daily Registrations Chart */}
          {growth.dailyRegistrations.length > 0 && (
            <div className="mt-4 bg-card border border-border rounded-xl p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Daily User Registrations</h4>
              <div className="flex items-end gap-1 h-24">
                {growth.dailyRegistrations.map((d, i) => {
                  const maxCount = Math.max(...growth.dailyRegistrations.map(x => Number(x.count)), 1);
                  const height = (Number(d.count) / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}: {d.count}
                      </div>
                      <div
                        className="w-full rounded-t bg-blue-500/80 hover:bg-blue-500 transition-colors min-h-[2px]"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(growth.dailyRegistrations[0]?.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(growth.dailyRegistrations[growth.dailyRegistrations.length - 1]?.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Records */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-500" />
            Database Records
          </h3>
          {stats ? (
            <div className="space-y-0">
              <DbRecordRow label="Users" count={stats.totalUsers} icon={Users} color="#3b82f6" />
              <DbRecordRow label="Teams" count={stats.totalTeams} icon={Activity} color="#22c55e" />
              <DbRecordRow label="Projects" count={stats.totalProjects} icon={FolderKanban} color="#10b981" />
              <DbRecordRow label="Tasks" count={stats.totalTasks} icon={CheckSquare} color="#f59e0b" />
              <DbRecordRow label="Brainstorms" count={stats.totalBrainstorms} icon={MessageSquare} color="#8b5cf6" />
              <DbRecordRow label="Diagrams" count={stats.totalDiagrams} icon={GitBranch} color="#f97316" />
              <DbRecordRow label="Notes" count={stats.totalNotes} icon={FileText} color="#06b6d4" />
              <DbRecordRow label="AI Keys" count={stats.totalAiKeys} icon={Key} color="#ef4444" />
              {stats.totalDiscussions !== undefined && (
                <DbRecordRow label="Discussions" count={stats.totalDiscussions} icon={MessageSquare} color="#ec4899" />
              )}
              {stats.totalGoals !== undefined && (
                <DbRecordRow label="Goals" count={stats.totalGoals} icon={TrendingUp} color="#14b8a6" />
              )}
              {stats.totalCalendarEvents !== undefined && (
                <DbRecordRow label="Calendar Events" count={stats.totalCalendarEvents} icon={Calendar} color="#6366f1" />
              )}
              {stats.totalSprintPlans !== undefined && (
                <DbRecordRow label="Sprint Plans" count={stats.totalSprintPlans} icon={Activity} color="#a855f7" />
              )}
              {stats.totalAiChats !== undefined && (
                <DbRecordRow label="AI Chats" count={stats.totalAiChats} icon={Bot} color="#7c3aed" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load database stats.</p>
          )}
        </div>

        {/* Task Breakdown */}
        <div className="space-y-6">
          {/* Tasks by Status */}
          {stats?.tasksByStatus && stats.tasksByStatus.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-amber-500" />
                Tasks by Status
              </h3>
              <div className="space-y-3">
                {stats.tasksByStatus.map(s => {
                  const total = stats.tasksByStatus!.reduce((a, b) => a + b._count, 0);
                  const pct = total > 0 ? (s._count / total) * 100 : 0;
                  const color = STATUS_COLORS[s.status] || '#6b7280';
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{s.status.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-medium text-foreground">{s._count} ({pct.toFixed(0)}%)</span>
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

          {/* Tasks by Priority */}
          {stats?.tasksByPriority && stats.tasksByPriority.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-500" />
                Tasks by Priority
              </h3>
              <div className="space-y-3">
                {stats.tasksByPriority.map(p => {
                  const total = stats.tasksByPriority!.reduce((a, b) => a + b._count, 0);
                  const pct = total > 0 ? (p._count / total) * 100 : 0;
                  const color = PRIORITY_COLORS[p.priority] || '#6b7280';
                  return (
                    <div key={p.priority}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{p.priority || 'NONE'}</span>
                        <span className="text-xs font-medium text-foreground">{p._count} ({pct.toFixed(0)}%)</span>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            Server Information
          </h3>
          <div className="space-y-0">
            <InfoRow label="API Status" value={isHealthy ? 'Healthy' : 'Unknown'} icon={CheckCircle2} status={isHealthy ? 'ok' : undefined} />
            <InfoRow label="API URL" value={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'} icon={Globe} />
            <InfoRow label="Environment" value={process.env.NODE_ENV || 'development'} icon={Cpu} />
            <InfoRow label="Framework" value="Next.js + Fastify" icon={HardDrive} />
          </div>
        </div>

        {/* App Info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            Application Stack
          </h3>
          <div className="space-y-0">
            <InfoRow label="App Name" value="BrainForge" />
            <InfoRow label="Database" value="PostgreSQL" icon={Database} />
            <InfoRow label="ORM" value="Prisma 6" />
            <InfoRow label="Frontend" value="Next.js 15" />
            <InfoRow label="Backend" value="Fastify 5" />
            <InfoRow label="Auth" value="JWT + Google OAuth" icon={Shield} />
          </div>
        </div>
      </div>
    </div>
  );
}
