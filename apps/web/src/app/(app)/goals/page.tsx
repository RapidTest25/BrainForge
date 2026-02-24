'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target, Plus, CheckCircle2, Circle, Clock, TrendingUp,
  MoreHorizontal, Trash2, Edit2, ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';

type Goal = {
  id: string;
  title: string;
  description?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progress: number;
  dueDate?: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  NOT_STARTED: { label: 'Not Started', color: '#6b7280', bg: '#f3f4f6' },
  IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
  COMPLETED: { label: 'Completed', color: '#22c55e', bg: '#f0fdf4' },
};

export default function GoalsPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', dueDate: '' });
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const { data: goalsRes } = useQuery({
    queryKey: ['goals', teamId],
    queryFn: () => api.get<{ data: Goal[] }>(`/teams/${teamId}/goals`),
    enabled: !!teamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/goals`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', teamId] });
      setShowCreate(false);
      setNewGoal({ title: '', description: '', dueDate: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/teams/${teamId}/goals/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals', teamId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', teamId] });
      setSelectedGoal(null);
    },
  });

  const goals = goalsRes?.data || [];
  const completedCount = goals.filter((g) => g.status === 'COMPLETED').length;
  const inProgressCount = goals.filter((g) => g.status === 'IN_PROGRESS').length;

  const stats = [
    { label: 'Total Goals', value: goals.length, color: '#7b68ee' },
    { label: 'In Progress', value: inProgressCount, color: '#3b82f6' },
    { label: 'Completed', value: completedCount, color: '#22c55e' },
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1a2e]">Goals</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your team objectives and key results.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Goal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}12` }}
              >
                <Target className="h-3.5 w-3.5" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-[#1a1a2e]">{stat.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Goals list */}
      <div className="space-y-2">
        {goals.map((goal) => {
          const statusStyle = STATUS_STYLES[goal.status] || STATUS_STYLES.NOT_STARTED;
          return (
            <div
              key={goal.id}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer"
              onClick={() => setSelectedGoal(goal)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    className="mt-0.5 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextStatus = goal.status === 'COMPLETED' ? 'NOT_STARTED'
                        : goal.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
                      updateMutation.mutate({
                        id: goal.id,
                        status: nextStatus,
                        progress: nextStatus === 'COMPLETED' ? 100 : nextStatus === 'IN_PROGRESS' ? 50 : 0,
                      });
                    }}
                  >
                    {goal.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : goal.status === 'IN_PROGRESS' ? (
                      <Clock className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-medium ${goal.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-[#1a1a2e]'}`}>
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-[13px] text-gray-400 mt-0.5 line-clamp-1">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ color: statusStyle.color, backgroundColor: statusStyle.bg }}
                      >
                        {statusStyle.label}
                      </span>
                      {goal.dueDate && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(goal.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Progress bar */}
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${goal.progress || 0}%`,
                        backgroundColor: goal.progress >= 100 ? '#22c55e' : '#7b68ee',
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 w-8 text-right">{goal.progress || 0}%</span>
                  <button
                    className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this goal?')) deleteMutation.mutate(goal.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="text-center py-16">
            <Target className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-[#1a1a2e] mb-1">No Goals Yet</h3>
            <p className="text-sm text-gray-400 mb-4">Set goals to track your team&apos;s progress and achievements.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors mx-auto"
            >
              <Plus className="h-3.5 w-3.5" /> Create Your First Goal
            </button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a2e]">New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Title</label>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g., Launch v2.0"
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Description (optional)</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Describe the goal..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7b68ee] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-600">Due Date (optional)</label>
              <Input
                type="date"
                value={newGoal.dueDate}
                onChange={(e) => setNewGoal({ ...newGoal, dueDate: e.target.value })}
                className="border-gray-200 focus:border-[#7b68ee]"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate(newGoal)}
              disabled={!newGoal.title}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              Create Goal
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
