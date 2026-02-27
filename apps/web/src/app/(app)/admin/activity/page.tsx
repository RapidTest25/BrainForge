'use client';

import { useState, useEffect } from 'react';
import {
  Activity, UserPlus, CheckSquare, MessageSquare, Loader2,
  RefreshCw, Clock, Bot, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface RecentActivity {
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
  recentTasks: { id: string; title: string; status: string; createdAt: string; creator: { name: string } }[];
  recentSessions: { id: string; title: string; mode: string; createdAt: string; creator: { name: string } }[];
}

type EventType = 'all' | 'user' | 'task' | 'session';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const iconMap = {
  user: { icon: UserPlus, bg: 'bg-blue-50 dark:bg-blue-500/10', color: 'text-blue-500', label: 'User' },
  task: { icon: CheckSquare, bg: 'bg-amber-50 dark:bg-amber-500/10', color: 'text-amber-500', label: 'Task' },
  session: { icon: MessageSquare, bg: 'bg-emerald-50 dark:bg-emerald-500/10', color: 'text-emerald-500', label: 'Brainstorm' },
};

export default function AdminActivityPage() {
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType>('all');
  const [limit, setLimit] = useState(30);

  useEffect(() => { fetchActivity(); }, [limit]);

  async function fetchActivity() {
    setLoading(true);
    try {
      const res: any = await api.get(`/admin/activity?limit=${limit}`);
      setActivity(res.data);
    } catch {} finally {
      setLoading(false);
    }
  }

  // Combine into a unified timeline
  const events: { id: string; type: 'user' | 'task' | 'session'; title: string; subtitle: string; detail?: string; date: string }[] = [];

  activity?.recentUsers.forEach(u => {
    events.push({ id: `u-${u.id}`, type: 'user', title: u.name, subtitle: 'joined the platform', detail: u.email, date: u.createdAt });
  });
  activity?.recentTasks.forEach(t => {
    events.push({ id: `t-${t.id}`, type: 'task', title: t.creator.name, subtitle: `created task "${t.title}"`, detail: t.status, date: t.createdAt });
  });
  activity?.recentSessions.forEach(s => {
    events.push({ id: `s-${s.id}`, type: 'session', title: s.creator.name, subtitle: `started ${s.mode.toLowerCase()} brainstorm "${s.title}"`, date: s.createdAt });
  });

  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

  // Group by date
  const grouped = new Map<string, typeof events>();
  filtered.forEach(e => {
    const dateKey = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const group = grouped.get(dateKey) || [];
    group.push(e);
    grouped.set(dateKey, group);
  });

  // Count by type
  const counts = { user: 0, task: 0, session: 0 };
  events.forEach(e => counts[e.type]++);

  const filterTabs: { key: EventType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: events.length },
    { key: 'user', label: 'Users', count: counts.user },
    { key: 'task', label: 'Tasks', count: counts.task },
    { key: 'session', label: 'Brainstorms', count: counts.session },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Recent platform activity across all users.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchActivity} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{counts.user}</p>
            <p className="text-[11px] text-muted-foreground">New Users</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{counts.task}</p>
            <p className="text-[11px] text-muted-foreground">Tasks Created</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{counts.session}</p>
            <p className="text-[11px] text-muted-foreground">Brainstorms</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {filterTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
              filter === t.key
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              filter === t.key ? 'bg-muted text-foreground' : 'bg-transparent text-muted-foreground'
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Activity className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dateLabel, dayEvents]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{dateLabel}</h3>
                <div className="flex-1 border-t border-border" />
                <span className="text-[10px] text-muted-foreground">{dayEvents.length} events</span>
              </div>
              <div className="bg-card border border-border rounded-xl divide-y divide-border">
                {dayEvents.map(event => {
                  const { icon: Icon, bg, color, label } = iconMap[event.type];
                  return (
                    <div key={event.id} className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors">
                      <div className={`h-8 w-8 rounded-full ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{event.title}</span>{' '}
                          <span className="text-muted-foreground">{event.subtitle}</span>
                        </p>
                        {event.detail && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{event.detail}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">{timeAgo(event.date)}</span>
                          <span className="text-[11px] text-muted-foreground/60 ml-1">
                            {new Date(event.date).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <span className={cn(
                        'text-[10px] uppercase tracking-wider font-medium rounded px-1.5 py-0.5 shrink-0',
                        bg, color
                      )}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load More */}
          {events.length >= limit && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimit(l => l + 30)}
                className="gap-2"
              >
                Load More Activity
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
