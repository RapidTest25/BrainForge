'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, Swords, BarChart3,
  Sparkles, Loader2, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const MODES = [
  { value: 'BRAINSTORM', label: 'Brainstorm', icon: Brain, color: '#22c55e', desc: 'Generate ideas freely', gradient: 'from-green-500/10 to-emerald-500/5' },
  { value: 'DEBATE', label: 'Debate', icon: Swords, color: '#ef4444', desc: 'Challenge ideas critically', gradient: 'from-red-500/10 to-orange-500/5' },
  { value: 'ANALYSIS', label: 'Analysis', icon: BarChart3, color: '#3b82f6', desc: 'Analyze systematically', gradient: 'from-blue-500/10 to-cyan-500/5' },
  { value: 'FREEFORM', label: 'Freeform', icon: Sparkles, color: '#8b5cf6', desc: 'Open conversation', gradient: 'from-violet-500/10 to-purple-500/5' },
];

export default function BrainstormPage() {
  const router = useRouter();
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [creatingMode, setCreatingMode] = useState<string | null>(null);

  const { data: sessions } = useQuery({
    queryKey: ['brainstorm-sessions', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/brainstorm`),
    enabled: !!teamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/brainstorm`, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-sessions', teamId] });
      setCreatingMode(null);
      router.push(`/brainstorm/${res.data.id}`);
    },
    onError: () => {
      setCreatingMode(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => api.delete(`/teams/${teamId}/brainstorm/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-sessions', teamId] });
      toast.success('Session deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete session');
    },
  });

  const handleAutoCreate = (mode: string) => {
    if (createMutation.isPending) return;
    const modeLabel = MODES.find(m => m.value === mode)?.label || 'Session';
    setCreatingMode(mode);
    createMutation.mutate({
      title: `${modeLabel} Session`,
      mode,
    });
  };

  const getModeInfo = (mode: string) => MODES.find(m => m.value === mode);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a2e]">Brainstorm</h1>
          <p className="text-sm text-gray-400 mt-0.5">Collaborate, discuss, and visualize ideas</p>
        </div>
      </div>

      {/* Mode cards — click to auto-create session */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MODES.map(({ value, label, icon: Icon, color, desc, gradient }) => (
          <button
            key={value}
            disabled={createMutation.isPending}
            className={cn(
              'bg-gradient-to-br border border-gray-100 rounded-2xl p-5 text-center',
              'hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200',
              'disabled:opacity-60 disabled:cursor-wait',
              gradient,
            )}
            onClick={() => handleAutoCreate(value)}
          >
            <div className="h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-white shadow-sm relative" style={{ color }}>
              {creatingMode === value ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            <p className="font-semibold text-sm text-[#1a1a2e]">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
          </button>
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
                onClick={() => router.push(`/brainstorm/${s.id}`)}
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
              <p className="text-xs text-gray-300 mt-1">Click a mode above to start your first brainstorm session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
