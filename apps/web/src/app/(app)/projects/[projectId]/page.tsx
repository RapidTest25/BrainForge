'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckSquare, MessageSquare, GitBranch, Target,
  FileText, Zap, Users, UserPlus, Crown, Shield, User,
  Pencil, Trash2, MoreHorizontal, Loader2, X, ExternalLink,
  ChevronRight, Mail, Copy, CheckCircle2, Link as LinkIcon,
} from 'lucide-react';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore, type Project } from '@/stores/project-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectIcon, PROJECT_ICON_MAP } from '@/components/shared/project-icon';
import Link from 'next/link';

const PROJECT_COLORS = [
  '#7b68ee', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
  '#6366f1', '#84cc16',
];
const PROJECT_ICONS = Object.keys(PROJECT_ICON_MAP);

const ROLE_LABELS: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  OWNER: { label: 'Owner', icon: Crown, color: '#f59e0b' },
  ADMIN: { label: 'Admin', icon: Shield, color: '#7b68ee' },
  MEMBER: { label: 'Member', icon: User, color: '#6b7280' },
};

const STAT_ITEMS = [
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: '#7b68ee', href: '/tasks' },
  { key: 'brainstormSessions', label: 'Brainstorms', icon: MessageSquare, color: '#22c55e', href: '/brainstorm' },
  { key: 'notes', label: 'Notes', icon: FileText, color: '#8b5cf6', href: '/notes' },
  { key: 'goals', label: 'Goals', icon: Target, color: '#f59e0b', href: '/goals' },
  { key: 'diagrams', label: 'Diagrams', icon: GitBranch, color: '#3b82f6', href: '/diagrams' },
  { key: 'sprintPlans', label: 'Sprints', icon: Zap, color: '#ef4444', href: '/sprints' },
];

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { activeTeam } = useTeamStore();
  const { activeProject, setActiveProject } = useProjectStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteMode, setInviteMode] = useState<'email' | 'link'>('email');
  const [removingMember, setRemovingMember] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '', icon: '' });

  // Fetch project detail
  const { data: projectRes, isLoading } = useQuery({
    queryKey: ['project', teamId, projectId],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}/projects/${projectId}`),
    enabled: !!teamId && !!projectId,
  });
  const project = projectRes?.data;

  // Fetch available team members (not already in project)
  const { data: availableRes } = useQuery({
    queryKey: ['project-available-members', teamId, projectId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/projects/${projectId}/available-members`),
    enabled: !!teamId && !!projectId,
  });
  const availableMembers = availableRes?.data || [];

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/teams/${teamId}/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', teamId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
      setShowEdit(false);
      toast.success('Project updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/teams/${teamId}/projects/${projectId}`),
    onSuccess: () => {
      if (activeProject?.id === projectId) setActiveProject(null);
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
      router.push('/projects');
      toast.success('Project deleted');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.post(`/teams/${teamId}/projects/${projectId}/members`, { userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', teamId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-available-members', teamId, projectId] });
      toast.success('Member added');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add member'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/teams/${teamId}/projects/${projectId}/members/${userId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', teamId, projectId] });
      toast.success('Role updated');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/teams/${teamId}/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', teamId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-available-members', teamId, projectId] });
      toast.success('Member removed');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to remove member'),
  });

  // Team invite mutations (reuses team invite endpoints)
  const inviteMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/invitations`, data),
    onSuccess: (data: any) => {
      setInviteLink(data?.data?.token || '');
      toast.success('Invitation sent');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to send invitation'),
  });

  const generateLinkMutation = useMutation({
    mutationFn: (data: any) => api.post<{ data: { token: string } }>(`/teams/${teamId}/invite-link`, data),
    onSuccess: (data: any) => {
      setInviteLink(data?.data?.token || '');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to generate link'),
  });

  function openEdit() {
    if (!project) return;
    setEditForm({
      name: project.name,
      description: project.description || '',
      color: project.color,
      icon: project.icon,
    });
    setShowEdit(true);
  }

  function handleSetActive() {
    if (!project) return;
    if (activeProject?.id === project.id) {
      setActiveProject(null);
    } else {
      setActiveProject({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        teamId: project.teamId,
        createdBy: project.createdBy,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    }
  }

  const isActive = activeProject?.id === projectId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-semibold text-foreground mb-2">Project not found</h3>
        <Button variant="outline" onClick={() => router.push('/projects')}>Back to Projects</Button>
      </div>
    );
  }

  const counts = project._count || {};
  const members = project.members || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.push('/projects')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </button>

      {/* Project header */}
      <div
        className="rounded-2xl border p-6 flex flex-col sm:flex-row items-start gap-5"
        style={{ borderColor: `${project.color}30`, backgroundColor: `${project.color}05` }}
      >
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${project.color}18` }}
        >
          <ProjectIcon icon={project.icon} className="h-8 w-8" style={{ color: project.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {isActive && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: project.color, backgroundColor: `${project.color}15` }}>
                Active
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{project.description}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-2">
            Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {project.creator && ` by ${project.creator.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={handleSetActive}
            className={isActive ? 'bg-[#7b68ee] hover:bg-[#6c5ce7] text-white' : ''}
          >
            {isActive ? 'Active' : 'Set as Active'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEdit}>
                <Pencil className="h-4 w-4 mr-2" /> Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAT_ITEMS.map(stat => {
            const count = counts[stat.key] ?? 0;
            return (
              <Link
                key={stat.key}
                href={stat.href}
                onClick={() => {
                  if (!isActive) handleSetActive();
                }}
                className="group bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-border transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}12` }}>
                    <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Team Members ({members.length})
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInvite(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <Mail className="h-3.5 w-3.5" />
              Invite
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMember(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {members.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No members yet</p>
              <button
                onClick={() => setShowAddMember(true)}
                className="text-xs text-[#7b68ee] hover:text-[#6c5ce7] font-medium mt-1"
              >
                Add the first member
              </button>
            </div>
          ) : (
            members.map((m: any) => {
              const roleInfo = ROLE_LABELS[m.role] || ROLE_LABELS.MEMBER;
              const RoleIcon = roleInfo.icon;
              return (
                <div key={m.user.id} className="flex items-center gap-4 px-5 py-3.5 group">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border-2 border-border">
                    {m.user.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">
                        {m.user.name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>

                  {/* Role badge + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={m.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ userId: m.user.id, role })}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs border-border/60">
                        <div className="flex items-center gap-1.5">
                          <RoleIcon className="h-3 w-3" style={{ color: roleInfo.color }} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">
                          <span className="flex items-center gap-1.5"><Crown className="h-3 w-3 text-[#f59e0b]" /> Owner</span>
                        </SelectItem>
                        <SelectItem value="ADMIN">
                          <span className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-[#7b68ee]" /> Admin</span>
                        </SelectItem>
                        <SelectItem value="MEMBER">
                          <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-[#6b7280]" /> Member</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <button
                      onClick={() => setRemovingMember(m)}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove member"
                    >
                      <X className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Available Team Members (Quick add) */}
      {availableMembers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Available Team Members
          </h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {availableMembers.map((m: any) => (
              <div key={m.user.id} className="flex items-center gap-4 px-5 py-3 group">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {m.user.name?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
                  onClick={() => addMemberMutation.mutate({ userId: m.user.id, role: 'MEMBER' })}
                  disabled={addMemberMutation.isPending}
                >
                  <UserPlus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Name</label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="border-border focus:border-[#7b68ee]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Description</label>
              <Textarea
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                className="border-border focus:border-[#7b68ee] min-h-[60px]"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Color</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditForm({ ...editForm, color: c })}
                    className={cn('h-8 w-8 rounded-lg transition-all', editForm.color === c ? 'ring-2 ring-offset-2 ring-offset-card' : 'hover:scale-110')}
                    style={{ backgroundColor: c, ringColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_ICONS.map(name => (
                  <button
                    key={name}
                    onClick={() => setEditForm({ ...editForm, icon: name })}
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center transition-all border',
                      editForm.icon === name ? 'border-[#7b68ee] bg-[#7b68ee]/10' : 'border-transparent hover:bg-muted'
                    )}
                  >
                    <ProjectIcon icon={name} className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate(editForm)}
              disabled={!editForm.name.trim() || updateMutation.isPending}
              className="bg-[#7b68ee] hover:bg-[#6c5ce7] text-white"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-card max-w-sm">
          <div className="flex flex-col items-center text-center py-2">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Delete Project</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to delete <span className="font-medium text-foreground">&ldquo;{project.name}&rdquo;</span>?
            </p>
            <p className="text-xs text-muted-foreground/70">Items within the project won&apos;t be deleted, but they will be unlinked.</p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <button onClick={() => setShowDelete(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Team Member</DialogTitle>
          </DialogHeader>
          {availableMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">All team members are already in this project</p>
              <button
                onClick={() => { setShowAddMember(false); setShowInvite(true); }}
                className="text-xs text-[#7b68ee] hover:text-[#6c5ce7] font-medium mt-2"
              >
                Invite someone new to the team
              </button>
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {availableMembers.map((m: any) => (
                <div key={m.user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 group">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                    {m.user.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {m.user.name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => addMemberMutation.mutate({ userId: m.user.id, role: 'MEMBER' })}
                      disabled={addMemberMutation.isPending}
                    >
                      Add as Member
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => addMemberMutation.mutate({ userId: m.user.id, role: 'ADMIN' })}
                      disabled={addMemberMutation.isPending}
                    >
                      Add as Admin
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Dialog (Email + Link) */}
      <Dialog open={showInvite} onOpenChange={(o) => { setShowInvite(o); if (!o) { setInviteLink(''); setInviteMode('email'); setInviteEmail(''); } }}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Invite to Team</DialogTitle>
          </DialogHeader>
          {inviteLink ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium text-sm">Invitation Created!</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Invite Link</label>
                <div className="flex gap-2">
                  <Input value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteLink}`} readOnly className="border-border text-sm" />
                  <button
                    className="px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground/80 hover:border-border transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/join/${inviteLink}`);
                      toast.success('Link copied to clipboard');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">This link expires in 7 days. Anyone with this link can join the team.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setInviteMode('email')}
                  className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-colors ${inviteMode === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  <Mail className="h-3.5 w-3.5 inline mr-1" /> Email
                </button>
                <button
                  onClick={() => setInviteMode('link')}
                  className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-colors ${inviteMode === 'link' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  <LinkIcon className="h-3.5 w-3.5 inline mr-1" /> Invite Link
                </button>
              </div>

              {inviteMode === 'email' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="border-border focus:border-[#7b68ee]"
                  />
                </div>
              )}

              {inviteMode === 'link' && (
                <p className="text-sm text-muted-foreground">Generate a link that anyone can use to join this team. The link expires in 7 days.</p>
              )}

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => { setShowInvite(false); setInviteLink(''); setInviteMode('email'); setInviteEmail(''); }} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors">
              {inviteLink ? 'Done' : 'Cancel'}
            </button>
            {!inviteLink && inviteMode === 'email' && (
              <button
                onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                disabled={!inviteEmail || inviteMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            )}
            {!inviteLink && inviteMode === 'link' && (
              <button
                onClick={() => generateLinkMutation.mutate({ role: inviteRole })}
                disabled={generateLinkMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                {generateLinkMutation.isPending ? 'Generating...' : 'Generate Link'}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <Dialog open={!!removingMember} onOpenChange={(o) => { if (!o) setRemovingMember(null); }}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Remove Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <span className="font-medium text-foreground">{removingMember?.user?.name || removingMember?.user?.email}</span> from this project?
            </p>
            <p className="text-xs text-muted-foreground">They will lose access to project-specific resources but remain in the team.</p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setRemovingMember(null)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { removeMemberMutation.mutate(removingMember.user.id); setRemovingMember(null); }}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
