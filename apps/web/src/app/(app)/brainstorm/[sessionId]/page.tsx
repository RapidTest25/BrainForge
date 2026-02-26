'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Send, Swords, BarChart3,
  Sparkles, Loader2, ArrowLeft, Pencil, GitBranch, Trash2,
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
type FlowNodeType = 'start' | 'process' | 'decision' | 'end' | 'note';
type PortDir = 'n' | 'e' | 's' | 'w';

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
  fromPort: PortDir;
  toPort: PortDir;
  label?: string;
}

// ===== NODE STYLE CONFIG =====
const NODE_STYLES: Record<FlowNodeType, { color: string; label: string }> = {
  start: { color: '#22c55e', label: 'Start' },
  process: { color: '#3b82f6', label: 'Process' },
  decision: { color: '#f59e0b', label: 'Decision' },
  end: { color: '#ef4444', label: 'End' },
  note: { color: '#8b5cf6', label: 'Note' },
};

const NODE_DEFAULTS: Record<FlowNodeType, { w: number; h: number }> = {
  start: { w: 120, h: 56 },
  process: { w: 150, h: 60 },
  decision: { w: 140, h: 100 },
  end: { w: 120, h: 56 },
  note: { w: 160, h: 70 },
};

// ===== HELPERS =====
function getPortPos(node: FlowNode, port: PortDir) {
  switch (port) {
    case 'n': return { x: node.x + node.w / 2, y: node.y };
    case 'e': return { x: node.x + node.w, y: node.y + node.h / 2 };
    case 's': return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'w': return { x: node.x, y: node.y + node.h / 2 };
  }
}

function getPortOffset(w: number, h: number, port: PortDir) {
  switch (port) {
    case 'n': return { x: w / 2, y: 0 };
    case 'e': return { x: w, y: h / 2 };
    case 's': return { x: w / 2, y: h };
    case 'w': return { x: 0, y: h / 2 };
  }
}

function getEdgePath(from: { x: number; y: number }, fp: PortDir, to: { x: number; y: number }, tp: PortDir) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const off = Math.max(40, Math.min(80, dist * 0.4));
  const dirs: Record<PortDir, [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
  const [fdx, fdy] = dirs[fp];
  const [tdx, tdy] = dirs[tp];
  return `M ${from.x} ${from.y} C ${from.x + fdx * off} ${from.y + fdy * off}, ${to.x + tdx * off} ${to.y + tdy * off}, ${to.x} ${to.y}`;
}

// ===== SVG NODE SHAPES =====
function NodeShape({ type, w, h, color, selected }: { type: FlowNodeType; w: number; h: number; color: string; selected: boolean }) {
  const stroke = selected ? '#7b68ee' : `${color}cc`;
  const fill = `${color}12`;
  const sw = selected ? 2.5 : 2;

  switch (type) {
    case 'start':
    case 'end':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`}>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={h / 2 - 2} ry={h / 2 - 2}
            fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'process':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`}>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={10} ry={10}
            fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'decision':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`}>
          <polygon
            points={`${w / 2},3 ${w - 3},${h / 2} ${w / 2},${h - 3} 3,${h / 2}`}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
        </svg>
      );
    case 'note':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`}>
          <path
            d={`M 16 2 L ${w - 2} 2 L ${w - 2} ${h - 2} L 2 ${h - 2} L 2 16 Z`}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
          <path d={`M 2 16 L 16 16 L 16 2`} fill={`${color}25`} stroke={stroke} strokeWidth={1.5} />
        </svg>
      );
  }
}

// Toolbar icon for each node type
function NodeTypeIcon({ type, size = 14 }: { type: FlowNodeType; size?: number }) {
  const color = NODE_STYLES[type].color;
  switch (type) {
    case 'start':
      return <Circle className={`h-[${size}px] w-[${size}px]`} style={{ color, width: size, height: size }} fill={`${color}40`} />;
    case 'process':
      return <Square className={`h-[${size}px] w-[${size}px]`} style={{ color, width: size, height: size }} />;
    case 'decision':
      return <Diamond className={`h-[${size}px] w-[${size}px]`} style={{ color, width: size, height: size }} />;
    case 'end':
      return <Circle className={`h-[${size}px] w-[${size}px]`} style={{ color, width: size, height: size }} fill={`${color}40`} strokeWidth={2.5} />;
    case 'note':
      return <FileText className={`h-[${size}px] w-[${size}px]`} style={{ color, width: size, height: size }} />;
  }
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

  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard' | 'flow'>('chat');

  // Chat state
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

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

  // Flow state
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; port: PortDir } | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const flowCanvasRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    unsubs.push(socketOn('flow:node-add', (node: FlowNode) => {
      setFlowNodes(prev => [...prev, node]);
    }));
    unsubs.push(socketOn('flow:node-update', (node: FlowNode) => {
      setFlowNodes(prev => prev.map(n => n.id === node.id ? node : n));
    }));
    unsubs.push(socketOn('flow:node-delete', (nodeId: string) => {
      setFlowNodes(prev => prev.filter(n => n.id !== nodeId));
      setFlowEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    }));
    unsubs.push(socketOn('flow:edge-add', (edge: FlowEdge) => {
      setFlowEdges(prev => [...prev, edge]);
    }));
    unsubs.push(socketOn('flow:edge-delete', (edgeId: string) => {
      setFlowEdges(prev => prev.filter(e => e.id !== edgeId));
    }));
    return () => unsubs.forEach(fn => fn());
  }, [sessionId, socketOn]);

  // ===== QUERIES =====
  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['brainstorm-session', sessionId],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/brainstorm/${sessionId}`),
    enabled: !!sessionId && !!teamId,
  });

  // ===== LOAD SAVED DATA =====
  useEffect(() => {
    if (session?.data) {
      canvasLoadedRef.current = false;
      const wb = session.data.whiteboardData;
      const fl = session.data.flowData;
      if (wb && Array.isArray(wb)) {
        setElements(wb);
      } else {
        setElements([]);
      }
      if (fl && fl.nodes && fl.edges) {
        setFlowNodes(fl.nodes);
        // Migrate edges: add default ports if missing
        setFlowEdges((fl.edges as any[]).map((e: any) => ({
          ...e,
          fromPort: e.fromPort || 's',
          toPort: e.toPort || 'n',
        })));
      } else {
        setFlowNodes([]);
        setFlowEdges([]);
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
        flowData: { nodes: flowNodes, edges: flowEdges },
      }).catch(() => {});
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [elements, flowNodes, flowEdges, sessionId, teamId]);

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
      return api.post(`/teams/${teamId}/brainstorm/${sessionId}/messages`, data);
    },
    onSuccess: () => {
      refetchSession();
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      return api.patch(`/teams/${teamId}/brainstorm/messages/${messageId}`, { content });
    },
    onSuccess: () => {
      setEditingMessageId(null);
      setEditingContent('');
      refetchSession();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return api.delete(`/teams/${teamId}/brainstorm/messages/${messageId}`);
    },
    onSuccess: () => {
      refetchSession();
      toast.success('Message deleted');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.data?.messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ content: message });
    setMessage('');
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

  // ===== FLOW LOGIC =====
  const getFlowPoint = useCallback((e: React.MouseEvent) => {
    const rect = flowCanvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left + (flowCanvasRef.current?.scrollLeft || 0),
      y: e.clientY - rect.top + (flowCanvasRef.current?.scrollTop || 0),
    };
  }, []);

  const addFlowNode = (type: FlowNodeType) => {
    const { w, h } = NODE_DEFAULTS[type];
    const newNode: FlowNode = {
      id: crypto.randomUUID(),
      type,
      x: 80 + Math.random() * 300,
      y: 80 + Math.random() * 200,
      w, h,
      label: NODE_STYLES[type].label,
      color: NODE_STYLES[type].color,
    };
    setFlowNodes(prev => [...prev, newNode]);
    if (sessionId) socketEmit('flow:node-add', { sessionId, node: newNode });
  };

  const handlePortClick = (nodeId: string, port: PortDir, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (connectingFrom) {
      // Complete connection
      if (connectingFrom.nodeId !== nodeId) {
        const newEdge: FlowEdge = {
          id: crypto.randomUUID(),
          from: connectingFrom.nodeId,
          to: nodeId,
          fromPort: connectingFrom.port,
          toPort: port,
        };
        setFlowEdges(prev => [...prev, newEdge]);
        if (sessionId) socketEmit('flow:edge-add', { sessionId, edge: newEdge });
      }
      setConnectingFrom(null);
    } else {
      // Start connection
      setConnectingFrom({ nodeId, port });
    }
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const point = getFlowPoint(e);
    const node = flowNodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNode(nodeId);
      setDragOffset({ x: point.x - node.x, y: point.y - node.y });
    }
    setSelectedNode(nodeId);
  };

  const handleFlowMouseMove = (e: React.MouseEvent) => {
    const point = getFlowPoint(e);
    setMousePos(point);
    if (draggingNode) {
      setFlowNodes(prev => prev.map(n =>
        n.id === draggingNode ? { ...n, x: point.x - dragOffset.x, y: point.y - dragOffset.y } : n
      ));
    }
  };

  const handleFlowMouseUp = () => {
    if (draggingNode) {
      const node = flowNodes.find(n => n.id === draggingNode);
      if (node && sessionId) socketEmit('flow:node-update', { sessionId, node });
    }
    setDraggingNode(null);
  };

  const handleFlowCanvasClick = () => {
    setSelectedNode(null);
    setConnectingFrom(null);
  };

  const deleteFlowNode = (nodeId: string) => {
    setFlowNodes(prev => prev.filter(n => n.id !== nodeId));
    setFlowEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    setSelectedNode(null);
    if (sessionId) socketEmit('flow:node-delete', { sessionId, nodeId });
  };

  const deleteFlowEdge = (edgeId: string) => {
    setFlowEdges(prev => prev.filter(e => e.id !== edgeId));
    if (sessionId) socketEmit('flow:edge-delete', { sessionId, edgeId });
  };

  // Compute connecting line from source port to mouse
  const connectLine = useMemo(() => {
    if (!connectingFrom) return null;
    const fromNode = flowNodes.find(n => n.id === connectingFrom.nodeId);
    if (!fromNode) return null;
    const from = getPortPos(fromNode, connectingFrom.port);
    return { x1: from.x, y1: from.y, x2: mousePos.x, y2: mousePos.y };
  }, [connectingFrom, flowNodes, mousePos]);

  const modeInfo = session?.data ? getModeInfo(session.data.mode) : null;

  // ===== RENDER =====
  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => router.push('/brainstorm')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
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
                      className="h-7 text-sm font-semibold border-gray-200 focus:border-[#7b68ee] rounded-lg px-2 max-w-[200px]"
                      autoFocus
                    />
                    <button onClick={saveTitle} className="p-1 rounded hover:bg-green-50 text-green-600"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditingTitle(false)} className="p-1 rounded hover:bg-red-50 text-red-500"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <button
                    onClick={startEditTitle}
                    className="group flex items-center gap-1.5"
                  >
                    <h2 className="font-semibold text-sm text-[#1a1a2e] truncate">{session.data.title}</h2>
                    <Pencil className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">{session.data.mode} mode</p>
              </div>
            </>
          )}

          {/* Presence avatars */}
          {members.length > 0 && (
            <div className="flex items-center -space-x-1.5 ml-2">
              {members.slice(0, 5).map((m, i) => (
                <div
                  key={m.userId + i}
                  className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center text-[10px] font-bold text-white"
                  title={m.userName}
                >
                  {m.userName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              ))}
              {members.length > 5 && (
                <div className="h-7 w-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                  +{members.length - 5}
                </div>
              )}
            </div>
          )}
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
      </div>

      {/* ===== CHAT TAB ===== */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {session?.data?.messages?.map((msg: any) => {
              const isOwn = msg.userId === user?.id;
              const senderName = msg.user?.name || (msg.role === 'ASSISTANT' ? 'AI' : 'Unknown');
              const senderInitial = senderName.charAt(0).toUpperCase();
              const isEditing = editingMessageId === msg.id;

              return (
                <div key={msg.id} className={cn('flex gap-3 max-w-[85%]', isOwn ? 'ml-auto flex-row-reverse' : '')}>
                  <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 text-[10px] font-bold text-white', isOwn ? 'bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7]' : 'bg-gradient-to-br from-gray-400 to-gray-500')}>
                    {msg.user?.avatarUrl ? (
                      <img src={msg.user.avatarUrl} alt={senderName} className="h-7 w-7 rounded-full object-cover" />
                    ) : senderInitial}
                  </div>
                  <div className={cn('rounded-2xl px-4 py-3 group relative', isOwn ? 'bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white' : 'bg-gray-50 text-[#1a1a2e] border border-gray-100')}>
                    {/* Sender name */}
                    <p className={cn('text-[11px] font-semibold mb-1', isOwn ? 'text-white/80' : 'text-gray-500')}>
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
                          className="min-h-[60px] text-sm bg-white/20 border-white/30 text-inherit rounded-xl"
                          autoFocus
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => { setEditingMessageId(null); setEditingContent(''); }} className="px-2.5 py-1 text-[11px] rounded-lg hover:bg-white/20">Cancel</button>
                          <button
                            onClick={() => editMutation.mutate({ messageId: msg.id, content: editingContent })}
                            disabled={!editingContent.trim() || editMutation.isPending}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-white/20 hover:bg-white/30 font-medium disabled:opacity-50"
                          >
                            {editMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
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
                                      className="max-w-[280px] max-h-[200px] rounded-lg object-cover border border-white/20"
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
                                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs', isOwn ? 'bg-white/15' : 'bg-gray-100')}>
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
                                    className={cn('ml-auto h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-colors', isOwn ? 'hover:bg-white/20' : 'hover:bg-gray-200')}
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
                        <span className={cn('text-[10px]', isOwn ? 'text-white/60' : 'text-gray-400')}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                        {msg.isEdited && (
                          <span className={cn('text-[10px] italic', isOwn ? 'text-white/50' : 'text-gray-400')}>
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
                            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-400 hover:text-[#7b68ee] transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this message?')) deleteMutation.mutate(msg.id);
                            }}
                            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
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
                <h3 className="text-sm font-semibold text-[#1a1a2e] mb-1">Start the conversation</h3>
                <p className="text-xs text-gray-400 max-w-xs">Share ideas and discuss with your team</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-100">
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
              className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-[#7b68ee] disabled:opacity-50 transition-all"
              title="Upload file"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <div className="flex-1 relative">
              <Textarea
                placeholder="Type your message... (Shift+Enter for new line)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                className="min-h-11 max-h-32 resize-none border-gray-200 focus:border-[#7b68ee] rounded-xl pr-12"
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
        <div className="flex-1 flex flex-col mt-3 overflow-hidden rounded-xl border border-gray-200">
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
                  drawTool === t.tool ? 'bg-[#7b68ee] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                )}
              >
                <t.icon className="h-4 w-4" />
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            {DRAW_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setDrawColor(c)}
                className={cn('h-6 w-6 rounded-full border-2 transition-all', drawColor === c ? 'border-[#7b68ee] scale-110' : 'border-transparent hover:scale-105')}
                style={{ backgroundColor: c }}
              />
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <Select value={String(drawSize)} onValueChange={v => setDrawSize(Number(v))}>
              <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DRAW_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}px</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <button onClick={undoCanvas} title="Undo" className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={clearCanvas} title="Clear" className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
            <button onClick={exportCanvas} title="Export" className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"><Download className="h-4 w-4" /></button>
          </div>
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
            {(Object.keys(NODE_STYLES) as FlowNodeType[]).map(type => (
              <button
                key={type}
                onClick={() => addFlowNode(type)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <NodeTypeIcon type={type} size={14} />
                {NODE_STYLES[type].label}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            {connectingFrom && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[#7b68ee] animate-pulse">Click a target port...</span>
                <button
                  onClick={() => setConnectingFrom(null)}
                  className="h-7 px-2.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
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
            onClick={handleFlowCanvasClick}
            style={{
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              cursor: connectingFrom ? 'crosshair' : 'default',
            }}
          >
            {/* Edges SVG */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                </marker>
                <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#7b68ee" />
                </marker>
              </defs>

              {flowEdges.map(edge => {
                const fromNode = flowNodes.find(n => n.id === edge.from);
                const toNode = flowNodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const from = getPortPos(fromNode, edge.fromPort || 's');
                const to = getPortPos(toNode, edge.toPort || 'n');
                const d = getEdgePath(from, edge.fromPort || 's', to, edge.toPort || 'n');
                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer group/edge" onClick={(e) => { e.stopPropagation(); deleteFlowEdge(edge.id); }}>
                    <path d={d} stroke="transparent" strokeWidth={14} fill="none" />
                    <path d={d} stroke="#9ca3af" strokeWidth={2} fill="none" markerEnd="url(#arrowhead)"
                      className="group-hover/edge:stroke-red-400 transition-colors" />
                    {edge.label && (
                      <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6} textAnchor="middle" className="text-[10px] fill-gray-400">{edge.label}</text>
                    )}
                  </g>
                );
              })}

              {/* Connecting line that follows cursor */}
              {connectLine && (
                <line
                  x1={connectLine.x1} y1={connectLine.y1}
                  x2={connectLine.x2} y2={connectLine.y2}
                  stroke="#7b68ee" strokeWidth={2} strokeDasharray="6,3"
                  markerEnd="url(#arrowhead-active)"
                />
              )}
            </svg>

            {/* Nodes */}
            {flowNodes.map(node => {
              const isSelected = selectedNode === node.id;
              const isConnSource = connectingFrom?.nodeId === node.id;
              const ports: PortDir[] = ['n', 'e', 's', 'w'];

              return (
                <div
                  key={node.id}
                  className={cn(
                    'absolute group/node cursor-move',
                    isSelected && 'z-10',
                  )}
                  style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
                  onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingNode(node);
                    setShowNodeDialog(true);
                  }}
                >
                  {/* SVG Shape */}
                  <NodeShape type={node.type} w={node.w} h={node.h} color={node.color} selected={isSelected} />

                  {/* Label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-semibold text-[#1a1a2e] truncate px-3 max-w-full leading-tight text-center">
                      {node.label}
                    </span>
                  </div>

                  {/* Selection ring */}
                  {isSelected && (
                    <div className="absolute -inset-1 rounded-xl border-2 border-[#7b68ee]/30 pointer-events-none" />
                  )}

                  {/* Connection ports */}
                  {ports.map(port => {
                    const offset = getPortOffset(node.w, node.h, port);
                    const isActive = isConnSource && connectingFrom?.port === port;
                    return (
                      <div
                        key={port}
                        className={cn(
                          'absolute w-3.5 h-3.5 rounded-full border-2 z-20 transition-all duration-150',
                          'hover:scale-125 cursor-crosshair',
                          isActive
                            ? 'bg-[#7b68ee] border-[#7b68ee] scale-125'
                            : connectingFrom
                              ? 'bg-white border-[#7b68ee] opacity-100'
                              : 'bg-white border-blue-400 opacity-0 group-hover/node:opacity-100',
                        )}
                        style={{
                          left: offset.x - 7,
                          top: offset.y - 7,
                        }}
                        onMouseDown={(e) => handlePortClick(node.id, port, e)}
                      />
                    );
                  })}
                </div>
              );
            })}

            {flowNodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <GitBranch className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-400">Create a flow diagram</p>
                <p className="text-xs text-gray-300 mt-1">Click a shape in the toolbar to add nodes, then drag between ports to connect</p>
              </div>
            )}
          </div>

          {/* Node Edit Dialog */}
          <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
            <DialogContent className="bg-white sm:max-w-[400px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[#1a1a2e]">Edit Node</DialogTitle>
                <DialogDescription className="text-sm text-gray-400">Change the node label or type</DialogDescription>
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
                    <Select
                      value={editingNode.type}
                      onValueChange={(v: string) => {
                        const t = v as FlowNodeType;
                        setEditingNode({
                          ...editingNode,
                          type: t,
                          color: NODE_STYLES[t].color,
                          w: NODE_DEFAULTS[t].w,
                          h: NODE_DEFAULTS[t].h,
                        });
                      }}
                    >
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(NODE_STYLES) as FlowNodeType[]).map(type => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <NodeTypeIcon type={type} size={14} />
                              {NODE_STYLES[type].label}
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
                      if (sessionId) socketEmit('flow:node-update', { sessionId, node: editingNode });
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
