'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Loader2, CheckSquare, Brain, FileText,
  Wand2, Check, X, AlertCircle
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
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const GENERATE_OPTIONS = [
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: '#7b68ee', desc: 'Auto-create tasks with priorities' },
  { key: 'brainstorm', label: 'Brainstorm', icon: Brain, color: '#22c55e', desc: 'Start an AI brainstorm session' },
  { key: 'notes', label: 'Notes', icon: FileText, color: '#8b5cf6', desc: 'Generate notes & documentation' },
];

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIGenerateDialog({ open, onOpenChange }: AIGenerateDialogProps) {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['tasks']);
  const [provider, setProvider] = useState('GEMINI');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [result, setResult] = useState<any>(null);

  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api.get<{ data: Record<string, any[]> }>('/ai/models'),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/ai-generate`, data),
    onSuccess: (res: any) => {
      setResult(res.data);
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      queryClient.invalidateQueries({ queryKey: ['brainstorm-sessions', teamId] });
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
    },
  });

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = () => {
    if (!prompt.trim() || !selectedTypes.length) return;
    generateMutation.mutate({
      prompt,
      provider,
      model,
      generateTypes: selectedTypes,
    });
  };

  const handleClose = () => {
    setResult(null);
    setPrompt('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white sm:max-w-[540px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#1a1a2e] flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#7b68ee]/20 to-[#6c5ce7]/10 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-[#7b68ee]" />
            </div>
            AI Auto-Generate
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Describe your project and let AI create tasks, brainstorms, and notes for you
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-5 py-2">
              {/* What to generate */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-gray-600">What to generate</label>
                <div className="grid grid-cols-3 gap-2">
                  {GENERATE_OPTIONS.map(opt => {
                    const isSelected = selectedTypes.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleType(opt.key)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                          isSelected
                            ? 'border-[#7b68ee] bg-[#7b68ee]/5 shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <div className="relative">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${opt.color}12` }}>
                            <opt.icon className="h-5 w-5" style={{ color: opt.color }} />
                          </div>
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#7b68ee] flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-[#1a1a2e]">{opt.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-600">Describe your project or goal</label>
                <Textarea
                  placeholder="e.g. I'm building an e-commerce platform with user auth, product catalog, shopping cart, and checkout flow..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="border-gray-200 focus:border-[#7b68ee] rounded-xl min-h-[100px]"
                  autoFocus
                />
              </div>

              {/* AI Model selection */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[13px] font-semibold text-gray-600">Provider</label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(modelsData?.data || {}).map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[13px] font-semibold text-gray-600">Model</label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="rounded-xl h-10">
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
            </div>

            <DialogFooter className="gap-2">
              <button onClick={handleClose} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !selectedTypes.length || generateMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Generated successfully!</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {result.summary.tasks > 0 && `${result.summary.tasks} tasks`}
                    {result.summary.brainstorm > 0 && `${result.summary.tasks > 0 ? ', ' : ''}1 brainstorm session`}
                    {result.summary.notes > 0 && `${(result.summary.tasks > 0 || result.summary.brainstorm > 0) ? ', ' : ''}${result.summary.notes} notes`}
                    {' created'}
                  </p>
                </div>
              </div>

              {/* Tasks preview */}
              {result.created.tasks?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-[#7b68ee]" /> Tasks
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.created.tasks.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#7b68ee]" />
                        <span className="text-sm text-[#1a1a2e] flex-1 truncate">{t.title}</span>
                        <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">{t.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brainstorm preview */}
              {result.created.brainstorm && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-green-500" /> Brainstorm
                  </h4>
                  <div className="py-2 px-3 bg-green-50/50 rounded-lg border border-green-100">
                    <p className="text-sm font-medium text-[#1a1a2e]">{result.created.brainstorm.title}</p>
                  </div>
                </div>
              )}

              {/* Notes preview */}
              {result.created.notes?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-purple-500" /> Notes
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.created.notes.map((n: any) => (
                      <div key={n.id} className="py-1.5 px-3 bg-purple-50/50 rounded-lg border border-purple-100">
                        <p className="text-sm font-medium text-[#1a1a2e]">{n.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-[#7b68ee] text-white text-sm font-medium rounded-xl hover:bg-[#6c5ce7] transition-colors"
              >
                Done
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
