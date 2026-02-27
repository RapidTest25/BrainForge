'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  User, Lock, Camera, Loader2, CheckCircle2, Mail, Shield, Sparkles, Link2, Unlink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [setPasswordValue, setSetPasswordValue] = useState('');
  const [setPasswordConfirm, setSetPasswordConfirm] = useState('');
  const [googleLinking, setGoogleLinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGoogleLinked = !!user?.googleId;
  const hasPassword = user?.hasPassword !== false;

  const linkGoogleMutation = useMutation({
    mutationFn: (data: { credential: string; userInfo: any }) =>
      api.post('/auth/me/link-google', data),
    onSuccess: (data: any) => {
      if (data?.data) {
        updateUser({ googleId: data.data.googleId });
      }
      toast.success('Google account linked successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to link Google account');
    },
  });

  const unlinkGoogleMutation = useMutation({
    mutationFn: () => api.delete('/auth/me/link-google'),
    onSuccess: () => {
      updateUser({ googleId: null });
      toast.success('Google account unlinked');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to unlink Google account');
    },
  });

  const googleLink = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setGoogleLinking(true);
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        linkGoogleMutation.mutate({
          credential: tokenResponse.access_token,
          userInfo: {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            sub: userInfo.sub,
          },
        });
      } catch {
        toast.error('Failed to get Google account info');
      } finally {
        setGoogleLinking(false);
      }
    },
    onError: () => {
      toast.error('Google authentication was cancelled or failed.');
    },
  });

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
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update password');
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: (data: { newPassword: string }) => api.post('/auth/me/set-password', data),
    onSuccess: () => {
      setSetPasswordValue('');
      setSetPasswordConfirm('');
      updateUser({ hasPassword: true });
      setPasswordSaved(true);
      toast.success('Password set successfully!');
      setTimeout(() => setPasswordSaved(false), 3000);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to set password');
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
        <h1 className="text-xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile, avatar, and account preferences.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-[#7b68ee] via-[#8b7cf6] to-[#a78bfa] relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-12 mb-5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative h-24 w-24 rounded-2xl border-4 border-background shadow-lg cursor-pointer group overflow-hidden"
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
            <p className="text-[11px] text-muted-foreground mt-2">Click to upload a photo (max 2MB)</p>
          </div>

          {/* Name */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <User className="h-3 w-3" /> Display Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-border focus:border-[#7b68ee] rounded-xl h-10"
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Mail className="h-3 w-3" /> Email
                </label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="opacity-60 border-border rounded-xl h-10"
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-muted/80 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-[#7b68ee]" />
                <span className="font-medium">Active Account</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                  className="text-xs text-muted-foreground hover:text-muted-foreground"
                >
                  Reset avatar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-red-500/10">
            <Lock className="h-3.5 w-3.5 text-red-500" />
          </div>
          Security
        </div>

        {hasPassword ? (
          /* Change Password - for users who already have a password */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="border-border focus:border-[#7b68ee] rounded-xl h-10"
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-border focus:border-[#7b68ee] rounded-xl h-10"
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
          </>
        ) : (
          /* Set Password - for Google-only users who don't have a password yet */
          <>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-700">
                Your account uses Google sign-in and doesn&apos;t have a password yet. Set one to also be able to log in with email &amp; password.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">New Password</label>
                <Input
                  type="password"
                  value={setPasswordValue}
                  onChange={(e) => setSetPasswordValue(e.target.value)}
                  className="border-border focus:border-[#7b68ee] rounded-xl h-10"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Confirm Password</label>
                <Input
                  type="password"
                  value={setPasswordConfirm}
                  onChange={(e) => setSetPasswordConfirm(e.target.value)}
                  className="border-border focus:border-[#7b68ee] rounded-xl h-10"
                  placeholder="Repeat password"
                />
              </div>
            </div>
            {setPasswordValue && setPasswordConfirm && setPasswordValue !== setPasswordConfirm && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
            <button
              onClick={() => setPasswordMutation.mutate({ newPassword: setPasswordValue })}
              disabled={
                !setPasswordValue ||
                setPasswordValue.length < 8 ||
                setPasswordValue !== setPasswordConfirm ||
                setPasswordMutation.isPending
              }
              className={cn(
                'px-5 py-2.5 text-sm font-medium rounded-xl transition-all',
                passwordSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-[#7b68ee] to-[#6c5ce7] text-white hover:shadow-lg hover:shadow-[#7b68ee]/25 disabled:opacity-50'
              )}
            >
              {setPasswordMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Setting...</span>
              ) : passwordSaved ? (
                <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Password Set!</span>
              ) : (
                'Set Password'
              )}
            </button>
          </>
        )}
      </div>

      {/* Connected Accounts */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-blue-500/10">
            <Link2 className="h-3.5 w-3.5 text-blue-500" />
          </div>
          Connected Accounts
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/80 border border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Google</p>
              {isGoogleLinked ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>

          {isGoogleLinked ? (
            <button
              onClick={() => unlinkGoogleMutation.mutate()}
              disabled={unlinkGoogleMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-600 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {unlinkGoogleMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unlink className="h-3 w-3" />
              )}
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => googleLink()}
              disabled={googleLinking || linkGoogleMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-blue-600 bg-blue-500/10 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {googleLinking || linkGoogleMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Link2 className="h-3 w-3" />
              )}
              Connect
            </button>
          )}
        </div>
      </div>

      {/* About */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">About BrainForge</h3>
        <p className="text-sm text-muted-foreground">
          BrainForge is an AI-powered collaborative workspace for teams. Brainstorm, manage tasks, create diagrams, and more — all in one place.
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-3">Version 1.0.0 &middot; 100% free, bring your own API keys.</p>
      </div>
    </div>
  );
}
