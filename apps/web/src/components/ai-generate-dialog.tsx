'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Loader2, CheckSquare, Brain, FileText,
  Wand2, Check, X, AlertCircle, Zap, ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeamStore } from '@/stores/team-store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const GENERATE_OPTIONS = [
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: '#7b68ee', desc: 'Auto-create tasks with priorities' },
  { key: 'brainstorm', label: 'Brainstorm', icon: Brain, color: '#22c55e', desc: 'Start an AI brainstorm session' },
  { key: 'notes', label: 'Notes', icon: FileText, color: '#8b5cf6', desc: 'Generate notes & documentation' },
];

const PROVIDER_INFO: Record<string, { label: string; icon: string; color: string }> = {
  OPENAI: { label: 'OpenAI', icon: '🟢', color: '#10a37f' },
  CLAUDE: { label: 'Anthropic', icon: '🟠', color: '#d4a574' },
  GEMINI: { label: 'Google Gemini', icon: '🔵', color: '#4285f4' },
  GROQ: { label: 'Groq', icon: '🔴', color: '#f55036' },
  OPENROUTER: { label: 'OpenRouter', icon: '🟣', color: '#6366f1' },
};

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIGenerateDialog({ open, onOpenChange }: AIGenerateDialogProps) {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['tasks']);
  const [provider, setProvider] = useState('GEMINI');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [result, setResult] = useState<any>(null);

  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const { data: keysData } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: any[] }>('/ai/keys'),
  });

  const connectedProviders = new Set((keysData?.data || []).map((k: any) => k.provider.toUpperCase()));

  // Auto-select first connected provider if current one isn't connected
  useEffect(() => {
    if (modelsData?.data && connectedProviders.size > 0 && !connectedProviders.has(provider)) {
      const firstConnected = Object.keys(modelsData.data).find(p => connectedProviders.has(p));
      if (firstConnected) {
        setProvider(firstConnected);
        const firstModel = modelsData.data[firstConnected]?.[0];
        if (firstModel) setModel(firstModel.id);
      }
    }
  }, [modelsData, keysData]);

  // When provider changes, auto-select first model
  useEffect(() => {
    const providerModels = modelsData?.data?.[provider];
    if (providerModels?.length && !providerModels.find((m: any) => m.id === model)) {
      setModel(providerModels[0].id);
    }
  }, [provider, modelsData]);

  const generateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/ai-generate`, data),
    onSuccess: (res: any) => {
      setResult(res.data);
      toast.success('AI generation complete!');
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      queryClient.invalidateQueries({ queryKey: ['brainstorm-sessions', teamId] });
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'AI generation failed. Check your API key and try again.');
    },
  });

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = () => {
    if (!prompt.trim() || !selectedTypes.length) return;
    generateMutation.mutate({
      prompt,
      provider,
      model,
      generateTypes: selectedTypes,
    });
  };

  const handleClose = () => {
    setResult(null);
    setPrompt('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card sm:max-w-[540px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#7b68ee]/20 to-[#6c5ce7]/10 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-[#7b68ee]" />
            </div>
            AI Auto-Generate
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Describe your project and let AI create tasks, brainstorms, and notes for you
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-5 py-2">
              {/* What to generate */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-muted-foreground">What to generate</label>
                <div className="grid grid-cols-3 gap-2">
                  {GENERATE_OPTIONS.map(opt => {
                    const isSelected = selectedTypes.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleType(opt.key)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                          isSelected
                            ? 'border-[#7b68ee] bg-[#7b68ee]/5 shadow-sm'
                            : 'border-border hover:border-border hover:bg-accent'
                        )}
                      >
                        <div className="relative">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${opt.color}12` }}>
                            <opt.icon className="h-5 w-5" style={{ color: opt.color }} />
                          </div>
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#7b68ee] flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-muted-foreground">Describe your project or goal</label>
                <Textarea
                  placeholder="e.g. I'm building an e-commerce platform with user auth, product catalog, shopping cart, and checkout flow..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="border-border focus:border-[#7b68ee] rounded-xl min-h-[100px]"
                  autoFocus
                />
              </div>

              {/* AI Model selection */}
              <div className="space-y-3">
                <label className="text-[13px] font-semibold text-muted-foreground">AI Model</label>
                
                {/* Provider pills — only show providers with connected keys */}
                <div className="flex flex-wrap gap-1.5">
                  {connectedProviders.size === 0 ? (
                    <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[12px]">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      No API keys connected. Go to Settings → AI Integration to add one.
                    </div>
                  ) : (
                    Object.keys(modelsData?.data || {}).filter(p => connectedProviders.has(p)).map(p => {
                      const info = PROVIDER_INFO[p];
                      const isSelected = provider === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setProvider(p)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border',
                            isSelected
                              ? 'border-[#7b68ee] bg-[#7b68ee]/5 text-[#7b68ee]'
                              : 'border-border bg-card text-muted-foreground hover:bg-accent'
                          )}
                        >
                          <span className="text-sm">{info?.icon || '⚪'}</span>
                          {info?.label || p}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Model selector */}
                <div className="space-y-1.5">
                  {(modelsData?.data?.[provider] || []).map((m: any) => {
                    const isSelected = model === m.id;
                    const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left',
                          isSelected
                            ? 'border-[#7b68ee] bg-[#7b68ee]/5'
                            : 'border-border hover:border-border hover:bg-accent'
                        )}
                      >
                        <div className={cn(
                          'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
                          isSelected ? 'border-[#7b68ee]' : 'border-border'
                        )}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-[#7b68ee]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium text-foreground">{m.name}</span>
                            {isFree && <span className="text-[8px] font-bold px-1 py-0 rounded bg-green-500/10 text-green-600">FREE</span>}
                          </div>
                          {m.description && <p className="text-[10px] text-muted-foreground truncate">{m.description}</p>}
                        </div>
                        <div className="text-right text-[10px] text-muted-foreground shrink-0">
                          <p>{(m.contextWindow / 1000).toFixed(0)}K ctx</p>
                          {!isFree && <p>${m.costPer1kInput}/1K</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>


              </div>
            </div>

            <DialogFooter className="gap-2">
              <button onClick={handleClose} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-xl hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !selectedTypes.length || generateMutation.isPending || connectedProviders.size === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Generated successfully!</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {result.summary.tasks > 0 && `${result.summary.tasks} tasks`}
                    {result.summary.brainstorm > 0 && `${result.summary.tasks > 0 ? ', ' : ''}1 brainstorm session`}
                    {result.summary.notes > 0 && `${(result.summary.tasks > 0 || result.summary.brainstorm > 0) ? ', ' : ''}${result.summary.notes} notes`}
                    {' created'}
                  </p>
                </div>
              </div>

              {/* Tasks preview */}
              {result.created.tasks?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-[#7b68ee]" /> Tasks
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.created.tasks.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 py-1.5 px-3 bg-muted rounded-lg">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#7b68ee]" />
                        <span className="text-sm text-foreground flex-1 truncate">{t.title}</span>
                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">{t.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brainstorm preview */}
              {result.created.brainstorm && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-green-500" /> Brainstorm
                  </h4>
                  <div className="py-2 px-3 bg-green-500/10/50 rounded-lg border border-green-500/20">
                    <p className="text-sm font-medium text-foreground">{result.created.brainstorm.title}</p>
                  </div>
                </div>
              )}

              {/* Notes preview */}
              {result.created.notes?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-purple-500" /> Notes
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.created.notes.map((n: any) => (
                      <div key={n.id} className="py-1.5 px-3 bg-purple-50/50 rounded-lg border border-purple-100">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-[#7b68ee] text-white text-sm font-medium rounded-xl hover:bg-[#6c5ce7] transition-colors"
              >
                Done
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
