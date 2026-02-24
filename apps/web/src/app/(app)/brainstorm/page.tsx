'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Plus, Send, Brain, Swords, BarChart3,
  Sparkles, Loader2, ArrowLeft, Pencil, GitBranch, Trash2,
  Circle, Square, Type, Minus, Eraser, Download,
  ArrowRight, Diamond, RotateCcw,
  Users, FileText
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
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const MODES = [
  { value: 'BRAINSTORM', label: 'Brainstorm', icon: Brain, color: '#22c55e', desc: 'Generate ideas freely', gradient: 'from-green-500/10 to-emerald-500/5' },
  { value: 'DEBATE', label: 'Debate', icon: Swords, color: '#ef4444', desc: 'Challenge ideas critically', gradient: 'from-red-500/10 to-orange-500/5' },
  { value: 'ANALYSIS', label: 'Analysis', icon: BarChart3, color: '#3b82f6', desc: 'Analyze systematically', gradient: 'from-blue-500/10 to-cyan-500/5' },
  { value: 'FREEFORM', label: 'Freeform', icon: Sparkles, color: '#8b5cf6', desc: 'Open conversation', gradient: 'from-violet-500/10 to-purple-500/5' },
];

const DRAW_COLORS = ['#1a1a2e', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const DRAW_SIZES = [2, 4, 6, 8];

type DrawTool = 'select' | 'pen' | 'line' | 'rect' | 'circle' | 'diamond' | 'text' | 'eraser' | 'arrow';
type FlowNodeType = 'start' | 'process' | 'decision' | 'end' | 'note';

interface DrawElement {
  id: string;
  tool: DrawTool;
  points?: number[];
  x?: number; y?: number; w?: number; h?: number;
  color: string;
  size: number;
  text?: string;
}

interface FlowNode {
  id: string;
  type: FlowNodeType;
  x: number; y: number;
  w: number; h: number;
  label: string;
  color: string;
}

interface FlowEdge {
  id: string;
  from: string; to: string;
  label?: string;
}

export default function BrainstormPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ title: '', mode: 'BRAINSTORM', context: '' });
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard' | 'flow'>('chat');

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
  }, [searchParams]);

  // Chat state
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('GEMINI');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Whiteboard state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [drawColor, setDrawColor] = useState('#1a1a2e');
  const [drawSize, setDrawSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null);

  // Flow state
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null);
  const flowCanvasRef = useRef<HTMLDivElement>(null);

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

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => api.delete(`/teams/${teamId}/brainstorm/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-sessions', teamId] });
      setActiveSession(null);
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
    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
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
          for (let i = 2; i < el.points.length; i += 2) {
            ctx.lineTo(el.points[i], el.points[i + 1]);
          }
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
        if (el.x != null && el.y != null && el.w != null && el.h != null) {
          ctx.strokeRect(el.x, el.y, el.w, el.h);
        }
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
          ctx.moveTo(cx, el.y);
          ctx.lineTo(el.x + el.w, cy);
          ctx.lineTo(cx, el.y + el.h);
          ctx.lineTo(el.x, cy);
          ctx.closePath();
          ctx.stroke();
        }
      } else if (el.tool === 'text' && el.text) {
        ctx.font = `${el.size * 4}px Inter, sans-serif`;
        ctx.fillText(el.text, el.x || 0, el.y || 0);
      }
    }
  }, [elements, currentElement]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

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
  }, [activeTab, activeSession, redrawCanvas]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPoint(e);
    setIsDrawing(true);

    if (drawTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        setElements(prev => [...prev, { id: crypto.randomUUID(), tool: 'text', x, y, color: drawColor, size: drawSize, text }]);
      }
      setIsDrawing(false);
      return;
    }

    const newEl: DrawElement = {
      id: crypto.randomUUID(),
      tool: drawTool,
      color: drawColor,
      size: drawSize,
    };

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
      setCurrentElement({
        ...currentElement,
        w: x - (currentElement.x || 0),
        h: y - (currentElement.y || 0),
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (currentElement) {
      setElements(prev => [...prev, currentElement]);
      setCurrentElement(null);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    setElements([]);
    setCurrentElement(null);
  };

  const undoCanvas = () => {
    setElements(prev => prev.slice(0, -1));
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `brainstorm-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // ===== FLOW LOGIC =====
  const NODE_STYLES: Record<FlowNodeType, { color: string; icon: any; label: string }> = {
    start: { color: '#22c55e', icon: Circle, label: 'Start' },
    process: { color: '#3b82f6', icon: Square, label: 'Process' },
    decision: { color: '#f59e0b', icon: Diamond, label: 'Decision' },
    end: { color: '#ef4444', icon: Circle, label: 'End' },
    note: { color: '#8b5cf6', icon: FileText, label: 'Note' },
  };

  const addFlowNode = (type: FlowNodeType) => {
    const newNode: FlowNode = {
      id: crypto.randomUUID(),
      type,
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200,
      w: type === 'decision' ? 120 : type === 'note' ? 160 : 140,
      h: type === 'decision' ? 80 : type === 'note' ? 80 : 50,
      label: NODE_STYLES[type].label,
      color: NODE_STYLES[type].color,
    };
    setFlowNodes(prev => [...prev, newNode]);
    setEditingNode(newNode);
    setShowNodeDialog(true);
  };

  const handleFlowMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        setFlowEdges(prev => [...prev, {
          id: crypto.randomUUID(),
          from: connectingFrom,
          to: nodeId,
        }]);
      }
      setConnectingFrom(null);
      return;
    }
    setDraggingNode(nodeId);
    const node = flowNodes.find(n => n.id === nodeId);
    if (node) {
      setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
    }
    setSelectedNode(nodeId);
  };

  const handleFlowMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode) return;
    setFlowNodes(prev => prev.map(n =>
      n.id === draggingNode ? { ...n, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } : n
    ));
  };

  const handleFlowMouseUp = () => {
    setDraggingNode(null);
  };

  const deleteFlowNode = (nodeId: string) => {
    setFlowNodes(prev => prev.filter(n => n.id !== nodeId));
    setFlowEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    setSelectedNode(null);
  };

  const deleteFlowEdge = (edgeId: string) => {
    setFlowEdges(prev => prev.filter(e => e.id !== edgeId));
  };

  // ===== SESSION LIST VIEW =====
  if (!activeSession) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1a1a2e]">Brainstorm</h1>
            <p className="text-sm text-gray-400 mt-0.5">Collaborate, discuss, and visualize ideas</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#7b68ee]/25 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODES.map(({ value, label, icon: Icon, color, desc, gradient }) => (
            <div
              key={value}
              className={cn(
                'bg-gradient-to-br border border-gray-100 rounded-2xl p-5 text-center cursor-pointer',
                'hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200',
                gradient
              )}
              onClick={() => {
                setNewSession({ ...newSession, mode: value });
                setShowCreate(true);
              }}
            >
              <div className="h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-white shadow-sm" style={{ color }}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-sm text-[#1a1a2e]">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* Sessions list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {sessions?.data?.map((s: any) => {
              const mode = getModeInfo(s.mode);
              return (
                <div
                  key={s.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
                  onClick={() => setActiveSession(s.id)}
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${mode?.color || '#6b7280'}10` }}>
                    {mode && <mode.icon className="h-5 w-5" style={{ color: mode.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1a1a2e] truncate">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{s._count?.messages || 0} messages</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{new Date(s.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ color: mode?.color, backgroundColor: `${mode?.color || '#6b7280'}10` }}>
                    {s.mode}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {!sessions?.data?.length && (
              <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <Brain className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-400">No sessions yet</p>
                <p className="text-xs text-gray-300 mt-1">Create your first brainstorm session to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-white sm:max-w-[480px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[#1a1a2e]">New Brainstorm Session</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">Start a new collaboration session with AI</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              {/* Mode selector */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-gray-600">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODES.map(({ value, label, icon: Icon, color, desc }) => (
                    <button
                      key={value}
                      onClick={() => setNewSession({ ...newSession, mode: value })}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                        newSession.mode === value
                          ? 'border-[#7b68ee] bg-[#7b68ee]/5 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1a1a2e]">{label}</p>
                        <p className="text-[11px] text-gray-400">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-600">Title</label>
                <Input
                  placeholder="e.g. Product Strategy Session"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="border-gray-200 focus:border-[#7b68ee] rounded-xl h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-600">Context <span className="text-gray-400 font-normal">(optional)</span></label>
                <Textarea
                  placeholder="Provide project context for better AI responses..."
                  value={newSession.context}
                  onChange={(e) => setNewSession({ ...newSession, context: e.target.value })}
                  className="border-gray-200 focus:border-[#7b68ee] rounded-xl min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={() => createMutation.mutate(newSession)}
                disabled={!newSession.title || createMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Session
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== ACTIVE SESSION VIEW =====
  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => setActiveSession(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {session?.data && (() => {
            const mode = getModeInfo(session.data.mode);
            return (
              <>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: `${mode?.color || '#6b7280'}10` }}>
                  {mode && <mode.icon className="h-4 w-4" style={{ color: mode.color }} />}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm text-[#1a1a2e] truncate">{session.data.title}</h2>
                  <p className="text-[11px] text-gray-400">{session.data.mode} mode</p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1">
          {[
            { key: 'chat' as const, label: 'Chat', icon: MessageSquare },
            { key: 'whiteboard' as const, label: 'Draw', icon: Pencil },
            { key: 'flow' as const, label: 'Flow', icon: GitBranch },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-white text-[#7b68ee] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'chat' && (
          <div className="flex items-center gap-2">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-28 h-7 text-xs border-gray-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(modelsData?.data || {}).map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-44 h-7 text-xs border-gray-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(modelsData?.data?.[provider] || []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ===== CHAT TAB ===== */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {session?.data?.messages?.map((msg: any) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 max-w-[85%]',
                  msg.role === 'USER' ? 'ml-auto flex-row-reverse' : ''
                )}
              >
                <div className={cn(
                  'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-1',
                  msg.role === 'USER' ? 'bg-[#7b68ee]/15' : 'bg-gradient-to-br from-gray-100 to-gray-50'
                )}>
                  {msg.role === 'USER'
                    ? <Users className="h-3.5 w-3.5 text-[#7b68ee]" />
                    : <Brain className="h-3.5 w-3.5 text-gray-500" />
                  }
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3',
                    msg.role === 'USER'
                      ? 'bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white'
                      : 'bg-gray-50 text-[#1a1a2e] border border-gray-100'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-[10px]', msg.role === 'USER' ? 'text-white/60' : 'text-gray-400')}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                    {msg.model && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md', msg.role === 'USER' ? 'text-white/60 bg-white/10' : 'text-gray-400 bg-gray-100')}>
                        {msg.model}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {streaming && streamContent && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50 shrink-0 mt-1">
                  <Brain className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-gray-50 border border-gray-100">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-[#1a1a2e]">{streamContent}</p>
                  <Loader2 className="h-3 w-3 animate-spin mt-2 text-[#7b68ee]" />
                </div>
              </div>
            )}
            {!session?.data?.messages?.length && !streaming && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#7b68ee]/10 to-[#6c5ce7]/5 flex items-center justify-center mb-4">
                  <Brain className="h-8 w-8 text-[#7b68ee]" />
                </div>
                <h3 className="text-sm font-semibold text-[#1a1a2e] mb-1">Start the conversation</h3>
                <p className="text-xs text-gray-400 max-w-xs">Ask a question, share an idea, or start a discussion with AI</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <div className="flex-1 relative">
              <Textarea
                placeholder="Type your message... (Shift+Enter for new line)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="min-h-11 max-h-32 resize-none border-gray-200 focus:border-[#7b68ee] rounded-xl pr-12"
                rows={1}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!message.trim() || streaming}
              className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50 transition-all"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}

      {/* ===== WHITEBOARD TAB ===== */}
      {activeTab === 'whiteboard' && (
        <div className="flex-1 flex flex-col mt-3 overflow-hidden rounded-xl border border-gray-200">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
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
                  drawTool === t.tool
                    ? 'bg-[#7b68ee] text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                )}
              >
                <t.icon className="h-4 w-4" />
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            {/* Colors */}
            {DRAW_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setDrawColor(c)}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-all',
                  drawColor === c ? 'border-[#7b68ee] scale-110' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            {/* Size */}
            <Select value={String(drawSize)} onValueChange={v => setDrawSize(Number(v))}>
              <SelectTrigger className="w-16 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRAW_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}px</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <button onClick={undoCanvas} title="Undo" className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={clearCanvas} title="Clear" className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={exportCanvas} title="Export" className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
              <Download className="h-4 w-4" />
            </button>
          </div>
          {/* Canvas */}
          <div className="flex-1 relative bg-white cursor-crosshair">
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

      {/* ===== FLOW TAB ===== */}
      {activeTab === 'flow' && (
        <div className="flex-1 flex flex-col mt-3 overflow-hidden rounded-xl border border-gray-200">
          {/* Flow Toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
            {(Object.entries(NODE_STYLES) as [FlowNodeType, typeof NODE_STYLES['start']][]).map(([type, style]) => (
              <button
                key={type}
                onClick={() => addFlowNode(type)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <style.icon className="h-3.5 w-3.5" style={{ color: style.color }} />
                {style.label}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => setConnectingFrom(selectedNode)}
              disabled={!selectedNode}
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors',
                connectingFrom
                  ? 'bg-[#7b68ee] text-white'
                  : selectedNode
                    ? 'text-gray-600 hover:bg-gray-200'
                    : 'text-gray-300 cursor-not-allowed'
              )}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {connectingFrom ? 'Click target' : 'Connect'}
            </button>
            {connectingFrom && (
              <button
                onClick={() => setConnectingFrom(null)}
                className="h-8 px-3 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <div className="flex-1" />
            {selectedNode && (
              <>
                <button
                  onClick={() => {
                    const node = flowNodes.find(n => n.id === selectedNode);
                    if (node) { setEditingNode(node); setShowNodeDialog(true); }
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteFlowNode(selectedNode)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Flow Canvas */}
          <div
            ref={flowCanvasRef}
            className="flex-1 relative bg-white overflow-auto"
            onMouseMove={handleFlowMouseMove}
            onMouseUp={handleFlowMouseUp}
            onClick={() => { setSelectedNode(null); setConnectingFrom(null); }}
            style={{
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            {/* Edges SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '100%', minHeight: '100%' }}>
              {flowEdges.map(edge => {
                const fromNode = flowNodes.find(n => n.id === edge.from);
                const toNode = flowNodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const x1 = fromNode.x + fromNode.w / 2;
                const y1 = fromNode.y + fromNode.h;
                const x2 = toNode.x + toNode.w / 2;
                const y2 = toNode.y;
                const midY = (y1 + y2) / 2;
                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); deleteFlowEdge(edge.id); }}>
                    <path
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      stroke="#9ca3af"
                      strokeWidth={2}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                    />
                    <path
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      stroke="transparent"
                      strokeWidth={12}
                      fill="none"
                    />
                    {edge.label && (
                      <text x={(x1 + x2) / 2} y={midY - 6} textAnchor="middle" className="text-[10px] fill-gray-400">{edge.label}</text>
                    )}
                  </g>
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                </marker>
              </defs>
            </svg>

            {/* Nodes */}
            {flowNodes.map(node => {
              const style = NODE_STYLES[node.type];
              const isSelected = selectedNode === node.id;
              const isConnecting = connectingFrom === node.id;
              return (
                <div
                  key={node.id}
                  className={cn(
                    'absolute flex items-center justify-center text-center',
                    'border-2 shadow-sm cursor-move transition-shadow',
                    'hover:shadow-md',
                    isSelected && 'ring-2 ring-[#7b68ee]/30',
                    isConnecting && 'ring-2 ring-orange-400/50',
                    node.type === 'start' || node.type === 'end' ? 'rounded-full' : 'rounded-xl',
                  )}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    height: node.h,
                    borderColor: isSelected ? '#7b68ee' : `${style.color}80`,
                    backgroundColor: `${style.color}08`,
                  }}
                  onMouseDown={(e) => handleFlowMouseDown(node.id, e)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingNode(node);
                    setShowNodeDialog(true);
                  }}
                >
                  <div className="flex flex-col items-center gap-0.5 px-2">
                    <style.icon className="h-3.5 w-3.5" style={{ color: style.color }} />
                    <span className="text-[11px] font-medium text-[#1a1a2e] leading-tight truncate max-w-full">
                      {node.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {flowNodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <GitBranch className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-400">Create a flow diagram</p>
                <p className="text-xs text-gray-300 mt-1">Add nodes from the toolbar and connect them</p>
              </div>
            )}
          </div>

          {/* Node Edit Dialog */}
          <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
            <DialogContent className="bg-white sm:max-w-[400px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[#1a1a2e]">Edit Node</DialogTitle>
              </DialogHeader>
              {editingNode && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-gray-600">Label</label>
                    <Input
                      value={editingNode.label}
                      onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
                      className="border-gray-200 focus:border-[#7b68ee] rounded-xl"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-gray-600">Type</label>
                    <Select value={editingNode.type} onValueChange={(v: string) => setEditingNode({ ...editingNode, type: v as FlowNodeType, color: NODE_STYLES[v as FlowNodeType].color })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(NODE_STYLES) as [FlowNodeType, typeof NODE_STYLES['start']][]).map(([type, s]) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                              {s.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <button onClick={() => setShowNodeDialog(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => {
                    if (editingNode) {
                      setFlowNodes(prev => {
                        const exists = prev.find(n => n.id === editingNode.id);
                        if (exists) return prev.map(n => n.id === editingNode.id ? editingNode : n);
                        return [...prev, editingNode];
                      });
                    }
                    setShowNodeDialog(false);
                  }}
                  className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-xl hover:bg-[#6c5ce7]"
                >
                  Save
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
