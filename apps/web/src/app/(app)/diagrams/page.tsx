'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ArrowLeft, Sparkles, Save, Loader2, Search, Clock,
  GitBranch, Network, Workflow, Database, Cpu, Share2, Trash2,
  PencilLine, X, GripVertical, Check, Link2, User, Key,
  AlertTriangle, Box, Layers
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

// ── Helpers ──

function parseERDColumns(description: string): Array<{ name: string; type: string; pk?: boolean; fk?: boolean }> {
  if (!description) return [];
  const lines = description.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  return lines.map(line => {
    const pk = /\bPK\b|primary\s*key/i.test(line);
    const fk = /\bFK\b|foreign\s*key/i.test(line);
    const clean = line.replace(/\(.*?\)/g, '').trim();
    const parts = clean.split(/[:\s]+/);
    const name = parts[0] || line;
    const type = parts.slice(1).join(' ') || 'text';
    return { name, type, pk, fk };
  });
}

function getMindMapLevel(nodeId: string, edges: any[], nodes: any[]): number {
  if (nodes.length === 0) return 0;
  const centerNodeId = nodes[0]?.id;
  if (nodeId === centerNodeId) return 0;
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [{ id: centerNodeId, level: 0 }];
  visited.add(centerNodeId);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.id === nodeId) return cur.level;
    const neighbors = edges
      .filter((e: any) => e.source === cur.id || e.target === cur.id)
      .map((e: any) => e.source === cur.id ? e.target : e.source)
      .filter(id => !visited.has(id));
    for (const nid of neighbors) {
      visited.add(nid);
      queue.push({ id: nid, level: cur.level + 1 });
    }
  }
  return 1;
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

// ── Type-Specific Node Renderers ──

function FlowchartNode({ node, color, isSelected, isEditing, editLabel, editDesc, onEditLabelChange, onEditDescChange, onSaveEdit, onCancelEdit, onStartEdit, onDelete, isLinkSource, linkingFrom }: any) {
  const label = node.data?.label || node.id;
  const description = node.data?.description || '';
  const isDecision = /\?$|decision|condition|if\b|check/i.test(label);
  const isTerminal = /^(start|end|begin|finish|stop)$/i.test(label);

  if (isEditing) return <InlineEditForm editLabel={editLabel} editDesc={editDesc} onEditLabelChange={onEditLabelChange} onEditDescChange={onEditDescChange} onSave={onSaveEdit} onCancel={onCancelEdit} />;

  return (
    <div className={`relative ${isDecision ? 'rotate-0' : ''}`}>
      <div
        className={`bg-card shadow-sm transition-all ${
          isTerminal ? 'rounded-full px-5 py-3 border-2' :
          isDecision ? 'rounded-2xl px-4 py-3 border-2 border-dashed' :
          'rounded-xl px-4 py-3 border-l-4 border border-border'
        }`}
        style={{
          borderLeftColor: !isTerminal && !isDecision ? color : undefined,
          borderColor: isLinkSource ? '#22c55e' : isSelected ? '#7b68ee' :
            isTerminal ? color : isDecision ? `${color}80` : undefined,
          minWidth: isTerminal ? '100px' : '140px',
          backgroundColor: isTerminal ? `${color}08` : isDecision ? `${color}05` : undefined,
        }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 shrink-0" />
          {isTerminal && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
          {isDecision && <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color }} />}
          {!isTerminal && !isDecision && <Workflow className="h-3 w-3 shrink-0" style={{ color: `${color}90` }} />}
          <span className={`text-sm font-medium text-foreground ${isTerminal ? 'text-center w-full' : ''}`}>{label}</span>
        </div>
        {description && !isTerminal && (
          <p className="text-[11px] text-muted-foreground mt-1.5 pl-5 leading-relaxed max-w-52">{description}</p>
        )}
      </div>
      <NodeActions show={isSelected && !linkingFrom} onEdit={onStartEdit} onDelete={onDelete} />
    </div>
  );
}

function ERDNode({ node, color, isSelected, isEditing, editLabel, editDesc, onEditLabelChange, onEditDescChange, onSaveEdit, onCancelEdit, onStartEdit, onDelete, isLinkSource, linkingFrom }: any) {
  const label = node.data?.label || node.id;
  const description = node.data?.description || '';
  const columns = parseERDColumns(description);

  if (isEditing) return <InlineEditForm editLabel={editLabel} editDesc={editDesc} onEditLabelChange={onEditLabelChange} onEditDescChange={onEditDescChange} onSave={onSaveEdit} onCancel={onCancelEdit} placeholder="id: UUID (PK)\nname: VARCHAR\nemail: VARCHAR" />;

  return (
    <div className="relative">
      <div
        className={`bg-card rounded-xl overflow-hidden shadow-sm border-2 transition-all min-w-48`}
        style={{
          borderColor: isLinkSource ? '#22c55e' : isSelected ? '#7b68ee' : `${color}40`,
        }}
      >
        {/* Table header */}
        <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: color }}>
          <Database className="h-3.5 w-3.5 text-white" />
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        {/* Columns */}
        {columns.length > 0 ? (
          <div className="divide-y divide-border">
            {columns.map((col, i) => (
              <div key={i} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                {col.pk ? <Key className="h-3 w-3 text-amber-500 shrink-0" /> :
                 col.fk ? <Link2 className="h-3 w-3 text-blue-500 shrink-0" /> :
                 <span className="w-3" />}
                <span className="font-medium text-foreground">{col.name}</span>
                <span className="text-muted-foreground ml-auto text-[10px] font-mono">{col.type}</span>
              </div>
            ))}
          </div>
        ) : description ? (
          <div className="px-3 py-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
          </div>
        ) : (
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-muted-foreground italic">Double-click to add columns</p>
          </div>
        )}
      </div>
      <NodeActions show={isSelected && !linkingFrom} onEdit={onStartEdit} onDelete={onDelete} />
    </div>
  );
}

function MindMapNode({ node, color, isSelected, isEditing, editLabel, editDesc, onEditLabelChange, onEditDescChange, onSaveEdit, onCancelEdit, onStartEdit, onDelete, isLinkSource, linkingFrom, level }: any) {
  const label = node.data?.label || node.id;
  const isCenter = level === 0;
  const branchColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const nodeColor = isCenter ? color : branchColors[Math.abs(label.charCodeAt(0)) % branchColors.length];

  if (isEditing) return <InlineEditForm editLabel={editLabel} editDesc={editDesc} onEditLabelChange={onEditLabelChange} onEditDescChange={onEditDescChange} onSave={onSaveEdit} onCancel={onCancelEdit} />;

  return (
    <div className="relative">
      <div
        className={`shadow-sm transition-all ${isCenter ? 'rounded-2xl px-6 py-4 border-2' : level === 1 ? 'rounded-xl px-4 py-2.5 border-2' : 'rounded-lg px-3 py-2 border'}`}
        style={{
          backgroundColor: isCenter ? `${nodeColor}15` : `${nodeColor}08`,
          borderColor: isLinkSource ? '#22c55e' : isSelected ? '#7b68ee' : `${nodeColor}50`,
          minWidth: isCenter ? '160px' : level === 1 ? '120px' : '90px',
        }}
      >
        <div className="flex items-center gap-2">
          {isCenter && <Network className="h-4 w-4 shrink-0" style={{ color: nodeColor }} />}
          {!isCenter && <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: nodeColor }} />}
          <span className={`font-medium ${isCenter ? 'text-base' : level === 1 ? 'text-sm' : 'text-xs'}`} style={{ color: isCenter ? nodeColor : undefined }}>
            {label}
          </span>
        </div>
        {node.data?.description && isCenter && (
          <p className="text-[11px] text-muted-foreground mt-1 text-center">{node.data.description}</p>
        )}
      </div>
      <NodeActions show={isSelected && !linkingFrom} onEdit={onStartEdit} onDelete={onDelete} />
    </div>
  );
}

function ArchitectureNode({ node, color, isSelected, isEditing, editLabel, editDesc, onEditLabelChange, onEditDescChange, onSaveEdit, onCancelEdit, onStartEdit, onDelete, isLinkSource, linkingFrom }: any) {
  const label = node.data?.label || node.id;
  const description = node.data?.description || '';
  const isLayer = /layer|tier|zone|group|boundary/i.test(label);

  if (isEditing) return <InlineEditForm editLabel={editLabel} editDesc={editDesc} onEditLabelChange={onEditLabelChange} onEditDescChange={onEditDescChange} onSave={onSaveEdit} onCancel={onCancelEdit} />;

  return (
    <div className="relative">
      <div
        className={`shadow-sm transition-all min-w-44 ${isLayer ? 'rounded-2xl border-2 border-dashed p-5' : 'rounded-xl border-2 p-4'}`}
        style={{
          borderColor: isLinkSource ? '#22c55e' : isSelected ? '#7b68ee' : `${color}50`,
          backgroundColor: isLayer ? `${color}05` : 'var(--color-card)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          {isLayer ? <Layers className="h-4 w-4 shrink-0" style={{ color }} /> : <Cpu className="h-3.5 w-3.5 shrink-0" style={{ color }} />}
          <span className={`font-semibold text-foreground ${isLayer ? 'text-sm uppercase tracking-wider' : 'text-sm'}`}>{label}</span>
        </div>
        {description && (
          <div className={`mt-2 ${isLayer ? '' : 'px-2 py-1.5 bg-muted/50 rounded-lg'}`}>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
          </div>
        )}
      </div>
      <NodeActions show={isSelected && !linkingFrom} onEdit={onStartEdit} onDelete={onDelete} />
    </div>
  );
}

function SequenceNode({ node, color, isSelected, isEditing, editLabel, editDesc, onEditLabelChange, onEditDescChange, onSaveEdit, onCancelEdit, onStartEdit, onDelete, isLinkSource, linkingFrom }: any) {
  const label = node.data?.label || node.id;

  if (isEditing) return <InlineEditForm editLabel={editLabel} editDesc={editDesc} onEditLabelChange={onEditLabelChange} onEditDescChange={onEditDescChange} onSave={onSaveEdit} onCancel={onCancelEdit} />;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="bg-card rounded-xl border-2 shadow-sm px-4 py-3 transition-all min-w-32 text-center"
        style={{
          borderColor: isLinkSource ? '#22c55e' : isSelected ? '#7b68ee' : color,
        }}
      >
        <div className="h-8 w-8 rounded-full mx-auto mb-1.5 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <User className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {node.data?.description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{node.data.description}</p>
        )}
      </div>
      {/* Lifeline */}
      <div className="w-px border-l-2 border-dashed" style={{ borderColor: `${color}30`, height: '300px' }} />
      <NodeActions show={isSelected && !linkingFrom} onEdit={onStartEdit} onDelete={onDelete} top={-8} />
    </div>
  );
}

function ComponentNode({ node, color, isSelected, isEditing, editLabel, editDesc, onEditLabelChange, onEditDescChange, onSaveEdit, onCancelEdit, onStartEdit, onDelete, isLinkSource, linkingFrom }: any) {
  const label = node.data?.label || node.id;
  const description = node.data?.description || '';

  if (isEditing) return <InlineEditForm editLabel={editLabel} editDesc={editDesc} onEditLabelChange={onEditLabelChange} onEditDescChange={onEditDescChange} onSave={onSaveEdit} onCancel={onCancelEdit} />;

  return (
    <div className="relative">
      <div
        className="bg-card rounded-xl border-2 shadow-sm transition-all min-w-44 overflow-hidden"
        style={{
          borderColor: isLinkSource ? '#22c55e' : isSelected ? '#7b68ee' : `${color}50`,
        }}
      >
        {/* Component tab */}
        <div className="flex px-3 pt-0">
          <div className="h-2.5 w-8 rounded-b-md" style={{ backgroundColor: color }} />
          <div className="h-2.5 w-6 rounded-b-md ml-1" style={{ backgroundColor: `${color}60` }} />
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Box className="h-3.5 w-3.5 shrink-0" style={{ color }} />
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {/* Interface port */}
      <div className="absolute -right-2 top-1/2 -translate-y-1/2">
        <div className="h-4 w-4 rounded-full border-2 bg-card" style={{ borderColor: color }} />
      </div>
      <div className="absolute -left-2 top-1/2 -translate-y-1/2">
        <div className="h-4 w-4 rounded-full border-2 bg-card flex items-center justify-center" style={{ borderColor: `${color}60` }}>
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
      <NodeActions show={isSelected && !linkingFrom} onEdit={onStartEdit} onDelete={onDelete} />
    </div>
  );
}

// ── Shared Sub-Components ──

function NodeActions({ show, onEdit, onDelete, top }: { show: boolean; onEdit: () => void; onDelete: () => void; top?: number }) {
  if (!show) return null;
  return (
    <div className="absolute -right-2 flex gap-1" style={{ top: top ?? -8 }}>
      <button className="h-5 w-5 bg-[#7b68ee] rounded-full flex items-center justify-center shadow-sm hover:bg-[#6c5ce7] transition-colors" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit">
        <PencilLine className="h-2.5 w-2.5 text-white" />
      </button>
      <button className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
        <X className="h-2.5 w-2.5 text-white" />
      </button>
    </div>
  );
}

function InlineEditForm({ editLabel, editDesc, onEditLabelChange, onEditDescChange, onSave, onCancel, placeholder }: any) {
  return (
    <div className="space-y-2 min-w-48 bg-card border-2 border-[#7b68ee] rounded-xl p-3 shadow-md" onClick={(e: any) => e.stopPropagation()}>
      <input
        value={editLabel}
        onChange={(e: any) => onEditLabelChange(e.target.value)}
        onKeyDown={(e: any) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
        className="w-full text-sm font-medium border border-border rounded-lg px-2 py-1.5 outline-none focus:border-[#7b68ee] bg-muted"
        autoFocus placeholder="Label"
      />
      <textarea
        value={editDesc}
        onChange={(e: any) => onEditDescChange(e.target.value)}
        onKeyDown={(e: any) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(); } if (e.key === 'Escape') onCancel(); }}
        className="w-full text-[11px] border border-border rounded-lg px-2 py-1.5 outline-none focus:border-[#7b68ee] bg-muted resize-none"
        rows={3} placeholder={placeholder || 'Description (optional)'}
      />
      <div className="flex gap-1 justify-end">
        <button onClick={onCancel} className="px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent rounded-md">Cancel</button>
        <button onClick={onSave} className="px-2 py-1 text-[11px] bg-[#7b68ee] text-white rounded-md hover:bg-[#6c5ce7]">Save</button>
      </div>
    </div>
  );
}

// ── Type-Specific Edge Renderers ──

function renderEdgeSVG(edge: any, source: any, target: any, color: string, diagramType: string, onDelete: (id: string) => void, edgeIndex?: number, allNodes?: any[], allEdges?: any[]) {
  const sx = (source.position?.x || 0) + 70;
  const sy = (source.position?.y || 0) + 25;
  const tx = (target.position?.x || 0) + 70;
  const ty = (target.position?.y || 0) + 25;
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  let pathD = '';
  let strokeDash = '';
  let strokeWidth = 2;
  let opacity = 0.5;
  let showArrow = true;

  switch (diagramType) {
    case 'FLOWCHART':
      pathD = `M ${sx} ${sy} Q ${mx} ${sy}, ${mx} ${my} Q ${mx} ${ty}, ${tx} ${ty}`;
      opacity = 0.6;
      break;
    case 'ERD':
      pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
      strokeWidth = 2.5;
      opacity = 0.5;
      showArrow = false;
      break;
    case 'MINDMAP':
      const cpx1 = sx + (tx - sx) * 0.4;
      const cpy1 = sy;
      const cpx2 = sx + (tx - sx) * 0.6;
      const cpy2 = ty;
      pathD = `M ${sx} ${sy} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${tx} ${ty}`;
      strokeWidth = level0Edge(edge, source, allNodes || [], allEdges || []) ? 3 : 2;
      opacity = 0.35;
      showArrow = false;
      break;
    case 'ARCHITECTURE':
      pathD = `M ${sx} ${sy} Q ${mx} ${sy}, ${mx} ${my} Q ${mx} ${ty}, ${tx} ${ty}`;
      strokeDash = '6 3';
      opacity = 0.4;
      break;
    case 'SEQUENCE':
      // Each message gets an incrementally lower Y based on its index
      const seqBaseY = Math.max(sy, ty) + 60;
      const seqOffsetY = seqBaseY + (edgeIndex || 0) * 40;
      pathD = `M ${sx} ${seqOffsetY} L ${tx} ${seqOffsetY}`;
      opacity = 0.7;
      strokeWidth = 1.5;
      break;
    case 'COMPONENT':
      pathD = `M ${sx} ${sy} Q ${mx} ${sy}, ${mx} ${my} Q ${mx} ${ty}, ${tx} ${ty}`;
      strokeDash = '4 2';
      opacity = 0.45;
      break;
    default:
      pathD = `M ${sx} ${sy} Q ${mx} ${sy}, ${mx} ${my} Q ${mx} ${ty}, ${tx} ${ty}`;
  }

  const labelX = diagramType === 'SEQUENCE' ? mx : mx;
  const labelY = diagramType === 'SEQUENCE' ? (Math.max(sy, ty) + 60 + (edgeIndex || 0) * 40) - 8 : my - 8;

  return (
    <g key={edge.id} className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
      <path d={pathD} stroke="transparent" strokeWidth="14" fill="none" />
      <path
        d={pathD}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        strokeDasharray={strokeDash}
        markerEnd={showArrow ? `url(#arrow-${diagramType})` : undefined}
      />
      {diagramType === 'ERD' && (
        <>
          <circle cx={sx} cy={sy} r="4" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
          <circle cx={tx} cy={ty} r="4" fill={color} opacity="0.5" />
        </>
      )}
      {edge.label && (
        <text x={labelX} y={labelY} fill="currentColor" className="text-muted-foreground" fontSize="10" textAnchor="middle" fontWeight="500">
          {edge.label}
        </text>
      )}
      <text
        x={labelX + (edge.label ? edge.label.length * 3 + 12 : 0)}
        y={labelY}
        fill="#ef4444"
        fontSize="14"
        textAnchor="middle"
        className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete(edge.id); }}
      >
        ×
      </text>
    </g>
  );
}

function level0Edge(edge: any, source: any, nodes: any[], edges: any[]) {
  if (!nodes.length) return false;
  const centerNodeId = nodes[0]?.id;
  return edge.source === centerNodeId || edge.target === centerNodeId;
}

// ── Interactive Diagram Editor ──

function DiagramEditor({ diagram, dtype, nodes: initNodes, edges: initEdges, onBack, onDelete, onSave }: {
  diagram: any; dtype: any; nodes: any[]; edges: any[]; onBack: () => void; onDelete: () => void; onSave: (nodes: any[], edges: any[]) => void;
}) {
  const [nodes, setNodes] = useState<any[]>(initNodes);
  const [edges, setEdges] = useState<any[]>(initEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [addingNode, setAddingNode] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const hasDraggedRef = useRef(false);

  useEffect(() => { setNodes(initNodes); setEdges(initEdges); setHasChanges(false); }, [initNodes, initEdges]);
  useEffect(() => { if (addingNode && addInputRef.current) addInputRef.current.focus(); }, [addingNode]);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (linkingFrom) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
    const rect = canvasRef.current?.getBoundingClientRect();
    setDragOffset({ x: e.clientX - (node.position?.x || 0) - (rect?.left || 0), y: e.clientY - (node.position?.y || 0) - (rect?.top || 0) });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode || !canvasRef.current) return;
    hasDraggedRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const y = Math.max(0, e.clientY - rect.top - dragOffset.y);
    setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, position: { x, y } } : n));
    setHasChanges(true);
  };

  const handleMouseUp = () => {
    if (draggingNode) {
      // Set a small timeout to prevent the click event from firing right after drag
      setTimeout(() => { hasDraggedRef.current = false; }, 50);
    }
    setDraggingNode(null);
  };

  const addNode = () => {
    if (!newLabel.trim()) return;
    const id = `node-${Date.now()}`;
    const maxX = Math.max(0, ...nodes.map(n => (n.position?.x || 0)));
    const maxY = Math.max(0, ...nodes.map(n => (n.position?.y || 0)));
    // Type-specific default positioning
    let pos = { x: 50, y: 50 };
    if (diagram.type === 'SEQUENCE') {
      pos = { x: nodes.length * 200 + 50, y: 30 };
    } else if (diagram.type === 'MINDMAP' && nodes.length === 0) {
      pos = { x: 350, y: 250 };
    } else if (nodes.length > 0) {
      // Place new nodes in a grid layout to avoid overlap
      const cols = diagram.type === 'ERD' ? 3 : 4;
      const spacingX = diagram.type === 'ERD' ? 300 : 220;
      const spacingY = diagram.type === 'ERD' ? 280 : 150;
      const col = nodes.length % cols;
      const row = Math.floor(nodes.length / cols);
      pos = { x: col * spacingX + 50, y: row * spacingY + 50 };
    }

    setNodes(prev => [...prev, { id, type: 'default', position: pos, data: { label: newLabel, description: newDesc } }]);
    setNewLabel(''); setNewDesc(''); setAddingNode(false); setHasChanges(true);
  };

  const startEdit = (node: any) => {
    setEditingNodeId(node.id);
    setEditLabel(node.data?.label || '');
    setEditDesc(node.data?.description || '');
    setSelectedNode(node.id);
  };

  const saveEdit = () => {
    if (!editingNodeId) return;
    setNodes(prev => prev.map(n => n.id === editingNodeId ? { ...n, data: { ...n.data, label: editLabel, description: editDesc } } : n));
    setEditingNodeId(null); setHasChanges(true);
  };
  const cancelEdit = () => setEditingNodeId(null);

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (linkingFrom && linkingFrom !== '__waiting__') {
      if (linkingFrom !== nodeId) {
        const exists = edges.some(ed => ed.source === linkingFrom && ed.target === nodeId);
        if (!exists) {
          setEdges(prev => [...prev, { id: `e-${linkingFrom}-${nodeId}`, source: linkingFrom, target: nodeId, label: '' }]);
          setHasChanges(true);
          toast.success('Edge connected! Click on edge label to rename.');
        }
      }
      setLinkingFrom(null);
    } else if (linkingFrom === '__waiting__') {
      setLinkingFrom(nodeId);
    } else {
      setSelectedNode(nodeId);
    }
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null); setEditingNodeId(null); setHasChanges(true);
  };

  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    setHasChanges(true);
  };

  const color = dtype?.color || '#7b68ee';
  const diagramType = diagram.type || 'FLOWCHART';

  const nodeAddLabel = diagramType === 'ERD' ? 'Table' :
    diagramType === 'MINDMAP' ? (nodes.length === 0 ? 'Central Topic' : 'Branch') :
    diagramType === 'SEQUENCE' ? 'Actor' :
    diagramType === 'COMPONENT' ? 'Component' :
    diagramType === 'ARCHITECTURE' ? 'Service' : 'Node';

  const renderNode = (node: any) => {
    const isEditing = editingNodeId === node.id;
    const isLinkSource = linkingFrom === node.id;
    const isSelected = selectedNode === node.id;
    const commonProps = {
      node, color, isSelected, isEditing, editLabel, editDesc,
      onEditLabelChange: setEditLabel, onEditDescChange: setEditDesc,
      onSaveEdit: saveEdit, onCancelEdit: cancelEdit,
      onStartEdit: () => startEdit(node), onDelete: () => deleteNode(node.id),
      isLinkSource, linkingFrom,
    };

    switch (diagramType) {
      case 'FLOWCHART': return <FlowchartNode {...commonProps} />;
      case 'ERD': return <ERDNode {...commonProps} />;
      case 'MINDMAP': return <MindMapNode {...commonProps} level={getMindMapLevel(node.id, edges, nodes)} />;
      case 'ARCHITECTURE': return <ArchitectureNode {...commonProps} />;
      case 'SEQUENCE': return <SequenceNode {...commonProps} />;
      case 'COMPONENT': return <ComponentNode {...commonProps} />;
      default: return <FlowchartNode {...commonProps} />;
    }
  };

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
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}12` }}>{diagram.type}</span>
              <span className="text-[11px] text-muted-foreground">{nodes.length} nodes · {edges.length} edges</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button onClick={() => onSave(nodes, edges)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors">
              <Save className="h-3.5 w-3.5" /> Save
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-2 bg-muted rounded-xl border border-border">
        <button
          onClick={() => { setAddingNode(true); setLinkingFrom(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${addingNode ? 'bg-[#7b68ee] text-white' : 'border border-border text-muted-foreground hover:bg-card'}`}
        >
          <Plus className="h-3.5 w-3.5" /> {nodeAddLabel}
        </button>
        <button
          onClick={() => { setLinkingFrom(linkingFrom ? null : '__waiting__'); setAddingNode(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${linkingFrom ? 'bg-emerald-500 text-white' : 'border border-border text-muted-foreground hover:bg-card'}`}
        >
          <Link2 className="h-3.5 w-3.5" /> {linkingFrom ? 'Click source...' : 'Connect'}
        </button>
        <div className="h-5 w-px bg-border mx-1" />
        {linkingFrom && <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg animate-pulse">Click source node, then target node</span>}
        {!linkingFrom && <span className="text-xs text-muted-foreground">Click to select · Double-click to edit</span>}
      </div>

      {/* Add Node Bar */}
      {addingNode && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-card border border-[#7b68ee]/30 rounded-xl shadow-sm">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <input
            ref={addInputRef}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNode(); if (e.key === 'Escape') setAddingNode(false); }}
            placeholder={`${nodeAddLabel} name...`}
            className="flex-1 text-sm border-0 outline-none bg-transparent placeholder:text-muted-foreground/60"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNode(); if (e.key === 'Escape') setAddingNode(false); }}
            placeholder={diagramType === 'ERD' ? 'id: UUID (PK)' : 'Description (optional)'}
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

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`border rounded-xl bg-card min-h-[65vh] p-6 relative overflow-auto ${linkingFrom ? 'cursor-crosshair border-emerald-200' : 'border-border'}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => { if (!hasDraggedRef.current) { setSelectedNode(null); setEditingNodeId(null); } }}
      >
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: diagramType === 'MINDMAP'
            ? 'radial-gradient(circle, var(--color-border) 0.5px, transparent 0.5px)'
            : 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: diagramType === 'MINDMAP' ? '32px 32px' : '24px 24px',
        }} />
        {nodes.length === 0 && !addingNode ? (
          <div className="relative flex items-center justify-center h-full min-h-[55vh]">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
                {dtype ? <dtype.icon className="h-6 w-6" style={{ color }} /> : <GitBranch className="h-6 w-6 text-muted-foreground/60" />}
              </div>
              <h3 className="font-medium text-foreground mb-1">Empty {dtype?.label || 'Diagram'}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-3">Click &quot;+ {nodeAddLabel}&quot; to add your first {nodeAddLabel.toLowerCase()}.</p>
              <button onClick={() => setAddingNode(true)} className="flex items-center gap-1.5 px-4 py-2 text-white text-sm rounded-lg hover:opacity-90 transition-colors mx-auto" style={{ backgroundColor: color }}>
                <Plus className="h-3.5 w-3.5" /> Add {nodeAddLabel}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative" style={{ minHeight: '500px' }}>
            <svg className="absolute inset-0 w-full h-full" style={{ minHeight: '500px', zIndex: 1 }}>
              {edges.map((edge: any, edgeIdx: number) => {
                const source = nodes.find((n: any) => n.id === edge.source);
                const target = nodes.find((n: any) => n.id === edge.target);
                if (!source || !target) return null;
                return renderEdgeSVG(edge, source, target, color, diagramType, deleteEdge, edgeIdx, nodes, edges);
              })}
              <defs>
                {['FLOWCHART', 'ARCHITECTURE', 'SEQUENCE', 'COMPONENT'].map(t => (
                  <marker key={t} id={`arrow-${t}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={color} opacity={t === 'SEQUENCE' ? '0.7' : '0.45'} />
                  </marker>
                ))}
              </defs>
            </svg>
            {nodes.map((node: any) => (
              <div
                key={node.id}
                className="absolute group select-none"
                style={{
                  left: node.position?.x || 0,
                  top: node.position?.y || 0,
                  zIndex: draggingNode === node.id ? 100 : editingNodeId === node.id ? 50 : 10,
                  cursor: linkingFrom ? 'pointer' : draggingNode === node.id ? 'grabbing' : 'grab',
                }}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={(e) => handleNodeClick(e, node.id)}
                onDoubleClick={(e) => { e.stopPropagation(); if (!linkingFrom) startEdit(node); }}
              >
                {renderNode(node)}
              </div>
            ))}
          </div>
        )}
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
    mutationFn: (data: any) => api.post(`/teams/${teamId}/diagrams/ai-generate`, { ...data, prompt: data.description }),
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
    const rawNodes = (diagram.data.data as any)?.nodes || [];
    const rawEdges = (diagram.data.data as any)?.edges || [];
    const dtype = getType(diagram.data.type);

    return (
      <>
        <DiagramEditor
          diagram={diagram.data}
          dtype={dtype}
          nodes={rawNodes}
          edges={rawEdges}
          onBack={() => setActiveDiagram(null)}
          onDelete={() => setDeleteConfirm({ id: diagram.data.id, title: diagram.data.title })}
          onSave={(nodes: any[], edges: any[]) => updateMutation.mutate({ id: diagram.data.id, data: { nodes, edges } })}
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

      {/* Type cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {DIAGRAM_TYPES.map(({ value, label, desc, icon: Icon, color }) => (
          <div key={value} className="bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:shadow-sm hover:border-border transition-all group"
            onClick={() => { setNewDiagram({ ...newDiagram, type: value }); setShowCreate(true); }}>
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
