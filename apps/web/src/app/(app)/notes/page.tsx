'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, FileText, Search, Clock, History, Wand2, Type, Maximize2, CheckCheck, Languages, AlignLeft, Sparkles, ArrowLeft, ChevronDown,
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

const AI_ACTIONS = [
  { value: 'summarize', label: 'Summarize', icon: AlignLeft },
  { value: 'expand', label: 'Expand', icon: Maximize2 },
  { value: 'improve', label: 'Improve Writing', icon: Sparkles },
  { value: 'translate', label: 'Translate', icon: Languages },
  { value: 'fix_grammar', label: 'Fix Grammar', icon: CheckCheck },
  { value: 'generate_outline', label: 'Generate Outline', icon: Type },
];

const PROVIDERS = ['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI', 'GROQ', 'COPILOT'];

export default function NotesPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
  }, [searchParams]);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [search, setSearch] = useState('');
  const [aiProvider, setAiProvider] = useState('OPENROUTER');
  const [aiModel, setAiModel] = useState('google/gemini-2.5-flash-preview-05-20');
  const [noteModelSearch, setNoteModelSearch] = useState('');
  const [noteModelOpen, setNoteModelOpen] = useState(false);

  const { data: notes } = useQuery({
    queryKey: ['notes', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/notes${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`),
    enabled: !!teamId,
  });

  const { data: history } = useQuery({
    queryKey: ['note-history', selectedNote?.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/notes/${selectedNote.id}/history`),
    enabled: !!selectedNote?.id && showHistory,
  });

  const { data: models } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/notes`, { ...data, projectId: activeProject?.id }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
      setShowCreate(false);
      setNewTitle('');
      setSelectedNote(data.data);
      setEditTitle(data.data?.title || '');
      setEditContent(data.data?.content || '');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/teams/${teamId}/notes/${selectedNote.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
    },
  });

  const aiAssistMutation = useMutation({
    mutationFn: (action: string) => api.post(`/teams/${teamId}/notes/${selectedNote.id}/ai-assist`, {
      action, provider: aiProvider, model: aiModel,
    }),
    onSuccess: (data: any) => {
      if (data?.data?.result) {
        setEditContent(data.data.result);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => api.post(`/teams/${teamId}/notes/${selectedNote.id}/restore/${versionId}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
      setShowHistory(false);
      if (data?.data) {
        setEditContent(data.data.content || '');
        setEditTitle(data.data.title || '');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
      setSelectedNote(null);
      toast.success('Note deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete note');
    },
  });

  const filteredNotes = (notes?.data || []).filter((n: any) =>
    n.title?.toLowerCase().includes(search.toLowerCase())
  );

  const providerModels = models?.data?.[aiProvider] || [];

  const saveNote = () => {
    if (selectedNote) {
      updateMutation.mutate({ title: editTitle, content: editContent });
    }
  };

  // Detail view
  if (selectedNote) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-5rem)]">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-3 mb-4 gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button onClick={() => { saveNote(); setSelectedNote(null); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-lg font-semibold text-foreground border-none bg-transparent focus:outline-none flex-1 min-w-0"
              placeholder="Note title..."
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={aiAssistMutation.isPending}
                  className="flex items-center gap-1.5 px-2.5 py-1 border border-border text-muted-foreground text-xs rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
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

            <button onClick={saveNote} disabled={updateMutation.isPending} className="px-3 py-1 bg-[#7b68ee] text-white text-xs rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors">
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={() => setDeleteConfirm({ id: selectedNote.id, title: selectedNote.title || 'This note' })}
              className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-full w-full border-none bg-transparent focus:outline-none resize-none font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60"
            placeholder="Start writing your note..."
          />
        </div>

        {/* History Dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="text-foreground">Version History</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-auto">
              {(history?.data || []).map((v: any) => (
                <div
                  key={v.id}
                  className="bg-card border border-border rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-border transition-all"
                  onClick={() => restoreMutation.mutate(v.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">Version {v.version}</p>
                    <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
                  </div>
                  <button className="px-2.5 py-1 border border-border text-xs text-muted-foreground rounded-lg hover:bg-accent transition-colors">Restore</button>
                </div>
              ))}
              {(!history?.data || history.data.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-4">No history available</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Notes</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Note
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-border focus:border-[#7b68ee]" placeholder="Search notes..." />
      </div>

      {/* Notes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredNotes.map((note: any) => (
          <div
            key={note.id}
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-sm hover:border-border transition-all"
            onClick={() => {
              setSelectedNote(note);
              setEditTitle(note.title);
              setEditContent(note.content || '');
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded flex items-center justify-center bg-[#8b5cf6]/10">
                  <FileText className="h-3.5 w-3.5 text-[#8b5cf6]" />
                </div>
                <h3 className="font-medium text-sm text-foreground truncate">{note.title}</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {note.content?.substring(0, 150) || 'Empty note'}
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(note.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
        {filteredNotes.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="font-medium text-foreground mb-1">No Notes Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first note and use AI to improve your writing.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors mx-auto"
            >
              <Plus className="h-3.5 w-3.5" /> Create Note
            </button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card">
          <DialogHeader><DialogTitle className="text-foreground">New Note</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Title</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Note title..." className="border-border focus:border-[#7b68ee]" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={() => createMutation.mutate({ title: newTitle })}
              disabled={!newTitle}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              Create
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
