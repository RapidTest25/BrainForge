'use client';

import { useState, useEffect } from 'react';
import {
  Key, Search, Loader2, ChevronLeft, ChevronRight,
  Lock, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const PROVIDER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  OPENAI: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'OpenAI' },
  CLAUDE: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Claude' },
  GEMINI: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'Gemini' },
  GROQ: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', label: 'Groq' },
  MISTRAL: { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', label: 'Mistral' },
  DEEPSEEK: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', label: 'DeepSeek' },
  OPENROUTER: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', label: 'OpenRouter' },
  OLLAMA: { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', label: 'Ollama' },
  COPILOT: { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', label: 'Copilot' },
  CUSTOM: { bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', label: 'Custom' },
};

interface APIKey {
  id: string;
  provider: string;
  label: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface ProviderSummary {
  provider: string;
  count: number;
}

export default function AdminAPIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [providerSummary, setProviderSummary] = useState<ProviderSummary[]>([]);

  useEffect(() => {
    fetchKeys();
  }, [page, search]);

  async function fetchKeys() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res: any = await api.get(`/admin/api-keys?${params}`);
      setKeys(res.data.keys);
      setTotal(res.data.total);
      setProviderSummary(res.data.providerSummary || []);
    } catch {} finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of all AI API keys configured across the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{total}</span>
            <span className="text-xs text-muted-foreground">total keys</span>
          </div>
        </div>
      </div>

      {/* Provider Distribution */}
      {providerSummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {providerSummary.sort((a, b) => b.count - a.count).map(p => {
            const style = PROVIDER_COLORS[p.provider] || PROVIDER_COLORS.CUSTOM;
            return (
              <div key={p.provider} className="bg-card border border-border rounded-xl p-4 text-center">
                <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mb-2', style.bg, style.text)}>
                  {style.label}
                </span>
                <p className="text-xl font-bold text-foreground">{p.count}</p>
                <p className="text-[11px] text-muted-foreground">active keys</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
        <Lock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground">Encrypted Keys</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            API keys are encrypted at rest. Only the provider, label, and status are visible. Actual key values are never exposed.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by user, provider, or label..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 h-9 bg-card"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading && keys.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Key className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No API keys found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">User</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Provider</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Label</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden lg:table-cell">Last Used</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => {
                const style = PROVIDER_COLORS[k.provider] || PROVIDER_COLORS.CUSTOM;
                return (
                  <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">
                          {k.user.avatarUrl ? (
                            <img src={k.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            k.user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{k.user.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{k.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium', style.bg, style.text)}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-foreground">{k.label || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {k.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <XCircle className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {k.lastUsedAt ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(k.lastUsedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{new Date(k.createdAt).toLocaleDateString()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
