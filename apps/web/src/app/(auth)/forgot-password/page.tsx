'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, Loader2, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{ data: { message: string; token?: string } }>('/auth/forgot-password', { email }, { skipAuthRetry: true });
      setSent(true);
      if (res.data.token) {
        setResetToken(res.data.token);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              Don&apos;t worry.
              <br />We&apos;ve got you.
            </h2>
            <p className="text-white/70 text-sm mb-8 max-w-xs">
              Enter your email address and we&apos;ll help you reset your password.
            </p>
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4 w-4 text-white/70 shrink-0" />
              <span className="text-sm text-white/80">Secure password reset</span>
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
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">BrainForge</span>
          </div>

          {!sent ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-1">Forgot password?</h1>
              <p className="text-muted-foreground text-sm mb-8">Enter your email to receive a reset link</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10 border-border focus:border-[#7b68ee] focus:ring-[#7b68ee]/20"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 text-sm font-medium bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-lg"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm mb-6">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, you&apos;ll receive a reset link.
              </p>

              {resetToken && (
                <div className="mb-6 p-4 bg-muted rounded-lg border border-border text-left">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Self-hosted mode — reset link:</p>
                  <button
                    onClick={() => router.push(`/reset-password?token=${resetToken}`)}
                    className="text-sm text-[#7b68ee] hover:underline break-all"
                  >
                    Click here to reset your password
                  </button>
                </div>
              )}

              <Button
                onClick={() => { setSent(false); setResetToken(''); }}
                variant="outline"
                className="w-full h-10 text-sm rounded-lg"
              >
                Try another email
              </Button>
            </div>
          )}

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
