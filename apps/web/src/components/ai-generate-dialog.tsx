'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Sparkles, Loader2, CheckSquare, Brain, FileText,
  Wand2, Check, X, AlertCircle, Zap, ChevronDown, Search, Target
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AIGenerateProgressModal, AIGenerateBubble, AnimatedDots,
  type AIStep,
} from '@/components/ai-progress-modal';

// ── Persistent AI Generation Storage ──

const AI_GEN_STORAGE_KEY = 'brainforge_ai_gen';

interface AIGenState {
  teamId: string;
  projectId?: string;
  prompt: string;
  provider: string;
  model: string;
  generateTypes: string[];
  startedAt: number;
  status: 'generating' | 'done' | 'error';
  result?: any;
  error?: string;
  elapsedTime?: number;
}

function saveAIGenState(state: AIGenState | null) {
  if (state) localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify(state));
  else localStorage.removeItem(AI_GEN_STORAGE_KEY);
}

function loadAIGenState(): AIGenState | null {
  try {
    const raw = localStorage.getItem(AI_GEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const GENERATE_OPTIONS = [
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: '#7b68ee', desc: 'Auto-create tasks with priorities' },
  { key: 'brainstorm', label: 'Brainstorm', icon: Brain, color: '#22c55e', desc: 'Start an AI brainstorm session' },
  { key: 'notes', label: 'Notes', icon: FileText, color: '#8b5cf6', desc: 'Generate notes & documentation' },
  { key: 'goals', label: 'Goals', icon: Target, color: '#f59e0b', desc: 'Create SMART project goals' },
];

const PROVIDER_INFO: Record<string, { label: string; icon: string; color: string }> = {
  OPENAI: { label: 'OpenAI', icon: '🟢', color: '#10a37f' },
  CLAUDE: { label: 'Anthropic', icon: '🟠', color: '#d4a574' },
  GEMINI: { label: 'Google Gemini', icon: '🔵', color: '#4285f4' },
  GROQ: { label: 'Groq', icon: '🔴', color: '#f55036' },
  OPENROUTER: { label: 'OpenRouter', icon: '🟣', color: '#6366f1' },
  COPILOT: { label: 'GitHub Copilot', icon: '⚫', color: '#6e40c9' },
};

const PROVIDER_PREFIX_MAP: Record<string, { label: string; icon: string }> = {
  'openai': { label: 'OpenAI', icon: '🟢' },
  'anthropic': { label: 'Anthropic', icon: '🟠' },
  'google': { label: 'Google', icon: '🔵' },
  'meta-llama': { label: 'Meta', icon: '🦙' },
  'deepseek': { label: 'DeepSeek', icon: '🌊' },
  'mistralai': { label: 'Mistral', icon: '🌀' },
  'qwen': { label: 'Qwen', icon: '🌟' },
  'x-ai': { label: 'xAI', icon: '⚡' },
  'microsoft': { label: 'Microsoft', icon: '🔷' },
  'nvidia': { label: 'NVIDIA', icon: '💚' },
  'cohere': { label: 'Cohere', icon: '🟤' },
  'amazon': { label: 'Amazon', icon: '📦' },
  'perplexity': { label: 'Perplexity', icon: '🔍' },
  'nous': { label: 'Nous', icon: '🧿' },
  'together': { label: 'Together', icon: '🤝' },
  'arcee-ai': { label: 'Arcee AI', icon: '🏹' },
  'sophosympatheia': { label: 'Sophos', icon: '🧵' },
  'thedrummer': { label: 'TheDrummer', icon: '🥁' },
  'moonshotai': { label: 'Moonshot', icon: '🌙' },
  'aion-labs': { label: 'Aion Labs', icon: '🧬' },
};

const DIRECT_CATEGORY_RULES = [
  { test: (id: string) => id.startsWith('gpt-') || /^o[1-4]/.test(id), label: 'OpenAI', icon: '🟢' },
  { test: (id: string) => id.startsWith('claude-'), label: 'Anthropic', icon: '🟠' },
  { test: (id: string) => id.startsWith('gemini-'), label: 'Google', icon: '🔵' },
  { test: (id: string) => id.startsWith('grok-'), label: 'xAI', icon: '⚡' },
  { test: (id: string) => id.startsWith('llama'), label: 'Meta', icon: '🦙' },
  { test: (id: string) => id.startsWith('deepseek'), label: 'DeepSeek', icon: '🌊' },
  { test: (id: string) => id.startsWith('mistral') || id.startsWith('mixtral'), label: 'Mistral', icon: '🌀' },
  { test: (id: string) => id.startsWith('qwen'), label: 'Qwen', icon: '🌟' },
];

function categorizeModels(models: any[]) {
  const groups = new Map<string, { label: string; icon: string; models: any[] }>();
  for (const m of models) {
    let cat = { label: 'Other', icon: '⚪' };
    const slashIdx = m.id.indexOf('/');
    if (slashIdx > 0) {
      const prefix = m.id.slice(0, slashIdx);
      const mapped = PROVIDER_PREFIX_MAP[prefix];
      cat = mapped || { label: prefix.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), icon: '⚪' };
    } else {
      for (const rule of DIRECT_CATEGORY_RULES) {
        if (rule.test(m.id)) { cat = { label: rule.label, icon: rule.icon }; break; }
      }
    }
    const key = cat.label;
    if (!groups.has(key)) groups.set(key, { ...cat, models: [] });
    groups.get(key)!.models.push(m);
  }
  return Array.from(groups.values()).sort((a, b) => b.models.length - a.models.length);
}

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIGenerateDialog({ open, onOpenChange }: AIGenerateDialogProps) {
  const { activeTeam } = useTeamStore();
  const { activeProject } = useProjectStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['tasks']);
  const [provider, setProvider] = useState('COPILOT');
  const [model, setModel] = useState('gpt-4o');
  const [modelFilter, setModelFilter] = useState('');
  const [result, setResult] = useState<any>(null);

  // Progress modal state
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState<AIStep[]>([]);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressResultId, setProgressResultId] = useState<string | null>(null);
  const [progressStartedAt, setProgressStartedAt] = useState<number | null>(null);
  const [progressTitle, setProgressTitle] = useState('');
  const [restoredElapsed, setRestoredElapsed] = useState<number | undefined>(undefined);
  const [minimized, setMinimized] = useState(false);

  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const { data: keysData } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: any[] }>('/ai/keys'),
  });

  const connectedProviders = new Set((keysData?.data || []).map((k: any) => k.provider.toUpperCase()));

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

  useEffect(() => {
    const providerModels = modelsData?.data?.[provider];
    if (providerModels?.length && !providerModels.find((m: any) => m.id === model)) {
      setModel(providerModels[0].id);
    }
    setModelFilter('');
  }, [provider, modelsData]);

  // Restore pending generation from localStorage
  useEffect(() => {
    const saved = loadAIGenState();
    if (!saved || !teamId || saved.teamId !== teamId) return;
    const age = Date.now() - saved.startedAt;
    if (age > 60 * 60 * 1000) { saveAIGenState(null); return; }

    setProgressTitle(saved.generateTypes.join(', '));
    setProgressStartedAt(saved.startedAt);

    if (saved.status === 'done') {
      setProgressOpen(true);
      setProgressResultId('done');
      setProgressError(null);
      setRestoredElapsed(saved.elapsedTime || Math.floor(age / 1000));
      setResult(saved.result || null);
      setProgressSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating content', status: 'done' },
        { label: 'Saving results', status: 'done' },
      ]);
      return;
    }

    if (saved.status === 'error') {
      setProgressOpen(true);
      setProgressError(saved.error || 'Generation failed');
      setProgressResultId(null);
      setRestoredElapsed(saved.elapsedTime || Math.floor(age / 1000));
      setProgressSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating content', status: 'error' },
        { label: 'Saving results', status: 'pending' },
      ]);
      return;
    }

    if (age > 5 * 60 * 1000) { saveAIGenState(null); return; }
    resumeGeneration(saved);
  }, [teamId]);

  const resumeGeneration = async (saved: AIGenState) => {
    setProgressOpen(true);
    setProgressError(null);
    setProgressResultId(null);

    const steps: AIStep[] = [
      { label: 'Preparing request', status: 'done' },
      { label: 'Connecting to AI', status: 'done' },
      { label: 'Generating content', status: 'active', hint: 'AI is creating your content...' },
      { label: 'Saving results', status: 'pending' },
    ];
    setProgressSteps([...steps]);

    try {
      const res: any = await api.post(`/teams/${saved.teamId}/ai-generate`, {
        prompt: saved.prompt,
        provider: saved.provider,
        model: saved.model,
        generateTypes: saved.generateTypes,
        projectId: saved.projectId,
      });

      steps[2].status = 'done';
      steps[3] = { label: 'Saving results', status: 'active', hint: 'Almost done...' };
      setProgressSteps([...steps]);

      await new Promise(r => setTimeout(r, 600));
      steps[3] = { label: 'Saving results', status: 'done' };
      setProgressSteps([...steps]);

      setResult(res.data);
      setProgressResultId('done');
      saveAIGenState({ ...saved, status: 'done', result: res.data, elapsedTime: Math.floor((Date.now() - saved.startedAt) / 1000) });
      invalidateQueries();
    } catch (err: any) {
      const updated = steps.map(s => s.status === 'active' ? { ...s, status: 'error' as const } : s);
      setProgressSteps(updated);
      const errMsg = err.message || 'AI generation failed. Check your API key and try again.';
      setProgressError(errMsg);
      saveAIGenState({ ...saved, status: 'error', error: errMsg, elapsedTime: Math.floor((Date.now() - saved.startedAt) / 1000) });
    }
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
    queryClient.invalidateQueries({ queryKey: ['brainstorm-sessions', teamId] });
    queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
    queryClient.invalidateQueries({ queryKey: ['goals', teamId] });
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedTypes.length || !teamId) return;

    const startedAt = Date.now();
    const genState: AIGenState = {
      teamId,
      projectId: activeProject?.id,
      prompt,
      provider,
      model,
      generateTypes: selectedTypes,
      startedAt,
      status: 'generating',
    };
    saveAIGenState(genState);

    onOpenChange(false);
    setProgressOpen(true);
    setMinimized(false);
    setProgressError(null);
    setProgressResultId(null);
    setProgressStartedAt(startedAt);
    setProgressTitle(selectedTypes.map(t => GENERATE_OPTIONS.find(o => o.key === t)?.label || t).join(', '));

    const steps: AIStep[] = [
      { label: 'Preparing request', status: 'active' },
      { label: 'Connecting to AI', status: 'pending' },
      { label: 'Generating content', status: 'pending' },
      { label: 'Saving results', status: 'pending' },
    ];
    setProgressSteps([...steps]);

    try {
      await new Promise(r => setTimeout(r, 600));
      steps[0] = { label: 'Preparing request', status: 'done' };
      steps[1] = { label: 'Connecting to AI', status: 'active', hint: 'Establishing connection...' };
      setProgressSteps([...steps]);

      await new Promise(r => setTimeout(r, 500));
      steps[1] = { label: 'Connecting to AI', status: 'done' };
      steps[2] = { label: 'Generating content', status: 'active', hint: 'AI is creating tasks, notes, and more...' };
      setProgressSteps([...steps]);

      const res: any = await api.post(`/teams/${teamId}/ai-generate`, {
        prompt,
        provider,
        model,
        generateTypes: selectedTypes,
        projectId: activeProject?.id,
      });

      steps[2] = { label: 'Generating content', status: 'done' };
      steps[3] = { label: 'Saving results', status: 'active', hint: 'Almost done...' };
      setProgressSteps([...steps]);

      await new Promise(r => setTimeout(r, 600));
      steps[3] = { label: 'Saving results', status: 'done' };
      setProgressSteps([...steps]);

      setResult(res.data);
      setProgressResultId('done');
      saveAIGenState({ ...genState, status: 'done', result: res.data, elapsedTime: Math.floor((Date.now() - startedAt) / 1000) });
      invalidateQueries();
      toast.success('AI generation complete!');
    } catch (err: any) {
      const updated = steps.map(s => s.status === 'active' ? { ...s, status: 'error' as const } : s);
      setProgressSteps(updated);
      const errMsg = err.message || 'AI generation failed. Check your API key and try again.';
      setProgressError(errMsg);
      saveAIGenState({ ...genState, status: 'error', error: errMsg, elapsedTime: Math.floor((Date.now() - startedAt) / 1000) });
    }
  };

  const handleRetry = () => {
    setProgressOpen(false);
    setMinimized(false);
    setProgressSteps([]);
    setProgressError(null);
    setProgressResultId(null);
    saveAIGenState(null);
    onOpenChange(true);
  };

  const handleProgressClose = () => {
    setProgressOpen(false);
    setMinimized(false);
    setProgressSteps([]);
    setProgressError(null);
    setProgressResultId(null);
    saveAIGenState(null);
    setResult(null);
  };

  const handleMinimize = () => {
    setProgressOpen(false);
    setMinimized(true);
  };

  const handleBubbleClick = () => {
    setMinimized(false);
    setProgressOpen(true);
  };

  const handleClose = () => {
    setResult(null);
    setPrompt('');
    setModelFilter('');
    onOpenChange(false);
  };

  const isGenerating = progressSteps.length > 0 && !progressSteps.every(s => s.status === 'done') && !progressError;
  const currentBubbleProgress = progressSteps.length > 0
    ? (progressSteps.filter(s => s.status === 'done').length / progressSteps.length) * 100
    : 0;

  return (
    <>
      {/* Progress Modal */}
      <AIGenerateProgressModal
        open={progressOpen}
        steps={progressSteps}
        error={progressError}
        resultId={progressResultId}
        onClose={handleProgressClose}
        onMinimize={handleMinimize}
        onRetry={handleRetry}
        startedAt={progressStartedAt}
        itemTitle={progressTitle}
        initialElapsed={restoredElapsed}
        generatingTitle="Generating Content"
        doneTitle="Content Generated!"
        generatingSubtitle={<>AI is crafting your tasks, notes & more<AnimatedDots /></>}
        doneSubtitle="All content has been created and added to your project."
        openResultLabel="Done"
        accentColor="#7b68ee"
      />

      {/* Floating Bubble */}
      <AIGenerateBubble
        visible={minimized && isGenerating}
        progress={currentBubbleProgress}
        title={progressTitle}
        onClick={handleBubbleClick}
      />

      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl">
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

          <div className="space-y-5 py-2">
            {/* What to generate */}
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-muted-foreground">What to generate</label>
              <div className="grid grid-cols-2 gap-2">
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
                          : 'border-border/50 hover:border-border hover:bg-muted/50'
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
              
              <div className="flex flex-wrap gap-1.5">
                {connectedProviders.size === 0 ? (
                  <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[12px]">
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
                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <span className="text-sm">{info?.icon || '⚪'}</span>
                        {info?.label || p}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="space-y-1.5">
                {(modelsData?.data?.[provider] || []).length > 6 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search models..."
                      value={modelFilter}
                      onChange={(e) => setModelFilter(e.target.value)}
                      className="h-7 pl-7 text-[11px] rounded-lg border-border/60 bg-muted/30"
                    />
                  </div>
                )}
                <div className="max-h-[260px] overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                  {(() => {
                    const allProviderModels = modelsData?.data?.[provider] || [];
                    const filtered = modelFilter
                      ? allProviderModels.filter((m: any) =>
                          m.name.toLowerCase().includes(modelFilter.toLowerCase()) ||
                          m.id.toLowerCase().includes(modelFilter.toLowerCase())
                        )
                      : allProviderModels;

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <Search className="h-5 w-5 mx-auto text-muted-foreground/30 mb-1" />
                          <p className="text-xs text-muted-foreground">No models match &quot;{modelFilter}&quot;</p>
                        </div>
                      );
                    }

                    const groups = categorizeModels(filtered);
                    const showHeaders = groups.length > 1;

                    return groups.map(group => (
                      <div key={group.label}>
                        {showHeaders && (
                          <div className="sticky top-0 z-10 flex items-center gap-1.5 px-2 py-1 mt-1.5 first:mt-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-background/95 backdrop-blur-sm border-b border-border/30">
                            <span className="text-sm leading-none">{group.icon}</span>
                            <span>{group.label}</span>
                            <span className="text-[9px] font-normal ml-auto tabular-nums opacity-60">{group.models.length}</span>
                          </div>
                        )}
                        {group.models.map((m: any) => {
                          const isSelected = model === m.id;
                          const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                          const desc = m.description && m.description !== 'Free' ? m.description : undefined;
                          return (
                            <button
                              key={m.id}
                              onClick={() => setModel(m.id)}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left',
                                isSelected
                                  ? 'bg-[#7b68ee]/8 ring-1 ring-[#7b68ee]/30'
                                  : 'hover:bg-muted/50'
                              )}
                            >
                              <div className={cn(
                                'h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
                                isSelected ? 'border-[#7b68ee]' : 'border-muted-foreground/30'
                              )}>
                                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-[#7b68ee]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] font-medium text-foreground truncate">{m.name}</span>
                                  {isFree && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-green-500/10 text-green-500 shrink-0 leading-none">FREE</span>}
                                  <span className="text-[9px] text-muted-foreground/60 ml-auto shrink-0 tabular-nums">{(m.contextWindow / 1000).toFixed(0)}K</span>
                                  {!isFree && m.costPer1kInput > 0 && <span className="text-[9px] text-muted-foreground/60 shrink-0 tabular-nums">${m.costPer1kInput.toFixed(3)}</span>}
                                </div>
                                {desc && <p className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">{desc}</p>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button onClick={handleClose} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">Cancel</button>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedTypes.length || connectedProviders.size === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
