'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  MessageSquare,
  Send,
  X,
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Zap,
  Calendar as CalendarIcon,
  Diamond,
  CheckCircle2,
  Target,
  Link2,
  Paperclip,
  Loader2,
  Download,
  File as FileIcon,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { useAuthStore } from '@/stores/auth-store';

type SessionItem = {
  id: string;
  title: string;
  mode: string;
  updatedAt: string;
  _count?: { messages?: number };
};

type AlertItem = {
  id: string;
  title: string;
  count: number;
};

type EmbedType = 'task' | 'note' | 'sprint' | 'calendar' | 'diagram' | 'goal';

const FLOATING_BUBBLE_OFFSET_VAR = '--brainforge-floating-bubble-bottom';
const DOCK_BOTTOM_OFFSET = 24;
const DOCK_TRIGGER_SIZE = 48;
const FLOATING_STACK_GAP = 12;
const FLOATING_BUBBLE_CLEARANCE = 12;
const FLOATING_BUBBLE_BASE_OFFSET = DOCK_BOTTOM_OFFSET + DOCK_TRIGGER_SIZE + FLOATING_STACK_GAP;

const MODE_COLORS: Record<string, string> = {
  BRAINSTORM: '#22c55e',
  DEBATE: '#ef4444',
  ANALYSIS: '#3b82f6',
  FREEFORM: '#8b5cf6',
};

export function BrainstormDock() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { user } = useAuthStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [embedType, setEmbedType] = useState<EmbedType>('note');
  const [embedSearch, setEmbedSearch] = useState('');
  const [selectedEmbed, setSelectedEmbed] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const prevCountsRef = useRef<Record<string, number>>({});
  const hasInitializedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sessions } = useQuery({
    queryKey: ['brainstorm-sessions', teamId, activeProject?.id],
    queryFn: () =>
      api.get<{ data: SessionItem[] }>(
        `/teams/${teamId}/brainstorm${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`,
      ),
    enabled: !!teamId,
    refetchInterval: 10000,
  });

  const sessionList = sessions?.data || [];

  const { data: activeSession } = useQuery({
    queryKey: ['brainstorm-session', activeSessionId],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/brainstorm/${activeSessionId}`),
    enabled: !!teamId && !!activeSessionId,
    refetchInterval: activeSessionId ? 8000 : false,
  });

  const embedProjectId = activeSession?.data?.projectId || activeProject?.id;

  const { data: embedNotes } = useQuery({
    queryKey: ['brainstorm-dock-embed-notes', teamId, embedProjectId],
    queryFn: () =>
      api.get<{ data: any[] }>(
        `/teams/${teamId}/notes${embedProjectId ? `?projectId=${embedProjectId}` : ''}`,
      ),
    enabled: showEmbedDialog && !!teamId,
  });

  const { data: embedSprints } = useQuery({
    queryKey: ['brainstorm-dock-embed-sprints', teamId, embedProjectId],
    queryFn: () =>
      api.get<{ data: any[] }>(
        `/teams/${teamId}/sprints${embedProjectId ? `?projectId=${embedProjectId}` : ''}`,
      ),
    enabled: showEmbedDialog && !!teamId,
  });

  const { data: embedDiagrams } = useQuery({
    queryKey: ['brainstorm-dock-embed-diagrams', teamId, embedProjectId],
    queryFn: () =>
      api.get<{ data: any[] }>(
        `/teams/${teamId}/diagrams${embedProjectId ? `?projectId=${embedProjectId}` : ''}`,
      ),
    enabled: showEmbedDialog && !!teamId,
  });

  const { data: embedTasks } = useQuery({
    queryKey: ['brainstorm-dock-embed-tasks', teamId, embedProjectId],
    queryFn: () =>
      api.get<{ data: any[] }>(
        `/teams/${teamId}/tasks${embedProjectId ? `?projectId=${embedProjectId}` : ''}`,
      ),
    enabled: showEmbedDialog && !!teamId,
  });

  const { data: embedGoals } = useQuery({
    queryKey: ['brainstorm-dock-embed-goals', teamId, embedProjectId],
    queryFn: () =>
      api.get<{ data: any[] }>(
        `/teams/${teamId}/goals${embedProjectId ? `?projectId=${embedProjectId}` : ''}`,
      ),
    enabled: showEmbedDialog && !!teamId,
  });

  const { data: embedCalendar } = useQuery({
    queryKey: ['brainstorm-dock-embed-calendar', teamId],
    queryFn: () => {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const end = new Date();
      end.setDate(end.getDate() + 60);
      return api.get<{ data: any[] }>(
        `/teams/${teamId}/calendar?start=${start.toISOString()}&end=${end.toISOString()}`,
      );
    },
    enabled: showEmbedDialog && !!teamId,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/teams/${teamId}/brainstorm/${activeSessionId}/messages`, { content }),
    onSuccess: (res: any) => {
      const newMsg = res.data;
      queryClient.setQueryData(['brainstorm-session', activeSessionId], (old: any) => {
        if (!old?.data?.messages) return old;
        const exists = old.data.messages.some((m: any) => m.id === newMsg.id);
        if (exists) return old;
        return { ...old, data: { ...old.data, messages: [...old.data.messages, newMsg] } };
      });
      setChatInput('');
    },
  });

  useEffect(() => {
    if (!sessionList.length) return;

    const nextCounts: Record<string, number> = {};
    sessionList.forEach((s) => {
      nextCounts[s.id] = s._count?.messages || 0;
    });

    if (!hasInitializedRef.current) {
      prevCountsRef.current = nextCounts;
      hasInitializedRef.current = true;
      return;
    }

    sessionList.forEach((s) => {
      const prev = prevCountsRef.current[s.id] || 0;
      const curr = nextCounts[s.id] || 0;
      if (curr > prev && !pathname?.startsWith(`/brainstorm/${s.id}`)) {
        setAlerts((prevAlerts) => {
          const exists = prevAlerts.find((a) => a.id === s.id);
          if (exists) {
            return prevAlerts.map((a) => (a.id === s.id ? { ...a, count: curr } : a));
          }
          return [{ id: s.id, title: s.title, count: curr }, ...prevAlerts].slice(0, 3);
        });
      }
    });

    prevCountsRef.current = nextCounts;
  }, [sessionList, pathname]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const timers = alerts.map((a) =>
      setTimeout(() => {
        setAlerts((prev) => prev.filter((x) => x.id !== a.id));
      }, 8000),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [alerts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.data?.messages, open]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    const updateFloatingBubbleOffset = () => {
      const panelHeight = open && panelRef.current ? panelRef.current.offsetHeight : 0;
      const nextOffset =
        FLOATING_BUBBLE_BASE_OFFSET +
        (panelHeight > 0 ? panelHeight + FLOATING_BUBBLE_CLEARANCE : 0);
      root.style.setProperty(FLOATING_BUBBLE_OFFSET_VAR, `${nextOffset}px`);
    };

    updateFloatingBubbleOffset();

    if (!open || !panelRef.current || typeof ResizeObserver === 'undefined') {
      return () => {
        root.style.removeProperty(FLOATING_BUBBLE_OFFSET_VAR);
      };
    }

    const observer = new ResizeObserver(() => {
      updateFloatingBubbleOffset();
    });

    observer.observe(panelRef.current);
    window.addEventListener('resize', updateFloatingBubbleOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFloatingBubbleOffset);
      root.style.removeProperty(FLOATING_BUBBLE_OFFSET_VAR);
    };
  }, [open]);

  const latestSessions = useMemo(() => sessionList.slice(0, 5), [sessionList]);

  const parseEmbed = (content: string) => {
    const regex = /\[\[embed\]\]([\s\S]*?)$/;
    const match = content.match(regex);
    if (!match) return { text: content, embed: null };
    try {
      const embed = JSON.parse(match[1]);
      const text = content.replace(regex, '').trim();
      return { text, embed };
    } catch {
      return { text: content, embed: null };
    }
  };

  const buildEmbedPayload = (item: any, type: EmbedType) => {
    const base = {
      kind: type,
      id: item.id,
    } as any;

    if (type === 'note') {
      base.title = item.title || 'Untitled Note';
      base.subtitle = 'Note';
      base.href = `/notes/${item.id}`;
      base.meta = { updatedAt: item.updatedAt };
      return base;
    }

    if (type === 'sprint') {
      base.title = item.title || 'Sprint';
      base.subtitle = `Sprint • ${item.status || 'DRAFT'}`;
      base.href = `/sprints?open=${item.id}`;
      base.meta = { deadline: item.deadline };
      return base;
    }

    if (type === 'calendar') {
      base.title = item.title || 'Calendar Event';
      base.subtitle = `Calendar • ${item.type || 'EVENT'}`;
      base.href = '/calendar';
      base.meta = { startDate: item.startDate, endDate: item.endDate };
      return base;
    }

    if (type === 'diagram') {
      base.title = item.title || 'Diagram';
      base.subtitle = `Diagram • ${item.type || 'FREEFORM'}`;
      base.href = `/diagrams/${item.id}`;
      base.meta = { updatedAt: item.updatedAt };
      return base;
    }

    if (type === 'task') {
      base.title = item.title || 'Task';
      base.subtitle = `Task • ${item.status || 'TODO'}`;
      base.href = '/tasks';
      base.meta = { priority: item.priority, dueDate: item.dueDate };
      return base;
    }

    if (type === 'goal') {
      base.title = item.title || 'Goal';
      base.subtitle = `Goal • ${item.status || 'NOT_STARTED'}`;
      base.href = '/goals';
      base.meta = { progress: item.progress, dueDate: item.dueDate };
      return base;
    }

    return base;
  };

  const embedToMessage = (embed: any) => `[[embed]]${JSON.stringify(embed)}`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId || !activeSessionId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      let token: string | null = null;

      try {
        const stored = localStorage.getItem('brainforge_tokens');
        if (stored) token = JSON.parse(stored).accessToken;
      } catch {}

      if (!token) {
        toast.error('Silakan login ulang untuk upload file');
        return;
      }

      const res = await fetch(`${apiUrl}/teams/${teamId}/brainstorm/${activeSessionId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || `Upload failed (${res.status})`);
      }

      const result = await res.json();
      const newMsg = result.data;

      queryClient.setQueryData(['brainstorm-session', activeSessionId], (old: any) => {
        if (!old?.data?.messages) return old;
        const exists = old.data.messages.some((m: any) => m.id === newMsg.id);
        if (exists) return old;
        return { ...old, data: { ...old.data, messages: [...old.data.messages, newMsg] } };
      });
      toast.success('File berhasil dikirim');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderEmbedCard = (embed: any) => {
    const kind = embed?.kind as string;
    const title = embed?.title || 'Untitled';
    const subtitle = embed?.subtitle || '';
    const href = embed?.href as string | undefined;
    const meta = embed?.meta || {};
    const iconMap: Record<string, any> = {
      note: FileText,
      sprint: Zap,
      calendar: CalendarIcon,
      diagram: Diamond,
      task: CheckCircle2,
      goal: Target,
    };
    const Icon = iconMap[kind] || FileText;

    return (
      <div
        className="mt-2 rounded-lg border border-border bg-card px-2.5 py-2 text-[11px] cursor-pointer hover:border-[#7b68ee]/30"
        onClick={() => {
          if (href) router.push(href);
        }}
      >
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#7b68ee]/10 text-[#7b68ee] flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{title}</div>
            {subtitle && (
              <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-1">
              {meta?.dueDate && <span>Due: {new Date(meta.dueDate).toLocaleDateString()} </span>}
              {meta?.deadline && (
                <span>Deadline: {new Date(meta.deadline).toLocaleDateString()} </span>
              )}
              {meta?.startDate && (
                <span>Start: {new Date(meta.startDate).toLocaleDateString()} </span>
              )}
              {meta?.progress !== undefined && <span>Progress: {meta.progress}% </span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFileAttachment = (msg: any, isOwn: boolean) => {
    if (!msg.fileUrl) return null;

    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(
      /\/api$/,
      '',
    );
    const fullUrl = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${baseUrl}${msg.fileUrl}`;
    const downloadUrl = `${fullUrl}?download=true&name=${encodeURIComponent(msg.fileName || 'file')}`;

    if (msg.fileType?.startsWith('image/')) {
      return (
        <div className="mt-2 relative group/file inline-block">
          <a href={fullUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={fullUrl}
              alt={msg.fileName || 'Image'}
              className="max-w-[180px] max-h-[140px] rounded-lg object-cover border border-background/20"
            />
          </a>
          <a
            href={downloadUrl}
            download={msg.fileName || 'image'}
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-md bg-black/55 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity"
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3 w-3 text-white" />
          </a>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'mt-2 flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px]',
          isOwn ? 'bg-black/10' : 'bg-background border border-border',
        )}
      >
        <FileIcon className="h-3.5 w-3.5 shrink-0" />
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate max-w-[110px] hover:underline"
        >
          {msg.fileName || 'File'}
        </a>
        <a
          href={downloadUrl}
          download={msg.fileName || 'file'}
          className={cn(
            'ml-auto h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-colors',
            isOwn ? 'hover:bg-black/10' : 'hover:bg-accent',
          )}
          title="Download"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>
    );
  };

  if (!teamId) return null;

  const dock = (
    <div
      className="fixed bottom-6 z-50 flex flex-col items-end"
      style={{
        right: 24,
        bottom: 24,
        left: 'auto',
        insetInlineStart: 'auto',
        insetInlineEnd: 24,
        direction: 'ltr',
      }}
    >
      {/* Alerts */}
      <div className="flex flex-col gap-2 mb-3 items-end">
        {alerts.map((a) => (
          <div key={a.id} className="w-72 rounded-xl border border-border bg-card shadow-lg p-3">
            <div className="flex items-start gap-2">
              <div className="h-9 w-9 rounded-lg bg-[#7b68ee]/10 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-[#7b68ee]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">New brainstorm message</p>
                <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
              </div>
              <button
                onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => {
                  setOpen(true);
                  setActiveSessionId(a.id);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#7b68ee] text-white"
              >
                Open chat
              </button>
              <button
                onClick={() => setOpen(true)}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-accent"
              >
                View all
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dock panel */}
      {open && (
        <div
          ref={panelRef}
          className="w-80 rounded-2xl border border-border bg-card shadow-xl mb-3 overflow-hidden"
        >
          {!activeSessionId && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[#7b68ee]" />
                  <span className="text-sm font-semibold text-foreground">Brainstorm</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {latestSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border/60"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${MODE_COLORS[s.mode] || '#6b7280'}15`,
                          color: MODE_COLORS[s.mode] || '#6b7280',
                        }}
                      >
                        <Brain className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {s._count?.messages || 0} messages
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {latestSessions.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No sessions yet
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push('/brainstorm');
                  }}
                  className="w-full text-sm font-medium text-[#7b68ee] hover:underline"
                >
                  Open Brainstorm page
                </button>
              </div>
            </>
          )}

          {activeSessionId && (
            <div className="flex flex-col h-105">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSessionId(null)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {activeSession?.data?.title || 'Brainstorm'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {activeSession?.data?.mode || 'Session'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push(`/brainstorm/${activeSessionId}`);
                  }}
                  className="h-7 w-7 rounded-lg border border-border text-muted-foreground hover:bg-accent flex items-center justify-center"
                  title="Open full view"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {(activeSession?.data?.messages || []).slice(-30).map((msg: any) => {
                  const isOwn = msg.userId === user?.id;
                  const name = msg.user?.name || (msg.role === 'ASSISTANT' ? 'AI' : 'User');
                  const { text: msgText, embed } = parseEmbed(msg.content || '');
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      {!isOwn && (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {msg.role === 'ASSISTANT' ? (
                            <Brain className="h-3.5 w-3.5 text-[#7b68ee]" />
                          ) : msg.user?.avatarUrl ? (
                            <img
                              src={msg.user.avatarUrl}
                              alt={name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-xl px-3 py-2 text-xs',
                          isOwn ? 'bg-[#7b68ee] text-white' : 'bg-muted text-foreground',
                        )}
                      >
                        <div
                          className={cn(
                            'text-[10px] mb-1',
                            isOwn ? 'text-white/70' : 'text-muted-foreground',
                          )}
                        >
                          {name}
                        </div>
                        {msgText && <div className="whitespace-pre-wrap">{msgText}</div>}
                        {embed && renderEmbedCard(embed)}
                        {renderFileAttachment(msg, isOwn)}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border px-3 py-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.sql,.txt,.csv,.json,.xml,.zip,.rar"
                  onChange={handleFileUpload}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowEmbedDialog(true);
                      setEmbedSearch('');
                      setSelectedEmbed(null);
                    }}
                    className="h-9 w-9 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-[#7b68ee] flex items-center justify-center transition-colors"
                    title="Embed item"
                  >
                    <Link2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-9 w-9 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-[#7b68ee] flex items-center justify-center disabled:opacity-50 transition-colors"
                    title="Upload file"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-9 px-3 text-xs rounded-lg border border-border bg-background focus:outline-none focus:border-[#7b68ee]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (chatInput.trim()) sendMutation.mutate(chatInput.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (chatInput.trim()) sendMutation.mutate(chatInput.trim());
                    }}
                    disabled={!chatInput.trim() || sendMutation.isPending}
                    className="h-9 w-9 rounded-lg bg-[#7b68ee] text-white flex items-center justify-center disabled:opacity-50"
                    title="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Embed item ke Brainstorm</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih item workspace untuk di-embed ke chat dock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-muted-foreground">Tipe</label>
              <Select
                value={embedType}
                onValueChange={(value) => {
                  setEmbedType(value as EmbedType);
                  setSelectedEmbed(null);
                }}
              >
                <SelectTrigger className="border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="sprint">Sprint</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                  <SelectItem value="diagram">Diagram</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="goal">Goal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-muted-foreground">Cari</label>
              <Input
                value={embedSearch}
                onChange={(e) => setEmbedSearch(e.target.value)}
                placeholder="Ketik untuk mencari..."
                className="border-border"
              />
            </div>

            <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y">
              {(() => {
                const search = embedSearch.toLowerCase();
                const list = (
                  embedType === 'note'
                    ? embedNotes?.data || []
                    : embedType === 'sprint'
                      ? embedSprints?.data || []
                      : embedType === 'calendar'
                        ? embedCalendar?.data || []
                        : embedType === 'diagram'
                          ? embedDiagrams?.data || []
                          : embedType === 'task'
                            ? embedTasks?.data || []
                            : embedGoals?.data || []
                ) as any[];

                const filtered = list.filter((item: any) => {
                  const title = (item.title || item.goal || '').toLowerCase();
                  return !search || title.includes(search);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-3 text-xs text-muted-foreground">
                      Tidak ada item ditemukan.
                    </div>
                  );
                }

                return filtered.map((item: any) => {
                  const title = item.title || item.goal || 'Untitled';
                  const subtitle =
                    embedType === 'calendar'
                      ? item.startDate
                        ? new Date(item.startDate).toLocaleDateString()
                        : ''
                      : item.status || item.type || '';
                  const isSelected = selectedEmbed?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedEmbed(item)}
                      className={cn(
                        'w-full text-left px-3 py-2 hover:bg-accent transition-colors',
                        isSelected && 'bg-[#7b68ee]/10 text-[#7b68ee]',
                      )}
                    >
                      <div className="text-sm font-medium truncate">{title}</div>
                      {subtitle && (
                        <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowEmbedDialog(false)}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (!selectedEmbed) return;
                const embed = buildEmbedPayload(selectedEmbed, embedType);
                sendMutation.mutate(embedToMessage(embed));
                setShowEmbedDialog(false);
                setSelectedEmbed(null);
                setEmbedSearch('');
              }}
              disabled={!selectedEmbed || sendMutation.isPending}
              className="px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg disabled:opacity-50"
            >
              Embed ke Chat
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dock bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative h-12 w-12 rounded-2xl shadow-lg flex items-center justify-center border transition-all',
          open
            ? 'bg-card border-border text-[#7b68ee]'
            : 'bg-[#7b68ee] text-white border-[#7b68ee]',
        )}
        title="Brainstorm chat"
      >
        <Brain className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </button>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dock, document.body);
}
