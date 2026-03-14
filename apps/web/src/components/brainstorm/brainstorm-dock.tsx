'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Brain, MessageSquare, Send, X, ArrowLeft, FileText, Zap, Calendar as CalendarIcon, Diamond, CheckCircle2, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
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
  const prevCountsRef = useRef<Record<string, number>>({});
  const hasInitializedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions } = useQuery({
    queryKey: ['brainstorm-sessions', teamId, activeProject?.id],
    queryFn: () => api.get<{ data: SessionItem[] }>(
      `/teams/${teamId}/brainstorm${activeProject?.id ? `?projectId=${activeProject.id}` : ''}`
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
            return prevAlerts.map((a) => a.id === s.id ? { ...a, count: curr } : a);
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
      }, 8000)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [alerts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.data?.messages, open]);

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
        onClick={() => { if (href) router.push(href); }}
      >
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#7b68ee]/10 text-[#7b68ee] flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{title}</div>
            {subtitle && <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>}
            <div className="text-[10px] text-muted-foreground mt-1">
              {meta?.dueDate && <span>Due: {new Date(meta.dueDate).toLocaleDateString()} </span>}
              {meta?.deadline && <span>Deadline: {new Date(meta.deadline).toLocaleDateString()} </span>}
              {meta?.startDate && <span>Start: {new Date(meta.startDate).toLocaleDateString()} </span>}
              {meta?.progress !== undefined && <span>Progress: {meta.progress}% </span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!teamId) return null;

  return (
    <div className="fixed bottom-6 right-6 left-auto z-50" style={{ right: 24, bottom: 24 }}>
      {/* Alerts */}
      <div className="flex flex-col gap-2 mb-3 items-end">
        {alerts.map((a) => (
          <div key={a.id} className="w-72 rounded-xl border border-border bg-card shadow-lg p-3">
            <div className="flex items-start gap-2">
              <div className="h-9 w-9 rounded-lg bg-[#7b68ee]/10 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-[#7b68ee]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Pesan baru di brainstorm</p>
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
                Buka chat
              </button>
              <button
                onClick={() => setOpen(true)}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-accent"
              >
                Lihat semua
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dock panel */}
      {open && (
        <div className="w-80 rounded-2xl border border-border bg-card shadow-xl mb-3 overflow-hidden">
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
                        style={{ backgroundColor: `${MODE_COLORS[s.mode] || '#6b7280'}15`, color: MODE_COLORS[s.mode] || '#6b7280' }}
                      >
                        <Brain className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{s.title}</div>
                        <div className="text-[11px] text-muted-foreground">{s._count?.messages || 0} messages</div>
                      </div>
                    </div>
                  </button>
                ))}
                {latestSessions.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    Belum ada session
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={() => { setOpen(false); router.push('/brainstorm'); }}
                  className="w-full text-sm font-medium text-[#7b68ee] hover:underline"
                >
                  Buka halaman Brainstorm
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
                  onClick={() => { setOpen(false); router.push(`/brainstorm/${activeSessionId}`); }}
                  className="text-[11px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-accent"
                >
                  Buka full
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {(activeSession?.data?.messages || []).slice(-30).map((msg: any) => {
                  const isOwn = msg.userId === user?.id;
                  const name = msg.user?.name || (msg.role === 'ASSISTANT' ? 'AI' : 'User');
                  const { text: msgText, embed } = parseEmbed(msg.content || '');
                  return (
                    <div key={msg.id} className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
                      {!isOwn && (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {msg.role === 'ASSISTANT' ? (
                            <Brain className="h-3.5 w-3.5 text-[#7b68ee]" />
                          ) : msg.user?.avatarUrl ? (
                            <img src={msg.user.avatarUrl} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[80%] rounded-xl px-3 py-2 text-xs',
                        isOwn ? 'bg-[#7b68ee] text-white' : 'bg-muted text-foreground'
                      )}>
                        <div className={cn('text-[10px] mb-1', isOwn ? 'text-white/70' : 'text-muted-foreground')}>
                          {name}
                        </div>
                        {msgText && <div className="whitespace-pre-wrap">{msgText}</div>}
                        {embed && renderEmbedCard(embed)}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border px-3 py-2 flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1 h-9 px-3 text-xs rounded-lg border border-border bg-background focus:outline-none focus:border-[#7b68ee]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (chatInput.trim()) sendMutation.mutate(chatInput.trim());
                    }
                  }}
                />
                <button
                  onClick={() => { if (chatInput.trim()) sendMutation.mutate(chatInput.trim()); }}
                  disabled={!chatInput.trim() || sendMutation.isPending}
                  className="h-9 w-9 rounded-lg bg-[#7b68ee] text-white flex items-center justify-center disabled:opacity-50"
                  title="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dock bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-12 w-12 rounded-2xl shadow-lg flex items-center justify-center border transition-all',
          open ? 'bg-card border-border text-[#7b68ee]' : 'bg-[#7b68ee] text-white border-[#7b68ee]'
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
}
