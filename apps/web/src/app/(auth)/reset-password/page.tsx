'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Brain, Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const SMOOTH = [0.25, 1, 0.5, 1] as const;

const TIPS = [
  'Use a mix of letters, numbers & symbols',
  'Avoid reusing passwords from other sites',
  'Consider using a password manager',
];

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

  const checks = [
    { label: '8+ chars', met: newPassword.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(newPassword) },
    { label: 'Number', met: /[0-9]/.test(newPassword) },
    { label: 'Symbol', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

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
      <motion.div className="text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: SMOOTH }}>
        <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h1>
        <p className="text-muted-foreground text-sm mb-6">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password">
          <Button className="h-11 px-6 bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-xl shadow-sm shadow-[#7b68ee]/20 hover:shadow-md transition-all">
            Request New Link
          </Button>
        </Link>
      </motion.div>
    );
  }

  if (success) {
    return (
      <motion.div className="text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: SMOOTH }}>
        <div className="h-14 w-14 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-6 w-6 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h1>
        <p className="text-muted-foreground text-sm mb-6">Your password has been successfully reset.</p>
        <Link href="/login">
          <Button className="w-full h-11 bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-xl shadow-sm shadow-[#7b68ee]/20 hover:shadow-md transition-all">
            Sign in with new password
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: SMOOTH }}>
      <div className="flex items-center gap-3 mb-1">
        <div className="h-9 w-9 rounded-xl bg-[#7b68ee]/10 flex items-center justify-center">
          <KeyRound className="h-4.5 w-4.5 text-[#7b68ee]" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8 ml-12">Enter your new password below</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20"
          >
            <div className="h-7 w-7 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs">⚠</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">New Password</label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-[#7b68ee] transition-colors" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 pr-10 h-11 border-border bg-card rounded-xl focus:border-[#7b68ee] focus:ring-2 focus:ring-[#7b68ee]/10"
              required
              minLength={8}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPassword && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {checks.map((c, i) => (
                <span
                  key={i}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                    c.met
                      ? 'bg-[#7b68ee]/10 text-[#7b68ee]'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {c.met ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">Confirm New Password</label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-[#7b68ee] transition-colors" />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`pl-10 pr-10 h-11 border-border bg-card rounded-xl focus:border-[#7b68ee] focus:ring-2 focus:ring-[#7b68ee]/10 ${
                confirmPassword && confirmPassword !== newPassword
                  ? 'border-red-300 dark:border-red-500/40 focus:border-red-400'
                  : ''
              }`}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-sm font-medium bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-xl shadow-sm shadow-[#7b68ee]/20 hover:shadow-md transition-all"
          disabled={loading || (!!confirmPassword && confirmPassword !== newPassword)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
        </Button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex bg-card">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-130 bg-linear-to-br from-[#7b68ee] via-[#6c5ce7] to-[#5a4bd1] relative overflow-hidden">
        {/* Abstract decorative shapes */}
        <div className="absolute top-16 -left-8 w-48 h-48 bg-white/5 rounded-full blur-xl" />
        <div className="absolute bottom-24 right-4 w-36 h-36 bg-white/5 rounded-full blur-xl" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 border border-white/20 rounded-2xl rotate-12" />
          <div className="absolute bottom-32 right-8 w-32 h-32 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-56 h-56 border border-white/10 rounded-3xl -rotate-6" />
        </div>

        <div className="relative flex flex-col justify-between p-10 w-full">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">BrainForge</span>
          </Link>

          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
                Almost there.
                <br />Set a new password.
              </h2>
              <p className="text-white/70 text-sm max-w-xs">
                Choose a strong password to secure your account.
              </p>
            </div>

            <div className="space-y-3">
              {TIPS.map((tip, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-white/80" />
                  </div>
                  <span className="text-sm text-white/70">{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} BrainForge
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-linear-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">BrainForge</span>
          </div>

          <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#7b68ee]" /></div>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-[#7b68ee] transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
