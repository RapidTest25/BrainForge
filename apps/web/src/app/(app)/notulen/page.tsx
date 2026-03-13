'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScrollText, Plus, Sparkles, Clock, Loader2, Search,
  ChevronRight, ArrowLeft, Trash2, MoreVertical, Eye,
  Brain, Lightbulb, ListChecks, CalendarDays, FileText,
  Target, GitBranch, MessageSquare, ChevronDown, RefreshCw,
  Power, PowerOff, Settings2, BookOpen, Copy, Check, Hash,
  Timer, Layers, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import {
  AIGenerateProgressModal,
  AIGenerateBubble,
  AnimatedDots,
  type AIStep,
} from '@/components/ai-progress-modal';

const ACCENT = '#06b6d4'; // cyan-500
const PROVIDERS = ['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI', 'GROQ', 'COPILOT'];

const LS_KEY = 'brainforge_notulen_gen';

interface NotulenGenState {
  status: 'generating' | 'done' | 'error';
  teamId: string;
  startedAt: number;
  elapsedTime?: number;
  error?: string;
  entryId?: string;
  itemTitle?: string;
}

function saveGenState(s: NotulenGenState | null) {
  try {
    if (s) localStorage.setItem(LS_KEY, JSON.stringify(s));
    else localStorage.removeItem(LS_KEY);
  } catch {}
}
function loadGenState(): NotulenGenState | null {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

// ── Markdown renderer (reusing pattern from notes page) ──
function renderMarkdown(text: string): string {
  if (!text) return '';
  const codeBlocks: string[] = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = codeBlocks.length;
    const langLabel = lang ? '<div class="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider"><span>' + lang + '</span></div>' : '';
    codeBlocks.push(
      '<div class="rounded-lg border border-border my-4 overflow-hidden bg-muted/30">' + langLabel + '<pre class="p-4 overflow-x-auto"><code class="text-[13px] font-mono text-foreground leading-relaxed">' + code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim() + '</code></pre></div>'
    );
    return '%%CB_' + idx + '%%';
  });
  const inlineCodes: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push('<code class="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded text-[13px] font-mono">' + code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>');
    return '%%IC_' + idx + '%%';
  });
  let html = processed
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#### (.+)$/gm, '<h4 class="text-[15px] font-semibold text-foreground mt-5 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-6 mb-2.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-foreground mt-7 mb-3 pb-2 border-b border-border/60">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-foreground mt-8 mb-4 pb-2.5 border-b-2 border-cyan-500/30">$1</h1>')
    .replace(/^---$/gm, '<hr class="border-border/60 my-8" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-cyan-500 pl-4 py-2 my-3 bg-cyan-500/5 rounded-r-lg text-muted-foreground italic text-[14px]">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-foreground/80">$1</em>')
    .replace(/^- \[x\] (.+)$/gm, '<div class="flex items-center gap-2.5 my-1.5 pl-1"><div class="h-4 w-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center"><svg class="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6l3 3 5-5"/></svg></div><span class="line-through text-muted-foreground/60 text-[14px]">$1</span></div>')
    .replace(/^- \[ \] (.+)$/gm, '<div class="flex items-center gap-2.5 my-1.5 pl-1"><div class="h-4 w-4 rounded border-2 border-border"></div><span class="text-foreground text-[14px]">$1</span></div>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-5 list-disc my-1 text-[14px] leading-relaxed">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 list-decimal my-1 text-[14px] leading-relaxed">$1</li>')
    .replace(/((?:<li class="ml-5 list-disc[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-3 space-y-0.5">$1</ul>')
    .replace(/((?:<li class="ml-5 list-decimal[^>]*>.*<\/li>\n?)+)/g, '<ol class="my-3 space-y-0.5">$1</ol>')
    .replace(/^(?!<[a-z/!]|%%CB|%%IC)(.+)$/gm, '<p class="my-2 leading-relaxed text-[14px] text-foreground/90">$1</p>');
  codeBlocks.forEach((block, i) => { html = html.replace('%%CB_' + i + '%%', block); });
  inlineCodes.forEach((code, i) => { html = html.replace('%%IC_' + i + '%%', code); });
  return html;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

function DetailSection({ label, icon: Icon, color, content }: { label: string; icon: any; color: string; content: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content || '');
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  if (!content) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 group/section">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover/section:opacity-100 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <MarkdownContent content={content} />
    </div>
  );
}

export default function NotulenPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();

  // ── State ──
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genProvider, setGenProvider] = useState('COPILOT');
  const [genModel, setGenModel] = useState('gpt-4o');
  const [genModelSearch, setGenModelSearch] = useState('');
  const [genModelOpen, setGenModelOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // ── AI Progress ──
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMinimized, setProgressMinimized] = useState(false);
  const [progressSteps, setProgressSteps] = useState<AIStep[]>([]);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressResult, setProgressResult] = useState<string | null>(null);
  const [progressStartedAt, setProgressStartedAt] = useState<number | null>(null);
  const [progressTitle, setProgressTitle] = useState<string>('');
  const [initialElapsed, setInitialElapsed] = useState<number>(0);

  // ── Queries ──
  const { data: entriesRes, isLoading: loadingEntries } = useQuery({
    queryKey: ['notulen', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/notulen${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`),
    enabled: !!teamId,
  });

  const { data: configRes } = useQuery({
    queryKey: ['notulen-config', teamId],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/notulen/config`),
    enabled: !!teamId,
  });

  const { data: models } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
    staleTime: 5 * 60_000,
  });

  const { data: keysData } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: any[] }>('/ai/keys'),
  });

  const providerModels = models?.data?.[genProvider] || [];
  const config = configRes?.data;
  const entries = entriesRes?.data || [];

  // Auto-select first connected provider + model
  const connectedProviders = new Set((keysData?.data || []).filter((k: any) => k.isActive).map((k: any) => k.provider.toUpperCase()));
  useEffect(() => {
    if (models?.data && connectedProviders.size > 0 && !connectedProviders.has(genProvider)) {
      const first = ['COPILOT', 'OPENAI', 'GEMINI', 'CLAUDE', 'OPENROUTER', 'GROQ'].find(p => connectedProviders.has(p))
        || Array.from(connectedProviders)[0];
      if (first) {
        setGenProvider(first);
        const firstModel = models.data[first]?.[0];
        if (firstModel) setGenModel(firstModel.id);
      }
    }
  }, [models, keysData]);

  useEffect(() => {
    if (providerModels?.length && !providerModels.find((m: any) => m.id === genModel)) {
      setGenModel(providerModels[0].id);
    }
  }, [genProvider, models]);

  // ── Mutations ──
  const toggleMutation = useMutation({
    mutationFn: (data: { isActive?: boolean; provider?: string; model?: string }) =>
      api.patch(`/teams/${teamId}/notulen/config`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notulen-config', teamId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) =>
      api.delete(`/teams/${teamId}/notulen/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notulen', teamId] });
      if (selectedEntry && deleteConfirm && selectedEntry.id === deleteConfirm.id) {
        setSelectedEntry(null);
      }
      toast.success('Notulen entry deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  });

  // ── Restore from localStorage ──
  useEffect(() => {
    const saved = loadGenState();
    if (!saved || !teamId || saved.teamId !== teamId) return;
    if (saved.status === 'generating') {
      // Was generating before refresh — mark as error since we lost the request
      const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
      setProgressSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating summary', status: 'error' },
        { label: 'Saving results', status: 'pending' },
      ]);
      setProgressError('Generation was interrupted. Please try again.');
      setProgressResult(null);
      setProgressStartedAt(saved.startedAt);
      setInitialElapsed(elapsed);
      setProgressTitle(saved.itemTitle || '');
      setProgressOpen(true);
      saveGenState({ ...saved, status: 'error', error: 'Interrupted', elapsedTime: elapsed });
    } else if (saved.status === 'done') {
      setProgressSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating summary', status: 'done' },
        { label: 'Saving results', status: 'done' },
      ]);
      setProgressError(null);
      setProgressResult(saved.entryId || null);
      setProgressStartedAt(saved.startedAt);
      setInitialElapsed(saved.elapsedTime || 0);
      setProgressTitle(saved.itemTitle || '');
      setProgressOpen(true);
    } else if (saved.status === 'error') {
      setProgressSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating summary', status: 'error' },
        { label: 'Saving results', status: 'pending' },
      ]);
      setProgressError(saved.error || 'Unknown error');
      setProgressResult(null);
      setProgressStartedAt(saved.startedAt);
      setInitialElapsed(saved.elapsedTime || 0);
      setProgressTitle(saved.itemTitle || '');
      setProgressOpen(true);
    }
  }, [teamId]);

  // ── Generate ──
  async function handleGenerate() {
    if (!teamId || !genProvider || !genModel) return;
    setShowGenerate(false);

    const startedAt = Date.now();
    const stTitle = 'AI Summary';

    setProgressSteps([
      { label: 'Preparing request', status: 'active', hint: 'Gathering activity data...' },
      { label: 'Connecting to AI', status: 'pending' },
      { label: 'Generating summary', status: 'pending' },
      { label: 'Saving results', status: 'pending' },
    ]);
    setProgressError(null);
    setProgressResult(null);
    setProgressStartedAt(startedAt);
    setProgressTitle(stTitle);
    setProgressMinimized(false);
    setProgressOpen(true);
    setInitialElapsed(0);

    saveGenState({ status: 'generating', teamId, startedAt, itemTitle: stTitle });

    // Step 2
    await new Promise(r => setTimeout(r, 600));
    setProgressSteps([
      { label: 'Preparing request', status: 'done' },
      { label: 'Connecting to AI', status: 'active', hint: `Using ${genProvider}...` },
      { label: 'Generating summary', status: 'pending' },
      { label: 'Saving results', status: 'pending' },
    ]);

    // Step 3
    await new Promise(r => setTimeout(r, 400));
    setProgressSteps([
      { label: 'Preparing request', status: 'done' },
      { label: 'Connecting to AI', status: 'done' },
      { label: 'Generating summary', status: 'active', hint: 'AI is analyzing your activity...' },
      { label: 'Saving results', status: 'pending' },
    ]);

    try {
      const res = await api.post<{ data: any }>(`/teams/${teamId}/notulen/generate`, {
        provider: genProvider,
        model: genModel,
        projectId: activeProject?.id,
        customPrompt: customPrompt || undefined,
      });

      // Step 4
      setProgressSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating summary', status: 'done' },
        { label: 'Saving results', status: 'active', hint: 'Finalizing...' },
      ]);

      await new Promise(r => setTimeout(r, 500));

      setProgressSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating summary', status: 'done' },
        { label: 'Saving results', status: 'done' },
      ]);
      setProgressResult(res.data?.id || 'done');

      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      saveGenState({ status: 'done', teamId, startedAt, elapsedTime: elapsed, entryId: res.data?.id, itemTitle: stTitle });

      queryClient.invalidateQueries({ queryKey: ['notulen', teamId] });
      setCustomPrompt('');
      toast.success('AI Summary generated!');
    } catch (err: any) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const errMsg = err.message || 'Failed to generate summary';
      setProgressSteps([
        { label: 'Preparing request', status: 'done' },
        { label: 'Connecting to AI', status: 'done' },
        { label: 'Generating summary', status: 'error' },
        { label: 'Saving results', status: 'pending' },
      ]);
      setProgressError(errMsg);
      saveGenState({ status: 'error', teamId, startedAt, elapsedTime: elapsed, error: errMsg, itemTitle: stTitle });
    }
  }

  function handleProgressClose() {
    setProgressOpen(false);
    setProgressMinimized(false);
    saveGenState(null);
  }

  // ── Filtering ──
  const filtered = entries.filter((e: any) =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.summary?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Section counts for detail ──
  function getActivityCounts(entry: any) {
    const d = entry.activityData || {};
    return {
      tasks: d.tasks?.length || 0,
      notes: d.notes?.length || 0,
      brainstorms: d.brainstorms?.length || 0,
      goals: d.goals?.length || 0,
      diagrams: d.diagrams?.length || 0,
    };
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function relativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // ══════════════════════════════════════════════════════════════
  //  DETAIL VIEW
  // ══════════════════════════════════════════════════════════════
  if (selectedEntry) {
    const counts = getActivityCounts(selectedEntry);
    const totalActivity = counts.tasks + counts.notes + counts.brainstorms + counts.goals + counts.diagrams;

    // Tab sections for detail view
    const sections = [
      { key: 'summary', label: 'Summary', icon: BookOpen, color: ACCENT, content: selectedEntry.summary },
      ...(selectedEntry.conclusions ? [{ key: 'conclusions', label: 'Conclusions', icon: Lightbulb, color: '#f59e0b', content: selectedEntry.conclusions }] : []),
      ...(selectedEntry.recommendations ? [{ key: 'recommendations', label: 'Recommendations', icon: ListChecks, color: '#22c55e', content: selectedEntry.recommendations }] : []),
    ];

    // Word count and reading time
    const allContent = [selectedEntry.summary, selectedEntry.conclusions, selectedEntry.recommendations].filter(Boolean).join(' ');
    const wordCount = allContent.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return (
      <div className="max-w-4xl mx-auto space-y-5 px-1">
        {/* Back button + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedEntry(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[11px] font-medium">
            <CalendarDays className="h-3 w-3" />
            {formatDate(selectedEntry.date)}
          </div>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setDeleteConfirm({ id: selectedEntry.id, title: selectedEntry.title })}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400" />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                <ScrollText className="h-6 w-6 text-cyan-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground leading-tight">{selectedEntry.title}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatTime(selectedEntry.createdAt)}
                  </span>
                  {selectedEntry.project && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${selectedEntry.project.color || '#7b68ee'}15`, color: selectedEntry.project.color || '#7b68ee' }}>
                      {selectedEntry.project.name}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">{selectedEntry.provider}/{selectedEntry.model}</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> {wordCount} words</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> {readingTime} min read</span>
                </div>
              </div>
            </div>

            {/* Activity stats */}
            {totalActivity > 0 && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {counts.tasks > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#7b68ee]/8 text-[#7b68ee] text-[11px] font-medium">
                    <ListChecks className="h-3 w-3" /> {counts.tasks} tasks
                  </span>
                )}
                {counts.notes > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/8 text-purple-500 text-[11px] font-medium">
                    <FileText className="h-3 w-3" /> {counts.notes} notes
                  </span>
                )}
                {counts.brainstorms > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/8 text-green-500 text-[11px] font-medium">
                    <MessageSquare className="h-3 w-3" /> {counts.brainstorms} brainstorms
                  </span>
                )}
                {counts.goals > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/8 text-amber-500 text-[11px] font-medium">
                    <Target className="h-3 w-3" /> {counts.goals} goals
                  </span>
                )}
                {counts.diagrams > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/8 text-orange-500 text-[11px] font-medium">
                    <GitBranch className="h-3 w-3" /> {counts.diagrams} diagrams
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section tabs + content */}
        {sections.map((section) => (
          <DetailSection
            key={section.key}
            label={section.label}
            icon={section.icon}
            color={section.color}
            content={section.content}
          />
        ))}

        {/* No content fallback */}
        {!selectedEntry.summary && !selectedEntry.conclusions && !selectedEntry.recommendations && (
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No content available</h3>
            <p className="text-xs text-muted-foreground">This summary entry appears to be empty.</p>
          </div>
        )}

        <DeleteConfirmDialog
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Notulen"
          itemLabel={deleteConfirm?.title || ''}
          onConfirm={() => {
            if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          isPending={deleteMutation.isPending}
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto space-y-5 px-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Notulen</h1>
            <p className="text-xs text-muted-foreground">AI-powered daily summaries & meeting notes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-summary toggle */}
          <button
            onClick={() => {
              if (!config) return;
              toggleMutation.mutate({ isActive: !config.isActive });
            }}
            disabled={toggleMutation.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border',
              config?.isActive
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/15'
                : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {config?.isActive ? (
              <><Power className="h-3.5 w-3.5" /> Auto: ON</>
            ) : (
              <><PowerOff className="h-3.5 w-3.5" /> Auto: OFF</>
            )}
          </button>

          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-[0.97]"
          >
            <Sparkles className="h-4 w-4" /> Generate Summary
          </button>
        </div>
      </div>

      {/* Auto-summary info banner */}
      {config && config.isActive && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
          <Brain className="h-4 w-4 text-cyan-500 shrink-0" />
          <p className="text-[12px] text-cyan-700 dark:text-cyan-300">
            <strong>Auto-summary is active.</strong> AI will generate a daily summary at 12:00 PM using <strong>{config.provider || 'no provider'}</strong>. 
            Configure provider in <button onClick={() => setShowGenerate(true)} className="underline underline-offset-2 hover:text-cyan-500">Settings</button>.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search summaries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 border-border bg-card rounded-xl"
        />
      </div>

      {/* Entries */}
      {loadingEntries ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
            <ScrollText className="h-8 w-8 text-cyan-500/50" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No summaries yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Click &quot;Generate Summary&quot; to create your first AI-powered daily summary, or enable auto-summary for daily reports at 12:00 PM.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            // Group entries by date period
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today.getTime() - 86400000);
            const weekAgo = new Date(today.getTime() - 7 * 86400000);

            const groups: { label: string; entries: any[] }[] = [
              { label: 'Today', entries: [] },
              { label: 'Yesterday', entries: [] },
              { label: 'This Week', entries: [] },
              { label: 'Earlier', entries: [] },
            ];

            for (const entry of filtered) {
              const d = new Date(entry.createdAt);
              if (d >= today) groups[0].entries.push(entry);
              else if (d >= yesterday) groups[1].entries.push(entry);
              else if (d >= weekAgo) groups[2].entries.push(entry);
              else groups[3].entries.push(entry);
            }

            return groups.filter(g => g.entries.length > 0).map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground/60">{group.entries.length}</span>
                </div>
                <div className="grid gap-3">
                  {group.entries.map((entry: any) => {
            const counts = getActivityCounts(entry);
            const totalActivity = counts.tasks + counts.notes + counts.brainstorms + counts.goals + counts.diagrams;
            return (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full text-left bg-card border border-border rounded-xl p-5 hover:border-cyan-500/30 hover:shadow-md hover:shadow-cyan-500/5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/15 transition-colors">
                    <ScrollText className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[15px] font-semibold text-foreground truncate">{entry.title}</h3>
                      <span className="text-[11px] text-muted-foreground shrink-0">{relativeTime(entry.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {entry.summary?.replace(/[#*_`>]/g, '').slice(0, 200) || 'No summary'}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> {formatDate(entry.date)}
                      </span>
                      {entry.project && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: `${entry.project.color || '#7b68ee'}12`, color: entry.project.color || '#7b68ee' }}>
                          {entry.project.name}
                        </span>
                      )}
                      {totalActivity > 0 && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {totalActivity} activit{totalActivity === 1 ? 'y' : 'ies'} analyzed
                        </span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto group-hover:text-cyan-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </button>
            );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── Generate Dialog ── */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="bg-card max-w-md border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-cyan-500" /> Generate AI Summary
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Provider */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Provider</label>
              <Select value={genProvider} onValueChange={(v) => { setGenProvider(v); setGenModel(''); setGenModelSearch(''); }}>
                <SelectTrigger className="h-10 border-border rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Model</label>
              <div className="relative">
                <button
                  onClick={() => setGenModelOpen(!genModelOpen)}
                  className="w-full h-10 px-3 text-left text-sm border border-border rounded-xl bg-background flex items-center justify-between hover:border-cyan-500/50 transition-colors"
                >
                  <span className={cn('truncate', genModel ? 'text-foreground' : 'text-muted-foreground')}>
                    {genModel || 'Select a model...'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
                {genModelOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <Input
                        placeholder="Search models..."
                        value={genModelSearch}
                        onChange={(e) => setGenModelSearch(e.target.value)}
                        className="h-8 text-[13px] border-border"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {providerModels
                        .filter((m: any) => {
                          const id = typeof m === 'string' ? m : m.id || m.name || '';
                          return id.toLowerCase().includes(genModelSearch.toLowerCase());
                        })
                        .slice(0, 30)
                        .map((m: any) => {
                          const id = typeof m === 'string' ? m : m.id || m.name || '';
                          return (
                            <button
                              key={id}
                              onClick={() => { setGenModel(id); setGenModelOpen(false); setGenModelSearch(''); }}
                              className={cn(
                                'w-full text-left px-3 py-2 text-[13px] rounded-lg transition-colors',
                                genModel === id ? 'bg-cyan-500/10 text-cyan-600 font-medium' : 'hover:bg-muted text-foreground'
                              )}
                            >
                              {id}
                            </button>
                          );
                        })}
                      {providerModels.length === 0 && (
                        <p className="text-[12px] text-muted-foreground p-3 text-center">No models available. Add API key in BYOK settings.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom prompt */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Additional Context (Optional)</label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Focus on frontend tasks, Highlight blockers..."
                className="min-h-[80px] border-border rounded-xl text-[13px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <button
              onClick={() => setShowGenerate(false)}
              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!genModel}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" /> Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress modal */}
      <AIGenerateProgressModal
        open={progressOpen && !progressMinimized}
        steps={progressSteps}
        error={progressError}
        resultId={progressResult}
        onClose={handleProgressClose}
        onMinimize={() => { setProgressMinimized(true); setProgressOpen(true); }}
        onOpenResult={() => {
          if (progressResult && progressResult !== 'done') {
            const entry = entries.find((e: any) => e.id === progressResult);
            if (entry) setSelectedEntry(entry);
          }
          handleProgressClose();
        }}
        onRetry={() => { handleProgressClose(); setShowGenerate(true); }}
        startedAt={progressStartedAt}
        itemTitle={progressTitle}
        initialElapsed={initialElapsed}
        accentColor={ACCENT}
        generatingTitle="Generating Summary"
        doneTitle="Summary Ready!"
        failedTitle="Generation Failed"
        generatingSubtitle={<>AI is analyzing your team activity<AnimatedDots /></>}
        doneSubtitle="Your AI-powered daily summary has been generated successfully."
        failedSubtitle="Something went wrong. Check your API key or try a different model."
        openResultLabel="View Summary"
        openResultIcon={<Eye className="h-3.5 w-3.5" />}
      />

      {/* Floating bubble */}
      <AIGenerateBubble
        visible={progressMinimized}
        progress={progressSteps.filter(s => s.status === 'done').length / Math.max(progressSteps.length, 1) * 100}
        title={progressTitle}
        onClick={() => { setProgressMinimized(false); setProgressOpen(true); }}
        color={ACCENT}
      />

      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Notulen"
        itemLabel={deleteConfirm?.title || ''}
        onConfirm={() => {
          if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
