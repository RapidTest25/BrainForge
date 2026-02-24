'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Key, Eye, EyeOff, Trash2, CheckCircle2, AlertCircle, BarChart3, Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', color: '#10a37f' },
  { value: 'claude', label: 'Anthropic Claude', color: '#d4a574' },
  { value: 'gemini', label: 'Google Gemini', color: '#4285f4' },
  { value: 'groq', label: 'Groq', color: '#f55036' },
  { value: 'openrouter', label: 'OpenRouter', color: '#6366f1' },
];

export default function AIKeysPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState({ provider: '', apiKey: '', label: '' });

  const { data: keys } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: any[] }>('/ai/keys'),
  });

  const { data: usageStats } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => api.get<{ data: any }>('/ai/usage'),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/ai/keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] });
      setShowAdd(false);
      setNewKey({ provider: '', apiKey: '', label: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ai/keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-keys'] }),
  });

  const toggleVisible = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => {
    if (!key) return '••••••••••••';
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 4);
  };

  const getProvider = (value: string) => PROVIDERS.find(p => p.value === value);

  const STAT_ITEMS = [
    { label: 'Total Requests', value: usageStats?.data?.totalRequests || 0, color: '#7b68ee' },
    { label: 'Total Tokens', value: usageStats?.data?.totalTokens?.toLocaleString() || 0, color: '#22c55e' },
    { label: 'Estimated Cost', value: `$${usageStats?.data?.estimatedCost?.toFixed(4) || '0.00'}`, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1a2e]">API Keys</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your AI provider API keys. Keys are encrypted at rest.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Key
        </button>
      </div>

      {/* Usage Stats */}
      {usageStats?.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STAT_ITEMS.map(stat => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}10` }}>
                <BarChart3 className="h-4.5 w-4.5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xl font-semibold text-[#1a1a2e]">{stat.value}</p>
                <p className="text-[11px] text-gray-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keys List */}
      <div className="space-y-2">
        {(keys?.data || []).map((key: any) => {
          const provider = getProvider(key.provider);
          return (
            <div key={key.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: provider?.color || '#6b7280' }}
                  >
                    {(provider?.label || key.provider).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm text-[#1a1a2e]">{key.label || provider?.label || key.provider}</h3>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${key.isValid !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {key.isValid !== false ? <><CheckCircle2 className="h-2.5 w-2.5" />Valid</> : <><AlertCircle className="h-2.5 w-2.5" />Invalid</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-gray-400 font-mono">
                        {visibleKeys.has(key.id) ? key.apiKey : maskKey(key.apiKey)}
                      </code>
                      <button onClick={() => toggleVisible(key.id)} className="text-gray-400 hover:text-gray-600">
                        {visibleKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400">
                    Added {new Date(key.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    onClick={() => { if (confirm('Delete this API key?')) deleteMutation.mutate(key.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {(!keys?.data || keys.data.length === 0) && (
          <div className="text-center py-12">
            <Key className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-[#1a1a2e] mb-1">No API Keys</h3>
            <p className="text-sm text-gray-400 mb-4">
              Add your API keys to use AI features. BrainForge never stores your keys in plain text.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors mx-auto"
            >
              <Plus className="h-3.5 w-3.5" /> Add Your First Key
            </button>
          </div>
        )}
      </div>

      {/* Add Key Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a2e]">Add API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Provider</label>
              <Select value={newKey.provider} onValueChange={(v) => setNewKey({ ...newKey, provider: v })}>
                <SelectTrigger className="border-gray-200"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Label (optional)</label>
              <Input
                value={newKey.label}
                onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                placeholder="e.g., Personal, Work"
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">API Key</label>
              <Input
                type="password"
                value={newKey.apiKey}
                onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                placeholder="sk-..."
                className="border-gray-200 focus:border-[#7b68ee]"
              />
              <p className="text-[11px] text-gray-400">Your key will be encrypted using AES-256-GCM before storage.</p>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => addMutation.mutate(newKey)}
              disabled={!newKey.provider || !newKey.apiKey || addMutation.isPending}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              {addMutation.isPending ? 'Adding...' : 'Add Key'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
