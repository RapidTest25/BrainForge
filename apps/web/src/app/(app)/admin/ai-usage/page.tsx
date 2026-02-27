'use client';

import { useState, useEffect } from 'react';
import {
  Bot, Loader2, Zap, DollarSign, ArrowUpDown,
  BarChart3, TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalTeams: number;
  totalProjects: number;
  totalTasks: number;
  totalAiKeys: number;
  totalBrainstorms: number;
  totalDiagrams: number;
  totalNotes: number;
  newUsersThisMonth: number;
  aiUsage: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AdminAIUsagePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res: any = await api.get('/admin/stats');
        setStats(res.data);
      } catch {} finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <Bot className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Failed to load AI usage data.</p>
        </div>
      </div>
    );
  }

  const { aiUsage } = stats;
  const totalTokens = aiUsage.inputTokens + aiUsage.outputTokens;
  const avgTokensPerReq = aiUsage.requests > 0 ? Math.round(totalTokens / aiUsage.requests) : 0;
  const avgCostPerReq = aiUsage.requests > 0 ? (aiUsage.totalCost / aiUsage.requests) : 0;
  const inputRatio = totalTokens > 0 ? ((aiUsage.inputTokens / totalTokens) * 100).toFixed(1) : '0';
  const outputRatio = totalTokens > 0 ? ((aiUsage.outputTokens / totalTokens) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of AI API usage across the platform (last 30 days).</p>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{aiUsage.requests.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Requests</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ArrowUpDown className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatTokens(totalTokens)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Tokens</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">${aiUsage.totalCost.toFixed(4)}</p>
          <p className="text-xs text-muted-foreground mt-1">Estimated Cost</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalAiKeys}</p>
          <p className="text-xs text-muted-foreground mt-1">Active API Keys</p>
        </div>
      </div>

      {/* Token breakdown & Averages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Distribution */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Token Distribution</h3>

          {/* Visual bar */}
          <div className="mb-6">
            <div className="h-4 rounded-full bg-muted overflow-hidden flex">
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${inputRatio}%` }}
              />
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${outputRatio}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">Input Tokens</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatTokens(aiUsage.inputTokens)}</p>
              <p className="text-[11px] text-muted-foreground">{inputRatio}% of total</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Output Tokens</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatTokens(aiUsage.outputTokens)}</p>
              <p className="text-[11px] text-muted-foreground">{outputRatio}% of total</p>
            </div>
          </div>
        </div>

        {/* Averages */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Averages per Request</h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs text-muted-foreground">Average Tokens / Request</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{avgTokensPerReq.toLocaleString()}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Average Cost / Request</span>
              </div>
              <p className="text-2xl font-bold text-foreground">${avgCostPerReq.toFixed(6)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs text-muted-foreground">Brainstorm Sessions</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalBrainstorms}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">
          AI usage data is aggregated across all users for the last 30 days. Individual user breakdowns are available via the user detail API.
        </p>
      </div>
    </div>
  );
}
