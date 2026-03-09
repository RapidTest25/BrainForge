'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Sparkles, Loader2, Search, Clock,
  GitBranch, Network, Workflow, Database, Cpu, Share2, Trash2,
  ChevronDown, CheckCircle2, XCircle, Zap, Brain,
  Timer, RefreshCw, Check, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { useProjectSocket } from '@/hooks/use-project-socket';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

// ── Persistent AI Generation Storage ──

const AI_GEN_STORAGE_KEY = 'brainforge_ai_diagram_gen';

interface AIGenState {
  teamId: string;
  projectId?: string;
  form: { title: string; type: string; description: string; provider: string; model: string };
  startedAt: number;
  status: 'generating' | 'done' | 'error';
  resultId?: string;
  error?: string;
  elapsedTime?: number;
}

function saveAIGenState(state: AIGenState | null) {
  if (state) {
    localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(AI_GEN_STORAGE_KEY);
  }
}

function loadAIGenState(): AIGenState | null {
  try {
    const raw = localStorage.getItem(AI_GEN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const DIAGRAM_TYPES = [
  { value: 'FLOWCHART', label: 'Flowchart', desc: 'Process flows & decisions', icon: Workflow, color: '#f59e0b' },
  { value: 'ERD', label: 'ERD', desc: 'Database relationships', icon: Database, color: '#3b82f6' },
  { value: 'MINDMAP', label: 'Mind Map', desc: 'Brainstorm & organize', icon: Network, color: '#22c55e' },
  { value: 'ARCHITECTURE', label: 'Architecture', desc: 'System design', icon: Cpu, color: '#8b5cf6' },
  { value: 'SEQUENCE', label: 'Sequence', desc: 'Interaction flows', icon: Share2, color: '#ef4444' },
  { value: 'COMPONENT', label: 'Component', desc: 'Module structure', icon: GitBranch, color: '#7b68ee' },
];

// ── Delete Confirmation Dialog ──

function DeleteConfirmDialog({ open, onClose, onConfirm, title, isPending }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card max-w-sm">
        <div className="flex flex-col items-center text-center py-2">
          <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Delete Diagram</h3>
          <p className="text-sm text-muted-foreground mb-1">
            Are you sure you want to delete <span className="font-medium text-foreground">&ldquo;{title}&rdquo;</span>?
          </p>
          <p className="text-xs text-muted-foreground/70">This action cannot be undone.</p>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-xl transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AI Generation Progress Modal ──

type AIStep = {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  hint?: string;
};

function useElapsedTime(isRunning: boolean, startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isRunning || !startedAt) { setElapsed(0); return; }
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isRunning, startedAt]);
  return elapsed;
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/** Animated dots "..." for loading text */
function AnimatedDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c >= 3 ? 1 : c + 1), 500);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block w-4 text-left">{'.'.repeat(count)}</span>;
}

/** Pulsing ring animation */
function PulseRing({ color, active }: { color: string; active: boolean }) {
  if (!active) return null;
  return (
    <>
      <span className="absolute inset-0 rounded-2xl animate-[ai-ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"
        style={{ border: `2px solid ${color}`, opacity: 0.4 }} />
      <span className="absolute inset-0 rounded-2xl animate-[ai-ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]"
        style={{ border: `2px solid ${color}`, opacity: 0.2 }} />
    </>
  );
}

function AIGenerateProgressModal({
  open, steps, error, resultId, onClose, onMinimize, onOpenDiagram, onRetry, startedAt, diagramTitle, initialElapsed,
}: {
  open: boolean;
  steps: AIStep[];
  error: string | null;
  resultId: string | null;
  onClose: () => void;
  onMinimize: () => void;
  onOpenDiagram: () => void;
  onRetry?: () => void;
  startedAt: number | null;
  diagramTitle?: string;
  initialElapsed?: number;
}) {
  const allDone = steps.length > 0 && steps.every(s => s.status === 'done');
  const hasError = !!error;
  const isGenerating = !allDone && !hasError && steps.length > 0;
  const elapsed = useElapsedTime(isGenerating, startedAt);
  const finalElapsed = useRef(initialElapsed || 0);
  useEffect(() => {
    if (initialElapsed && initialElapsed > 0) finalElapsed.current = initialElapsed;
  }, [initialElapsed]);
  if (isGenerating) finalElapsed.current = elapsed;
  
  const doneSteps = steps.filter(s => s.status === 'done').length;
  const activeIdx = steps.findIndex(s => s.status === 'active');
  
  // Smooth progress calculation
  const baseProgress = steps.length > 0 ? (doneSteps / steps.length) * 100 : 0;
  const smoothProgress = activeIdx >= 0
    ? ((doneSteps + Math.min(elapsed * 0.02, 0.85)) / steps.length) * 100
    : baseProgress;
  const displayProgress = allDone ? 100 : hasError ? baseProgress : Math.min(smoothProgress, 99);
  
  const statusColor = hasError ? '#ef4444' : allDone ? '#22c55e' : '#7b68ee';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { isGenerating ? onMinimize() : onClose(); } }}>
      <DialogContent className="bg-card max-w-105 p-0 overflow-hidden border-border/50 shadow-2xl">
        <VisuallyHidden.Root><DialogTitle>AI Generation Progress</DialogTitle></VisuallyHidden.Root>
        {/* Gradient header band */}
        <div className="relative h-1.5 w-full overflow-hidden"
          style={{ background: hasError ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)' : allDone ? 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)' : 'linear-gradient(90deg, #7b68ee 0%, #a78bfa 50%, #7b68ee 100%)' }}>
          {/* Progress track */}
          <div className="absolute inset-0 bg-muted/80" />
          {/* Progress fill */}
          <div className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out"
            style={{
              width: `${displayProgress}%`,
              backgroundImage: hasError
                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                : allDone
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, #7b68ee, #a78bfa, #7b68ee)',
              backgroundSize: '200% 100%',
            }}
          />
          {isGenerating && (
            <div className="absolute inset-y-0 left-0 transition-all duration-1000"
              style={{ width: `${displayProgress}%` }}>
              <div className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
            </div>
          )}
        </div>

        <div className="px-6 pt-5 pb-6">
          {/* Icon + Title Section */}
          <div className="flex flex-col items-center text-center mb-5">
            {/* Animated status icon */}
            <div className="relative mb-4">
              <div className={cn(
                'h-18 w-18 rounded-2xl flex items-center justify-center transition-all duration-500',
                hasError ? 'bg-red-500/10' : allDone ? 'bg-green-500/10' : 'bg-[#7b68ee]/10'
              )}>
                <PulseRing color={statusColor} active={isGenerating} />
                {hasError ? (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                ) : allDone ? (
                  <div className="relative">
                    <CheckCircle2 className="h-9 w-9 text-green-500 animate-in zoom-in-50 duration-500" />
                    {/* Small sparkles around the check */}
                    <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-green-400 animate-in spin-in-180 zoom-in-50 duration-700" />
                  </div>
                ) : (
                  <Brain className="h-8 w-8 text-[#7b68ee] animate-pulse" />
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[17px] font-bold text-foreground leading-tight">
              {hasError ? 'Generation Failed' : allDone ? 'Diagram Ready!' : 'Generating Diagram'}
            </h3>
            
            {/* Diagram title badge */}
            {diagramTitle && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: `${statusColor}12`, color: statusColor }}>
                <Sparkles className="h-2.5 w-2.5" />
                {diagramTitle}
              </div>
            )}

            {/* Subtitle */}
            <p className="text-[13px] text-muted-foreground mt-2 max-w-70">
              {hasError
                ? 'Something went wrong. Please check your API key or try a different model.'
                : allDone
                  ? 'Your AI-powered diagram has been created and saved successfully.'
                  : <>AI is crafting your diagram<AnimatedDots /></>}
            </p>

            {/* Timer & Progress badge */}
            {(isGenerating || allDone) && startedAt && (
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  {formatElapsed(allDone ? finalElapsed.current : elapsed)}
                </div>
                {isGenerating && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: '#7b68ee15', color: '#7b68ee' }}>
                    {Math.round(displayProgress)}%
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="relative bg-muted/40 rounded-xl p-3 mb-4 border border-border/50">
            {/* Vertical connector line */}
            <div className="absolute left-7.25 top-5.5 bottom-5.5 w-0.5 rounded-full overflow-hidden bg-border/60">
              <div className="w-full transition-all duration-700 ease-out rounded-full"
                style={{
                  height: `${displayProgress}%`,
                  background: hasError
                    ? 'linear-gradient(to bottom, #22c55e, #ef4444)'
                    : allDone
                      ? '#22c55e'
                      : 'linear-gradient(to bottom, #22c55e, #7b68ee)',
                }} />
            </div>

            <div className="space-y-0.5">
              {steps.map((step, i) => {
                const isActive = step.status === 'active';
                const isDone = step.status === 'done';
                const isError = step.status === 'error';
                const isPending = step.status === 'pending';

                return (
                  <div key={i} className={cn(
                    'relative flex items-start gap-3 px-2 py-2.5 rounded-lg transition-all duration-300',
                    isActive && 'bg-[#7b68ee]/6',
                    isDone && 'opacity-75',
                  )}>
                    {/* Step indicator */}
                    <div className="shrink-0 relative z-10 mt-px">
                      {isDone ? (
                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm"
                          style={{ boxShadow: '0 0 8px rgba(34, 197, 94, 0.3)' }}>
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      ) : isActive ? (
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #7b68ee, #a78bfa)', boxShadow: '0 0 12px rgba(123, 104, 238, 0.4)' }}>
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                        </div>
                      ) : isError ? (
                        <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center shadow-sm"
                          style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)' }}>
                          <XCircle className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                          <span className="text-[9px] font-bold text-muted-foreground/40">{i + 1}</span>
                        </div>
                      )}
                    </div>

                    {/* Step text */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          'text-[13px] font-medium leading-tight',
                          isDone ? 'text-green-600 dark:text-green-400'
                            : isActive ? 'text-[#7b68ee] dark:text-[#9b8cff]'
                              : isError ? 'text-red-500'
                                : 'text-muted-foreground/40'
                        )}>
                          {step.label}
                        </span>
                        {isDone && (
                          <span className="text-[10px] font-semibold text-green-500 shrink-0 px-1.5 py-0.5 rounded-full bg-green-500/10">
                            Done
                          </span>
                        )}
                        {isActive && (
                          <span className="shrink-0 flex gap-0.5">
                            <span className="h-1 w-1 rounded-full bg-[#7b68ee] animate-[ai-bounce_1.4s_ease-in-out_infinite]" />
                            <span className="h-1 w-1 rounded-full bg-[#7b68ee] animate-[ai-bounce_1.4s_ease-in-out_0.2s_infinite]" />
                            <span className="h-1 w-1 rounded-full bg-[#7b68ee] animate-[ai-bounce_1.4s_ease-in-out_0.4s_infinite]" />
                          </span>
                        )}
                        {isError && (
                          <span className="text-[10px] font-semibold text-red-500 shrink-0 px-1.5 py-0.5 rounded-full bg-red-500/10">
                            Failed
                          </span>
                        )}
                      </div>
                      {/* Hint text for active long steps */}
                      {isActive && step.hint && (
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-tight">{step.hint}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error details */}
          {hasError && error && (
            <div className="mb-4 px-3.5 py-3 rounded-xl bg-red-500/6 border border-red-500/15">
              <div className="flex gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-medium text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {(allDone || hasError) && (
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-xl transition-all duration-200 active:scale-[0.98]">
                {hasError ? 'Close' : 'Stay Here'}
              </button>
              {hasError && onRetry && (
                <button onClick={onRetry}
                  className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #7b68ee, #6c5ce7)' }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              )}
              {allDone && resultId && (
                <button onClick={onOpenDiagram}
                  className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #7b68ee, #6c5ce7)', boxShadow: '0 4px 14px rgba(123, 104, 238, 0.35)' }}>
                  Open Diagram <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Background info for generating state */}
          {isGenerating && (
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-muted-foreground/40">
              <RefreshCw className="h-2.5 w-2.5" />
              Safe to refresh — generation continues in background
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──

export default function DiagramsPage() {
  const router = useRouter();
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { emitEntityChange, on: onProjectEvent } = useProjectSocket(activeProject?.id);
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const searchParams = useSearchParams();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // AI progress modal state
  const [aiProgressOpen, setAiProgressOpen] = useState(false);
  const [aiSteps, setAiSteps] = useState<AIStep[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResultId, setAiResultId] = useState<string | null>(null);
  const [aiStartedAt, setAiStartedAt] = useState<number | null>(null);
  const [aiTitle, setAiTitle] = useState<string>('');
  const [aiRestoredElapsed, setAiRestoredElapsed] = useState<number | undefined>(undefined);
  const aiGenAbortRef = useRef<AbortController | null>(null);

  // Restore pending AI generation from localStorage on mount
  useEffect(() => {
    const saved = loadAIGenState();
    if (!saved || !teamId || saved.teamId !== teamId) return;

    const age = Date.now() - saved.startedAt;

    // Auto-clear states older than 1 hour
    if (age > 60 * 60 * 1000) {
      saveAIGenState(null);
      return;
    }

    setAiTitle(saved.form.title);
    setAiStartedAt(saved.startedAt);

    if (saved.status === 'done') {
      // Restore completed modal
      setAiProgressOpen(true);
      setAiResultId(saved.resultId || null);
      setAiError(null);
      setAiRestoredElapsed(saved.elapsedTime || Math.floor(age / 1000));
      setAiSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating diagram XML', status: 'done' },
        { label: 'Saving to project', status: 'done' },
      ]);
      return;
    }

    if (saved.status === 'error') {
      // Restore error modal
      setAiProgressOpen(true);
      setAiError(saved.error || 'Generation failed');
      setAiResultId(null);
      setAiRestoredElapsed(saved.elapsedTime || Math.floor(age / 1000));
      setAiSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating diagram XML', status: 'error' },
        { label: 'Saving to project', status: 'pending' },
      ]);
      return;
    }

    // Status is 'generating' — resume
    if (age > 5 * 60 * 1000) {
      saveAIGenState(null);
      return;
    }
    resumeAIGeneration(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const resumeAIGeneration = useCallback(async (saved: AIGenState) => {
    setAiProgressOpen(true);
    setAiError(null);
    setAiResultId(null);

    const steps: AIStep[] = [
      { label: 'Preparing request', status: 'done' },
      { label: 'Connecting to AI', status: 'done' },
      { label: 'Generating diagram XML', status: 'active', hint: 'AI is designing the layout…' },
      { label: 'Saving to project', status: 'pending' },
    ];
    setAiSteps([...steps]);

    try {
      const res: any = await api.post(`/teams/${saved.teamId}/diagrams/ai-generate`, {
        ...saved.form,
        prompt: saved.form.description,
        projectId: saved.projectId,
      });

      steps[2].status = 'done';
      steps[3] = { label: 'Saving to project', status: 'active', hint: 'Almost done...' };
      setAiSteps([...steps]);

      await new Promise(r => setTimeout(r, 600));
      steps[3] = { label: 'Saving to project', status: 'done' };
      setAiSteps([...steps]);

      const newId = res.data.id;
      setAiResultId(newId);
      saveAIGenState({ ...saved, status: 'done', resultId: newId, elapsedTime: Math.floor((Date.now() - saved.startedAt) / 1000) });
      queryClient.invalidateQueries({ queryKey: ['diagrams', saved.teamId] });
      emitEntityChange('diagram', 'create');
    } catch (err: any) {
      const updated = steps.map(s =>
        s.status === 'active' ? { ...s, status: 'error' as const } : s
      );
      setAiSteps(updated);
      const errMsg = err.message || 'AI generation failed. Check your API key and try again.';
      setAiError(errMsg);
      saveAIGenState({ ...saved, status: 'error', error: errMsg, elapsedTime: Math.floor((Date.now() - saved.startedAt) / 1000) });
    }
  }, [queryClient, emitEntityChange]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
  }, [searchParams]);

  // Listen for real-time diagram changes from other team members
  useEffect(() => {
    const unsub = onProjectEvent('entity:changed', (data: any) => {
      if (data.type === 'diagram') {
        queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      }
    });
    return unsub;
  }, [onProjectEvent, teamId, queryClient]);

  const [newDiagram, setNewDiagram] = useState({ title: '', type: 'FLOWCHART', description: '' });
  const [aiForm, setAiForm] = useState({ title: '', type: 'FLOWCHART', description: '', provider: 'COPILOT', model: 'gpt-4o' });
  const [search, setSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [modelDropOpen, setModelDropOpen] = useState(false);

  const { data: diagrams } = useQuery({
    queryKey: ['diagrams', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/diagrams${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`),
    enabled: !!teamId,
  });

  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const { data: keysData } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: any[] }>('/ai/keys'),
  });

  // Auto-select first connected provider + model
  const connectedProviders = new Set((keysData?.data || []).filter((k: any) => k.isActive).map((k: any) => k.provider.toUpperCase()));
  useEffect(() => {
    if (modelsData?.data && connectedProviders.size > 0 && !connectedProviders.has(aiForm.provider)) {
      const first = ['COPILOT', 'OPENAI', 'GEMINI', 'CLAUDE', 'OPENROUTER', 'GROQ'].find(p => connectedProviders.has(p))
        || Array.from(connectedProviders)[0];
      if (first) {
        const firstModel = modelsData.data[first]?.[0];
        setAiForm(f => ({ ...f, provider: first, model: firstModel?.id || 'gpt-4o' }));
      }
    }
  }, [modelsData, keysData]);

  useEffect(() => {
    const providerModels = modelsData?.data?.[aiForm.provider];
    if (providerModels?.length && !providerModels.find((m: any) => m.id === aiForm.model)) {
      setAiForm(f => ({ ...f, model: providerModels[0].id }));
    }
  }, [aiForm.provider, modelsData]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/diagrams`, { ...data, projectId: activeProject?.id }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      setShowCreate(false);
      toast.success('Diagram created');
      emitEntityChange('diagram', 'create');
      router.push(`/diagrams/${res.data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create diagram');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/diagrams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      setDeleteConfirm(null);
      toast.success('Diagram deleted');
      emitEntityChange('diagram', 'delete');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete diagram');
    },
  });

  // AI Generate with progress steps
  const handleAIGenerate = async () => {
    if (!aiForm.title || !aiForm.description || !teamId) return;

    const startedAt = Date.now();
    const genState: AIGenState = {
      teamId,
      projectId: activeProject?.id,
      form: aiForm,
      startedAt,
      status: 'generating',
    };
    saveAIGenState(genState);

    // Close form dialog, open progress modal
    setShowAIGenerate(false);
    setAiProgressOpen(true);
    setAiError(null);
    setAiResultId(null);
    setAiStartedAt(startedAt);
    setAiTitle(aiForm.title);

    const steps: AIStep[] = [
      { label: 'Preparing request', status: 'active' },
      { label: 'Connecting to AI', status: 'pending' },
      { label: 'Generating diagram XML', status: 'pending' },
      { label: 'Saving to project', status: 'pending' },
    ];
    setAiSteps([...steps]);

    try {
      // Step 1 done
      await new Promise(r => setTimeout(r, 600));
      steps[0] = { label: 'Preparing request', status: 'done' };
      steps[1] = { label: 'Connecting to AI', status: 'active', hint: 'Establishing connection...' };
      setAiSteps([...steps]);

      // Step 2 done
      await new Promise(r => setTimeout(r, 500));
      steps[1] = { label: 'Connecting to AI', status: 'done' };
      steps[2] = { label: 'Generating diagram XML', status: 'active', hint: 'AI is designing the layout…' };
      setAiSteps([...steps]);

      // Step 3 — actual API call (the long one)
      const res: any = await api.post(`/teams/${teamId}/diagrams/ai-generate`, {
        ...aiForm,
        prompt: aiForm.description,
        projectId: activeProject?.id,
      });

      steps[2] = { label: 'Generating diagram XML', status: 'done' };
      steps[3] = { label: 'Saving to project', status: 'active', hint: 'Almost done...' };
      setAiSteps([...steps]);

      // Step 4 done
      await new Promise(r => setTimeout(r, 600));
      steps[3] = { label: 'Saving to project', status: 'done' };
      setAiSteps([...steps]);

      // Done!
      const newId = res.data.id;
      setAiResultId(newId);
      saveAIGenState({ ...genState, status: 'done', resultId: newId, elapsedTime: Math.floor((Date.now() - startedAt) / 1000) });
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      emitEntityChange('diagram', 'create');
      toast.success('Diagram generated successfully!');
    } catch (err: any) {
      const updated = steps.map(s =>
        s.status === 'active' ? { ...s, status: 'error' as const } : s
      );
      setAiSteps(updated);
      const errMsg = err.message || 'AI generation failed. Check your API key and try again.';
      setAiError(errMsg);
      saveAIGenState({ ...genState, status: 'error', error: errMsg, elapsedTime: Math.floor((Date.now() - startedAt) / 1000) });
    }
  };

  const handleRetryAIGenerate = () => {
    setAiProgressOpen(false);
    setAiSteps([]);
    setAiError(null);
    setAiResultId(null);
    saveAIGenState(null);
    setShowAIGenerate(true);
  };

  const getType = (type: string) => DIAGRAM_TYPES.find(d => d.value === type);
  const diagramList = diagrams?.data || [];
  const filteredDiagrams = search
    ? diagramList.filter((d: any) => d.title.toLowerCase().includes(search.toLowerCase()))
    : diagramList;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Diagrams</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{diagramList.length} diagram{diagramList.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAIGenerate(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#7b68ee]/20 text-[#7b68ee] text-sm rounded-lg hover:bg-[#7b68ee]/5 transition-colors">
            <Sparkles className="h-3.5 w-3.5" /> AI Generate
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors">
            <Plus className="h-3.5 w-3.5" /> New Diagram
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search diagrams..." className="pl-9 border-border focus:border-[#7b68ee]" />
      </div>

      {/* Quick type shortcuts */}
      <div className="flex flex-wrap gap-2">
        {DIAGRAM_TYPES.map(({ value, label, icon: Icon, color }) => (
          <button key={value} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:shadow-sm transition-all bg-card"
            onClick={() => { setNewDiagram({ ...newDiagram, type: value }); setShowCreate(true); }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
            <span className="text-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* Diagram list */}
      {filteredDiagrams.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">All Diagrams</h3>
          {filteredDiagrams.map((d: any) => {
            const dtype = getType(d.type);
            const hasXml = !!(d.data as any)?.xml;
            const nodeCount = (d.data as any)?.nodes?.length || 0;
            return (
              <div key={d.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-sm hover:border-border transition-all flex items-center gap-4"
                onClick={() => router.push(`/diagrams/${d.id}`)}>
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${dtype?.color || '#6b7280'}10` }}>
                  {dtype && <dtype.icon className="h-5 w-5" style={{ color: dtype.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{d.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: dtype?.color, backgroundColor: `${dtype?.color}10` }}>{d.type}</span>
                    {hasXml && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#7b68ee]/10 text-[#7b68ee]">draw.io</span>}
                    {!hasXml && nodeCount > 0 && <span className="text-[11px] text-muted-foreground">{nodeCount} nodes</span>}
                    {d.description && <span className="text-[11px] text-muted-foreground truncate max-w-48">{d.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                  <button className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: d.id, title: d.title }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : diagramList.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-muted">
            <GitBranch className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h3 className="font-medium text-foreground mb-1">No Diagrams Yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">Create a diagram manually or use AI to generate flowcharts, ERDs, mind maps and more.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setShowAIGenerate(true)} className="flex items-center gap-1.5 px-4 py-2 border border-[#7b68ee]/20 text-[#7b68ee] text-sm rounded-lg hover:bg-[#7b68ee]/5 transition-colors">
              <Sparkles className="h-3.5 w-3.5" /> AI Generate
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors">
              <Plus className="h-3.5 w-3.5" /> Create Diagram
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No diagrams matching &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
        title={deleteConfirm?.title || ''}
        isPending={deleteMutation.isPending}
      />

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Diagram</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const selectedType = getType(newDiagram.type);
              return selectedType ? (
                <div className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-xl bg-muted/50">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedType.color}12` }}>
                    <selectedType.icon className="h-4 w-4" style={{ color: selectedType.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedType.label}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedType.desc}</p>
                  </div>
                </div>
              ) : null;
            })()}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Title</label>
              <Input value={newDiagram.title} onChange={(e) => setNewDiagram({ ...newDiagram, title: e.target.value })} placeholder="e.g. User Authentication Flow" className="border-border focus:border-[#7b68ee]" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea value={newDiagram.description} onChange={(e) => setNewDiagram({ ...newDiagram, description: e.target.value })} placeholder="What is this diagram about?" rows={2} className="border-border focus:border-[#7b68ee]" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button onClick={() => createMutation.mutate(newDiagram)} disabled={!newDiagram.title || createMutation.isPending}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors flex items-center gap-1.5">
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showAIGenerate} onOpenChange={setShowAIGenerate}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-[#7b68ee]" />
              AI Generate Diagram
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Title</label>
              <Input value={aiForm.title} onChange={(e) => setAiForm({ ...aiForm, title: e.target.value })} placeholder="Diagram title" className="border-border focus:border-[#7b68ee]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Type</label>
              <Select value={aiForm.type} onValueChange={(v) => setAiForm({ ...aiForm, type: v })}>
                <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIAGRAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Description</label>
              <Textarea value={aiForm.description} onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })} placeholder="Describe what you want the diagram to show..." rows={4} className="border-border focus:border-[#7b68ee]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Provider</label>
                <Select value={aiForm.provider} onValueChange={(v) => {
                  const models = modelsData?.data?.[v] || [];
                  setAiForm({ ...aiForm, provider: v, model: models[0]?.id || '' });
                  setModelSearch('');
                  setModelDropOpen(false);
                }}>
                  <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(modelsData?.data || {}).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 relative">
                <label className="text-[13px] font-medium text-muted-foreground">Model</label>
                {(() => {
                  const allModels = modelsData?.data?.[aiForm.provider] || [];
                  const hasMany = allModels.length > 10;
                  const selectedModel = allModels.find((m: any) => m.id === aiForm.model);

                  if (!hasMany) {
                    return (
                      <Select value={aiForm.model} onValueChange={(v) => setAiForm({ ...aiForm, model: v })}>
                        <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allModels.map((m: any) => {
                            const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                            return <SelectItem key={m.id} value={m.id}>{m.name}{isFree ? ' ✦ Free' : ''}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    );
                  }

                  const filtered = modelSearch
                    ? allModels.filter((m: any) =>
                        m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
                        m.id.toLowerCase().includes(modelSearch.toLowerCase())
                      )
                    : allModels;

                  return (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setModelDropOpen(!modelDropOpen)}
                        className="flex items-center w-full h-9 px-3 text-sm border border-border rounded-md bg-background hover:bg-accent/50 transition-colors text-left"
                      >
                        <span className="truncate flex-1 text-foreground">
                          {selectedModel?.name || aiForm.model || 'Select model'}
                          {selectedModel && selectedModel.costPer1kInput === 0 && selectedModel.costPer1kOutput === 0 ? ' ✦ Free' : ''}
                        </span>
                        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', modelDropOpen && 'rotate-180')} />
                      </button>
                      {modelDropOpen && (
                        <div className="absolute z-50 top-10 left-0 right-0 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
                          <div className="relative border-b border-border">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              placeholder="Search models..."
                              value={modelSearch}
                              onChange={(e) => setModelSearch(e.target.value)}
                              className="w-full h-8 pl-8 pr-3 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-50 overflow-y-auto p-1">
                            {filtered.length === 0 ? (
                              <div className="text-center py-3 text-xs text-muted-foreground">No models found</div>
                            ) : (
                              filtered.slice(0, 50).map((m: any) => {
                                const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setAiForm({ ...aiForm, model: m.id });
                                      setModelDropOpen(false);
                                      setModelSearch('');
                                    }}
                                    className={cn(
                                      'w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-md hover:bg-accent/60 transition-colors',
                                      aiForm.model === m.id && 'bg-[#7b68ee]/10 text-[#7b68ee]'
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">
                                        {m.name}
                                        {isFree && <span className="ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded bg-green-500/10 text-green-500">FREE</span>}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground/60 truncate font-mono">{m.id}</div>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {(m.contextWindow / 1000).toFixed(0)}K
                                    </span>
                                  </button>
                                );
                              })
                            )}
                            {filtered.length > 50 && (
                              <div className="text-center py-2 text-[10px] text-muted-foreground">
                                Showing 50 of {filtered.length} — refine your search
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowAIGenerate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button onClick={handleAIGenerate} disabled={!aiForm.title || !aiForm.description}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors">
              <Zap className="h-3.5 w-3.5" />
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generation Progress Modal */}
      <AIGenerateProgressModal
        open={aiProgressOpen}
        steps={aiSteps}
        error={aiError}
        resultId={aiResultId}
        startedAt={aiStartedAt}
        diagramTitle={aiTitle}
        initialElapsed={aiRestoredElapsed}
        onRetry={handleRetryAIGenerate}
        onMinimize={() => setAiProgressOpen(false)}
        onClose={() => { setAiProgressOpen(false); setAiSteps([]); setAiError(null); setAiResultId(null); setAiStartedAt(null); setAiRestoredElapsed(undefined); saveAIGenState(null); }}
        onOpenDiagram={() => {
          if (aiResultId) {
            setAiProgressOpen(false);
            saveAIGenState(null);
            router.push(`/diagrams/${aiResultId}`);
          }
        }}
      />

      {/* Floating progress indicator when modal is minimized but generation is active */}
      {!aiProgressOpen && aiSteps.length > 0 && aiSteps.some(s => s.status === 'active') && (
        <button
          onClick={() => setAiProgressOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 pl-3.5 pr-4 py-2.5 bg-card border border-border rounded-2xl shadow-xl hover:shadow-2xl transition-all animate-in slide-in-from-bottom-4 duration-300 group"
        >
          <div className="relative h-8 w-8 rounded-xl bg-[#7b68ee]/10 flex items-center justify-center">
            <Brain className="h-4 w-4 text-[#7b68ee] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#7b68ee] animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#7b68ee]" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground">AI Generating...</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-36">{aiTitle}</p>
          </div>
          <Loader2 className="h-3.5 w-3.5 text-[#7b68ee] animate-spin group-hover:text-[#6c5ce7]" />
        </button>
      )}
    </div>
  );
}
