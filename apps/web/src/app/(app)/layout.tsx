'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useTeamStore } from '@/stores/team-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const { setTeams } = useTeamStore();
  const [hydrated, setHydrated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bf_sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('bf_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar
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

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  // Fetch teams
  useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>('/teams');
      setTeams(res.data);
      return res.data;
    },
    enabled: isAuthenticated,
  });

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" hideClose className="w-72 p-0 md:hidden">
          <Sidebar
            collapsed={false}
            onToggle={toggleSidebar}
            mobile
            onMobileClose={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
