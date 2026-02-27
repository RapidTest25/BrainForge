'use client';

import { useState, useEffect } from 'react';
import {
  Database, Server, Globe, Clock, Cpu, HardDrive,
  Loader2, RefreshCw, CheckCircle2, Shield,
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

export default function AdminSystemPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [healthRes, statsRes] = await Promise.all([
        api.get('/health').catch(() => ({ data: { status: 'unknown' } })),
        api.get('/admin/stats').catch(() => ({ data: null })),
      ]) as any[];
      setHealth(healthRes.data || healthRes);
      setStats(statsRes.data);
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform information and system health.</p>
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

        {/* Database Stats */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-500" />
            Database Records
          </h3>
          {stats ? (
            <div className="space-y-0">
              <InfoRow label="Users" value={stats.totalUsers.toLocaleString()} />
              <InfoRow label="Teams" value={stats.totalTeams.toLocaleString()} />
              <InfoRow label="Projects" value={stats.totalProjects.toLocaleString()} />
              <InfoRow label="Tasks" value={stats.totalTasks.toLocaleString()} />
              <InfoRow label="Brainstorm Sessions" value={stats.totalBrainstorms.toLocaleString()} />
              <InfoRow label="Diagrams" value={stats.totalDiagrams.toLocaleString()} />
              <InfoRow label="Notes" value={stats.totalNotes.toLocaleString()} />
              <InfoRow label="AI API Keys" value={stats.totalAiKeys.toLocaleString()} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load database stats.</p>
          )}
        </div>
      </div>

      {/* App Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-500" />
          Application
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
          <div>
            <InfoRow label="App Name" value="BrainForge" />
            <InfoRow label="Database" value="PostgreSQL" icon={Database} />
            <InfoRow label="ORM" value="Prisma" />
          </div>
          <div>
            <InfoRow label="Frontend" value="Next.js 15" />
            <InfoRow label="Backend" value="Fastify 5" />
            <InfoRow label="Auth" value="JWT + Google OAuth" icon={Shield} />
          </div>
        </div>
      </div>
    </div>
  );
}
