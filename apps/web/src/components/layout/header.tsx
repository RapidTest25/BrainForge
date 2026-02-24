'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Plus, ChevronDown, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team-store';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Home',
  '/tasks': 'Tasks',
  '/brainstorm': 'Brainstorm',
  '/diagrams': 'Diagrams',
  '/calendar': 'Calendar',
  '/sprints': 'Sprints',
  '/notes': 'Notes',
  '/settings': 'Settings',
  '/settings/ai-keys': 'AI Keys',
  '/settings/team': 'Team',
  '/notifications': 'Notifications',
  '/goals': 'Goals',
  '/docs': 'Documentation',
};

const SEARCH_PAGES = [
  { label: 'Tasks', href: '/tasks', icon: '✓' },
  { label: 'Brainstorm', href: '/brainstorm', icon: '💬' },
  { label: 'Diagrams', href: '/diagrams', icon: '⎈' },
  { label: 'Notes', href: '/notes', icon: '📝' },
  { label: 'Sprints', href: '/sprints', icon: '⚡' },
  { label: 'Calendar', href: '/calendar', icon: '📅' },
  { label: 'Settings', href: '/settings', icon: '⚙' },
  { label: 'AI Keys', href: '/settings/ai-keys', icon: '🔑' },
  { label: 'Team', href: '/settings/team', icon: '👥' },
  { label: 'Goals', href: '/goals', icon: '🎯' },
  { label: 'Notifications', href: '/notifications', icon: '🔔' },
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
];

export function Header() {
  const { user, logout } = useAuthStore();
  const { activeTeam } = useTeamStore();
  const teamId = activeTeam?.id;
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[pathname] || 'BrainForge';

  const filteredPages = searchQuery.trim()
    ? SEARCH_PAGES.filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: notifications, isLoading: notifLoading } = useQuery({
    queryKey: ['notifications', teamId],
    queryFn: () => api.get<{ data: any[] }>(`/teams/${teamId}/notifications`),
    enabled: !!teamId,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/teams/${teamId}/notifications/${id}`, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', teamId] }),
  });

  const notifList = notifications?.data || [];
  const unreadCount = notifList.filter((n: any) => !n.read).length;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    logout();
    router.push('/login');
  };

  return (
    <header className="h-12 border-b border-border bg-white flex items-center justify-between px-4">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">{pageTitle}</h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        <div ref={searchRef} className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); }
              if (e.key === 'Enter' && filteredPages.length > 0) {
                router.push(filteredPages[0].href);
                setSearchQuery('');
                setShowSearch(false);
              }
            }}
            className="pl-8 h-8 w-48 text-[13px] bg-muted/40 border-transparent focus:border-border focus:bg-white focus:w-64 transition-all"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
          {showSearch && filteredPages.length > 0 && (
            <div className="absolute top-full mt-1 right-0 w-64 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
              {filteredPages.map(p => (
                <button
                  key={p.href}
                  onClick={() => { router.push(p.href); setSearchQuery(''); setShowSearch(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors"
                >
                  <span className="text-sm">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-7 px-2.5 text-xs gap-1 rounded-md">
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => router.push('/tasks?new=true')} className="text-[13px]">Task</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/brainstorm?new=true')} className="text-[13px]">Brainstorm</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/diagrams?new=true')} className="text-[13px]">Diagram</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/notes?new=true')} className="text-[13px]">Note</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/sprints?new=true')} className="text-[13px]">Sprint</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notification dropdown */}
        <div ref={notifRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
          {showNotifications && (
            <div className="absolute top-full mt-1 right-0 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-sm font-semibold text-[#1a1a2e]">Notifications</span>
                <button
                  onClick={() => { setShowNotifications(false); router.push('/notifications'); }}
                  className="text-xs text-[#7b68ee] hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : notifList.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  notifList.slice(0, 8).map((n: any) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markReadMutation.mutate(n.id);
                        setShowNotifications(false);
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${!n.read ? 'bg-[#7b68ee]/3' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <div className="h-2 w-2 rounded-full bg-[#7b68ee] mt-1.5 shrink-0" />}
                        <div className={!n.read ? '' : 'pl-4'}>
                          <p className="text-sm text-[#1a1a2e] font-medium line-clamp-1">{n.title}</p>
                          {n.message && <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{n.message}</p>}
                          <p className="text-[11px] text-gray-300 mt-1">
                            {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent transition-colors">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-[#7b68ee]/15 text-[#7b68ee] text-[10px] font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[13px] font-normal">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')} className="text-[13px]">Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings/ai-keys')} className="text-[13px]">AI Keys</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-[13px] text-destructive">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
