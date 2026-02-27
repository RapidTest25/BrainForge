'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Loader2, Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, hydrate } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bf_admin_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('bf_admin_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  // Redirect non-auth or non-admin
  useEffect(() => {
    if (hydrated) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && !(user as any).isAdmin) {
        router.replace('/dashboard');
      }
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || !isAuthenticated) return null;

  if (user && !(user as any).isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-lg font-medium text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Admin sidebar */}
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Admin top bar */}
        <header className="h-12 border-b border-border bg-background flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-foreground">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Logged in as <span className="font-medium text-foreground">{user?.name}</span>
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
