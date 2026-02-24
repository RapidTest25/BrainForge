'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Brain, Users, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export default function JoinTeamPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await api.get<{ data: any }>(`/teams/invite/${token}`);
        setInviteInfo(res.data);
        setStatus('ready');
      } catch (e: any) {
        setError(e.response?.data?.error || 'Invalid or expired invitation link');
        setStatus('error');
      }
    }
    if (token) fetchInvite();
  }, [token]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/join/${token}`);
      return;
    }
    setStatus('joining');
    try {
      await api.post(`/teams/join/${token}`);
      setStatus('success');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to join team');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1a1a2e]">BrainForge</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#7b68ee] mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading invitation...</p>
            </div>
          )}

          {status === 'ready' && inviteInfo && (
            <div className="text-center space-y-5">
              <div className="h-14 w-14 rounded-2xl bg-[#7b68ee]/10 flex items-center justify-center mx-auto">
                <Users className="h-7 w-7 text-[#7b68ee]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a2e]">You&apos;re invited to join</h2>
                <p className="text-2xl font-bold text-[#7b68ee] mt-1">{inviteInfo.teamName}</p>
                {inviteInfo.teamDescription && (
                  <p className="text-sm text-gray-500 mt-2">{inviteInfo.teamDescription}</p>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> {inviteInfo.memberCount} members
                </span>
                <span>Role: <span className="font-medium text-gray-600">{inviteInfo.role}</span></span>
              </div>
              <Button
                onClick={handleJoin}
                className="w-full h-11 bg-[#7b68ee] hover:bg-[#6c5ce7] text-white rounded-xl text-sm font-medium"
              >
                {isAuthenticated ? 'Join Team' : 'Log in to Join'}
              </Button>
              {!isAuthenticated && (
                <p className="text-xs text-gray-400">
                  Don&apos;t have an account? <Link href={`/register?redirect=/join/${token}`} className="text-[#7b68ee] hover:underline">Sign up</Link>
                </p>
              )}
            </div>
          )}

          {status === 'joining' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#7b68ee] mx-auto mb-3" />
              <p className="text-sm text-gray-500">Joining team...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Welcome to the team!</h3>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8 space-y-3">
              <XCircle className="h-12 w-12 text-red-400 mx-auto" />
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Unable to Join</h3>
              <p className="text-sm text-gray-500">{error}</p>
              <Link href="/">
                <Button variant="outline" className="mt-4">Go Home</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
