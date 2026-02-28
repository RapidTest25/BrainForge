'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, Loader2, Mail, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const SMOOTH = [0.25, 1, 0.5, 1] as const;

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
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-130 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-[#7b68ee] via-[#6c5ce7] to-[#5a4bd1]" />

        {/* Abstract shapes */}
        <div className="absolute inset-0">
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-1/3 right-12 w-28 h-28 border border-white/10 rounded-2xl rotate-12" />
          <div className="absolute bottom-1/3 left-10 w-24 h-24 border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border border-white/5 rounded-3xl -rotate-6" />
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
              Don&apos;t worry.
              <br />
              <span className="text-white/80">We&apos;ve got you.</span>
            </h2>
            <p className="text-white/60 text-sm mb-8 max-w-xs leading-relaxed">
              Enter your email address and we&apos;ll help you reset your password securely.
            </p>
            <div className="space-y-3">
              {[
                { icon: KeyRound, text: 'Secure password reset via email' },
                { icon: ShieldCheck, text: 'Token expires after 1 hour' },
              ].map((item, i) => (
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

          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} BrainForge
          </p>
        </div>
      </div>

      {/* Right panel */}
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

          {!sent ? (
            <>
              <div className="inline-flex h-12 w-12 rounded-2xl bg-[#7b68ee]/10 items-center justify-center mb-5">
                <KeyRound className="h-6 w-6 text-[#7b68ee]" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1.5">Forgot password?</h1>
              <p className="text-muted-foreground text-sm mb-8">Enter your email to receive a reset link</p>

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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-[#7b68ee] transition-colors" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 border-border bg-card rounded-xl focus:border-[#7b68ee] focus:ring-2 focus:ring-[#7b68ee]/10 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-medium bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-xl shadow-sm shadow-[#7b68ee]/20 hover:shadow-md hover:shadow-[#7b68ee]/25 transition-all"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: SMOOTH }}
            >
              <div className="h-16 w-16 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-5">
                <Mail className="h-7 w-7 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, you&apos;ll receive a reset link.
              </p>

              {resetToken && (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border text-left">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Self-hosted mode — reset link:</p>
                  <button
                    onClick={() => router.push(`/reset-password?token=${resetToken}`)}
                    className="text-sm text-[#7b68ee] hover:text-[#6c5ce7] font-medium hover:underline break-all transition-colors"
                  >
                    Click here to reset your password
                  </button>
                </div>
              )}

              <Button
                onClick={() => { setSent(false); setResetToken(''); }}
                variant="outline"
                className="w-full h-11 text-sm rounded-xl border-border"
              >
                Try another email
              </Button>
            </motion.div>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-[#7b68ee] transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
