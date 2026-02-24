'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  User, Lock, Camera, Loader2, CheckCircle2, Mail, Shield, Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.patch('/auth/me', data),
    onSuccess: (data: any) => {
      if (data?.data) {
        updateUser({
          name: data.data.name,
          avatar: data.data.avatarUrl || undefined,
        });
      }
      setAvatarFile(null);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.patch('/auth/me/password', data),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const scale = Math.max(size / img.width, size / img.height);
      const x = (size - img.width * scale) / 2;
      const y = (size - img.height * scale) / 2;
      ctx?.drawImage(img, x, y, img.width * scale, img.height * scale);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setAvatarPreview(dataUrl);
      setAvatarFile(dataUrl);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSaveProfile = () => {
    const payload: any = {};
    if (name !== user?.name) payload.name = name;
    if (avatarFile) payload.avatarUrl = avatarFile;
    if (Object.keys(payload).length === 0) return;
    profileMutation.mutate(payload);
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Profile & Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your profile, avatar, and account preferences.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-[#7b68ee] via-[#8b7cf6] to-[#a78bfa] relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-12 mb-5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative h-24 w-24 rounded-2xl border-4 border-white shadow-lg cursor-pointer group overflow-hidden"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7] flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <p className="text-[11px] text-gray-400 mt-2">Click to upload a photo (max 2MB)</p>
          </div>

          {/* Name */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <User className="h-3 w-3" /> Display Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-gray-200 focus:border-[#7b68ee] rounded-xl h-10"
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <Mail className="h-3 w-3" /> Email
                </label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="opacity-60 border-gray-200 rounded-xl h-10"
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Shield className="h-3.5 w-3.5 text-[#7b68ee]" />
                <span className="font-medium">Active Account</span>
              </div>
              <div className="h-3 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium">BrainForge v1.0</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProfile}
                disabled={profileMutation.isPending || (name === user?.name && !avatarFile)}
                className={cn(
                  'px-5 py-2.5 text-sm font-medium rounded-xl transition-all',
                  profileSaved
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50'
                )}
              >
                {profileMutation.isPending ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</span>
                ) : profileSaved ? (
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Saved!</span>
                ) : (
                  'Save Profile'
                )}
              </button>
              {avatarFile && (
                <button
                  onClick={() => { setAvatarPreview(user?.avatar || null); setAvatarFile(null); }}
                  className="text-xs text-gray-400 hover:text-gray-500"
                >
                  Reset avatar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-red-50">
            <Lock className="h-3.5 w-3.5 text-red-500" />
          </div>
          Security
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-gray-600">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="border-gray-200 focus:border-[#7b68ee] rounded-xl h-10"
              placeholder="Enter current password"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-gray-600">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-gray-200 focus:border-[#7b68ee] rounded-xl h-10"
              placeholder="Enter new password"
            />
          </div>
        </div>
        <button
          onClick={() => passwordMutation.mutate({ currentPassword, newPassword })}
          disabled={!currentPassword || !newPassword || passwordMutation.isPending}
          className={cn(
            'px-5 py-2.5 text-sm font-medium rounded-xl transition-all',
            passwordSaved
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:shadow-lg hover:shadow-red-500/25 disabled:opacity-50'
          )}
        >
          {passwordMutation.isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...</span>
          ) : passwordSaved ? (
            <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Updated!</span>
          ) : (
            'Update Password'
          )}
        </button>
      </div>

      {/* About */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-2">About BrainForge</h3>
        <p className="text-sm text-gray-400">
          BrainForge is an AI-powered collaborative workspace for teams. Brainstorm, manage tasks, create diagrams, and more — all in one place.
        </p>
        <p className="text-[11px] text-gray-300 mt-3">Version 1.0.0 &middot; 100% free, bring your own API keys.</p>
      </div>
    </div>
  );
}
