'use client';

import { useState, useEffect } from 'react';
import {
  Users, Search, ChevronLeft, ChevronRight, Trash2,
  ShieldCheck, ShieldOff, Loader2, UserPlus, Mail, Chrome,
  X, Building2, CheckSquare, MessageSquare, Key, FileText,
  FolderKanban, Calendar, Eye,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

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

interface UserDetail {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  teamMemberships: { role: string; joinedAt: string; team: { id: string; name: string } }[];
  _count: {
    createdTasks: number;
    brainstormSessions: number;
    notes: number;
    diagrams: number;
    aiKeys: number;
    projects: number;
  };
}

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res: any = await api.get(`/admin/users?${params}`);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function openUserDetail(userId: string) {
    setDetailLoading(true);
    try {
      const res: any = await api.get(`/admin/users/${userId}`);
      setSelectedUser(res.data);
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleToggleAdmin(userId: string, isAdmin: boolean) {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/admin`, { isAdmin });
      toast.success(isAdmin ? 'Admin role granted' : 'Admin role revoked');
      fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, isAdmin } : null);
      }
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
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.error?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user accounts and permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{total}</span>
            <span className="text-xs text-muted-foreground">total</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 bg-card"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className={cn("flex-1 min-w-0 transition-all", selectedUser ? 'max-w-[calc(100%-380px)]' : '')}>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loading && users.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-red-500" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <UserPlus className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">User</th>
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Login</th>
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden lg:table-cell">Teams</th>
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden lg:table-cell">Tasks</th>
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Role</th>
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Joined</th>
                    <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr
                      key={u.id}
                      onClick={() => openUserDetail(u.id)}
                      className={cn(
                        'border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer',
                        selectedUser?.id === u.id && 'bg-muted/40'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400 shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
                          u.googleId
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {u.googleId ? <Chrome className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                          {u.googleId ? 'Google' : 'Email'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground hidden lg:table-cell">{u.stats.teamMemberships}</td>
                      <td className="px-4 py-3 text-sm text-foreground hidden lg:table-cell">{u.stats.createdTasks}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          u.isAdmin
                            ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {u.isAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openUserDetail(u.id)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleAdmin(u.id, !u.isAdmin)}
                            disabled={actionLoading === u.id || u.id === user?.id}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors disabled:opacity-30',
                              u.isAdmin
                                ? 'hover:bg-amber-50 dark:hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600'
                                : 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600'
                            )}
                            title={u.isAdmin ? 'Revoke admin' : 'Grant admin'}
                          >
                            {u.isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={actionLoading === u.id || u.id === user?.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30"
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
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
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

        {/* Detail Panel */}
        {(selectedUser || detailLoading) && (
          <div className="w-[360px] shrink-0 hidden lg:block">
            <div className="bg-card border border-border rounded-xl sticky top-6 overflow-hidden">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                </div>
              ) : selectedUser && (
                <>
                  {/* Header */}
                  <div className="relative p-5 border-b border-border">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-lg font-medium text-blue-600 dark:text-blue-400 shrink-0">
                        {selectedUser.avatarUrl ? (
                          <img src={selectedUser.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          selectedUser.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{selectedUser.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                            selectedUser.isAdmin
                              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {selectedUser.isAdmin ? 'Admin' : 'User'}
                          </span>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                            selectedUser.googleId
                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {selectedUser.googleId ? 'Google' : 'Email'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-5 border-b border-border">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity Stats</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <StatBadge icon={CheckSquare} label="Tasks" value={selectedUser._count.createdTasks} color="text-amber-500" />
                      <StatBadge icon={MessageSquare} label="Brainstorms" value={selectedUser._count.brainstormSessions} color="text-emerald-500" />
                      <StatBadge icon={FolderKanban} label="Projects" value={selectedUser._count.projects} color="text-blue-500" />
                      <StatBadge icon={FileText} label="Notes" value={selectedUser._count.notes} color="text-indigo-500" />
                      <StatBadge icon={Key} label="AI Keys" value={selectedUser._count.aiKeys} color="text-red-500" />
                      <StatBadge icon={Building2} label="Diagrams" value={selectedUser._count.diagrams} color="text-purple-500" />
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="p-5 border-b border-border">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Teams ({selectedUser.teamMemberships.length})
                    </h4>
                    {selectedUser.teamMemberships.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No team memberships</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedUser.teamMemberships.map(m => (
                          <div key={m.team.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground">{m.team.name}</span>
                            </div>
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              m.role === 'OWNER' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                              m.role === 'ADMIN' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                              'bg-muted text-muted-foreground'
                            )}>
                              {m.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="p-5">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Timeline</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" /> Joined
                        </span>
                        <span className="text-xs font-medium text-foreground">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" /> Last Updated
                        </span>
                        <span className="text-xs font-medium text-foreground">{new Date(selectedUser.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-5 border-t border-border flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => handleToggleAdmin(selectedUser.id, !selectedUser.isAdmin)}
                      disabled={actionLoading === selectedUser.id || selectedUser.id === user?.id}
                    >
                      {selectedUser.isAdmin ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {selectedUser.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name)}
                      disabled={actionLoading === selectedUser.id || selectedUser.id === user?.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <Icon className={cn('h-3.5 w-3.5 mx-auto mb-1', color)} />
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
