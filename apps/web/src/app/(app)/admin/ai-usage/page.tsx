'use client';

import { useState, useEffect } from 'react';
import {
  Bot, Loader2, Zap, DollarSign, ArrowUpDown,
  BarChart3, TrendingUp, Users, RefreshCw, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const PROVIDER_COLORS: Record<string, string> = {
  OPENAI: '#10b981', CLAUDE: '#f97316', GEMINI: '#3b82f6', GROQ: '#8b5cf6',
  MISTRAL: '#06b6d4', DEEPSEEK: '#6366f1', OPENROUTER: '#f43f5e',
  OLLAMA: '#64748b', COPILOT: '#0ea5e9', CUSTOM: '#9ca3af',
};
const PROVIDER_LABELS: Record<string, string> = {
  OPENAI: 'OpenAI', CLAUDE: 'Claude', GEMINI: 'Gemini', GROQ: 'Groq',
  MISTRAL: 'Mistral', DEEPSEEK: 'DeepSeek', OPENROUTER: 'OpenRouter',
  OLLAMA: 'Ollama', COPILOT: 'Copilot', CUSTOM: 'Custom',
};

interface AIAnalytics {
  byProvider: { provider: string; requests: number; inputTokens: number; outputTokens: number; cost: number }[];
  byModel: { provider: string; model: string; requests: number; inputTokens: number; outputTokens: number; cost: number }[];
  byFeature: { feature: string; requests: number; inputTokens: number; outputTokens: number; cost: number }[];
  topUsers: { user: { id: string; name: string; email: string; avatarUrl: string | null }; requests: number; inputTokens: number; outputTokens: number; cost: number }[];
  dailyUsage: { date: string; requests: number; tokens: number; cost: number }[];
}

interface Stats {
  totalAiKeys: number;
  totalBrainstorms: number;
  totalAiChats: number;
  aiUsage: { requests: number; inputTokens: number; outputTokens: number; totalCost: number };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AdminAIUsagePage() {
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'providers' | 'models' | 'users'>('overview');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: null })),
        api.get('/admin/ai-usage').catch(() => ({ data: null })),
      ]) as any[];
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
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

  const aiUsage = stats?.aiUsage || { requests: 0, inputTokens: 0, outputTokens: 0, totalCost: 0 };
  const totalTokens = aiUsage.inputTokens + aiUsage.outputTokens;
  const avgTokensPerReq = aiUsage.requests > 0 ? Math.round(totalTokens / aiUsage.requests) : 0;
  const inputRatio = totalTokens > 0 ? ((aiUsage.inputTokens / totalTokens) * 100).toFixed(1) : '0';
  const outputRatio = totalTokens > 0 ? ((aiUsage.outputTokens / totalTokens) * 100).toFixed(1) : '0';

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'providers' as const, label: 'By Provider' },
    { key: 'models' as const, label: 'By Model' },
    { key: 'users' as const, label: 'Top Users' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Usage Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive AI usage across the platform (last 30 days).</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Zap} color="purple" value={aiUsage.requests.toLocaleString()} label="Total Requests" />
        <MetricCard icon={ArrowUpDown} color="blue" value={formatTokens(totalTokens)} label="Total Tokens" />
        <MetricCard icon={DollarSign} color="emerald" value={`$${aiUsage.totalCost.toFixed(4)}`} label="Estimated Cost" />
        <MetricCard icon={BarChart3} color="amber" value={String(stats?.totalAiKeys || 0)} label="Active API Keys" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              tab === t.key
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Token Distribution + Averages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-5">Token Distribution</h3>
              <div className="mb-6">
                <div className="h-4 rounded-full bg-muted overflow-hidden flex">
                  <div className="bg-blue-500 transition-all duration-500" style={{ width: `${inputRatio}%` }} />
                  <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${outputRatio}%` }} />
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

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-5">Usage Summary</h3>
              <div className="space-y-5">
                <SummaryRow icon={TrendingUp} color="text-blue-500" label="Avg Tokens / Request" value={avgTokensPerReq.toLocaleString()} />
                <SummaryRow icon={DollarSign} color="text-emerald-500" label="Avg Cost / Request" value={`$${aiUsage.requests > 0 ? (aiUsage.totalCost / aiUsage.requests).toFixed(6) : '0'}`} />
                <SummaryRow icon={Bot} color="text-purple-500" label="Brainstorm Sessions" value={String(stats?.totalBrainstorms || 0)} />
                <SummaryRow icon={Layers} color="text-indigo-500" label="AI Chat Sessions" value={String(stats?.totalAiChats || 0)} />
              </div>
            </div>
          </div>

          {/* Daily Usage Chart (CSS-only bar chart) */}
          {analytics?.dailyUsage && analytics.dailyUsage.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Daily Requests (Last 30 Days)</h3>
              <div className="flex items-end gap-1 h-32">
                {analytics.dailyUsage.map((d, i) => {
                  const max = Math.max(...analytics.dailyUsage.map(x => x.requests), 1);
                  const height = (d.requests / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-purple-500/80 dark:bg-purple-400/60 rounded-t-sm transition-all hover:bg-purple-500 min-h-[2px]"
                        style={{ height: `${height}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover border shadow-md rounded-md px-2 py-1 text-[10px] text-foreground whitespace-nowrap z-10">
                        <p className="font-medium">{new Date(d.date).toLocaleDateString()}</p>
                        <p>{d.requests} requests</p>
                        <p>{formatTokens(d.tokens)} tokens</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {analytics.dailyUsage.length > 0 ? new Date(analytics.dailyUsage[0].date).toLocaleDateString() : ''}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {analytics.dailyUsage.length > 0 ? new Date(analytics.dailyUsage[analytics.dailyUsage.length - 1].date).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          )}

          {/* By Feature */}
          {analytics?.byFeature && analytics.byFeature.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Usage by Feature</h3>
              <div className="space-y-3">
                {analytics.byFeature
                  .sort((a, b) => b.requests - a.requests)
                  .map(f => {
                    const maxReq = Math.max(...analytics.byFeature.map(x => x.requests), 1);
                    return (
                      <div key={f.feature} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground capitalize">{f.feature.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>{f.requests} req</span>
                            <span>{formatTokens(f.inputTokens + f.outputTokens)} tokens</span>
                            <span>${f.cost.toFixed(4)}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-indigo-500/70 rounded-full transition-all" style={{ width: `${(f.requests / maxReq) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'providers' && (
        <div className="space-y-4">
          {!analytics?.byProvider?.length ? (
            <EmptyState text="No provider usage data available" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {analytics.byProvider
                .sort((a, b) => b.requests - a.requests)
                .map(p => (
                  <div key={p.provider} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${PROVIDER_COLORS[p.provider] || '#888'}18` }}>
                        <Bot className="h-4 w-4" style={{ color: PROVIDER_COLORS[p.provider] || '#888' }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{PROVIDER_LABELS[p.provider] || p.provider}</h3>
                        <p className="text-[11px] text-muted-foreground">{p.requests} requests</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-sm font-bold text-foreground">{formatTokens(p.inputTokens)}</p>
                        <p className="text-[10px] text-muted-foreground">Input</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{formatTokens(p.outputTokens)}</p>
                        <p className="text-[10px] text-muted-foreground">Output</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">${p.cost.toFixed(4)}</p>
                        <p className="text-[10px] text-muted-foreground">Cost</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {tab === 'models' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {!analytics?.byModel?.length ? (
            <EmptyState text="No model usage data available" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Provider</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Model</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Requests</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Input</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Output</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byModel.map((m, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                        backgroundColor: `${PROVIDER_COLORS[m.provider] || '#888'}18`,
                        color: PROVIDER_COLORS[m.provider] || '#888',
                      }}>
                        {PROVIDER_LABELS[m.provider] || m.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{m.model}</td>
                    <td className="px-4 py-3 text-sm text-foreground text-right">{m.requests}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden md:table-cell">{formatTokens(m.inputTokens)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden md:table-cell">{formatTokens(m.outputTokens)}</td>
                    <td className="px-4 py-3 text-sm text-foreground text-right">${m.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {!analytics?.topUsers?.length ? (
            <EmptyState text="No user usage data available" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">#</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">User</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Requests</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Input</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Output</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topUsers.map((u, i) => (
                  <tr key={u.user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-muted-foreground font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">
                          {u.user.avatarUrl ? (
                            <img src={u.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            u.user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.user.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">{u.requests}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden md:table-cell">{formatTokens(u.inputTokens)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden md:table-cell">{formatTokens(u.outputTokens)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">${u.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, color, value, label }: { icon: any; color: string; value: string; label: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-9 w-9 rounded-lg bg-${color}-500/10 flex items-center justify-center`}>
          <Icon className={`h-4 w-4 text-${color}-500`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function SummaryRow({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Bot className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
