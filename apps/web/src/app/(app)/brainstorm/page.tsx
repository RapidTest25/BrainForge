'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Plus, Send, Brain, Swords, BarChart3,
  Sparkles, Loader2, ArrowLeft
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
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const MODES = [
  { value: 'BRAINSTORM', label: 'Brainstorm', icon: Brain, color: '#22c55e', desc: 'Generate ideas freely' },
  { value: 'DEBATE', label: 'Debate', icon: Swords, color: '#ef4444', desc: 'Challenge ideas critically' },
  { value: 'ANALYSIS', label: 'Analysis', icon: BarChart3, color: '#3b82f6', desc: 'Analyze systematically' },
  { value: 'FREEFORM', label: 'Freeform', icon: Sparkles, color: '#8b5cf6', desc: 'Open conversation' },
];

export default function BrainstormPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ title: '', mode: 'BRAINSTORM', context: '' });
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
  }, [searchParams]);
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('GEMINI');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions } = useQuery({
    queryKey: ['brainstorm-sessions', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/brainstorm`),
    enabled: !!teamId,
  });

  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['brainstorm-session', activeSession],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/brainstorm/${activeSession}`),
    enabled: !!activeSession && !!teamId,
  });

  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/brainstorm`, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-sessions', teamId] });
      setActiveSession(res.data.id);
      setShowCreate(false);
      setNewSession({ title: '', mode: 'BRAINSTORM', context: '' });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { content: string; provider: string; model: string }) => {
      setStreaming(true);
      setStreamContent('');
      try {
        let full = '';
        for await (const chunk of api.streamPost(
          `/teams/${teamId}/brainstorm/${activeSession}/stream`,
          data
        )) {
          full += chunk;
          setStreamContent(full);
        }
      } catch {
        await api.post(`/teams/${teamId}/brainstorm/${activeSession}/messages`, data);
      }
      setStreaming(false);
      setStreamContent('');
      refetchSession();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.data?.messages, streamContent]);

  const handleSend = () => {
    if (!message.trim() || streaming) return;
    sendMutation.mutate({ content: message, provider, model });
    setMessage('');
  };

  const getModeInfo = (mode: string) => MODES.find(m => m.value === mode);

  // Session list view
  if (!activeSession) {
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#1a1a2e]">Brainstorm</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Session
          </button>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODES.map(({ value, label, icon: Icon, color, desc }) => (
            <div
              key={value}
              className="bg-white border border-gray-100 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all"
              onClick={() => {
                setNewSession({ ...newSession, mode: value });
                setShowCreate(true);
              }}
            >
              <div className="h-10 w-10 rounded-lg mx-auto mb-2.5 flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <p className="font-medium text-sm text-[#1a1a2e]">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* Sessions list */}
        <div className="space-y-2">
          {sessions?.data?.map((s: any) => {
            const mode = getModeInfo(s.mode);
            return (
              <div
                key={s.id}
                className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all"
                onClick={() => setActiveSession(s.id)}
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mode?.color || '#6b7280'}10` }}>
                  {mode && <mode.icon className="h-4 w-4" style={{ color: mode.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#1a1a2e] truncate">{s.title}</p>
                  <p className="text-xs text-gray-400">
                    {s._count?.messages || 0} messages · {new Date(s.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 px-2 py-0.5 bg-gray-50 rounded">{s.mode}</span>
              </div>
            );
          })}
          {!sessions?.data?.length && (
            <div className="text-center py-12">
              <Brain className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">No sessions yet. Create your first brainstorm!</p>
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#1a1a2e]">New Brainstorm Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Pre-selected mode badge */}
              {(() => {
                const selectedMode = getModeInfo(newSession.mode);
                return selectedMode ? (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 border border-gray-100 rounded-xl bg-gray-50/50">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedMode.color}10` }}>
                      <selectedMode.icon className="h-4 w-4" style={{ color: selectedMode.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1a1a2e]">{selectedMode.label}</p>
                      <p className="text-[11px] text-gray-400">{selectedMode.desc}</p>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Title</label>
                <Input
                  placeholder="e.g. Product Strategy Session"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="border-gray-200 focus:border-[#7b68ee]"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Context <span className="text-gray-400 font-normal">(optional)</span></label>
                <Textarea
                  placeholder="Provide project context for better AI responses..."
                  value={newSession.context}
                  onChange={(e) => setNewSession({ ...newSession, context: e.target.value })}
                  className="border-gray-200 focus:border-[#7b68ee]"
                />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={() => createMutation.mutate(newSession)}
                disabled={!newSession.title || createMutation.isPending}
                className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Chat view
  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
        <button onClick={() => setActiveSession(null)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400">
          <ArrowLeft className="h-4 w-4" />
        </button>
        {session?.data && (() => {
          const mode = getModeInfo(session.data.mode);
          return (
            <>
              <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${mode?.color || '#6b7280'}10` }}>
                {mode && <mode.icon className="h-3.5 w-3.5" style={{ color: mode.color }} />}
              </div>
              <div>
                <h2 className="font-medium text-sm text-[#1a1a2e]">{session.data.title}</h2>
                <p className="text-[11px] text-gray-400">{session.data.mode} mode</p>
              </div>
            </>
          );
        })()}
        <div className="ml-auto flex items-center gap-2">
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-28 h-7 text-xs border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(modelsData?.data || {}).map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-44 h-7 text-xs border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(modelsData?.data?.[provider] || []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {session?.data?.messages?.map((msg: any) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3 max-w-[80%]',
              msg.role === 'USER' ? 'ml-auto flex-row-reverse' : ''
            )}
          >
            <div
              className={cn(
                'rounded-xl px-4 py-3',
                msg.role === 'USER'
                  ? 'bg-[#7b68ee] text-white'
                  : 'bg-gray-50 text-[#1a1a2e]'
              )}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn('text-[10px]', msg.role === 'USER' ? 'text-white/60' : 'text-gray-400')}>
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
                {msg.model && (
                  <span className={cn('text-[10px]', msg.role === 'USER' ? 'text-white/60' : 'text-gray-400')}>{msg.model}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {streaming && streamContent && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-[#1a1a2e]">{streamContent}</p>
              <Loader2 className="h-3 w-3 animate-spin mt-2 text-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="min-h-11 max-h-32 resize-none border-gray-200 focus:border-[#7b68ee]"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || streaming}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-[#7b68ee] text-white hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
        >
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
