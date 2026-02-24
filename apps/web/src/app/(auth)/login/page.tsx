'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Loader2, ArrowRight, Mail, Lock, CheckSquare, MessageSquare, GitBranch, Zap, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

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
      setAuth(res.data.user, res.data.tokens);

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
    <div className="min-h-screen flex bg-white">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] bg-gradient-to-br from-[#7b68ee] to-[#6c5ce7] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 border border-white/20 rounded-2xl rotate-12" />
          <div className="absolute bottom-32 right-8 w-32 h-32 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-56 h-56 border border-white/10 rounded-3xl -rotate-6" />
        </div>
        <div className="relative flex flex-col justify-between p-10 w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">BrainForge</span>
          </Link>

          <div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Manage everything.
              <br />In one place.
            </h2>
            <p className="text-white/70 text-sm mb-8 max-w-xs">
              Tasks, brainstorming, diagrams, sprints, and more — all powered by AI.
            </p>
            <div className="space-y-3">
              {[
                { icon: CheckSquare, text: 'Task boards with Kanban & list views' },
                { icon: MessageSquare, text: 'AI brainstorming with multiple modes' },
                { icon: GitBranch, text: 'Auto-generate diagrams & flowcharts' },
                { icon: Zap, text: 'Sprint planning with milestones' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 text-white/70 shrink-0" />
                  <span className="text-sm text-white/80">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} BrainForge
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#1a1a2e]">BrainForge</span>
          </div>

          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-8">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-10 border-gray-200 focus:border-[#7b68ee] focus:ring-[#7b68ee]/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#7b68ee] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-10 border-gray-200 focus:border-[#7b68ee] focus:ring-[#7b68ee]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                  rememberMe
                    ? 'bg-[#7b68ee] border-[#7b68ee]'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {rememberMe && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <label
                className="text-sm text-gray-600 cursor-pointer select-none"
                onClick={() => setRememberMe(!rememberMe)}
              >
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-sm font-medium bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#7b68ee] font-medium hover:underline">
              Sign up
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              &larr; Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
