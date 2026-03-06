'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, FileText, Search, Clock, History, Wand2, Type, Maximize2, CheckCheck, Languages, AlignLeft, Sparkles, ArrowLeft, ChevronDown,
  Eye, PenLine, Hash, Copy, Columns, BookOpen, MoreVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { useProjectSocket } from '@/hooks/use-project-socket';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

const AI_ACTIONS = [
  { value: 'summarize', label: 'Summarize', icon: AlignLeft },
  { value: 'expand', label: 'Expand', icon: Maximize2 },
  { value: 'improve', label: 'Improve Writing', icon: Sparkles },
  { value: 'translate', label: 'Translate', icon: Languages },
  { value: 'fix_grammar', label: 'Fix Grammar', icon: CheckCheck },
  { value: 'generate_outline', label: 'Generate Outline', icon: Type },
];

const PROVIDERS = ['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI', 'GROQ', 'COPILOT'];

// ===== IMPROVED MARKDOWN RENDERER =====
function renderMarkdown(text: string): string {
  if (!text) return '';

  const codeBlocks: string[] = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = codeBlocks.length;
    const langLabel = lang ? '<div class="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider"><span>' + lang + '</span></div>' : '';
    codeBlocks.push(
      '<div class="rounded-lg border border-border my-4 overflow-hidden bg-muted/30">' + langLabel + '<pre class="p-4 overflow-x-auto"><code class="text-[13px] font-mono text-foreground leading-relaxed">' + code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim() + '</code></pre></div>'
    );
    return '%%CODEBLOCK_' + idx + '%%';
  });

  const inlineCodes: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push('<code class="bg-[#7b68ee]/10 text-[#7b68ee] px-1.5 py-0.5 rounded text-[13px] font-mono">' + code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>');
    return '%%INLINECODE_' + idx + '%%';
  });

  let html = processed
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#### (.+)$/gm, '<h4 class="text-[15px] font-semibold text-foreground mt-5 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-6 mb-2.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-foreground mt-7 mb-3 pb-2 border-b border-border/60">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-foreground mt-8 mb-4 pb-2.5 border-b-2 border-[#7b68ee]/30">$1</h1>')
    .replace(/^---$/gm, '<hr class="border-border/60 my-8" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#7b68ee] pl-4 py-2 my-3 bg-[#7b68ee]/5 rounded-r-lg text-muted-foreground italic text-[14px]">$1</blockquote>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold"><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-foreground/80">$1</em>')
    .replace(/~~(.+?)~~/g, '<del class="line-through text-muted-foreground/60">$1</del>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4 border border-border shadow-sm" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#7b68ee] hover:text-[#6c5ce7] underline underline-offset-2">$1</a>')
    .replace(/^- \[x\] (.+)$/gm, '<div class="flex items-center gap-2.5 my-1.5 pl-1"><div class="h-4 w-4 rounded border-2 border-[#22c55e] bg-[#22c55e] flex items-center justify-center"><svg class="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6l3 3 5-5"/></svg></div><span class="line-through text-muted-foreground/60 text-[14px]">$1</span></div>')
    .replace(/^- \[ \] (.+)$/gm, '<div class="flex items-center gap-2.5 my-1.5 pl-1"><div class="h-4 w-4 rounded border-2 border-border"></div><span class="text-foreground text-[14px]">$1</span></div>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-5 list-disc my-1 text-[14px] leading-relaxed">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 list-decimal my-1 text-[14px] leading-relaxed">$1</li>')
    .replace(/((?:<li class="ml-5 list-disc[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-3 space-y-0.5">$1</ul>')
    .replace(/((?:<li class="ml-5 list-decimal[^>]*>.*<\/li>\n?)+)/g, '<ol class="my-3 space-y-0.5">$1</ol>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[\s-:]+$/.test(c))) return '<!-- table-sep -->';
      const cellHtml = cells.map(c => '<td class="border border-border/60 px-3 py-2 text-[13px]">' + c.trim() + '</td>').join('');
      return '<tr class="hover:bg-muted/30 transition-colors">' + cellHtml + '</tr>';
    })
    .replace(/^(?!<[a-z/!]|<!-- |%%CODEBLOCK|%%INLINECODE)(.+)$/gm, '<p class="my-2 leading-relaxed text-[14px] text-foreground/90">$1</p>')
    .replace(/((?:<tr[^>]*>.*<\/tr>\n?)+)/g, '<div class="my-4 rounded-lg border border-border overflow-hidden"><table class="w-full border-collapse">$1</table></div>')
    .replace(/<!-- table-sep -->\n?/g, '');

  codeBlocks.forEach((block, i) => {
    html = html.replace('%%CODEBLOCK_' + i + '%%', block);
  });
  inlineCodes.forEach((code, i) => {
    html = html.replace('%%INLINECODE_' + i + '%%', code);
  });

  return html;
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none min-h-full text-foreground leading-relaxed px-1"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

function getWordCount(text: string) {
  if (!text) return { words: 0, chars: 0, lines: 0 };
  return {
    words: text.trim().split(/\s+/).filter(Boolean).length,
    chars: text.length,
    lines: text.split('\n').length,
  };
}

export default function NotesPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const searchParams = useSearchParams();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  useProjectSocket();

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [aiProvider, setAiProvider] = useState('OPENROUTER');
  const [aiModel, setAiModel] = useState('');
  const [noteModelSearch, setNoteModelSearch] = useState('');
  const [noteModelOpen, setNoteModelOpen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const { data: notes } = useQuery({
    queryKey: ['notes', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/notes' + (activeProject?.id ? '?projectId=' + activeProject.id : '')),
    enabled: !!teamId,
  });

  const { data: history } = useQuery({
    queryKey: ['note-history', selectedNote?.id],
    queryFn: () => api.get<{ data: any[] }>('/teams/' + teamId + '/notes/' + selectedNote.id + '/history'),
    enabled: !!teamId && !!selectedNote?.id && showHistory,
  });

  const { data: models } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
    staleTime: 5 * 60_000,
  });

  const providerModels = models?.data?.[aiProvider] || [];

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api.post('/teams/' + teamId + '/notes', { ...data, projectId: activeProject?.id }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
      setShowCreate(false); setNewTitle('');
      setSelectedNote(res.data);
      setEditTitle(res.data.title);
      setEditContent(res.data.content || '');
      toast.success('Note created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/teams/' + teamId + '/notes/' + selectedNote.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
      toast.success('Note saved');
    },
  });

  const aiAssistMutation = useMutation({
    mutationFn: (action: string) =>
      api.post<{ data: { content: string } }>('/teams/' + teamId + '/notes/ai-assist', {
        content: editContent, action, provider: aiProvider, model: aiModel,
      }),
    onSuccess: (res) => {
      setEditContent(res.data.content);
      toast.success('AI assist applied');
    },
    onError: (e: any) => toast.error(e.message || 'AI assist failed'),
  });

  const restoreMutation = useMutation({
    mutationFn: (historyId: string) =>
      api.post('/teams/' + teamId + '/notes/' + selectedNote.id + '/restore/' + historyId),
    onSuccess: (res: any) => {
      setEditContent(res.data.content || '');
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
      setShowHistory(false);
      toast.success('Version restored');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete('/teams/' + teamId + '/notes/' + noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
      setSelectedNote(null);
      toast.success('Note deleted');
    },
  });

  const filteredNotes = (notes?.data || []).filter((n: any) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.code || '').toLowerCase().includes(search.toLowerCase())
  );

  function saveNote() {
    if (!selectedNote) return;
    updateMutation.mutate({ title: editTitle, content: editContent });
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  }

  // Ctrl+S shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && selectedNote) {
        e.preventDefault();
        saveNote();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote, editTitle, editContent]);

  const wordCount = getWordCount(editContent);

  // DETAIL / EDITOR VIEW
  if (selectedNote) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-full">
        {/* Top toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <button onClick={() => setSelectedNote(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="h-4 w-px bg-border" />
          {selectedNote.code && (
            <button
              onClick={() => copyCode(selectedNote.code)}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#7b68ee]/10 text-[#7b68ee] text-[11px] font-mono font-medium rounded-md hover:bg-[#7b68ee]/20 transition-colors"
              title="Click to copy code"
            >
              <Hash className="h-3 w-3" />
              {selectedNote.code}
            </button>
          )}
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-base font-semibold text-foreground border-none bg-transparent focus:outline-none flex-1 min-w-0"
            placeholder="Note title..."
          />
        </div>

        {/* Secondary toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-card/30 shrink-0 flex-wrap">
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
                viewMode === 'edit' ? 'bg-card text-[#7b68ee] shadow-sm' : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <PenLine className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
                viewMode === 'split' ? 'bg-card text-[#7b68ee] shadow-sm' : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <Columns className="h-3 w-3" /> Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
                viewMode === 'preview' ? 'bg-card text-[#7b68ee] shadow-sm' : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>

          <div className="h-4 w-px bg-border/60" />

          <Select value={aiProvider} onValueChange={(v) => { setAiProvider(v); const m = models?.data?.[v] || []; setAiModel(m[0]?.id || ''); setNoteModelSearch(''); setNoteModelOpen(false); }}>
            <SelectTrigger className="w-28 h-7 text-xs border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {(() => {
            const hasMany = providerModels.length > 10;
            const selectedModel = providerModels.find((m: any) => m.id === aiModel);
            if (!hasMany) {
              return (
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger className="w-36 h-7 text-xs border-border"><SelectValue placeholder="Model" /></SelectTrigger>
                  <SelectContent>
                    {providerModels.map((m: any) => {
                      const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                      return <SelectItem key={m.id} value={m.id}>{m.name}{isFree ? ' ✦' : ''}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              );
            }
            const filtered = noteModelSearch
              ? providerModels.filter((m: any) => m.name.toLowerCase().includes(noteModelSearch.toLowerCase()) || m.id.toLowerCase().includes(noteModelSearch.toLowerCase()))
              : providerModels;
            return (
              <div className="relative">
                <button type="button" onClick={() => setNoteModelOpen(!noteModelOpen)}
                  className="flex items-center w-36 h-7 px-2 text-xs border border-border rounded-md bg-background hover:bg-accent/50 transition-colors text-left">
                  <span className="truncate flex-1 text-foreground">{selectedModel?.name || aiModel || 'Model'}</span>
                  <ChevronDown className={cn('h-3 w-3 shrink-0 text-muted-foreground transition-transform', noteModelOpen && 'rotate-180')} />
                </button>
                {noteModelOpen && (
                  <div className="absolute z-50 top-8 right-0 w-72 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
                    <div className="relative border-b border-border">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input placeholder="Search models..." value={noteModelSearch} onChange={(e) => setNoteModelSearch(e.target.value)}
                        className="w-full h-7 pl-7 pr-3 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground" autoFocus />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                      {filtered.length === 0 ? (
                        <div className="text-center py-3 text-xs text-muted-foreground">No models found</div>
                      ) : filtered.slice(0, 50).map((m: any) => {
                        const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                        return (
                          <button key={m.id} type="button" onClick={() => { setAiModel(m.id); setNoteModelOpen(false); setNoteModelSearch(''); }}
                            className={cn('w-full flex items-center gap-2 px-2 py-1 text-left rounded hover:bg-accent/60 transition-colors', aiModel === m.id && 'bg-[#7b68ee]/10 text-[#7b68ee]')}>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium truncate">{m.name}{isFree && <span className="ml-1 text-[9px] font-bold px-1 rounded bg-green-500/10 text-green-500">FREE</span>}</div>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">{(m.contextWindow / 1000).toFixed(0)}K</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="h-4 w-px bg-border/60" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={aiAssistMutation.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-[#7b68ee]/10 to-[#a78bfa]/10 border border-[#7b68ee]/20 text-[#7b68ee] text-xs font-medium rounded-lg hover:from-[#7b68ee]/20 hover:to-[#a78bfa]/20 disabled:opacity-50 transition-all"
              >
                <Wand2 className="h-3.5 w-3.5" />
                {aiAssistMutation.isPending ? 'Processing...' : 'AI Assist'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {AI_ACTIONS.map(a => (
                <DropdownMenuItem key={a.value} onClick={() => aiAssistMutation.mutate(a.value)}>
                  <a.icon className="h-4 w-4 mr-2" />
                  {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 px-2.5 py-1 border border-border text-muted-foreground text-xs rounded-lg hover:bg-accent transition-colors">
            <History className="h-3.5 w-3.5" /> History
          </button>

          <div className="flex-1" />

          <button onClick={saveNote} disabled={updateMutation.isPending} className="px-3 py-1 bg-[#7b68ee] text-white text-xs font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors">
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {selectedNote.code && (
                <DropdownMenuItem onClick={() => copyCode(selectedNote.code)}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Code
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteConfirm({ id: selectedNote.id, title: selectedNote.title || 'This note' })}
                className="text-red-500 focus:text-red-500"
              >
                Delete Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={cn('flex flex-col overflow-hidden', viewMode === 'split' ? 'w-1/2 border-r border-border' : 'w-full')}>
              <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  <PenLine className="h-3 w-3" /> Editor
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Markdown</span>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <textarea
                  ref={editorRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-full w-full border-none bg-transparent focus:outline-none resize-none font-mono text-[13px] leading-[1.8] text-foreground placeholder:text-muted-foreground/40"
                  placeholder={'# Start writing in Markdown...\n\nUse **bold**, *italic*, `code`, and more...'}
                  spellCheck={false}
                />
              </div>
            </div>
          )}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={cn('flex flex-col overflow-hidden', viewMode === 'split' ? 'w-1/2' : 'w-full')}>
              <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  <Eye className="h-3 w-3" /> Preview
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 md:p-6">
                {editContent ? (
                  <MarkdownPreview content={editContent} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                      <Eye className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Nothing to preview yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Switch to Edit mode and start writing</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-t border-border/60 shrink-0 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{wordCount.words} words</span>
            <span>{wordCount.chars} characters</span>
            <span>{wordCount.lines} lines</span>
          </div>
          <div className="flex items-center gap-3">
            {selectedNote.code && <span className="font-mono">{selectedNote.code}</span>}
            <span>v{selectedNote.version || 1}</span>
            {selectedNote.updatedAt && <span>Last saved {new Date(selectedNote.updatedAt).toLocaleTimeString()}</span>}
          </div>
        </div>

        {/* History Dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-[#7b68ee]" /> Version History
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-auto">
              {(history?.data || []).map((v: any, i: number) => (
                <div
                  key={v.id}
                  className={cn(
                    "bg-card border rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-[#7b68ee]/30 transition-all",
                    i === 0 ? 'border-[#7b68ee]/20 bg-[#7b68ee]/5' : 'border-border'
                  )}
                  onClick={() => restoreMutation.mutate(v.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      Version {v.version}
                      {i === 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7b68ee]/10 text-[#7b68ee]">LATEST</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(v.createdAt).toLocaleString()}
                      {v.editor?.name && (' · ' + v.editor.name)}
                    </p>
                  </div>
                  <button className="px-2.5 py-1 border border-border text-xs text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors">
                    Restore
                  </button>
                </div>
              ))}
              {(!history?.data || history.data.length === 0) && (
                <div className="text-center py-8">
                  <History className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No history available</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Save changes to create version history</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => { if (deleteConfirm) { deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); } }}
          title="Delete Note"
          itemLabel={deleteConfirm?.title || ''}
          isPending={deleteMutation.isPending}
        />
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div className="max-w-6xl mx-auto space-y-5 px-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#8b5cf6]" />
            Notes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            {activeProject ? (' in ' + activeProject.name) : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-xl hover:bg-[#6c5ce7] transition-colors shadow-sm shadow-[#7b68ee]/20"
        >
          <Plus className="h-4 w-4" /> New Note
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-border focus:border-[#7b68ee] bg-card"
            placeholder="Search by title, content, or code..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredNotes.map((note: any) => (
          <div
            key={note.id}
            className="group bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-[#8b5cf6]/20 hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => {
              setSelectedNote(note);
              setEditTitle(note.title);
              setEditContent(note.content || '');
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#8b5cf6]/15 to-[#7b68ee]/15 shrink-0">
                  <FileText className="h-4 w-4 text-[#8b5cf6]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{note.title}</h3>
                  {note.code && (
                    <span className="text-[10px] font-mono text-[#7b68ee] bg-[#7b68ee]/8 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      {note.code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[13px] text-muted-foreground line-clamp-3 leading-relaxed mb-3">
              {note.content?.replace(/[#*`~\[\]]/g, '').substring(0, 150) || 'Empty note — click to start writing'}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>v{note.version || 1}</span>
                {note.content && (
                  <>
                    <span>·</span>
                    <span>{note.content.trim().split(/\s+/).filter(Boolean).length} words</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredNotes.length === 0 && (
          <div className="col-span-full text-center py-16">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-[#8b5cf6]/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-[#8b5cf6]/40" />
            </div>
            <h3 className="font-semibold text-foreground mb-1.5">No Notes Yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              Create your first note and use AI to improve your writing. Each note gets a unique code for easy reference.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#7b68ee] text-white text-sm font-medium rounded-xl hover:bg-[#6c5ce7] transition-colors shadow-sm shadow-[#7b68ee]/20"
            >
              <Plus className="h-4 w-4" /> Create Note
            </button>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#7b68ee]" /> New Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Title</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Note title..."
                className="border-border focus:border-[#7b68ee]"
                onKeyDown={(e) => { if (e.key === 'Enter' && newTitle) createMutation.mutate({ title: newTitle }); }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              A unique code will be assigned automatically (e.g., NOTE-001)
            </p>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={() => createMutation.mutate({ title: newTitle })}
              disabled={!newTitle || createMutation.isPending}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) { deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); } }}
        title="Delete Note"
        itemLabel={deleteConfirm?.title || ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
