'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ArrowLeft, Sparkles, Save, Loader2, Search, Clock,
  GitBranch, Network, Workflow, Database, Cpu, Share2, MoreHorizontal, Trash2,
  Move, MousePointer, PencilLine, X, GripVertical, Check, Link2
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
import { toast } from 'sonner';

const DIAGRAM_TYPES = [
  { value: 'FLOWCHART', label: 'Flowchart', desc: 'Process flows & decisions', icon: Workflow, color: '#f59e0b' },
  { value: 'ERD', label: 'ERD', desc: 'Database relationships', icon: Database, color: '#3b82f6' },
  { value: 'MINDMAP', label: 'Mind Map', desc: 'Brainstorm & organize', icon: Network, color: '#22c55e' },
  { value: 'ARCHITECTURE', label: 'Architecture', desc: 'System design', icon: Cpu, color: '#8b5cf6' },
  { value: 'SEQUENCE', label: 'Sequence', desc: 'Interaction flows', icon: Share2, color: '#ef4444' },
  { value: 'COMPONENT', label: 'Component', desc: 'Module structure', icon: GitBranch, color: '#7b68ee' },
];

// ── Interactive Diagram Editor Component (Inline Editing — No Modals) ──
function DiagramEditor({ diagram, dtype, nodes: initNodes, edges: initEdges, onBack, onDelete, onSave }: {
  diagram: any;
  dtype: any;
  nodes: any[];
  edges: any[];
  onBack: () => void;
  onDelete: () => void;
  onSave: (nodes: any[], edges: any[]) => void;
}) {
  const [nodes, setNodes] = useState<any[]>(initNodes);
  const [edges, setEdges] = useState<any[]>(initEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Inline editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Inline add-node bar
  const [addingNode, setAddingNode] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  // Edge-linking mode
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [edgeLabel, setEdgeLabel] = useState('');
  const [showEdgeLabelInput, setShowEdgeLabelInput] = useState<{ source: string; target: string } | null>(null);

  useEffect(() => { setNodes(initNodes); setEdges(initEdges); setHasChanges(false); }, [initNodes, initEdges]);
  useEffect(() => { if (addingNode && addInputRef.current) addInputRef.current.focus(); }, [addingNode]);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (linkingFrom) return; // don't drag in link mode
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
    const rect = canvasRef.current?.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - (node.position?.x || 0) - (rect?.left || 0),
      y: e.clientY - (node.position?.y || 0) - (rect?.top || 0),
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const y = Math.max(0, e.clientY - rect.top - dragOffset.y);
    setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, position: { x, y } } : n));
    setHasChanges(true);
  };

  const handleMouseUp = () => { setDraggingNode(null); };

  // Add node inline
  const addNode = () => {
    if (!newLabel.trim()) return;
    const id = `node-${Date.now()}`;
    const maxX = Math.max(0, ...nodes.map(n => (n.position?.x || 0)));
    const maxY = Math.max(0, ...nodes.map(n => (n.position?.y || 0)));
    setNodes(prev => [...prev, {
      id,
      type: 'default',
      position: { x: maxX + 200, y: nodes.length % 2 === 0 ? 50 : maxY + 100 },
      data: { label: newLabel, description: newDesc },
    }]);
    setNewLabel('');
    setNewDesc('');
    setAddingNode(false);
    setHasChanges(true);
  };

  // Start inline edit on double-click
  const startEdit = (node: any) => {
    setEditingNodeId(node.id);
    setEditLabel(node.data?.label || '');
    setEditDesc(node.data?.description || '');
    setSelectedNode(node.id);
  };

  const saveEdit = () => {
    if (!editingNodeId) return;
    setNodes(prev => prev.map(n => n.id === editingNodeId ? {
      ...n,
      data: { ...n.data, label: editLabel, description: editDesc },
    } : n));
    setEditingNodeId(null);
    setHasChanges(true);
  };

  const cancelEdit = () => { setEditingNodeId(null); };

  // Edge linking
  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (linkingFrom) {
      if (linkingFrom !== nodeId) {
        // Show edge label input before adding
        setShowEdgeLabelInput({ source: linkingFrom, target: nodeId });
        setEdgeLabel('');
      }
      setLinkingFrom(null);
    } else {
      setSelectedNode(nodeId);
    }
  };

  const confirmAddEdge = () => {
    if (!showEdgeLabelInput) return;
    const { source, target } = showEdgeLabelInput;
    // Prevent duplicate edges
    const exists = edges.some(e => e.source === source && e.target === target);
    if (!exists) {
      setEdges(prev => [...prev, {
        id: `e-${source}-${target}`,
        source,
        target,
        label: edgeLabel || '',
      }]);
      setHasChanges(true);
    }
    setShowEdgeLabelInput(null);
    setEdgeLabel('');
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setEditingNodeId(null);
    setHasChanges(true);
  };

  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    setHasChanges(true);
  };

  const color = dtype?.color || '#7b68ee';

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {dtype && (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
              <dtype.icon className="h-4 w-4" style={{ color }} />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-foreground">{diagram.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}12` }}>
                {diagram.type}
              </span>
              <span className="text-[11px] text-muted-foreground">{nodes.length} nodes · {edges.length} edges</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={() => onSave(nodes, edges)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inline Toolbar */}
      <div className="flex items-center gap-2 px-2 py-2 bg-muted rounded-xl border border-border">
        <button
          onClick={() => { setAddingNode(true); setLinkingFrom(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${addingNode ? 'bg-[#7b68ee] text-white' : 'border border-border text-muted-foreground hover:bg-card'}`}
        >
          <Plus className="h-3.5 w-3.5" /> Node
        </button>
        <button
          onClick={() => { setLinkingFrom(linkingFrom ? null : '__waiting__'); setAddingNode(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${linkingFrom ? 'bg-emerald-500 text-white' : 'border border-border text-muted-foreground hover:bg-card'}`}
        >
          <Link2 className="h-3.5 w-3.5" /> {linkingFrom ? 'Click source node...' : 'Connect'}
        </button>
        <div className="h-5 w-px bg-border mx-1" />
        {linkingFrom && (
          <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg animate-pulse">
            Click a source node, then a target node to connect
          </span>
        )}
        {selectedNode && !linkingFrom && (
          <span className="text-xs text-muted-foreground">
            Double-click node to edit · Click to select
          </span>
        )}
        {!selectedNode && !linkingFrom && (
          <span className="text-xs text-muted-foreground">Click node to select · Double-click to edit</span>
        )}
      </div>

      {/* Inline Add Node Bar */}
      {addingNode && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-card border border-[#7b68ee]/30 rounded-xl shadow-sm">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <input
            ref={addInputRef}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNode(); if (e.key === 'Escape') setAddingNode(false); }}
            placeholder="Node label..."
            className="flex-1 text-sm border-0 outline-none bg-transparent placeholder:text-muted-foreground/60"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNode(); if (e.key === 'Escape') setAddingNode(false); }}
            placeholder="Description (optional)"
            className="flex-1 text-sm border-0 outline-none bg-transparent placeholder:text-muted-foreground/60 border-l border-border pl-2"
          />
          <button onClick={addNode} disabled={!newLabel.trim()} className="h-7 w-7 rounded-lg bg-[#7b68ee] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#6c5ce7] transition-colors">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setAddingNode(false)} className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent flex items-center justify-center transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Inline Edge Label Input */}
      {showEdgeLabelInput && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-card border border-emerald-300 rounded-xl shadow-sm">
          <Link2 className="h-4 w-4 text-emerald-500" />
          <span className="text-xs text-muted-foreground">
            {nodes.find(n => n.id === showEdgeLabelInput.source)?.data?.label} → {nodes.find(n => n.id === showEdgeLabelInput.target)?.data?.label}
          </span>
          <input
            value={edgeLabel}
            onChange={(e) => setEdgeLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmAddEdge(); if (e.key === 'Escape') setShowEdgeLabelInput(null); }}
            placeholder="Edge label (optional, Enter to confirm)"
            className="flex-1 text-sm border-0 outline-none bg-transparent placeholder:text-muted-foreground/60"
            autoFocus
          />
          <button onClick={confirmAddEdge} className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setShowEdgeLabelInput(null)} className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent flex items-center justify-center transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`border rounded-xl bg-card min-h-[65vh] p-6 relative overflow-auto ${linkingFrom ? 'cursor-crosshair border-emerald-200' : 'border-border'}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => { setSelectedNode(null); setEditingNodeId(null); }}
      >
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        {nodes.length === 0 && !addingNode ? (
          <div className="relative flex items-center justify-center h-full min-h-[55vh]">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-muted">
                <GitBranch className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Empty Diagram</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-3">Click &quot;+ Node&quot; in the toolbar above to add your first node.</p>
              <button onClick={() => setAddingNode(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors mx-auto">
                <Plus className="h-3.5 w-3.5" /> Add First Node
              </button>
            </div>
          </div>
        ) : (
          <div className="relative" style={{ minHeight: '500px' }}>
            <svg className="absolute inset-0 w-full h-full" style={{ minHeight: '500px', zIndex: 1 }}>
              {edges.map((edge: any) => {
                const source = nodes.find((n: any) => n.id === edge.source);
                const target = nodes.find((n: any) => n.id === edge.target);
                if (!source || !target) return null;
                const sx = (source.position?.x || 0) + 70;
                const sy = (source.position?.y || 0) + 25;
                const tx = (target.position?.x || 0) + 70;
                const ty = (target.position?.y || 0) + 25;
                const mx = (sx + tx) / 2;
                const my = (sy + ty) / 2;
                return (
                  <g key={edge.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); }}>
                    <path
                      d={`M ${sx} ${sy} Q ${mx} ${sy}, ${mx} ${my} Q ${mx} ${ty}, ${tx} ${ty}`}
                      stroke="transparent"
                      strokeWidth="12"
                      fill="none"
                    />
                    <path
                      d={`M ${sx} ${sy} Q ${mx} ${sy}, ${mx} ${my} Q ${mx} ${ty}, ${tx} ${ty}`}
                      stroke={color}
                      strokeWidth="2"
                      fill="none"
                      opacity="0.4"
                      markerEnd="url(#arrowhead)"
                    />
                    <circle cx={tx} cy={ty} r="3" fill={color} opacity="0.5" />
                    {edge.label && (
                      <text x={mx} y={my - 8} fill="currentColor" className="text-muted-foreground" fontSize="10" textAnchor="middle">{edge.label}</text>
                    )}
                    <text
                      x={mx + 15}
                      y={my - 8}
                      fill="#ef4444"
                      fontSize="14"
                      textAnchor="middle"
                      className="cursor-pointer opacity-0 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); deleteEdge(edge.id); }}
                    >
                      ×
                    </text>
                  </g>
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={color} opacity="0.4" />
                </marker>
              </defs>
            </svg>
            {nodes.map((node: any) => {
              const isEditing = editingNodeId === node.id;
              const isLinkSource = linkingFrom === node.id;
              return (
                <div
                  key={node.id}
                  className={`absolute bg-card border-2 rounded-xl p-3 shadow-sm min-w-36 transition-all group select-none ${
                    isLinkSource ? 'border-emerald-400 shadow-md ring-2 ring-emerald-200' :
                    selectedNode === node.id ? 'border-[#7b68ee] shadow-md ring-2 ring-[#7b68ee]/20' :
                    linkingFrom ? 'border-border hover:border-emerald-300 hover:shadow-md cursor-pointer' :
                    'border-border hover:shadow-md hover:border-border'
                  }`}
                  style={{
                    left: node.position?.x || 0,
                    top: node.position?.y || 0,
                    zIndex: draggingNode === node.id ? 100 : isEditing ? 50 : 10,
                    cursor: linkingFrom ? 'pointer' : draggingNode === node.id ? 'grabbing' : 'grab',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (linkingFrom === '__waiting__') {
                      // First click: set source
                      setLinkingFrom(node.id);
                    } else if (linkingFrom) {
                      handleNodeClick(e, node.id);
                    } else {
                      setSelectedNode(node.id);
                    }
                  }}
                  onDoubleClick={(e) => { e.stopPropagation(); if (!linkingFrom) startEdit(node); }}
                >
                  {isEditing ? (
                    /* Inline edit form */
                    <div className="space-y-2 min-w-48" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        className="w-full text-sm font-medium border border-border rounded-lg px-2 py-1.5 outline-none focus:border-[#7b68ee] bg-muted"
                        autoFocus
                        placeholder="Label"
                      />
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') cancelEdit(); }}
                        className="w-full text-[11px] border border-border rounded-lg px-2 py-1.5 outline-none focus:border-[#7b68ee] bg-muted resize-none"
                        rows={2}
                        placeholder="Description (optional)"
                      />
                      <div className="flex gap-1 justify-end">
                        <button onClick={cancelEdit} className="px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent rounded-md">Cancel</button>
                        <button onClick={saveEdit} className="px-2 py-1 text-[11px] bg-[#7b68ee] text-white rounded-md hover:bg-[#6c5ce7]">Save</button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <div className="flex items-center gap-2 mb-0.5">
                        <GripVertical className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <p className="text-sm font-medium text-foreground">{node.data?.label || node.id}</p>
                      </div>
                      {node.data?.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-48 leading-relaxed pl-5">{node.data.description}</p>
                      )}
                      {selectedNode === node.id && !linkingFrom && (
                        <div className="absolute -top-2 -right-2 flex gap-1">
                          <button
                            className="h-5 w-5 bg-[#7b68ee] rounded-full flex items-center justify-center shadow-sm hover:bg-[#6c5ce7]"
                            onClick={(e) => { e.stopPropagation(); startEdit(node); }}
                            title="Edit"
                          >
                            <PencilLine className="h-2.5 w-2.5 text-white" />
                          </button>
                          <button
                            className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-red-600"
                            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                            title="Delete"
                          >
                            <X className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiagramsPage() {
  const { activeTeam } = useTeamStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [activeDiagram, setActiveDiagram] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
  }, [searchParams]);
  const [newDiagram, setNewDiagram] = useState({ title: '', type: 'FLOWCHART', description: '' });
  const [aiForm, setAiForm] = useState({ title: '', type: 'FLOWCHART', description: '', provider: 'GEMINI', model: 'gemini-2.5-flash' });
  const [search, setSearch] = useState('');

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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/diagrams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      setActiveDiagram(null);
      toast.success('Diagram deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete diagram');
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/diagrams/ai-generate`, {
      ...data,
      prompt: data.description,
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      setActiveDiagram(res.data.id);
      setShowAIGenerate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/teams/${teamId}/diagrams/${id}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram', activeDiagram] });
      queryClient.invalidateQueries({ queryKey: ['diagrams', teamId] });
      toast.success('Diagram saved');
    },
    onError: () => {
      toast.error('Failed to save diagram');
    },
  });

  const getType = (type: string) => DIAGRAM_TYPES.find(d => d.value === type);
  const diagramList = diagrams?.data || [];
  const filteredDiagrams = search
    ? diagramList.filter((d: any) => d.title.toLowerCase().includes(search.toLowerCase()))
    : diagramList;

  // Detail view — Interactive Editor
  if (activeDiagram && diagram?.data) {
    const rawNodes = (diagram.data.data as any)?.nodes || [];
    const rawEdges = (diagram.data.data as any)?.edges || [];
    const dtype = getType(diagram.data.type);

    return (
      <DiagramEditor
        diagram={diagram.data}
        dtype={dtype}
        nodes={rawNodes}
        edges={rawEdges}
        onBack={() => setActiveDiagram(null)}
        onDelete={() => { if (confirm('Delete this diagram?')) deleteMutation.mutate(diagram.data.id); }}
        onSave={(nodes: any[], edges: any[]) => {
          updateMutation.mutate({ id: diagram.data.id, data: { nodes, edges } });
        }}
      />
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
          <button
            onClick={() => setShowAIGenerate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#7b68ee]/20 text-[#7b68ee] text-sm rounded-lg hover:bg-[#7b68ee]/5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Generate
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Diagram
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search diagrams..."
          className="pl-9 border-border focus:border-[#7b68ee]"
        />
      </div>

      {/* Type quick-create cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {DIAGRAM_TYPES.map(({ value, label, desc, icon: Icon, color }) => (
          <div
            key={value}
            className="bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:shadow-sm hover:border-border transition-all group"
            onClick={() => {
              setNewDiagram({ ...newDiagram, type: value });
              setShowCreate(true);
            }}
          >
            <div className="h-9 w-9 rounded-xl mb-2.5 flex items-center justify-center transition-colors" style={{ backgroundColor: `${color}10` }}>
              <Icon className="h-4.5 w-4.5" style={{ color }} />
            </div>
            <p className="text-[13px] font-medium text-foreground mb-0.5">{label}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
          </div>
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
              <div
                key={d.id}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-sm hover:border-border transition-all flex items-center gap-4"
                onClick={() => setActiveDiagram(d.id)}
              >
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${dtype?.color || '#6b7280'}10` }}>
                  {dtype && <dtype.icon className="h-5 w-5" style={{ color: dtype.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{d.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: dtype?.color, backgroundColor: `${dtype?.color}10` }}>
                      {d.type}
                    </span>
                    {nodeCount > 0 && (
                      <span className="text-[11px] text-muted-foreground">{nodeCount} nodes</span>
                    )}
                    {d.description && (
                      <span className="text-[11px] text-muted-foreground truncate max-w-48">{d.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    className="p-1 rounded text-muted-foreground/60 hover:text-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this diagram?')) deleteMutation.mutate(d.id);
                    }}
                  >
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
            <button
              onClick={() => setShowAIGenerate(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#7b68ee]/20 text-[#7b68ee] text-sm rounded-lg hover:bg-[#7b68ee]/5 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> AI Generate
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Create Diagram
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No diagrams matching &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Diagram</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Pre-selected type badge */}
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
              <Textarea
                value={newDiagram.description}
                onChange={(e) => setNewDiagram({ ...newDiagram, description: e.target.value })}
                placeholder="What is this diagram about?"
                rows={2}
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={() => createMutation.mutate(newDiagram)}
              disabled={!newDiagram.title || createMutation.isPending}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
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
              <Textarea
                value={aiForm.description}
                onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })}
                placeholder="Describe what you want the diagram to show..."
                rows={4}
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Provider</label>
                <Select value={aiForm.provider} onValueChange={(v) => setAiForm({ ...aiForm, provider: v })}>
                  <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(modelsData?.data || {}).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Model</label>
                <Select value={aiForm.model} onValueChange={(v) => setAiForm({ ...aiForm, model: v })}>
                  <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(modelsData?.data?.[aiForm.provider] || []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowAIGenerate(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={() => aiGenerateMutation.mutate(aiForm)}
              disabled={!aiForm.title || !aiForm.description || aiGenerateMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              {aiGenerateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
