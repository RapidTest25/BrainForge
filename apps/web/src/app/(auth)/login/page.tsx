'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, Loader2, ArrowRight, Mail, Lock, Eye, EyeOff,
  CheckSquare, MessageSquare, GitBranch, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { GoogleAuthButton } from '@/components/google-auth-button';

const SMOOTH = [0.25, 1, 0.5, 1] as const;

const FEATURES = [
  { icon: CheckSquare, text: 'Task boards with Kanban & list views' },
  { icon: MessageSquare, text: 'AI brainstorming with multiple modes' },
  { icon: GitBranch, text: 'Auto-generate diagrams & flowcharts' },
  { icon: Zap, text: 'Sprint planning with milestones' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

  // Load remembered email
  useEffect(() => {
    const savedEmail = localStorage.getItem('brainforge_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post<{ data: { user: any; tokens: any } }>('/auth/login', { email, password }, { skipAuthRetry: true });
      const userData = { ...res.data.user, avatar: res.data.user.avatarUrl || undefined, googleId: res.data.user.googleId || null, hasPassword: res.data.user.hasPassword ?? true };
      setAuth(userData, res.data.tokens);

      if (rememberMe) {
        localStorage.setItem('brainforge_remember_email', email);
      } else {
        localStorage.removeItem('brainforge_remember_email');
      }

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 800);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-130 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-[#7b68ee] via-[#6c5ce7] to-[#5a4bd1]" />

        {/* Abstract shapes */}
        <div className="absolute inset-0">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-1/3 right-10 w-32 h-32 border border-white/10 rounded-2xl rotate-12" />
          <div className="absolute bottom-1/4 left-12 w-24 h-24 border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/5 rounded-3xl -rotate-6" />
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
              Manage everything.
              <br />
              <span className="text-white/80">In one place.</span>
            </h2>
            <p className="text-white/60 text-sm mb-8 max-w-xs leading-relaxed">
              Tasks, brainstorming, diagrams, sprints, and more — all powered by AI in a single workspace.
            </p>
            <div className="space-y-3">
              {FEATURES.map((item, i) => (
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
            <div className="flex -space-x-2">
              {['bg-blue-400', 'bg-green-400', 'bg-orange-400', 'bg-pink-400'].map((color, i) => (
                <div key={i} className={`h-7 w-7 rounded-full ${color} border-2 border-[#5a4bd1] flex items-center justify-center`}>
                  <span className="text-white text-[10px] font-bold">{['A', 'B', 'C', 'D'][i]}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40">
              Trusted by teams worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          className="w-full max-w-100"
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

          <h1 className="text-2xl font-bold text-foreground mb-1.5">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#7b68ee] hover:text-[#6c5ce7] font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-[#7b68ee] transition-colors" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
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
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`h-4.5 w-4.5 rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${
                  rememberMe
                    ? 'bg-[#7b68ee] border-[#7b68ee] shadow-sm shadow-[#7b68ee]/20'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                {rememberMe && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <label
                className="text-sm text-muted-foreground cursor-pointer select-none"
                onClick={() => setRememberMe(!rememberMe)}
              >
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-xl shadow-sm shadow-[#7b68ee]/20 hover:shadow-md hover:shadow-[#7b68ee]/25 transition-all"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="h-4 w-4" />
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
            label="Sign in with Google"
          />

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#7b68ee] font-semibold hover:text-[#6c5ce7] transition-colors">
              Sign up free
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
