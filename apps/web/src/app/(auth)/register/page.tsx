'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Loader2, User, Mail, Lock, Key, Shield, Users, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

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
  const { setAuth } = useAuthStore();
  const router = useRouter();

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

    setLoading(true);

    try {
      const res = await api.post<{ data: { user: any; tokens: any } }>('/auth/register', { name, email, password }, { skipAuthRetry: true });
      const userData = { ...res.data.user, avatar: res.data.user.avatarUrl || undefined };
      setAuth(userData, res.data.tokens);
      setSuccess('Account created! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 800);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] bg-gradient-to-br from-[#6c5ce7] to-[#7b68ee] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-20 left-12 w-36 h-36 border border-white/20 rounded-full" />
          <div className="absolute top-24 right-10 w-44 h-44 border border-white/20 rounded-2xl rotate-45" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-white/10 rounded-3xl -rotate-12" />
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
              Start building
              <br />something amazing.
            </h2>
            <p className="text-white/70 text-sm mb-8 max-w-xs">
              Join thousands of teams using BrainForge to collaborate with AI.
            </p>
            <div className="space-y-3">
              {[
                { icon: Key, text: 'Bring your own API keys — no markup' },
                { icon: Shield, text: 'Your data is encrypted at rest' },
                { icon: Users, text: 'Unlimited team members' },
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

          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">Create your account</h1>
          <p className="text-gray-500 text-sm mb-8">Free forever — no credit card required</p>

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
              <label className="text-sm font-medium text-gray-700">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-10 border-gray-200 focus:border-[#7b68ee] focus:ring-[#7b68ee]/20"
                  required
                />
              </div>
            </div>

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
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-10 border-gray-200 focus:border-[#7b68ee] focus:ring-[#7b68ee]/20"
                  required
                  minLength={8}
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
              {/* Password strength indicators */}
              {password && (
                <div className="flex gap-1 mt-1.5">
                  {[
                    password.length >= 8,
                    /[A-Z]/.test(password),
                    /[0-9]/.test(password),
                    /[^A-Za-z0-9]/.test(password),
                  ].map((met, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${met ? 'bg-[#7b68ee]' : 'bg-gray-200'}`} />
                  ))}
                </div>
              )}
              {password && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {[
                    password.length >= 8 ? null : '8+ chars',
                    /[A-Z]/.test(password) ? null : 'uppercase',
                    /[0-9]/.test(password) ? null : 'number',
                  ].filter(Boolean).join(', ') || 'Strong password!'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 pr-10 h-10 border-gray-200 focus:border-[#7b68ee] focus:ring-[#7b68ee]/20 ${
                    confirmPassword && confirmPassword !== password ? 'border-red-300 focus:border-red-400' : ''
                  }`}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-sm font-medium bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg"
              disabled={loading || (!!confirmPassword && confirmPassword !== password)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  Create account <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-[#7b68ee] font-medium hover:underline">
              Sign in
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
