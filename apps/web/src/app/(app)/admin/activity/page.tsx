'use client';

import { useState, useEffect } from 'react';
import {
  Activity, UserPlus, CheckSquare, MessageSquare, Loader2,
  RefreshCw, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface RecentActivity {
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
  recentTasks: { id: string; title: string; status: string; createdAt: string; creator: { name: string } }[];
  recentSessions: { id: string; title: string; mode: string; createdAt: string; user: { name: string } }[];
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminActivityPage() {
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchActivity(); }, []);

  async function fetchActivity() {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/activity?limit=20');
      setActivity(res.data);
    } catch {} finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }

  // Combine into a unified timeline
  const events: { id: string; type: 'user' | 'task' | 'session'; title: string; subtitle: string; date: string }[] = [];

  activity?.recentUsers.forEach(u => {
    events.push({ id: `u-${u.id}`, type: 'user', title: u.name, subtitle: `joined the platform (${u.email})`, date: u.createdAt });
  });
  activity?.recentTasks.forEach(t => {
    events.push({ id: `t-${t.id}`, type: 'task', title: t.creator.name, subtitle: `created task "${t.title}"`, date: t.createdAt });
  });
  activity?.recentSessions.forEach(s => {
    events.push({ id: `s-${s.id}`, type: 'session', title: s.user.name, subtitle: `started ${s.mode} brainstorm "${s.title}"`, date: s.createdAt });
  });

  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const iconMap = {
    user: { icon: UserPlus, bg: 'bg-blue-50 dark:bg-blue-500/10', color: 'text-blue-500' },
    task: { icon: CheckSquare, bg: 'bg-amber-50 dark:bg-amber-500/10', color: 'text-amber-500' },
    session: { icon: MessageSquare, bg: 'bg-emerald-50 dark:bg-emerald-500/10', color: 'text-emerald-500' },
  };

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

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Activity className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No activity recorded yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {events.map(event => {
            const { icon: Icon, bg, color } = iconMap[event.type];
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
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{timeAgo(event.date)}</span>
                    <span className="text-[11px] text-muted-foreground/60 ml-1">
                      {new Date(event.date).toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                  {event.type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
