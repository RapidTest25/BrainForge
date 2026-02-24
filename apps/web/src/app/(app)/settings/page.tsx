'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.patch('/auth/me', data),
    onSuccess: (data: any) => {
      if (data?.data) updateUser(data.data);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.patch('/auth/me/password', data),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
    },
  });

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a2e]">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account settings.</p>
      </div>

      {/* Profile */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e]">
          <div className="h-6 w-6 rounded flex items-center justify-center bg-[#7b68ee]/10">
            <User className="h-3.5 w-3.5 text-[#7b68ee]" />
          </div>
          Profile
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-gray-600">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="border-gray-200 focus:border-[#7b68ee]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-gray-600">Email</label>
          <Input value={user?.email || ''} disabled className="opacity-60 border-gray-200" />
          <p className="text-[11px] text-gray-400">Email cannot be changed.</p>
        </div>
        <button
          onClick={() => profileMutation.mutate({ name })}
          disabled={profileMutation.isPending}
          className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
        >
          {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Password */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e]">
          <div className="h-6 w-6 rounded flex items-center justify-center bg-destructive/10">
            <Lock className="h-3.5 w-3.5 text-destructive" />
          </div>
          Change Password
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-gray-600">Current Password</label>
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="border-gray-200 focus:border-[#7b68ee]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-gray-600">New Password</label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="border-gray-200 focus:border-[#7b68ee]" />
        </div>
        <button
          onClick={() => passwordMutation.mutate({ currentPassword, newPassword })}
          disabled={!currentPassword || !newPassword || passwordMutation.isPending}
          className="px-5 py-2 bg-[#7b68ee] text-white text-sm font-medium rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors"
        >
          {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
        </button>
      </div>

      {/* About */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="text-sm font-medium text-[#1a1a2e] mb-2">About BrainForge</h3>
        <p className="text-sm text-gray-400">
          BrainForge is an AI-powered collaborative workspace. 100% free, bring your own API keys.
        </p>
        <p className="text-[11px] text-gray-300 mt-2">Version 1.0.0</p>
      </div>
    </div>
  );
}
