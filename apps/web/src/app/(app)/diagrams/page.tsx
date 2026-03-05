'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ArrowLeft, Sparkles, Loader2, Search, Clock,
  GitBranch, Network, Workflow, Database, Cpu, Share2, Trash2,
  ChevronDown,
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
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

const DIAGRAM_TYPES = [
  { value: 'FLOWCHART', label: 'Flowchart', desc: 'Process flows & decisions', icon: Workflow, color: '#f59e0b' },
  { value: 'ERD', label: 'ERD', desc: 'Database relationships', icon: Database, color: '#3b82f6' },
  { value: 'MINDMAP', label: 'Mind Map', desc: 'Brainstorm & organize', icon: Network, color: '#22c55e' },
  { value: 'ARCHITECTURE', label: 'Architecture', desc: 'System design', icon: Cpu, color: '#8b5cf6' },
  { value: 'SEQUENCE', label: 'Sequence', desc: 'Interaction flows', icon: Share2, color: '#ef4444' },
  { value: 'COMPONENT', label: 'Component', desc: 'Module structure', icon: GitBranch, color: '#7b68ee' },
];

// ── Convert legacy nodes/edges to draw.io XML ──

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nodesToDrawioXml(nodes: any[], edges: any[]): string {
  if (!nodes?.length) return '';

  let cells = '';
  cells += '    <mxCell id="0"/>\n';
  cells += '    <mxCell id="1" parent="0"/>\n';

  for (const node of nodes) {
    const label = escapeXml(node.data?.label || node.id || '');
    const desc = node.data?.description
      ? escapeXml(node.data.description).replace(/\\n/g, '&#xa;')
      : '';
    const tooltip = desc ? ` tooltip="${desc}"` : '';
    const x = node.position?.x || 0;
    const y = node.position?.y || 0;
    const w = desc ? 160 : 120;
    const h = desc ? 80 : 60;
    cells += `    <mxCell id="${escapeXml(node.id)}" value="${label}"${tooltip} style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">\n`;
    cells += `      <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>\n`;
    cells += `    </mxCell>\n`;
  }

  for (const edge of edges) {
    const label = edge.label || edge.data?.label || '';
    cells += `    <mxCell id="${escapeXml(edge.id)}" value="${escapeXml(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;" edge="1" parent="1" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">\n`;
    cells += `      <mxGeometry relative="1" as="geometry"/>\n`;
    cells += `    </mxCell>\n`;
  }

  return `<mxGraphModel><root>\n${cells}  </root></mxGraphModel>`;
}

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
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ── Draw.io Embedded Editor ──

function DrawIOEditor({ diagram, onBack, onDelete, onSave }: {
  diagram: any;
  onBack: () => void;
  onDelete: () => void;
  onSave: (data: any) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const { theme } = useTheme();
  const onSaveRef = useRef(onSave);
  const onBackRef = useRef(onBack);
  onSaveRef.current = onSave;
  onBackRef.current = onBack;

  // Build draw.io embed URL with dark mode support
  const isDarkMode = theme === 'dark';
  const drawioUrl = useMemo(() => {
    const params = new URLSearchParams({
      embed: '1',
      proto: 'json',
      spin: '1',
      libraries: '1',
      configure: '1',
      ui: isDarkMode ? 'dark' : 'kennedy',
      dark: isDarkMode ? '1' : '0',
    });
    return `https://embed.diagrams.net/?${params.toString()}`;
  }, [isDarkMode]);

  // Get initial XML from saved diagram data
  const getInitialXml = useCallback(() => {
    const data = diagram.data;
    if (!data) return '';
    // New format: stored as draw.io XML
    if (typeof data.xml === 'string') return data.xml;
    // Legacy format: nodes/edges → convert to draw.io XML
    if (Array.isArray(data.nodes) && data.nodes.length > 0) {
      return nodesToDrawioXml(data.nodes, data.edges || []);
    }
    return '';
  }, [diagram]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'string') return;

      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.event === 'configure') {
        // Respond with theme configuration
        const isDark = document.documentElement.classList.contains('dark');
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            action: 'configure',
            config: {
              darkMode: isDark,
              ui: isDark ? 'dark' : 'kennedy',
            },
          }),
          '*'
        );
      } else if (msg.event === 'init') {
        // Editor is ready — load diagram data
        setReady(true);
        const xml = getInitialXml();
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'load', xml: xml || '', autosave: 0 }),
          '*'
        );
      } else if (msg.event === 'save') {
        // User clicked save in draw.io
        onSaveRef.current({ xml: msg.xml });
        // Confirm save to draw.io
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'status', message: 'Saved!', modified: false }),
          '*'
        );
      } else if (msg.event === 'exit') {
        // User clicked exit in draw.io
        onBackRef.current();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [getInitialXml]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Back to diagrams"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-sm font-medium text-foreground">{diagram.title}</h2>
            {diagram.type && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{diagram.type}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Delete diagram"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* draw.io iframe */}
      <div className="flex-1 relative">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#7b68ee]" />
            <p className="text-sm text-muted-foreground">Loading draw.io editor...</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={drawioUrl}
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}

// ── Main Page ──

export default function DiagramsPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [activeDiagram, setActiveDiagram] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const searchParams = useSearchParams();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
  }, [searchParams]);
  const [newDiagram, setNewDiagram] = useState({ title: '', type: 'FLOWCHART', description: '' });
  const [aiForm, setAiForm] = useState({ title: '', type: 'FLOWCHART', description: '', provider: 'OPENROUTER', model: 'google/gemini-2.5-flash-preview-05-20' });
  const [search, setSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [modelDropOpen, setModelDropOpen] = useState(false);

  const { data: diagrams } = useQuery({
    queryKey: ['diagrams', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/diagrams${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`),
    enabled: !!teamId,
  });

  const { data: diagram } = useQuery({
    queryKey: ['diagram', activeDiagram],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/diagrams/${activeDiagram}`),
    enabled: !!activeDiagram && !!teamId,
  });

  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/diagrams`, { ...data, projectId: activeProject?.id }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      setActiveDiagram(res.data.id);
      setShowCreate(false);
      toast.success('Diagram created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create diagram');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/diagrams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      setActiveDiagram(null);
      setDeleteConfirm(null);
      toast.success('Diagram deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete diagram');
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/diagrams/ai-generate`, { ...data, prompt: data.description, projectId: activeProject?.id }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      setActiveDiagram(res.data.id);
      setShowAIGenerate(false);
      toast.success('Diagram generated with AI');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'AI generation failed. Check your API key and try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/teams/${teamId}/diagrams/${id}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram', activeDiagram] });
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      toast.success('Diagram saved');
    },
    onError: () => { toast.error('Failed to save diagram'); },
  });

  const getType = (type: string) => DIAGRAM_TYPES.find(d => d.value === type);
  const diagramList = diagrams?.data || [];
  const filteredDiagrams = search
    ? diagramList.filter((d: any) => d.title.toLowerCase().includes(search.toLowerCase()))
    : diagramList;

  // Detail view
  if (activeDiagram && diagram?.data) {
    return (
      <>
        <DrawIOEditor
          diagram={diagram.data}
          onBack={() => setActiveDiagram(null)}
          onDelete={() => setDeleteConfirm({ id: diagram.data.id, title: diagram.data.title })}
          onSave={(data: any) => updateMutation.mutate({ id: diagram.data.id, data })}
        />
        <DeleteConfirmDialog
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
          title={deleteConfirm?.title || ''}
          isPending={deleteMutation.isPending}
        />
      </>
    );
  }

  // List view
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
          <button key={value} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:shadow-sm hover:border-[color] transition-all bg-card"
            style={{ '--hover-border': color } as any}
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
            const nodeCount = (d.data as any)?.nodes?.length || 0;
            return (
              <div key={d.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-sm hover:border-border transition-all flex items-center gap-4"
                onClick={() => setActiveDiagram(d.id)}>
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${dtype?.color || '#6b7280'}10` }}>
                  {dtype && <dtype.icon className="h-5 w-5" style={{ color: dtype.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{d.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: dtype?.color, backgroundColor: `${dtype?.color}10` }}>{d.type}</span>
                    {nodeCount > 0 && <span className="text-[11px] text-muted-foreground">{nodeCount} nodes</span>}
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
            <DialogTitle className="text-foreground">AI Generate Diagram</DialogTitle>
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

                  // Searchable model selector for providers with many models (OpenRouter)
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
                          <div className="max-h-[200px] overflow-y-auto p-1">
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
            <button onClick={() => aiGenerateMutation.mutate(aiForm)} disabled={!aiForm.title || !aiForm.description || aiGenerateMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors">
              {aiGenerateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
