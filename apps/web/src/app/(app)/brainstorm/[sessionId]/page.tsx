'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Send, Swords, BarChart3,
  Sparkles, Loader2, ArrowLeft, Pencil, Trash2,
  Circle, Square, Type, Minus, Eraser, Download,
  ArrowRight, Diamond, RotateCcw,
  Users, FileText, Check, X, Paperclip, Image as ImageIcon, File as FileIcon,
  MoreVertical, Edit2, Brain,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeamStore } from '@/stores/team-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBrainstormSocket } from '@/hooks/use-brainstorm-socket';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

// ===== CONSTANTS =====
const MODES = [
  { value: 'BRAINSTORM', label: 'Brainstorm', icon: Brain, color: '#22c55e' },
  { value: 'DEBATE', label: 'Debate', icon: Swords, color: '#ef4444' },
  { value: 'ANALYSIS', label: 'Analysis', icon: BarChart3, color: '#3b82f6' },
  { value: 'FREEFORM', label: 'Freeform', icon: Sparkles, color: '#8b5cf6' },
];

const DRAW_COLORS = ['#1a1a2e', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const DRAW_SIZES = [2, 4, 6, 8];

// ===== TYPES =====
type DrawTool = 'select' | 'pen' | 'line' | 'rect' | 'circle' | 'diamond' | 'text' | 'eraser' | 'arrow';

interface DrawElement {
  id: string;
  tool: DrawTool;
  points?: number[];
  x?: number; y?: number; w?: number; h?: number;
  color: string;
  size: number;
  text?: string;
}



// ===== MAIN COMPONENT =====
export default function BrainstormSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { activeTeam } = useTeamStore();
  const { user } = useAuthStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard'>('chat');

  // Chat state
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI typing indicator
  const [aiTyping, setAiTyping] = useState(false);
  const aiTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Whiteboard state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [drawColor, setDrawColor] = useState('#1a1a2e');
  const [drawSize, setDrawSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null);


  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [msgDeleteConfirm, setMsgDeleteConfirm] = useState<{ id: string } | null>(null);
  const canvasLoadedRef = useRef(false);

  // Socket for realtime
  const { emit: socketEmit, on: socketOn, members } = useBrainstormSocket(
    sessionId,
    user ? { id: user.id, name: user.name, avatarUrl: user.avatar } : undefined,
  );

  // ===== REALTIME LISTENERS =====
  useEffect(() => {
    if (!sessionId) return;
    const unsubs: (() => void)[] = [];
    unsubs.push(socketOn('whiteboard:draw', (element: DrawElement) => {
      setElements(prev => [...prev, element]);
    }));
    unsubs.push(socketOn('whiteboard:undo', () => {
      setElements(prev => prev.slice(0, -1));
    }));
    unsubs.push(socketOn('whiteboard:clear', () => {
      setElements([]);
      setCurrentElement(null);
    }));

    // Real-time chat: new message
    unsubs.push(socketOn('chat:message', (newMsg: any) => {
      // If we receive an AI message, hide typing indicator
      if (newMsg.role === 'ASSISTANT') {
        setAiTyping(false);
        if (aiTypingTimeoutRef.current) {
          clearTimeout(aiTypingTimeoutRef.current);
          aiTypingTimeoutRef.current = null;
        }
      }
      queryClient.setQueryData(['brainstorm-session', sessionId], (old: any) => {
        if (!old?.data?.messages) return old;
        // Avoid duplicates (sender already sees their own message via mutation)
        const exists = old.data.messages.some((m: any) => m.id === newMsg.id);
        if (exists) return old;
        return {
          ...old,
          data: {
            ...old.data,
            messages: [...old.data.messages, newMsg],
          },
        };
      });
    }));

    // AI typing indicator from server
    unsubs.push(socketOn('ai:typing', (data: { isTyping: boolean }) => {
      setAiTyping(data.isTyping);
      // Auto-clear typing indicator after 60s safety net
      if (data.isTyping) {
        if (aiTypingTimeoutRef.current) clearTimeout(aiTypingTimeoutRef.current);
        aiTypingTimeoutRef.current = setTimeout(() => {
          setAiTyping(false);
          // Refetch to get any missed messages
          queryClient.invalidateQueries({ queryKey: ['brainstorm-session', sessionId] });
        }, 60000);
      } else {
        if (aiTypingTimeoutRef.current) {
          clearTimeout(aiTypingTimeoutRef.current);
          aiTypingTimeoutRef.current = null;
        }
      }
    }));

    // Real-time chat: message edited
    unsubs.push(socketOn('chat:edit', (editedMsg: any) => {
      queryClient.setQueryData(['brainstorm-session', sessionId], (old: any) => {
        if (!old?.data?.messages) return old;
        return {
          ...old,
          data: {
            ...old.data,
            messages: old.data.messages.map((m: any) =>
              m.id === editedMsg.id ? { ...m, content: editedMsg.content, isEdited: true } : m
            ),
          },
        };
      });
    }));

    // Real-time chat: message deleted
    unsubs.push(socketOn('chat:delete', (data: { messageId: string }) => {
      queryClient.setQueryData(['brainstorm-session', sessionId], (old: any) => {
        if (!old?.data?.messages) return old;
        return {
          ...old,
          data: {
            ...old.data,
            messages: old.data.messages.filter((m: any) => m.id !== data.messageId),
          },
        };
      });
    }));

    return () => unsubs.forEach(fn => fn());
  }, [sessionId, socketOn, queryClient]);

  // ===== QUERIES =====
  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['brainstorm-session', sessionId],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/brainstorm/${sessionId}`),
    enabled: !!sessionId && !!teamId,
  });

  // Team members for @mention autocomplete
  const { data: teamMembersRes } = useQuery({
    queryKey: ['brainstorm-members', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/brainstorm/members`),
    enabled: !!teamId,
    staleTime: 5 * 60_000,
  });

  // AI models for @ai
  const { data: aiModelsRes } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
    staleTime: 5 * 60_000,
  });

  const teamMembers = teamMembersRes?.data || [];

  // Mention candidates: AI + team members
  const mentionCandidates = [
    { id: '__ai__', name: 'AI Assistant', avatarUrl: null, isAI: true },
    ...teamMembers.map((m: any) => ({ ...m, isAI: false })),
  ];

  const filteredMentions = mentionQuery !== null
    ? mentionCandidates.filter((c) =>
        c.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        (c.isAI && 'ai'.includes(mentionQuery.toLowerCase()))
      )
    : [];

  // ===== LOAD SAVED DATA =====
  useEffect(() => {
    if (session?.data) {
      canvasLoadedRef.current = false;
      const wb = session.data.whiteboardData;
      if (wb && Array.isArray(wb)) {
        setElements(wb);
      } else {
        setElements([]);
      }
      setTimeout(() => { canvasLoadedRef.current = true; }, 500);
    }
  }, [session?.data?.id]);

  // ===== AUTO-SAVE =====
  useEffect(() => {
    if (!sessionId || !teamId || !canvasLoadedRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      api.patch(`/teams/${teamId}/brainstorm/${sessionId}/canvas`, {
        whiteboardData: elements,
      }).catch(() => {});
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [elements, sessionId, teamId]);

  // ===== MUTATIONS =====
  const titleMutation = useMutation({
    mutationFn: (title: string) => api.patch(`/teams/${teamId}/brainstorm/${sessionId}`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['brainstorm-sessions', teamId] });
      setEditingTitle(false);
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      return api.post<{ data: any }>(`/teams/${teamId}/brainstorm/${sessionId}/messages`, data);
    },
    onSuccess: (res: any) => {
      // Add the message to cache immediately (socket broadcast dedup prevents doubles)
      const newMsg = res.data;
      queryClient.setQueryData(['brainstorm-session', sessionId], (old: any) => {
        if (!old?.data?.messages) return old;
        const exists = old.data.messages.some((m: any) => m.id === newMsg.id);
        if (exists) return old;
        return {
          ...old,
          data: { ...old.data, messages: [...old.data.messages, newMsg] },
        };
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      return api.patch<{ data: any }>(`/teams/${teamId}/brainstorm/messages/${messageId}`, { content });
    },
    onSuccess: (res: any) => {
      setEditingMessageId(null);
      setEditingContent('');
      // Update cache inline (socket broadcast also delivers this for other clients)
      const edited = res.data;
      queryClient.setQueryData(['brainstorm-session', sessionId], (old: any) => {
        if (!old?.data?.messages) return old;
        return {
          ...old,
          data: {
            ...old.data,
            messages: old.data.messages.map((m: any) =>
              m.id === edited.id ? { ...m, content: edited.content, isEdited: true } : m
            ),
          },
        };
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return api.delete(`/teams/${teamId}/brainstorm/messages/${messageId}`);
    },
    onSuccess: (_res: any, messageId: string) => {
      // Remove from cache (socket broadcast also delivers this for other clients)
      queryClient.setQueryData(['brainstorm-session', sessionId], (old: any) => {
        if (!old?.data?.messages) return old;
        return {
          ...old,
          data: {
            ...old.data,
            messages: old.data.messages.filter((m: any) => m.id !== messageId),
          },
        };
      });
      toast.success('Message deleted');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.data?.messages, aiTyping]);

  const handleSend = () => {
    if (!message.trim()) return;
    // Check if @ai is mentioned — include a default provider/model
    const hasAiMention = /@ai\b/i.test(message);
    const payload: any = { content: message };
    if (hasAiMention) {
      // Pick first available provider from user's keys, or default
      const allModels = aiModelsRes?.data || {};
      const providerPriority = ['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI', 'GROQ', 'COPILOT'];
      let aiProvider = 'OPENROUTER';
      let aiModel = '';
      for (const p of providerPriority) {
        if (allModels[p]?.length > 0) {
          aiProvider = p;
          const models = allModels[p];
          // Pick a capable model
          const preferred = models.find((m: any) => {
            const id = typeof m === 'string' ? m : m.id || '';
            return /gpt-4|claude-3|gemini-2|llama-3\.3/i.test(id);
          });
          aiModel = preferred ? (typeof preferred === 'string' ? preferred : preferred.id) : (typeof models[0] === 'string' ? models[0] : models[0].id);
          break;
        }
      }
      payload.provider = aiProvider;
      payload.model = aiModel;
    }
    sendMutation.mutate(payload);
    setMessage('');
    setMentionQuery(null);
    // Optimistically show AI typing indicator for client who sent the message
    if (hasAiMention) {
      setAiTyping(true);
      // Safety fallback: refetch session after 30s if AI hasn't responded
      if (aiTypingTimeoutRef.current) clearTimeout(aiTypingTimeoutRef.current);
      aiTypingTimeoutRef.current = setTimeout(() => {
        setAiTyping(false);
        queryClient.invalidateQueries({ queryKey: ['brainstorm-session', sessionId] });
      }, 30000);
    }
  };

  // @mention helpers
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    const cursorPos = e.target.selectionStart || 0;
    // Find the last @ before cursor
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only trigger if @ is at start or preceded by whitespace, and no space in query
      if ((charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) && !/\s/.test(textAfterAt)) {
        setMentionQuery(textAfterAt);
        setMentionStart(lastAtIndex);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (candidate: { id: string; name: string; isAI: boolean }) => {
    const mentionText = candidate.isAI ? '@ai' : `@${candidate.name}`;
    const before = message.slice(0, mentionStart);
    const after = message.slice((textareaRef.current?.selectionStart || mentionStart + (mentionQuery?.length || 0) + 1));
    setMessage(before + mentionText + ' ' + after);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, filteredMentions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (mentionQuery !== null && filteredMentions.length > 0) {
          e.preventDefault();
          insertMention(filteredMentions[mentionIndex]);
          return;
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageContent = (content: string, isOwn: boolean, isAI: boolean) => {
    const mentionRegex = /@(\w+(?:\s\w+)*?)(?=\s|$|[.,!?;:])/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      const mentionName = match[1];
      const isAIMention = /^ai$/i.test(mentionName);
      parts.push(
        <span
          key={match.index}
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold mx-0.5',
            isAIMention
              ? 'bg-[#7b68ee]/20 text-[#7b68ee] border border-[#7b68ee]/30'
              : isOwn
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-[#7b68ee]/10 text-[#7b68ee] border border-[#7b68ee]/20'
          )}
        >
          {isAIMention && <Brain className="h-3 w-3 mr-0.5" />}
          @{mentionName}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    return parts.length > 0 ? parts : content;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
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
        toast.error('Please log in again to upload files');
        return;
      }

      const res = await fetch(`${apiUrl}/teams/${teamId}/brainstorm/${sessionId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || `Upload failed (${res.status})`);
      }
      queryClient.invalidateQueries({ queryKey: ['brainstorm-session', sessionId] });
      toast.success('File uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getModeInfo = (mode: string) => MODES.find(m => m.value === mode);

  // ===== TITLE EDIT =====
  const startEditTitle = () => {
    setTitleDraft(session?.data?.title || '');
    setEditingTitle(true);
  };

  const saveTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== session?.data?.title) {
      titleMutation.mutate(trimmed);
    } else {
      setEditingTitle(false);
    }
  };

  // ===== WHITEBOARD LOGIC =====
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'var(--color-border)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    const drawAll = [...elements, currentElement].filter(Boolean) as DrawElement[];
    for (const el of drawAll) {
      ctx.strokeStyle = el.tool === 'eraser' ? '#ffffff' : el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.tool === 'eraser' ? el.size * 4 : el.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.tool === 'pen' || el.tool === 'eraser') {
        if (el.points && el.points.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(el.points[0], el.points[1]);
          for (let i = 2; i < el.points.length; i += 2) ctx.lineTo(el.points[i], el.points[i + 1]);
          ctx.stroke();
        }
      } else if (el.tool === 'line' || el.tool === 'arrow') {
        if (el.points && el.points.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(el.points[0], el.points[1]);
          ctx.lineTo(el.points[2], el.points[3]);
          ctx.stroke();
          if (el.tool === 'arrow') {
            const angle = Math.atan2(el.points[3] - el.points[1], el.points[2] - el.points[0]);
            const headLen = 12;
            ctx.beginPath();
            ctx.moveTo(el.points[2], el.points[3]);
            ctx.lineTo(el.points[2] - headLen * Math.cos(angle - Math.PI / 6), el.points[3] - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(el.points[2], el.points[3]);
            ctx.lineTo(el.points[2] - headLen * Math.cos(angle + Math.PI / 6), el.points[3] - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          }
        }
      } else if (el.tool === 'rect') {
        if (el.x != null && el.y != null && el.w != null && el.h != null) ctx.strokeRect(el.x, el.y, el.w, el.h);
      } else if (el.tool === 'circle') {
        if (el.x != null && el.y != null && el.w != null && el.h != null) {
          ctx.beginPath();
          ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w / 2), Math.abs(el.h / 2), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (el.tool === 'diamond') {
        if (el.x != null && el.y != null && el.w != null && el.h != null) {
          const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
          ctx.beginPath();
          ctx.moveTo(cx, el.y); ctx.lineTo(el.x + el.w, cy); ctx.lineTo(cx, el.y + el.h); ctx.lineTo(el.x, cy);
          ctx.closePath(); ctx.stroke();
        }
      } else if (el.tool === 'text' && el.text) {
        ctx.font = `${el.size * 4}px Inter, sans-serif`;
        ctx.fillText(el.text, el.x || 0, el.y || 0);
      }
    }
  }, [elements, currentElement]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        redrawCanvas();
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [activeTab, redrawCanvas]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPoint(e);
    setIsDrawing(true);
    if (drawTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const textEl: DrawElement = { id: crypto.randomUUID(), tool: 'text', x, y, color: drawColor, size: drawSize, text };
        setElements(prev => [...prev, textEl]);
        if (sessionId) socketEmit('whiteboard:draw', { sessionId, element: textEl });
      }
      setIsDrawing(false);
      return;
    }
    const newEl: DrawElement = { id: crypto.randomUUID(), tool: drawTool, color: drawColor, size: drawSize };
    if (drawTool === 'pen' || drawTool === 'eraser') {
      newEl.points = [x, y];
    } else if (drawTool === 'line' || drawTool === 'arrow') {
      newEl.points = [x, y, x, y];
    } else {
      newEl.x = x; newEl.y = y; newEl.w = 0; newEl.h = 0;
    }
    setCurrentElement(newEl);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElement) return;
    const { x, y } = getCanvasPoint(e);
    if (currentElement.tool === 'pen' || currentElement.tool === 'eraser') {
      setCurrentElement({ ...currentElement, points: [...(currentElement.points || []), x, y] });
    } else if (currentElement.tool === 'line' || currentElement.tool === 'arrow') {
      const pts = currentElement.points || [0, 0, 0, 0];
      setCurrentElement({ ...currentElement, points: [pts[0], pts[1], x, y] });
    } else {
      setCurrentElement({ ...currentElement, w: x - (currentElement.x || 0), h: y - (currentElement.y || 0) });
    }
  };

  const handleCanvasMouseUp = () => {
    if (currentElement) {
      setElements(prev => [...prev, currentElement]);
      if (sessionId) socketEmit('whiteboard:draw', { sessionId, element: currentElement });
      setCurrentElement(null);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    setElements([]); setCurrentElement(null);
    if (sessionId) socketEmit('whiteboard:clear', { sessionId });
  };
  const undoCanvas = () => {
    setElements(prev => prev.slice(0, -1));
    if (sessionId) socketEmit('whiteboard:undo', { sessionId });
  };
  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `brainstorm-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };


  const modeInfo = session?.data ? getModeInfo(session.data.mode) : null;

  // ===== RENDER =====
  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => router.push('/brainstorm')} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {session?.data && modeInfo && (
            <>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: `${modeInfo.color}10` }}>
                <modeInfo.icon className="h-4 w-4" style={{ color: modeInfo.color }} />
              </div>
              <div className="min-w-0 flex-1">
                {editingTitle ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                      className="h-7 text-sm font-semibold border-border focus:border-[#7b68ee] rounded-lg px-2 max-w-[200px]"
                      autoFocus
                    />
                    <button onClick={saveTitle} className="p-1 rounded hover:bg-green-500/10 text-green-600"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditingTitle(false)} className="p-1 rounded hover:bg-red-500/10 text-red-500"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <button
                    onClick={startEditTitle}
                    className="group flex items-center gap-1.5"
                  >
                    <h2 className="font-semibold text-sm text-foreground truncate">{session.data.title}</h2>
                    <Pencil className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{session.data.mode} mode</p>
              </div>
            </>
          )}

          {/* Presence avatars */}
          {members.length > 0 && (
            <div className="flex items-center -space-x-1.5 ml-2">
              {members.slice(0, 5).map((m, i) => (
                <div
                  key={m.userId + i}
                  className="h-7 w-7 rounded-full border-2 border-background bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center text-[10px] font-bold text-white"
                  title={m.userName}
                >
                  {m.userName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              ))}
              {members.length > 5 && (
                <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                  +{members.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/80 rounded-xl p-1">
          {[
            { key: 'chat' as const, label: 'Chat', icon: MessageSquare },
            { key: 'whiteboard' as const, label: 'Draw', icon: Pencil },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-card text-[#7b68ee] shadow-sm'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== CHAT TAB ===== */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {session?.data?.messages?.map((msg: any) => {
              const isOwn = msg.userId === user?.id;
              const isAI = msg.role === 'ASSISTANT';
              const senderName = msg.user?.name || (isAI ? 'AI Assistant' : 'Unknown');
              const senderInitial = isAI ? '' : senderName.charAt(0).toUpperCase();
              const isEditing = editingMessageId === msg.id;

              return (
                <div key={msg.id} className={cn('flex gap-3 max-w-[85%]', isOwn ? 'ml-auto flex-row-reverse' : '')}>
                  <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 text-[10px] font-bold text-white',
                    isAI ? 'bg-gradient-to-br from-[#7b68ee] to-[#a855f7]' :
                    isOwn ? 'bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7]' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                  )}>
                    {isAI ? (
                      <Brain className="h-3.5 w-3.5 text-white" />
                    ) : msg.user?.avatarUrl ? (
                      <img src={msg.user.avatarUrl} alt={senderName} className="h-7 w-7 rounded-full object-cover" />
                    ) : senderInitial}
                  </div>
                  <div className={cn(
                    'rounded-2xl px-4 py-3 group relative',
                    isAI ? 'bg-gradient-to-r from-[#7b68ee]/10 to-[#a855f7]/10 text-foreground border border-[#7b68ee]/20' :
                    isOwn ? 'bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white' : 'bg-muted text-foreground border border-border'
                  )}>
                    {/* Sender name */}
                    <p className={cn('text-[11px] font-semibold mb-1', isAI ? 'text-[#7b68ee]' : isOwn ? 'text-white/80' : 'text-muted-foreground')}>
                      {isAI && <Brain className="h-3 w-3 inline mr-1 -mt-0.5" />}
                      {senderName}
                    </p>

                    {/* Message content or edit input */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editMutation.mutate({ messageId: msg.id, content: editingContent }); }
                            if (e.key === 'Escape') { setEditingMessageId(null); setEditingContent(''); }
                          }}
                          className="min-h-[60px] text-sm bg-card/20 border-background/30 text-inherit rounded-xl"
                          autoFocus
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => { setEditingMessageId(null); setEditingContent(''); }} className="px-2.5 py-1 text-[11px] rounded-lg hover:bg-card/20">Cancel</button>
                          <button
                            onClick={() => editMutation.mutate({ messageId: msg.id, content: editingContent })}
                            disabled={!editingContent.trim() || editMutation.isPending}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-card/20 hover:bg-card/30 font-medium disabled:opacity-50"
                          >
                            {editMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{renderMessageContent(msg.content, isOwn, isAI)}</p>}
                        {msg.fileUrl && (() => {
                          const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
                          const fullUrl = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${baseUrl}${msg.fileUrl}`;
                          const downloadUrl = `${fullUrl}?download=true&name=${encodeURIComponent(msg.fileName || 'file')}`;
                          return (
                            <div className="mt-2">
                              {msg.fileType?.startsWith('image/') ? (
                                <div className="relative group/file inline-block">
                                  <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={fullUrl}
                                      alt={msg.fileName || 'Image'}
                                      className="max-w-[280px] max-h-[200px] rounded-lg object-cover border border-background/20"
                                    />
                                  </a>
                                  <a
                                    href={downloadUrl}
                                    download={msg.fileName || 'image'}
                                    className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity"
                                    title="Download"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="h-3.5 w-3.5 text-white" />
                                  </a>
                                </div>
                              ) : (
                                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs', isOwn ? 'bg-card/15' : 'bg-muted')}>
                                  <FileIcon className="h-4 w-4" />
                                  <a
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate max-w-[160px] hover:underline"
                                  >
                                    {msg.fileName || 'File'}
                                  </a>
                                  <a
                                    href={downloadUrl}
                                    download={msg.fileName || 'file'}
                                    className={cn('ml-auto h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-colors', isOwn ? 'hover:bg-card/20' : 'hover:bg-accent')}
                                    title="Download"
                                  >
                                    <Download className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {/* Timestamp + edited badge */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('text-[10px]', isOwn ? 'text-white/60' : 'text-muted-foreground')}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                        {msg.isEdited && (
                          <span className={cn('text-[10px] italic', isOwn ? 'text-white/50' : 'text-muted-foreground')}>
                            (edited)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Edit/Delete actions — only for own messages */}
                    {isOwn && !isEditing && (
                      <div className="absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ [isOwn ? 'left' : 'right']: '-2rem' }}>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => { setEditingMessageId(msg.id); setEditingContent(msg.content || ''); }}
                            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-[#7b68ee] transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              setMsgDeleteConfirm({ id: msg.id });
                            }}
                            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!session?.data?.messages?.length && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#7b68ee]/10 to-[#6c5ce7]/5 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-[#7b68ee]" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Start the conversation</h3>
                <p className="text-xs text-muted-foreground max-w-xs">Share ideas and discuss with your team</p>
              </div>
            )}
            {/* AI Typing Indicator */}
            {aiTyping && (
              <div className="flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 bg-gradient-to-br from-[#7b68ee] to-[#a855f7] animate-pulse">
                  <Brain className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-gradient-to-r from-[#7b68ee]/10 to-[#a855f7]/10 border border-[#7b68ee]/20">
                  <p className="text-[11px] font-semibold mb-2 text-[#7b68ee]">
                    <Brain className="h-3 w-3 inline mr-1 -mt-0.5" />
                    AI Assistant
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#7b68ee] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-[#7b68ee] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-[#7b68ee] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-[#7b68ee]/70 font-medium">Sedang berpikir...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2 pt-3 border-t border-border">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.sql,.txt,.csv,.json,.xml,.zip,.rar"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl border border-border hover:bg-accent text-muted-foreground hover:text-[#7b68ee] disabled:opacity-50 transition-all"
              title="Upload file"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <div className="flex-1 relative">
              {/* @mention autocomplete dropdown */}
              {mentionQuery !== null && filteredMentions.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-border">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mention</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filteredMentions.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => insertMention(c)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                          i === mentionIndex ? 'bg-[#7b68ee]/10 text-[#7b68ee]' : 'hover:bg-muted text-foreground'
                        )}
                      >
                        {c.isAI ? (
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center shrink-0">
                            <Brain className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {c.avatarUrl ? (
                              <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground">{c.name?.charAt(0)?.toUpperCase()}</span>
                            )}
                          </div>
                        )}
                        <div className="text-left min-w-0">
                          <div className="text-[13px] font-medium truncate">{c.isAI ? 'AI Assistant' : c.name}</div>
                          <div className="text-[10px] text-muted-foreground">{c.isAI ? 'Ask AI a question' : c.email || ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Textarea
                ref={textareaRef}
                placeholder="Type your message... Use @ai to ask AI, @name to mention"
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleMentionKeyDown}
                className="min-h-11 max-h-32 resize-none border-border focus:border-[#7b68ee] rounded-xl pr-12"
                rows={1}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50 transition-all"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}

      {/* ===== WHITEBOARD TAB ===== */}
      {activeTab === 'whiteboard' && (
        <div className="flex-1 flex flex-col mt-3 overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-1 px-3 py-2 bg-muted border-b border-border flex-wrap">
            {([
              { tool: 'pen' as DrawTool, icon: Pencil, label: 'Pen' },
              { tool: 'line' as DrawTool, icon: Minus, label: 'Line' },
              { tool: 'arrow' as DrawTool, icon: ArrowRight, label: 'Arrow' },
              { tool: 'rect' as DrawTool, icon: Square, label: 'Rectangle' },
              { tool: 'circle' as DrawTool, icon: Circle, label: 'Circle' },
              { tool: 'diamond' as DrawTool, icon: Diamond, label: 'Diamond' },
              { tool: 'text' as DrawTool, icon: Type, label: 'Text' },
              { tool: 'eraser' as DrawTool, icon: Eraser, label: 'Eraser' },
            ]).map(t => (
              <button
                key={t.tool}
                onClick={() => setDrawTool(t.tool)}
                title={t.label}
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-lg transition-all',
                  drawTool === t.tool ? 'bg-[#7b68ee] text-white shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground/80'
                )}
              >
                <t.icon className="h-4 w-4" />
              </button>
            ))}
            <div className="w-px h-6 bg-muted mx-1" />
            {DRAW_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setDrawColor(c)}
                className={cn('h-6 w-6 rounded-full border-2 transition-all', drawColor === c ? 'border-[#7b68ee] scale-110' : 'border-transparent hover:scale-105')}
                style={{ backgroundColor: c }}
              />
            ))}
            <div className="w-px h-6 bg-muted mx-1" />
            <Select value={String(drawSize)} onValueChange={v => setDrawSize(Number(v))}>
              <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DRAW_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}px</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <button onClick={undoCanvas} title="Undo" className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={clearCanvas} title="Clear" className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
            <button onClick={exportCanvas} title="Export" className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"><Download className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 relative bg-card cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="absolute inset-0"
            />
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!msgDeleteConfirm}
        onClose={() => setMsgDeleteConfirm(null)}
        onConfirm={() => { if (msgDeleteConfirm) { deleteMutation.mutate(msgDeleteConfirm.id); setMsgDeleteConfirm(null); } }}
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone."
      />
    </div>
  );
}
