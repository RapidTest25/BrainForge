'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Building2, BarChart3, Search, ChevronLeft, ChevronRight,
  Trash2, ShieldCheck, ShieldOff, Eye, CheckSquare, MessageSquare,
  FileText, GitBranch, FolderKanban, Key, Activity, Bot,
  TrendingUp, UserPlus, Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  totalTeams: number;
  totalProjects: number;
  totalTasks: number;
  totalAiKeys: number;
  totalBrainstorms: number;
  totalDiagrams: number;
  totalNotes: number;
  newUsersThisMonth: number;
  aiUsage: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId: string | null;
  isAdmin: boolean;
  createdAt: string;
  stats: {
    teamMemberships: number;
    createdTasks: number;
    brainstormSessions: number;
    aiKeys: number;
  };
}

interface AdminTeam {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  stats: { members: number; tasks: number; projects: number };
}

// ── Tab type ──────────────────────────────────────────
type Tab = 'overview' | 'users' | 'teams';

// ── Stat Card ──────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: number | string; color: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-4.5 w-4.5" style={{ color }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── Main Admin Page ──────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamTotal, setTeamTotal] = useState(0);
  const [teamPage, setTeamPage] = useState(1);
  const [teamSearch, setTeamSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && !(user as any).isAdmin) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch users when tab/page/search changes
  useEffect(() => {
    if (tab === 'users') fetchUsers();
  }, [tab, userPage, userSearch]);

  // Fetch teams when tab/page/search changes
  useEffect(() => {
    if (tab === 'teams') fetchTeams();
  }, [tab, teamPage, teamSearch]);

  async function fetchStats() {
    try {
      const res: any = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err: any) {
      if (err?.status === 403) router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const params = new URLSearchParams({ page: String(userPage), limit: '20' });
      if (userSearch) params.set('search', userSearch);
      const res: any = await api.get(`/admin/users?${params}`);
      setUsers(res.data.users);
      setUserTotal(res.data.total);
    } catch {}
  }

  async function fetchTeams() {
    try {
      const params = new URLSearchParams({ page: String(teamPage), limit: '20' });
      if (teamSearch) params.set('search', teamSearch);
      const res: any = await api.get(`/admin/teams?${params}`);
      setTeams(res.data.teams);
      setTeamTotal(res.data.total);
    } catch {}
  }

  async function handleToggleAdmin(userId: string, isAdmin: boolean) {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/admin`, { isAdmin });
      toast.success(isAdmin ? 'Admin role granted' : 'Admin role revoked');
      fetchUsers();
    } catch {
      toast.error('Failed to update admin status');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteUser(userId: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted');
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.error?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7b68ee]" />
      </div>
    );
  }

  if (!stats) return null;

  const TABS = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'users' as const, label: 'Users', icon: Users, count: stats.totalUsers },
    { id: 'teams' as const, label: 'Teams', icon: Building2, count: stats.totalTeams },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-red-500/100/10">
          <Shield className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">System overview & user management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#7b68ee" sub={`+${stats.newUsersThisMonth} this month`} />
            <StatCard icon={Building2} label="Teams" value={stats.totalTeams} color="#6366f1" />
            <StatCard icon={FolderKanban} label="Projects" value={stats.totalProjects} color="#22c55e" />
            <StatCard icon={CheckSquare} label="Tasks" value={stats.totalTasks} color="#f59e0b" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={MessageSquare} label="Brainstorm Sessions" value={stats.totalBrainstorms} color="#22c55e" />
            <StatCard icon={GitBranch} label="Diagrams" value={stats.totalDiagrams} color="#f59e0b" />
            <StatCard icon={FileText} label="Notes" value={stats.totalNotes} color="#8b5cf6" />
            <StatCard icon={Key} label="AI Keys" value={stats.totalAiKeys} color="#ef4444" />
          </div>

          {/* AI Usage */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bot className="h-4 w-4 text-[#7b68ee]" />
              AI Usage (Last 30 Days)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.aiUsage.requests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">API Requests</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{(stats.aiUsage.inputTokens / 1000).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground">Input Tokens</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{(stats.aiUsage.outputTokens / 1000).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground">Output Tokens</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">${stats.aiUsage.totalCost.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">Estimated Cost</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                className="pl-9 h-9 bg-card border-border"
              />
            </div>
            <span className="text-sm text-muted-foreground">{userTotal} users total</span>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">User</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Login</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden lg:table-cell">Teams</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden lg:table-cell">Tasks</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Role</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Joined</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#7b68ee]/10 flex items-center justify-center text-sm font-medium text-[#7b68ee]">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        u.googleId ? 'bg-blue-500/100/10 text-blue-600' : 'bg-muted text-muted-foreground'
                      )}>
                        {u.googleId ? 'Google' : 'Email'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{u.stats.teamMemberships}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{u.stats.createdTasks}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        u.isAdmin ? 'bg-red-500/100/10 text-red-600' : 'bg-muted text-muted-foreground'
                      )}>
                        {u.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleAdmin(u.id, !u.isAdmin)}
                          disabled={actionLoading === u.id || u.id === user?.id}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-muted-foreground transition-colors disabled:opacity-30"
                          title={u.isAdmin ? 'Revoke admin' : 'Grant admin'}
                        >
                          {u.isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          disabled={actionLoading === u.id || u.id === user?.id}
                          className="p-1.5 rounded-lg hover:bg-red-500/100/100/100/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {userTotal > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline" size="sm"
                disabled={userPage <= 1}
                onClick={() => setUserPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {userPage} of {Math.ceil(userTotal / 20)}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={userPage >= Math.ceil(userTotal / 20)}
                onClick={() => setUserPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Teams Tab */}
      {tab === 'teams' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                value={teamSearch}
                onChange={e => { setTeamSearch(e.target.value); setTeamPage(1); }}
                className="pl-9 h-9 bg-card border-border"
              />
            </div>
            <span className="text-sm text-muted-foreground">{teamTotal} teams total</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {teams.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                    {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-5 rounded-full bg-[#7b68ee]/10 flex items-center justify-center text-[10px] font-medium text-[#7b68ee]">
                    {t.owner.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-muted-foreground">{t.owner.name}</span>
                  <span className="text-xs text-muted-foreground/60">·</span>
                  <span className="text-xs text-muted-foreground">{t.owner.email}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.stats.members} members</span>
                  <span className="flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5" /> {t.stats.projects} projects</span>
                  <span className="flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" /> {t.stats.tasks} tasks</span>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-3">
                  Created {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {teamTotal > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline" size="sm"
                disabled={teamPage <= 1}
                onClick={() => setTeamPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {teamPage} of {Math.ceil(teamTotal / 20)}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={teamPage >= Math.ceil(teamTotal / 20)}
                onClick={() => setTeamPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
