'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Copy, Mail, Shield, Trash2, Crown, UserPlus, CheckCircle2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeamStore } from '@/stores/team-store';
import { api } from '@/lib/api';

const ROLES = [
  { value: 'OWNER', label: 'Owner', icon: Crown },
  { value: 'ADMIN', label: 'Admin', icon: Shield },
  { value: 'MEMBER', label: 'Member', icon: Users },
];

export default function TeamSettingsPage() {
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteLink, setInviteLink] = useState('');
  const [teamName, setTeamName] = useState(activeTeam?.name || '');

  const [inviteMode, setInviteMode] = useState<'email' | 'link'>('email');

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => api.get<{ data: any }>(`/teams/${teamId}`),
    enabled: !!teamId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/teams/${teamId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', teamId] }),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${teamId}/invitations`, data),
    onSuccess: (data: any) => {
      setInviteLink(data?.data?.token || '');
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: (data: any) => api.post<{ data: { token: string } }>(`/teams/${teamId}/invite-link`, data),
    onSuccess: (data: any) => {
      setInviteLink(data?.data?.token || '');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => api.delete(`/teams/${teamId}/members/${memberId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', teamId] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.patch(`/teams/${teamId}/members/${memberId}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', teamId] }),
  });

  const members = team?.data?.members || [];

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-amber-50 text-amber-600';
      case 'ADMIN': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a2e]">Team Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your team, members, and invitations.</p>
      </div>

      {/* Team Info */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-[#1a1a2e]">Team Information</h3>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-gray-600">Team Name</label>
          <div className="flex gap-2">
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} className="border-gray-200 focus:border-[#7b68ee]" />
            <button
              onClick={() => updateMutation.mutate({ name: teamName })}
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="h-4 w-4" />
          {members.length} member{members.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Members */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#1a1a2e]">Members</h3>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7b68ee] text-white text-sm rounded-lg hover:bg-[#6c5ce7] transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite
          </button>
        </div>
        <div className="space-y-2">
          {members.map((member: any) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-gray-100 text-gray-500">
                    {(member.user?.name || member.user?.email || '?').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm text-[#1a1a2e]">{member.user?.name || 'Unknown'}</p>
                  <p className="text-[11px] text-gray-400">{member.user?.email}</p>
                </div>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getRoleStyle(member.role)}`}>
                  {member.role}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {member.role !== 'OWNER' && (
                  <>
                    <Select
                      value={member.role}
                      onValueChange={(v) => updateRoleMutation.mutate({ memberId: member.id, role: v })}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs border-gray-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      onClick={() => { if (confirm('Remove this member?')) removeMutation.mutate(member.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={(o) => { setShowInvite(o); if (!o) { setInviteLink(''); setInviteMode('email'); } }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a2e]">Invite Member</DialogTitle>
          </DialogHeader>
          {inviteLink ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium text-sm">Invitation Created!</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Invite Link</label>
                <div className="flex gap-2">
                  <Input value={`${window.location.origin}/join/${inviteLink}`} readOnly className="border-gray-200 text-sm" />
                  <button
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${inviteLink}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">This link expires in 7 days. Anyone with this link can join the team.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setInviteMode('email')}
                  className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-colors ${inviteMode === 'email' ? 'bg-white text-[#1a1a2e] shadow-sm' : 'text-gray-500'}`}
                >
                  <Mail className="h-3.5 w-3.5 inline mr-1" /> Email
                </button>
                <button
                  onClick={() => setInviteMode('link')}
                  className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-colors ${inviteMode === 'link' ? 'bg-white text-[#1a1a2e] shadow-sm' : 'text-gray-500'}`}
                >
                  <Copy className="h-3.5 w-3.5 inline mr-1" /> Invite Link
                </button>
              </div>

              {inviteMode === 'email' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-600">Email</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="border-gray-200 focus:border-[#7b68ee]"
                  />
                </div>
              )}

              {inviteMode === 'link' && (
                <p className="text-sm text-gray-500">Generate a link that anyone can use to join this team. The link expires in 7 days.</p>
              )}

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-600">Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => { setShowInvite(false); setInviteLink(''); setInviteMode('email'); }} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
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
    </div>
  );
}
