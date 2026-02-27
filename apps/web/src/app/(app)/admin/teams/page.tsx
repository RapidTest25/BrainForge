'use client';

import { useState, useEffect } from 'react';
import {
  Building2, Users, FolderKanban, CheckSquare, Search,
  ChevronLeft, ChevronRight, Loader2, Calendar, Eye,
  X, Crown, Shield, UserCircle, MessageSquare, Mail,
  Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface AdminTeam {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  stats: { members: number; tasks: number; projects: number };
}

interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null; isAdmin: boolean };
}

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string; avatarUrl: string | null };
  members: TeamMember[];
  stats: { members: number; tasks: number; projects: number; brainstormSessions: number; invitations: number };
  projects: { id: string; name: string; description: string | null; createdAt: string }[];
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  ADMIN: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
  MEMBER: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
};



function StatBadge({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [page, search]);

  async function fetchTeams() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res: any = await api.get(`/admin/teams?${params}`);
      setTeams(res.data.teams);
      setTotal(res.data.total);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function fetchTeamDetail(teamId: string) {
    setDetailLoading(true);
    try {
      const res: any = await api.get(`/admin/teams/${teamId}`);
      setSelectedTeam(res.data);
    } catch {} finally {
      setDetailLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className={`flex-1 min-w-0 space-y-6 transition-all ${selectedTeam ? 'max-w-[calc(100%-380px)]' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Teams</h1>
              <p className="text-sm text-muted-foreground mt-1">View all teams and their details.</p>
            </div>
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{total}</span>
              <span className="text-xs text-muted-foreground">total</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 bg-card"
            />
          </div>

          {/* Table View */}
          {loading && teams.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-red-500" />
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No teams found</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Team</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Owner</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Members</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Projects</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Tasks</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Created</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t => (
                    <tr
                      key={t.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors ${selectedTeam?.id === t.id ? 'bg-muted/30' : ''}`}
                      onClick={() => fetchTeamDetail(t.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                            {t.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-medium text-blue-600 dark:text-blue-400">
                            {t.owner.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-foreground truncate max-w-[120px]">{t.owner.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-foreground">{t.stats.members}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-foreground">{t.stats.projects}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-foreground">{t.stats.tasks}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); fetchTeamDetail(t.id); }}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Side Panel */}
        {selectedTeam && (
          <div className="w-[360px] shrink-0 sticky top-4 self-start bg-card border border-border rounded-xl overflow-hidden max-h-[calc(100vh-6rem)] overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-red-500" />
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div className="p-5 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{selectedTeam.name}</h3>
                        {selectedTeam.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selectedTeam.description}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelectedTeam(null)} className="p-1 rounded hover:bg-muted transition-colors">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-4 border-b border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <StatBadge icon={Users} label="Members" value={selectedTeam.stats.members} color="#3b82f6" />
                    <StatBadge icon={FolderKanban} label="Projects" value={selectedTeam.stats.projects} color="#22c55e" />
                    <StatBadge icon={CheckSquare} label="Tasks" value={selectedTeam.stats.tasks} color="#f59e0b" />
                    <StatBadge icon={MessageSquare} label="Sessions" value={selectedTeam.stats.brainstormSessions} color="#8b5cf6" />
                  </div>
                </div>

                {/* Owner */}
                <div className="p-4 border-b border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Owner</h4>
                  <div className="flex items-center gap-3">
                    {selectedTeam.owner.avatarUrl ? (
                      <img src={selectedTeam.owner.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Crown className="h-4 w-4 text-amber-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{selectedTeam.owner.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedTeam.owner.email}</p>
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div className="p-4 border-b border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Members ({selectedTeam.members.length})
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedTeam.members.map(m => (
                      <div key={m.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {m.user.avatarUrl ? (
                            <img src={m.user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-medium text-blue-600 dark:text-blue-400 shrink-0">
                              {m.user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {m.user.name}
                              {m.user.isAdmin && (
                                <Shield className="inline h-3 w-3 text-red-500 ml-1" />
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" /> {m.user.email}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_COLORS[m.role] || ROLE_COLORS.MEMBER}`}>
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                {selectedTeam.projects.length > 0 && (
                  <div className="p-4 border-b border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Recent Projects
                    </h4>
                    <div className="space-y-2">
                      {selectedTeam.projects.map(p => (
                        <div key={p.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-foreground truncate">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Timeline</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Created {new Date(selectedTeam.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Updated {new Date(selectedTeam.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {selectedTeam.stats.invitations > 0 && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>{selectedTeam.stats.invitations} pending invitation{selectedTeam.stats.invitations > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
