'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Plus, Trash2, Loader2, MessageSquare,
  Sparkles, Target, BarChart3, Clock,
  Edit2, Check, X, PanelLeftClose, PanelLeftOpen,
  ArrowUp, Zap, AlertCircle, Search, ChevronDown,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PROVIDER_INFO: Record<string, { label: string; icon: string; color: string }> = {
  OPENAI: { label: 'OpenAI', icon: '🟢', color: '#10a37f' },
  CLAUDE: { label: 'Anthropic', icon: '🟠', color: '#d4a574' },
  GEMINI: { label: 'Google Gemini', icon: '🔵', color: '#4285f4' },
  GROQ: { label: 'Groq', icon: '🔴', color: '#f55036' },
  OPENROUTER: { label: 'OpenRouter', icon: '🟣', color: '#6366f1' },
  COPILOT: { label: 'GitHub Copilot', icon: '⚫', color: '#6e40c9' },
  MISTRAL: { label: 'Mistral', icon: '🌀', color: '#ff7000' },
  DEEPSEEK: { label: 'DeepSeek', icon: '🌊', color: '#4d6bfe' },
  OLLAMA: { label: 'Ollama', icon: '🦙', color: '#1a1a2e' },
};

const MODEL_CATEGORY_RULES = [
  { test: (id: string) => id.startsWith('gpt-'), label: 'GPT', icon: '🟢' },
  { test: (id: string) => /^o[1-4]/.test(id), label: 'Reasoning', icon: '🧠' },
  { test: (id: string) => id.startsWith('claude-'), label: 'Claude', icon: '🟠' },
  { test: (id: string) => id.startsWith('gemini-'), label: 'Gemini', icon: '🔵' },
  { test: (id: string) => id.startsWith('grok-'), label: 'Grok', icon: '⚡' },
  { test: (id: string) => id.startsWith('llama') || id.startsWith('meta-'), label: 'Meta', icon: '🦙' },
  { test: (id: string) => id.startsWith('deepseek'), label: 'DeepSeek', icon: '🌊' },
  { test: (id: string) => id.startsWith('mistral') || id.startsWith('mixtral'), label: 'Mistral', icon: '🌀' },
  { test: (id: string) => id.startsWith('qwen'), label: 'Qwen', icon: '🌟' },
];

function categorizeModels(models: any[]) {
  const groups: { label: string; icon: string; models: any[] }[] = [];
  const used = new Set<string>();
  for (const rule of MODEL_CATEGORY_RULES) {
    const matching = models.filter(m => rule.test(m.id) && !used.has(m.id));
    if (matching.length > 0) {
      matching.forEach(m => used.add(m.id));
      groups.push({ label: rule.label, icon: rule.icon, models: matching });
    }
  }
  const remaining = models.filter(m => !used.has(m.id));
  if (remaining.length > 0) {
    groups.push({ label: 'Other', icon: '⚪', models: remaining });
  }
  return groups;
}

const QUICK_ACTIONS = [
  { label: 'Summarize project', description: 'Get a comprehensive status overview', prompt: 'Please give me a comprehensive summary of the current project status, including progress on tasks, goals, and any recent brainstorm sessions.', icon: BarChart3, color: 'from-blue-500/10 to-blue-600/5 text-blue-600' },
  { label: 'Suggest next goals', description: 'AI-powered priority recommendations', prompt: 'Based on the current project state, what should be the next goals and priorities? Please suggest 3-5 actionable goals with reasoning.', icon: Target, color: 'from-emerald-500/10 to-emerald-600/5 text-emerald-600' },
  { label: 'Analyze blockers', description: 'Identify risks and bottlenecks', prompt: 'Are there any potential blockers or risks in the current project? Analyze overdue tasks, stalled goals, and suggest solutions.', icon: Sparkles, color: 'from-amber-500/10 to-amber-600/5 text-amber-600' },
  { label: 'Sprint planning', description: 'Plan your next sprint efficiently', prompt: 'Help me plan the next sprint. Based on incomplete tasks and current priorities, suggest what should be included in the next sprint.', icon: Clock, color: 'from-purple-500/10 to-purple-600/5 text-purple-600' },
];

export default function AiChatPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chat list
  const { data: chatsRes } = useQuery({
    queryKey: ['ai-chats', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/ai-chat`),
    enabled: !!teamId,
  });

  // Fetch active chat
  const { data: chatRes } = useQuery({
    queryKey: ['ai-chat', activeChatId],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/ai-chat/${activeChatId}`),
    enabled: !!activeChatId && !!teamId,
  });

  // Fetch models
  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  // Fetch connected keys
  const { data: keysData } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ data: any[] }>('/ai/keys'),
  });

  const connectedProviders = new Set((keysData?.data || []).map((k: any) => k.provider.toUpperCase()));

  // Auto-select first connected provider
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

  // When provider changes, auto-select first model & clear filter
  useEffect(() => {
    if (!provider) return;
    const providerModels = modelsData?.data?.[provider];
    if (providerModels?.length && !providerModels.find((m: any) => m.id === model)) {
      setModel(providerModels[0].id);
    }
    setModelFilter('');
  }, [provider, modelsData]);

  const chats = chatsRes?.data || [];
  const activeChat = chatRes?.data;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [message]);

  // Create chat
  const createMutation = useMutation({
    mutationFn: (title: string) => api.post<{ data: any }>(`/teams/${teamId}/ai-chat`, { title }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['ai-chats', teamId] });
      setActiveChatId(res.data.id);
    },
  });

  // Delete chat
  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => api.delete(`/teams/${teamId}/ai-chat/${chatId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-chats', teamId] });
      if (activeChatId) setActiveChatId(null);
      toast.success('Chat deleted');
    },
  });

  // Update title
  const titleMutation = useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      api.patch(`/teams/${teamId}/ai-chat/${chatId}`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-chats', teamId] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat', activeChatId] });
      setEditingTitle(null);
    },
  });

  // Send message
  const handleSend = async (content?: string) => {
    const text = content || message.trim();
    if (!text) return;
    setMessage('');
    setSending(true);

    let chatId = activeChatId;

    // Auto-create chat if none active
    if (!chatId) {
      try {
        const res: any = await api.post(`/teams/${teamId}/ai-chat`, { title: text.slice(0, 50) || 'New Chat' });
        queryClient.invalidateQueries({ queryKey: ['ai-chats', teamId] });
        chatId = res.data.id;
        setActiveChatId(chatId);
      } catch {
        toast.error('Failed to create chat');
        setSending(false);
        return;
      }
    }

    try {
      queryClient.setQueryData(['ai-chat', chatId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            messages: [...(old.data.messages || []), {
              id: `temp-${Date.now()}`,
              role: 'USER',
              content: text,
              createdAt: new Date().toISOString(),
            }],
          },
        };
      });

      await api.post(`/teams/${teamId}/ai-chat/${chatId}/messages`, {
        content: text,
        provider,
        model,
      });
      queryClient.invalidateQueries({ queryKey: ['ai-chat', chatId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
      queryClient.invalidateQueries({ queryKey: ['ai-chat', chatId] });
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = () => {
    createMutation.mutate('New Chat');
  };

  const handleQuickAction = async (prompt: string) => {
    handleSend(prompt);
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-[#1e1e2e] text-gray-100 rounded-xl p-4 my-3 overflow-x-auto text-[13px] leading-relaxed font-mono"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-primary/8 text-[#7b68ee] px-1.5 py-0.5 rounded-md text-[13px] font-mono">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-1.5 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-1.5 text-foreground">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2 text-foreground">$1</h1>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm leading-relaxed">$2</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex h-[calc(100vh-5.5rem)] md:h-[calc(100vh-6.5rem)]">
      {/* ── Sidebar: Chat History ── */}
      <div className={cn(
        'shrink-0 flex flex-col bg-muted/30 border-r border-border transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-r-0'
      )}>
        <div className="flex items-center justify-between h-12 px-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 whitespace-nowrap">
            <div className="h-6 w-6 rounded-lg bg-linear-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            Chat History
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              disabled={createMutation.isPending}
              className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
              title="New Chat"
            >
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {chats.length === 0 ? (
            <div className="text-center py-12 px-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">No conversations yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {chats.map((chat: any) => (
                <div
                  key={chat.id}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-all duration-150',
                    activeChatId === chat.id
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  {editingTitle === chat.id ? (
                    <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') titleMutation.mutate({ chatId: chat.id, title: titleDraft });
                          if (e.key === 'Escape') setEditingTitle(null);
                        }}
                        className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        autoFocus
                      />
                      <button onClick={() => titleMutation.mutate({ chatId: chat.id, title: titleDraft })} className="text-green-500 hover:text-green-600">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditingTitle(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] truncate flex-1">{chat.title}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingTitle(chat.id); setTitleDraft(chat.title); }}
                          className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this chat?')) deleteMutation.mutate(chat.id); }}
                          className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Toggle sidebar button (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-2 left-2 z-10 h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm"
            title="Open chat history"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {!activeChatId ? (
          /* ── Empty State ── */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-xl text-center">
              {/* Logo */}
              <div className="relative mx-auto mb-8 w-20 h-20">
                <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-[#7b68ee]/20 to-[#6c5ce7]/10 blur-xl" />
                <div className="relative h-20 w-20 rounded-3xl bg-linear-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center shadow-lg shadow-primary/20">
                  <Bot className="h-10 w-10 text-white" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-2">AI Project Assistant</h1>
              <p className="text-muted-foreground text-sm mb-10 max-w-sm mx-auto leading-relaxed">
                Ask questions about your project, get insights, plan sprints, and stay on top of everything.
              </p>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={sending}
                    className="flex flex-col items-start gap-2 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 text-left group"
                  >
                    <div className={cn('h-9 w-9 rounded-xl bg-linear-to-br flex items-center justify-center', action.color)}>
                      <action.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* New Chat CTA */}
              <button
                onClick={handleNewChat}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:shadow-primary/20 disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Start New Chat
              </button>

            </div>
          </div>
        ) : (
          /* ── Active Chat ── */
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {activeChat?.messages?.length === 0 && !sending && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-[#7b68ee]/10 to-[#6c5ce7]/5 flex items-center justify-center mb-5">
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">What can I help you with?</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">I can summarize progress, suggest goals, analyze tasks, and help with planning.</p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => handleSend(action.prompt)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border rounded-xl text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary hover:shadow-sm transition-all"
                        >
                          <action.icon className="h-3.5 w-3.5" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeChat?.messages?.map((msg: any) => (
                  <div key={msg.id} className={cn('flex gap-3', msg.role === 'USER' ? 'justify-end' : '')}>
                    {msg.role !== 'USER' && (
                      <div className="h-8 w-8 rounded-xl bg-linear-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3',
                      msg.role === 'USER'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border rounded-bl-md shadow-sm'
                    )}>
                      {msg.role === 'USER' ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div
                          className="text-sm leading-relaxed [&_li]:my-0.5"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                      )}
                      <div className={cn('flex items-center gap-2 mt-2 pt-1', msg.role !== 'USER' && 'border-t border-border/50')}>
                        <span className={cn('text-[10px]', msg.role === 'USER' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.model && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-medium">
                            {msg.model}
                          </span>
                        )}
                      </div>
                    </div>
                    {msg.role === 'USER' && (
                      <div className="h-8 w-8 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <span className="text-xs font-bold text-white">U</span>
                      </div>
                    )}
                  </div>
                ))}

                {sending && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-linear-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md px-4 py-3.5 bg-card border border-border shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
                        </div>
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        )}

            {/* ── Input Area (always visible) ── */}
            <div className="border-t border-border bg-background/80 backdrop-blur-sm shrink-0">
              <div className="max-w-3xl mx-auto px-4 py-3">
                {/* Provider pills & model selector */}
                <div className="space-y-2 mb-2">
                  {/* Provider pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {connectedProviders.size === 0 ? (
                      <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        No API keys connected. Go to Settings → AI Integration.
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
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border',
                              isSelected
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <span className="text-xs leading-none">{info?.icon || '⚪'}</span>
                            {info?.label || p}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Model selector toggle */}
                  <button
                    onClick={() => setModelSelectorOpen(!modelSelectorOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors w-full text-left"
                  >
                    <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-[11px] font-medium text-foreground truncate flex-1">
                      {(modelsData?.data?.[provider] || []).find((m: any) => m.id === model)?.name || model || 'Select model'}
                    </span>
                    <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', modelSelectorOpen && 'rotate-180')} />
                  </button>

                  {/* Expanded model list */}
                  {modelSelectorOpen && (
                    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                      {/* Search */}
                      {(modelsData?.data?.[provider] || []).length > 6 && (
                        <div className="relative border-b border-border">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            placeholder="Search models..."
                            value={modelFilter}
                            onChange={(e) => setModelFilter(e.target.value)}
                            className="h-8 pl-8 text-[11px] rounded-none border-0 bg-transparent focus-visible:ring-0"
                          />
                        </div>
                      )}
                      <div className="max-h-[220px] overflow-y-auto p-1">
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
                                <Search className="h-4 w-4 mx-auto text-muted-foreground/30 mb-1" />
                                <p className="text-[11px] text-muted-foreground">No models match &quot;{modelFilter}&quot;</p>
                              </div>
                            );
                          }

                          const groups = categorizeModels(filtered);
                          const showHeaders = groups.length > 1;

                          return groups.map(group => (
                            <div key={group.label}>
                              {showHeaders && (
                                <div className="sticky top-0 z-10 flex items-center gap-1.5 px-2 py-1 mt-1 first:mt-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-card/95 backdrop-blur-sm">
                                  <span className="text-xs leading-none">{group.icon}</span>
                                  {group.label}
                                  <span className="text-[9px] font-normal ml-auto opacity-50">{group.models.length}</span>
                                </div>
                              )}
                              {group.models.map((m: any) => {
                                const isSelected = model === m.id;
                                const isFree = m.costPer1kInput === 0 && m.costPer1kOutput === 0;
                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => { setModel(m.id); setModelSelectorOpen(false); }}
                                    className={cn(
                                      'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all text-left',
                                      isSelected
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted/50 text-foreground'
                                    )}
                                  >
                                    <div className={cn(
                                      'h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
                                      isSelected ? 'border-primary' : 'border-muted-foreground/30'
                                    )}>
                                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[12px] font-medium truncate">{m.name}</span>
                                        {isFree && <span className="text-[8px] font-bold px-1 rounded bg-green-500/10 text-green-500">FREE</span>}
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">{(m.contextWindow / 1000).toFixed(0)}K</span>
                                  </button>
                                );
                              })}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 shadow-sm focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/5 transition-all">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Ask anything about your project..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    className="flex-1 min-h-6 max-h-40 resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                    rows={1}
                    disabled={sending}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!message.trim() || sending}
                    className="shrink-0 h-8 w-8 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary transition-all"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">Press Enter to send, Shift+Enter for new line</p>
              </div>
            </div>
      </div>
    </div>
  );
}
