'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CheckCircle2, AlertCircle, MessageSquare, CheckSquare,
  GitBranch, Zap, Users, Clock, Check, Trash2, BellOff,
} from 'lucide-react';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
};

const ICON_MAP: Record<string, { icon: any; color: string }> = {
  task: { icon: CheckSquare, color: '#7b68ee' },
  brainstorm: { icon: MessageSquare, color: '#22c55e' },
  diagram: { icon: GitBranch, color: '#f59e0b' },
  sprint: { icon: Zap, color: '#ef4444' },
  team: { icon: Users, color: '#3b82f6' },
  system: { icon: Bell, color: '#6b7280' },
};

export default function NotificationsPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications', teamId],
    queryFn: () => api.get<{ data: Notification[] }>(`/teams/${teamId}/notifications`),
    enabled: !!teamId,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/teams/${teamId}/notifications/${id}`, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', teamId] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch(`/teams/${teamId}/notifications/mark-all-read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', teamId] }),
  });

  const notifications = notificationsRes?.data || [];
  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#7b68ee] hover:bg-[#7b68ee]/5 rounded-lg transition-colors"
          >
            <Check className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted p-0.5 rounded-lg w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
              filter === f
                ? 'bg-card text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {f}{f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-1">
        {filteredNotifications.map((n) => {
          const iconInfo = ICON_MAP[n.type] || ICON_MAP.system;
          const Icon = iconInfo.icon;
          return (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer group ${
                n.read ? 'bg-card hover:bg-accent' : 'bg-[#7b68ee]/3 hover:bg-[#7b68ee]/6'
              }`}
              onClick={() => {
                if (!n.read) markReadMutation.mutate(n.id);
                if (n.link) router.push(n.link);
              }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${iconInfo.color}12` }}
              >
                <Icon className="h-4 w-4" style={{ color: iconInfo.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${n.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                    {n.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0">{getTimeAgo(n.createdAt)}</span>
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
              </div>
              {!n.read && (
                <div className="h-2 w-2 rounded-full bg-[#7b68ee] shrink-0 mt-2" />
              )}
            </div>
          );
        })}

        {filteredNotifications.length === 0 && (
          <div className="text-center py-16">
            <BellOff className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="font-medium text-foreground mb-1">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'unread'
                ? 'You\'re all caught up!'
                : 'Notifications will appear here when there\'s activity in your workspace.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
