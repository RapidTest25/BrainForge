'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { useProjectSocket } from '@/hooks/use-project-socket';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

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
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-xl transition-colors">
            Cancel
          </button>
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

  const isDarkMode = theme === 'dark';
  const drawioUrl = useMemo(() => {
    const params = new URLSearchParams({
      embed: '1', proto: 'json', spin: '1', libraries: '1', configure: '1',
      ui: isDarkMode ? 'dark' : 'kennedy',
      dark: isDarkMode ? '1' : '0',
    });
    return `https://embed.diagrams.net/?${params.toString()}`;
  }, [isDarkMode]);

  const getInitialXml = useCallback(() => {
    const data = diagram.data;
    if (!data) return '';
    if (typeof data.xml === 'string') return data.xml;
    if (Array.isArray(data.nodes) && data.nodes.length > 0) {
      return nodesToDrawioXml(data.nodes, data.edges || []);
    }
    return '';
  }, [diagram]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'string') return;
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.event === 'configure') {
        const isDark = document.documentElement.classList.contains('dark');
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'configure', config: { darkMode: isDark, ui: isDark ? 'dark' : 'kennedy' } }), '*'
        );
      } else if (msg.event === 'init') {
        setReady(true);
        const xml = getInitialXml();
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'load', xml: xml || '', autosave: 0 }), '*'
        );
      } else if (msg.event === 'save') {
        onSaveRef.current({ xml: msg.xml });
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'status', message: 'Saved!', modified: false }), '*'
        );
      } else if (msg.event === 'exit') {
        onBackRef.current();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [getInitialXml]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Back to diagrams">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-sm font-medium text-foreground">{diagram.title}</h2>
            {diagram.type && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{diagram.type}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete diagram">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 relative">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#7b68ee]" />
            <p className="text-sm text-muted-foreground">Loading draw.io editor...</p>
          </div>
        )}
        <iframe ref={iframeRef} src={drawioUrl} className="w-full h-full border-0" allow="clipboard-read; clipboard-write" />
      </div>
    </div>
  );
}

// ── Detail Page ──

export default function DiagramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const diagramId = params.diagramId as string;
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { emitEntityChange } = useProjectSocket(activeProject?.id);
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const { data: diagram, isLoading } = useQuery({
    queryKey: ['diagram', diagramId],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/diagrams/${diagramId}`),
    enabled: !!diagramId && !!teamId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/teams/${teamId}/diagrams/${id}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram', diagramId] });
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      toast.success('Diagram saved');
      emitEntityChange('diagram', 'update');
    },
    onError: () => { toast.error('Failed to save diagram'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/diagrams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      toast.success('Diagram deleted');
      emitEntityChange('diagram', 'delete');
      router.push('/diagrams');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete diagram');
    },
  });

  if (isLoading || !diagram?.data) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#7b68ee]" />
        <p className="text-sm text-muted-foreground">Loading diagram...</p>
      </div>
    );
  }

  return (
    <>
      <DrawIOEditor
        diagram={diagram.data}
        onBack={() => router.push('/diagrams')}
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
