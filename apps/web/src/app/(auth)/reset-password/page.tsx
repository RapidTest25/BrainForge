'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Brain, Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, newPassword }, { skipAuthRetry: true });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h1>
        <p className="text-muted-foreground text-sm mb-6">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password">
          <Button className="bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-6 w-6 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h1>
        <p className="text-muted-foreground text-sm mb-6">Your password has been successfully reset.</p>
        <Link href="/login">
          <Button className="w-full h-10 bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg">
            Sign in with new password
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-1">Reset your password</h1>
      <p className="text-muted-foreground text-sm mb-8">Enter your new password below</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 pr-10 h-10 border-border focus:border-[#7b68ee] focus:ring-[#7b68ee]/20"
              required
              minLength={8}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPassword && (
            <div className="flex gap-1 mt-1.5">
              {[
                newPassword.length >= 8,
                /[A-Z]/.test(newPassword),
                /[0-9]/.test(newPassword),
                /[^A-Za-z0-9]/.test(newPassword),
              ].map((met, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${met ? 'bg-[#7b68ee]' : 'bg-muted'}`} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`pl-10 pr-10 h-10 border-border focus:border-[#7b68ee] focus:ring-[#7b68ee]/20 ${
                confirmPassword && confirmPassword !== newPassword ? 'border-red-300 focus:border-red-400' : ''
              }`}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-[11px] text-red-500">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-10 text-sm font-medium bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg"
          disabled={loading || (!!confirmPassword && confirmPassword !== newPassword)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex bg-card">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 border border-white/20 rounded-2xl rotate-12" />
          <div className="absolute bottom-32 right-8 w-32 h-32 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-56 h-56 border border-white/10 rounded-3xl -rotate-6" />
        </div>
        <div className="relative flex flex-col justify-between p-10 w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-card/20 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">BrainForge</span>
          </Link>

          <div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Almost there.
              <br />Set a new password.
            </h2>
            <p className="text-white/70 text-sm max-w-xs">
              Choose a strong password to secure your account.
            </p>
          </div>

          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} BrainForge
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">BrainForge</span>
          </div>

          <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#7b68ee]" /></div>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-[#7b68ee] transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
