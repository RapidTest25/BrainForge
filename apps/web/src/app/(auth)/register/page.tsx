'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, Loader2, User, Mail, Lock, Key, Shield, Users,
  Eye, EyeOff, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { GoogleAuthButton } from '@/components/google-auth-button';

const SMOOTH = [0.25, 1, 0.5, 1] as const;

const PERKS = [
  { icon: Key, text: 'Bring your own API keys — no markup' },
  { icon: Shield, text: 'Your data is encrypted at rest' },
  { icon: Users, text: 'Unlimited team members' },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth, isAuthenticated, hydrate } = useAuthStore();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<{ data: { user: any; tokens: any } }>('/auth/register', { name, email, password }, { skipAuthRetry: true });
      const userData = { ...res.data.user, avatar: res.data.user.avatarUrl || undefined, googleId: res.data.user.googleId || null, hasPassword: res.data.user.hasPassword ?? true };
      setAuth(userData, res.data.tokens);
      setSuccess('Account created! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 800);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = [
    { label: '8+ chars', met: password.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
  ];

  const allChecksMet = passwordChecks.every((c) => c.met);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-130 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-[#6c5ce7] via-[#7b68ee] to-[#8b7cf6]" />

        {/* Abstract shapes */}
        <div className="absolute inset-0">
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-1/3 right-10 w-36 h-36 border border-white/10 rounded-2xl rotate-45" />
          <div className="absolute top-1/4 left-12 w-28 h-28 border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-52 h-52 border border-white/5 rounded-3xl -rotate-12" />
        </div>

        {/* Content */}
        <div className="relative flex flex-col justify-between p-10 w-full">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">BrainForge</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: SMOOTH }}
          >
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Start building
              <br />
              <span className="text-white/80">something amazing.</span>
            </h2>
            <p className="text-white/60 text-sm mb-8 max-w-xs leading-relaxed">
              Join teams using BrainForge to collaborate, plan, and build with AI assistance.
            </p>
            <div className="space-y-3">
              {PERKS.map((item, i) => (
                <motion.div
                  key={item.text}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1, ease: SMOOTH }}
                >
                  <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-white/80" />
                  </div>
                  <span className="text-sm text-white/70">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-white text-xs font-bold">∞</span>
            </div>
            <div>
              <p className="text-xs text-white/60">Free forever</p>
              <p className="text-xs text-white/40">No credit card required</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <motion.div
          className="w-full max-w-100 py-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: SMOOTH }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-linear-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">BrainForge</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1.5">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-8">Free forever — no credit card required</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="h-5 w-5 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                  <span className="text-red-500 text-xs">!</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200/60 dark:border-green-500/20"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                  <span className="text-green-500 text-xs">✓</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full name</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-[#7b68ee] transition-colors" />
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11 border-border bg-card rounded-xl focus:border-[#7b68ee] focus:ring-2 focus:ring-[#7b68ee]/10 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-[#7b68ee] transition-colors" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 border-border bg-card rounded-xl focus:border-[#7b68ee] focus:ring-2 focus:ring-[#7b68ee]/10 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-[#7b68ee] transition-colors" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 border-border bg-card rounded-xl focus:border-[#7b68ee] focus:ring-2 focus:ring-[#7b68ee]/10 transition-all"
                  required
                  minLength={8}
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
              {/* Password strength */}
              {password && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-1">
                    {passwordChecks.map((check, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          check.met ? 'bg-[#7b68ee]' : 'bg-muted'
                        }`}
                      />
                    ))}
                    <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${/[^A-Za-z0-9]/.test(password) ? 'bg-[#7b68ee]' : 'bg-muted'}`} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {passwordChecks.map((check) => (
                      <span
                        key={check.label}
                        className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                          check.met
                            ? 'text-[#7b68ee] bg-[#7b68ee]/10'
                            : 'text-muted-foreground bg-muted'
                        }`}
                      >
                        {check.met ? '✓' : '○'} {check.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-[#7b68ee] transition-colors" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 pr-10 h-11 border-border bg-card rounded-xl focus:border-[#7b68ee] focus:ring-2 focus:ring-[#7b68ee]/10 transition-all ${
                    confirmPassword && confirmPassword !== password ? 'border-red-300 dark:border-red-500/40' : ''
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
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1">
                  <span>✕</span> Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-xl shadow-sm shadow-[#7b68ee]/20 hover:shadow-md hover:shadow-[#7b68ee]/25 transition-all"
              disabled={loading || (!!confirmPassword && confirmPassword !== password)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  Create account <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <GoogleAuthButton
            onError={(msg) => setError(msg)}
            onSuccess={(msg) => setSuccess(msg)}
            label="Sign up with Google"
          />

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-[#7b68ee] font-semibold hover:text-[#6c5ce7] transition-colors">
              Sign in
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              &larr; Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
