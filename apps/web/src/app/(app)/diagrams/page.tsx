'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ArrowLeft, Sparkles, Save, Loader2, Search, Clock,
  GitBranch, Network, Workflow, Database, Cpu, Share2, MoreHorizontal, Trash2
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
import { toast } from 'sonner';

const DIAGRAM_TYPES = [
  { value: 'FLOWCHART', label: 'Flowchart', desc: 'Process flows & decisions', icon: Workflow, color: '#f59e0b' },
  { value: 'ERD', label: 'ERD', desc: 'Database relationships', icon: Database, color: '#3b82f6' },
  { value: 'MINDMAP', label: 'Mind Map', desc: 'Brainstorm & organize', icon: Network, color: '#22c55e' },
  { value: 'ARCHITECTURE', label: 'Architecture', desc: 'System design', icon: Cpu, color: '#8b5cf6' },
  { value: 'SEQUENCE', label: 'Sequence', desc: 'Interaction flows', icon: Share2, color: '#ef4444' },
  { value: 'COMPONENT', label: 'Component', desc: 'Module structure', icon: GitBranch, color: '#7b68ee' },
];

export default function DiagramsPage() {
  const { activeTeam } = useTeamStore();
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
    queryKey: ['diagrams', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/diagrams`),
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
    mutationFn: (data: any) => api.post(`/teams/${teamId}/diagrams`, data),
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

  const getType = (type: string) => DIAGRAM_TYPES.find(d => d.value === type);
  const diagramList = diagrams?.data || [];
  const filteredDiagrams = search
    ? diagramList.filter((d: any) => d.title.toLowerCase().includes(search.toLowerCase()))
    : diagramList;

  // Detail view
  if (activeDiagram && diagram?.data) {
    const nodes = (diagram.data.data as any)?.nodes || [];
    const edges = (diagram.data.data as any)?.edges || [];
    const dtype = getType(diagram.data.type);

    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveDiagram(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            {dtype && (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${dtype.color}12` }}>
                <dtype.icon className="h-4 w-4" style={{ color: dtype.color }} />
              </div>
            )}
            <div>
              <h2 className="font-semibold text-[#1a1a2e]">{diagram.data.title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: dtype?.color, backgroundColor: `${dtype?.color}12` }}>
                  {diagram.data.type}
                </span>
                <span className="text-[11px] text-gray-400">{nodes.length} nodes · {edges.length} edges</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { if (confirm('Delete this diagram?')) deleteMutation.mutate(diagram.data.id); }}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Canvas */}
        <div className="border border-gray-100 rounded-xl bg-white min-h-[65vh] p-6 relative overflow-auto">
          {/* Grid dots background */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />
          {nodes.length === 0 ? (
            <div className="relative flex items-center justify-center h-full min-h-[55vh]">
              <div className="text-center">
                <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gray-50">
                  <GitBranch className="h-6 w-6 text-gray-300" />
                </div>
                <h3 className="font-medium text-[#1a1a2e] mb-1">Empty Diagram</h3>
                <p className="text-sm text-gray-400 max-w-xs">Use AI Generate to automatically create nodes and connections for this diagram.</p>
              </div>
            </div>
          ) : (
            <div className="relative" style={{ minHeight: '500px' }}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '500px' }}>
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
                    <g key={edge.id}>
                      <path
                        d={`M ${sx} ${sy} Q ${mx} ${sy}, ${mx} ${my} Q ${mx} ${ty}, ${tx} ${ty}`}
                        stroke={dtype?.color || '#7b68ee'}
                        strokeWidth="2"
                        fill="none"
                        opacity="0.4"
                      />
                      <circle cx={tx} cy={ty} r="3" fill={dtype?.color || '#7b68ee'} opacity="0.5" />
                      {edge.label && (
                        <text x={mx} y={my - 8} fill="#9ca3af" fontSize="10" textAnchor="middle">{edge.label}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
              {nodes.map((node: any) => (
                <div
                  key={node.id}
                  className="absolute bg-white border-2 border-gray-100 rounded-xl p-3 shadow-sm min-w-36 hover:shadow-md hover:border-gray-200 transition-all group"
                  style={{
                    left: node.position?.x || 0,
                    top: node.position?.y || 0,
                  }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dtype?.color || '#7b68ee' }} />
                    <p className="text-sm font-medium text-[#1a1a2e]">{node.data?.label || node.id}</p>
                  </div>
                  {node.data?.description && (
                    <p className="text-[11px] text-gray-400 mt-1 max-w-48 leading-relaxed">{node.data.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1a2e]">Diagrams</h1>
          <p className="text-sm text-gray-400 mt-0.5">{diagramList.length} diagram{diagramList.length !== 1 ? 's' : ''}</p>
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search diagrams..."
          className="pl-9 border-gray-200 focus:border-[#7b68ee]"
        />
      </div>

      {/* Type quick-create cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {DIAGRAM_TYPES.map(({ value, label, desc, icon: Icon, color }) => (
          <div
            key={value}
            className="bg-white border border-gray-100 rounded-xl p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all group"
            onClick={() => {
              setNewDiagram({ ...newDiagram, type: value });
              setShowCreate(true);
            }}
          >
            <div className="h-9 w-9 rounded-xl mb-2.5 flex items-center justify-center transition-colors" style={{ backgroundColor: `${color}10` }}>
              <Icon className="h-4.5 w-4.5" style={{ color }} />
            </div>
            <p className="text-[13px] font-medium text-[#1a1a2e] mb-0.5">{label}</p>
            <p className="text-[10px] text-gray-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Diagram list */}
      {filteredDiagrams.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-1">All Diagrams</h3>
          {filteredDiagrams.map((d: any) => {
            const dtype = getType(d.type);
            const nodeCount = (d.data as any)?.nodes?.length || 0;
            return (
              <div
                key={d.id}
                className="bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all flex items-center gap-4"
                onClick={() => setActiveDiagram(d.id)}
              >
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${dtype?.color || '#6b7280'}10` }}>
                  {dtype && <dtype.icon className="h-5 w-5" style={{ color: dtype.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-[#1a1a2e] truncate">{d.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: dtype?.color, backgroundColor: `${dtype?.color}10` }}>
                      {d.type}
                    </span>
                    {nodeCount > 0 && (
                      <span className="text-[11px] text-gray-400">{nodeCount} nodes</span>
                    )}
                    {d.description && (
                      <span className="text-[11px] text-gray-400 truncate max-w-48">{d.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
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
          <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gray-50">
            <GitBranch className="h-6 w-6 text-gray-300" />
          </div>
          <h3 className="font-medium text-[#1a1a2e] mb-1">No Diagrams Yet</h3>
          <p className="text-sm text-gray-400 mb-4 max-w-sm mx-auto">Create a diagram manually or use AI to generate flowcharts, ERDs, mind maps and more.</p>
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
          <p className="text-sm text-gray-400">No diagrams matching &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a2e]">Create Diagram</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Pre-selected type badge */}
            {(() => {
              const selectedType = getType(newDiagram.type);
              return selectedType ? (
                <div className="flex items-center gap-2.5 px-3 py-2.5 border border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedType.color}12` }}>
                    <selectedType.icon className="h-4 w-4" style={{ color: selectedType.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a1a2e]">{selectedType.label}</p>
                    <p className="text-[11px] text-gray-400">{selectedType.desc}</p>
                  </div>
                </div>
              ) : null;
            })()}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Title</label>
              <Input value={newDiagram.title} onChange={(e) => setNewDiagram({ ...newDiagram, title: e.target.value })} placeholder="e.g. User Authentication Flow" className="border-gray-200 focus:border-[#7b68ee]" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <Textarea
                value={newDiagram.description}
                onChange={(e) => setNewDiagram({ ...newDiagram, description: e.target.value })}
                placeholder="What is this diagram about?"
                rows={2}
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
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
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a2e]">AI Generate Diagram</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Title</label>
              <Input value={aiForm.title} onChange={(e) => setAiForm({ ...aiForm, title: e.target.value })} placeholder="Diagram title" className="border-gray-200 focus:border-[#7b68ee]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Type</label>
              <Select value={aiForm.type} onValueChange={(v) => setAiForm({ ...aiForm, type: v })}>
                <SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIAGRAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Description</label>
              <Textarea
                value={aiForm.description}
                onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })}
                placeholder="Describe what you want the diagram to show..."
                rows={4}
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Provider</label>
                <Select value={aiForm.provider} onValueChange={(v) => setAiForm({ ...aiForm, provider: v })}>
                  <SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(modelsData?.data || {}).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Model</label>
                <Select value={aiForm.model} onValueChange={(v) => setAiForm({ ...aiForm, model: v })}>
                  <SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger>
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
            <button onClick={() => setShowAIGenerate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
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
