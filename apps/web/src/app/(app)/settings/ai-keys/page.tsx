'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Key, Trash2, CheckCircle2, BarChart3,
  Loader2, Zap, Shield, Sparkles, ExternalLink, RefreshCw, XCircle,
  Cpu, DollarSign, Activity, Search, Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ProviderLogo } from '@/components/icons/ai-provider-logos';

// ═══════════════════════════════════════════
//  Provider configuration
// ═══════════════════════════════════════════
const PROVIDERS = [
  {
    value: 'OPENAI', label: 'OpenAI', color: '#10a37f', bg: '#10a37f15',
    icon: '🟢', desc: 'GPT-4.1, O3, O4 Mini — industry leader',
    website: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    features: ['Function calling', 'Vision', 'Reasoning'],
  },
  {
    value: 'CLAUDE', label: 'Anthropic', color: '#d4a574', bg: '#d4a57415',
    icon: '🟠', desc: 'Claude Opus 4 & Sonnet 4 — highest quality',
    website: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-',
    features: ['200K context', 'Best for writing', 'Coding'],
  },
  {
    value: 'GEMINI', label: 'Google Gemini', color: '#4285f4', bg: '#4285f415',
    icon: '🔵', desc: 'Gemini 2.5 Pro & Flash — free tier available',
    website: 'https://aistudio.google.com/apikey',
    keyPrefix: 'AI',
    features: ['1M context', 'Free tier', 'Multimodal'],
  },
  {
    value: 'GROQ', label: 'Groq', color: '#f55036', bg: '#f5503615',
    icon: '🔴', desc: 'Llama 4, DeepSeek R1 — ultra-fast inference',
    website: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    features: ['Fastest inference', 'Free tier', 'Open models'],
  },
  {
    value: 'OPENROUTER', label: 'OpenRouter', color: '#6366f1', bg: '#6366f115',
    icon: '🟣', desc: 'All models in one API — GPT, Claude, Gemini, Llama, DeepSeek, Qwen',
    website: 'https://openrouter.ai/settings/keys',
    keyPrefix: 'sk-or-',
    features: ['100+ models', 'Pay-per-use', 'Model routing'],
  },
];

export default function AIKeysPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [newKey, setNewKey] = useState({ provider: '', apiKey: '', label: '' });
  const [validatingKey, setValidatingKey] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string } | null>(null);
  const [checkingKeys, setCheckingKeys] = useState<Set<string>>(new Set());
  const [keyStatuses, setKeyStatuses] = useState<Record<string, { valid: boolean; balance?: any; checkedAt: Date }>>({});
  const [modelSearch, setModelSearch] = useState('');

  const { data: keys, isLoading: loadingKeys } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: any[] }>('/ai/keys'),
  });

  const { data: usageStats } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => api.get<{ data: any }>('/ai/usage'),
  });

  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/ai/keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] });
      setShowAdd(false);
      setNewKey({ provider: '', apiKey: '', label: '' });
      setValidationResult(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ai/keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] });
      toast.success('API key deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete API key');
    },
  });

  const keyList = keys?.data || [];
  const connectedProviders = new Set(keyList.map((k: any) => k.provider.toUpperCase()));
  const usage = usageStats?.data;

  // Validate key before adding
  const handleValidateKey = async () => {
    if (!newKey.provider || !newKey.apiKey) return;
    setValidatingKey(true);
    setValidationResult(null);
    try {
      const res = await api.post<{ data: { valid: boolean; error?: string } }>('/ai/keys/validate', {
        provider: newKey.provider,
        apiKey: newKey.apiKey,
      });
      setValidationResult({
        valid: res.data.valid,
        message: res.data.valid ? 'API key is valid and working!' : (res.data.error || 'API key is invalid or expired'),
      });
    } catch (err: any) {
      setValidationResult({ valid: false, message: err.message || 'Validation failed' });
    }
    setValidatingKey(false);
  };

  // Check existing key status
  const handleCheckKey = async (keyId: string) => {
    setCheckingKeys(prev => new Set(prev).add(keyId));
    try {
      const res = await api.post<{ data: { valid: boolean; balance?: any } }>(`/ai/keys/${keyId}/check`, {});
      setKeyStatuses(prev => ({
        ...prev,
        [keyId]: { valid: res.data.valid, balance: res.data.balance, checkedAt: new Date() },
      }));
    } catch {
      setKeyStatuses(prev => ({
        ...prev,
        [keyId]: { valid: false, checkedAt: new Date() },
      }));
    }
    setCheckingKeys(prev => {
      const next = new Set(prev);
      next.delete(keyId);
      return next;
    });
  };

  const handleAddKey = () => {
    if (!newKey.provider || !newKey.apiKey) return;
    addMutation.mutate(newKey);
  };

  const openAddForProvider = (providerValue: string) => {
    setNewKey({ provider: providerValue, apiKey: '', label: '' });
    setValidationResult(null);
    setShowAdd(true);
  };

  const getProviderConfig = (value: string) => PROVIDERS.find(p => p.value === value.toUpperCase());

  // Count total models
  const allModels = modelsData?.data || {};
  const totalModels = Object.values(allModels).reduce((acc: number, models: any) => acc + models.length, 0);

  // Filter models for catalog
  const filteredModels: { provider: string; model: any; providerConfig: any }[] = [];
  for (const [providerKey, models] of Object.entries(allModels)) {
    const config = getProviderConfig(providerKey);
    for (const m of models as any[]) {
      if (!modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase())) {
        filteredModels.push({ provider: providerKey, model: m, providerConfig: config });
      }
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#7b68ee]/20 to-[#6c5ce7]/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[#7b68ee]" />
            </div>
            AI Integration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Connect your AI providers, manage API keys, and browse available models.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModels(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-xl hover:bg-accent transition-colors"
          >
            <Cpu className="h-3.5 w-3.5" />
            {totalModels} Models
          </button>
          <button
            onClick={() => { setNewKey({ provider: '', apiKey: '', label: '' }); setValidationResult(null); setShowAdd(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#7b68ee]/25 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Connect Provider
          </button>
        </div>
      </div>

      {/* Usage Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: 'Connected', value: connectedProviders.size, suffix: `/${PROVIDERS.length}`, icon: Zap, color: '#7b68ee' },
          { label: 'Requests (30d)', value: usage?.totalRequests || 0, suffix: '', icon: Activity, color: '#3b82f6' },
          { label: 'Tokens Used', value: usage?.totalTokens ? (usage.totalTokens > 1000000 ? `${(usage.totalTokens / 1000000).toFixed(1)}M` : `${(usage.totalTokens / 1000).toFixed(0)}K`) : '0', suffix: '', icon: Cpu, color: '#22c55e' },
          { label: 'Est. Cost', value: `$${(usage?.totalCost || 0).toFixed(4)}`, suffix: '', icon: DollarSign, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}12` }}>
              <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stat.value}<span className="text-muted-foreground text-sm font-normal">{stat.suffix}</span></p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Provider Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROVIDERS.map(provider => {
            const isConnected = connectedProviders.has(provider.value);
            const keyData = keyList.find((k: any) => k.provider.toUpperCase() === provider.value);
            const status = keyData ? keyStatuses[keyData.id] : null;
            const isChecking = keyData ? checkingKeys.has(keyData.id) : false;
            const providerModels = allModels[provider.value] || [];

            return (
              <div
                key={provider.value}
                className={cn(
                  'bg-card border rounded-2xl p-4 transition-all relative overflow-hidden',
                  isConnected ? 'border-green-500/30 shadow-sm' : 'border-border hover:border-border'
                )}
              >
                {/* Status indicator stripe */}
                <div className={cn(
                  'absolute top-0 left-0 right-0 h-1',
                  isConnected ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-muted'
                )} />

                <div className="flex items-start justify-between mt-1">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: provider.bg }}
                    >
                      <ProviderLogo provider={provider.value} className="h-5 w-5" style={{ color: provider.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-sm text-foreground">{provider.label}</h3>
                        {isConnected && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/100/10 text-green-600 border border-green-500/20">
                            <CheckCircle2 className="h-2.5 w-2.5" /> CONNECTED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{provider.desc}</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {provider.features.map(f => (
                    <span key={f} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">{f}</span>
                  ))}
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">{providerModels.length} models</span>
                </div>

                {/* Connected state: show key info + check button */}
                {isConnected && keyData ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-muted/80 border border-border">
                      <Key className="h-3 w-3 text-muted-foreground" />
                      <code className="text-[11px] text-muted-foreground font-mono flex-1 truncate">
                        {(keyData.label || provider.keyPrefix) + '••••••••'}
                      </code>
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                        keyData.isActive !== false
                          ? 'bg-green-500/100/10 text-green-600'
                          : 'bg-red-500/100/10 text-red-500'
                      )}>
                        {keyData.isActive !== false ? 'Active' : 'Invalid'}
                      </span>
                    </div>

                    {/* Balance / check result */}
                    {status && (
                      <div className={cn(
                        'flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px]',
                        status.valid ? 'bg-green-500/100/10/50 text-green-700' : 'bg-red-500/100/10/50 text-red-600'
                      )}>
                        {status.valid ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
                        <span className="flex-1">
                          {status.valid ? (status.balance?.message || 'Key verified — working') : 'Key invalid or expired'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCheckKey(keyData.id)}
                        disabled={isChecking}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground bg-muted border border-border rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
                      >
                        {isChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {isChecking ? 'Checking...' : 'Verify Key'}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remove ${provider.label} key?`)) deleteMutation.mutate(keyData.id); }}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-medium text-red-500 bg-red-500/100/10 border border-red-500/20 rounded-lg hover:bg-red-500/100/100/100/20 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <a
                        href={provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-2 py-1.5 text-muted-foreground hover:text-muted-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <button
                      onClick={() => openAddForProvider(provider.value)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-[#7b68ee] hover:text-[#7b68ee] hover:bg-[#7b68ee]/5 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" /> Connect {provider.label}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage per Provider */}
      {usage?.byProvider && Object.keys(usage.byProvider).length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#7b68ee]" />
            Usage Breakdown (Last 30 Days)
          </h2>
          <div className="space-y-3">
            {Object.entries(usage.byProvider).map(([prov, stats]: [string, any]) => {
              const config = getProviderConfig(prov);
              const maxRequests = Math.max(...Object.values(usage.byProvider).map((s: any) => s.requests));
              return (
                <div key={prov} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config?.color || '#6b7280' }} />
                      <span className="text-xs font-medium text-foreground">{config?.label || prov}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span>{stats.requests} requests</span>
                      <span>{stats.tokens.toLocaleString()} tokens</span>
                      <span className="font-medium text-muted-foreground">${stats.cost.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(stats.requests / maxRequests) * 100}%`,
                        backgroundColor: config?.color || '#6b7280',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      {usage?.recentLogs && usage.recentLogs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#3b82f6]" />
            Recent Activity
          </h2>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {usage.recentLogs.slice(0, 20).map((log: any, i: number) => {
              const config = getProviderConfig(log.provider);
              return (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-accent text-[12px]">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: config?.color || '#6b7280' }} />
                  <span className="text-muted-foreground font-medium w-20 shrink-0 truncate">{log.model.split('/').pop()}</span>
                  <span className="text-muted-foreground flex-1 truncate">{(log.promptTokens + log.completionTokens).toLocaleString()} tokens</span>
                  <span className="text-muted-foreground font-medium">${log.estimatedCost.toFixed(5)}</span>
                  <span className="text-muted-foreground/60 text-[10px] w-16 text-right">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Add Key Dialog
         ═══════════════════════════════════════════ */}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setValidationResult(null); setValidatingKey(false); } }}>
        <DialogContent className="bg-card sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#7b68ee]/20 to-[#6c5ce7]/10 flex items-center justify-center">
                <Key className="h-4 w-4 text-[#7b68ee]" />
              </div>
              Connect AI Provider
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Your API key will be encrypted with AES-256-GCM before storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Provider selection */}
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-muted-foreground">Provider</label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {PROVIDERS.map(p => {
                  const alreadyConnected = connectedProviders.has(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => { setNewKey({ ...newKey, provider: p.value }); setValidationResult(null); }}
                      disabled={alreadyConnected}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                        newKey.provider === p.value
                          ? 'border-[#7b68ee] bg-[#7b68ee]/5'
                          : alreadyConnected
                            ? 'border-border opacity-50 cursor-not-allowed'
                            : 'border-border hover:border-border hover:bg-accent'
                      )}
                    >
                      <span className="text-lg"><ProviderLogo provider={p.value} className="h-5 w-5" style={{ color: p.color }} /></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{p.label}</span>
                          {alreadyConnected && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/100/10 text-green-600">CONNECTED</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{p.desc}</p>
                      </div>
                      {newKey.provider === p.value && (
                        <div className="h-5 w-5 rounded-full bg-[#7b68ee] flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key input */}
            {newKey.provider && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-muted-foreground">API Key</label>
                    {(() => {
                      const pConfig = getProviderConfig(newKey.provider);
                      return pConfig?.website ? (
                        <a href={pConfig.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#7b68ee] hover:underline flex items-center gap-0.5">
                          Get API key <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : null;
                    })()}
                  </div>
                  <Input
                    type="password"
                    value={newKey.apiKey}
                    onChange={(e) => { setNewKey({ ...newKey, apiKey: e.target.value }); setValidationResult(null); }}
                    placeholder={`${getProviderConfig(newKey.provider)?.keyPrefix || 'sk-'}...`}
                    className="border-border focus:border-[#7b68ee] rounded-xl h-10 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-muted-foreground">Label <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input
                    value={newKey.label}
                    onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                    placeholder="e.g., Personal, Work, Project X"
                    className="border-border focus:border-[#7b68ee] rounded-xl h-10"
                  />
                </div>

                {/* Validation result */}
                {validationResult && (
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm',
                    validationResult.valid
                      ? 'bg-green-500/100/10 text-green-700 border border-green-500/20'
                      : 'bg-red-500/100/10 text-red-600 border border-red-500/20'
                  )}>
                    {validationResult.valid
                      ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                      : <XCircle className="h-4 w-4 shrink-0" />
                    }
                    <span className="text-[13px]">{validationResult.message}</span>
                  </div>
                )}

                {/* Validate button */}
                <button
                  onClick={handleValidateKey}
                  disabled={!newKey.apiKey || validatingKey}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-[#7b68ee] bg-[#7b68ee]/5 border border-[#7b68ee]/20 rounded-xl hover:bg-[#7b68ee]/10 disabled:opacity-50 transition-colors"
                >
                  {validatingKey ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Validating...</>
                  ) : (
                    <><Shield className="h-3.5 w-3.5" /> Test Connection</>
                  )}
                </button>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-xl hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAddKey}
              disabled={!newKey.provider || !newKey.apiKey || addMutation.isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {addMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Key className="h-4 w-4" /> Save Key</>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          Model Catalog Dialog
         ═══════════════════════════════════════════ */}
      <Dialog open={showModels} onOpenChange={setShowModels}>
        <DialogContent className="bg-card sm:max-w-[700px] max-h-[85vh] rounded-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#7b68ee]/20 to-[#6c5ce7]/10 flex items-center justify-center">
                <Cpu className="h-4 w-4 text-[#7b68ee]" />
              </div>
              Model Catalog
              <span className="text-xs font-normal text-muted-foreground ml-1">({totalModels} models)</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Browse all available AI models across connected and available providers.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="pl-9 border-border focus:border-[#7b68ee] rounded-xl h-9 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
            {filteredModels.map(({ provider, model: m, providerConfig }) => {
              const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
              return (
                <div key={`${provider}-${m.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: providerConfig?.bg || 'transparent' }}
                  >
                    <ProviderLogo provider={provider} className="h-4 w-4" style={{ color: providerConfig?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{m.name}</span>
                      {isFree && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/100/10 text-green-600 border border-green-500/20">FREE</span>}
                      {m.description && <span className="text-[10px] text-muted-foreground hidden sm:inline">{m.description}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <code className="text-[10px] text-muted-foreground font-mono">{m.id}</code>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {isFree ? 'Free' : `$${m.costPer1kInput}/1K in`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(m.contextWindow / 1000).toFixed(0)}K ctx
                    </p>
                  </div>
                </div>
              );
            })}
            {filteredModels.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-muted-foreground">No models found for &quot;{modelSearch}&quot;</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
