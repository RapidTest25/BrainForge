'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Brain, LayoutDashboard, CheckSquare, MessageSquare,
  GitBranch, Calendar, Zap, FileText, Key, Settings,
  ChevronDown, Users, Home, Bell, Target, Star,
  PanelLeftClose, BookOpen, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamStore } from '@/stores/team-store';
import { useAuthStore } from '@/stores/auth-store';
import { useState } from 'react';

const MAIN_NAV = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Goals', href: '/goals', icon: Target },
];

const FAVORITES = [
  { label: 'My Tasks', href: '/tasks', icon: CheckSquare, color: '#7b68ee' },
  { label: 'Sprint Board', href: '/sprints', icon: Zap, color: '#ef4444' },
];

const SPACE_NAV = [
  { label: 'Tasks', href: '/tasks', icon: CheckSquare, color: '#7b68ee' },
  { label: 'Brainstorm', href: '/brainstorm', icon: MessageSquare, color: '#22c55e' },
  { label: 'Diagrams', href: '/diagrams', icon: GitBranch, color: '#f59e0b' },
  { label: 'Calendar', href: '/calendar', icon: Calendar, color: '#3b82f6' },
  { label: 'Sprints', href: '/sprints', icon: Zap, color: '#ef4444' },
  { label: 'Notes', href: '/notes', icon: FileText, color: '#8b5cf6' },
];

const BOTTOM_NAV = [
  { label: 'Docs', href: '/docs', icon: BookOpen },
  { label: 'AI Keys', href: '/settings/ai-keys', icon: Key },
  { label: 'Team', href: '/settings/team', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

type SectionState = { favorites: boolean; spaces: boolean };

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobile, onMobileClose }: SidebarProps) {
  const [sections, setSections] = useState<SectionState>({ favorites: true, spaces: true });
  const pathname = usePathname();
  const { activeTeam } = useTeamStore();
  const { user } = useAuthStore();

  const toggle = (key: keyof SectionState) =>
    setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const checkActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/settings') return pathname === '/settings';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleNavClick = () => {
    if (mobile && onMobileClose) onMobileClose();
  };

  // ── Collapsed sidebar (desktop only) ──
  if (collapsed && !mobile) {
    return (
      <aside className="hidden md:flex flex-col h-screen w-13 border-r border-border bg-sidebar shrink-0 items-center">
        <div className="flex items-center justify-center h-12 border-b border-border w-full">
          <button onClick={onToggle} className="h-7 w-7 rounded-lg bg-linear-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center" title="Expand sidebar">
            <Brain className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="pt-3 pb-1 space-y-1 w-full px-1.5">
          {MAIN_NAV.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} title={label} className={cn('flex items-center justify-center h-8 w-full rounded-md transition-colors', checkActive(href) ? 'bg-primary/8 text-[#7b68ee]' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
              <Icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
        <div className="w-6 border-t border-border my-1" />
        <div className="space-y-1 w-full px-1.5 flex-1 overflow-y-auto">
          {SPACE_NAV.map(({ label, href, icon: Icon, color }) => (
            <Link key={`c-${label}`} href={href} title={label} className={cn('flex items-center justify-center h-8 w-full rounded-md transition-colors', checkActive(href) ? 'bg-primary/8' : 'hover:bg-accent')}>
              <div className="h-5 w-5 rounded flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon className="h-3 w-3" style={{ color }} />
              </div>
            </Link>
          ))}
        </div>
        <div className="py-2 border-t border-border space-y-1 w-full px-1.5">
          {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} title={label} className={cn('flex items-center justify-center h-8 w-full rounded-md transition-colors', checkActive(href) ? 'bg-primary/8 text-[#7b68ee]' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
              <Icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
        {user && (
          <div className="py-2.5 border-t border-border">
            <Avatar className="h-7 w-7">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="bg-[#7b68ee]/15 text-[#7b68ee] text-xs font-medium">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </aside>
    );
  }

  // ── Expanded sidebar ──
  return (
    <aside className={cn(
      'flex flex-col h-screen border-r border-border bg-sidebar shrink-0',
      mobile ? 'w-72' : 'hidden md:flex w-60'
    )}>
      <div className="flex items-center gap-2 px-3 h-12 border-b border-border">
        <div className="h-7 w-7 rounded-lg bg-linear-to-br from-[#7b68ee] to-[#a78bfa] flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground truncate flex-1">{activeTeam?.name || 'BrainForge'}</span>
        {mobile ? (
          <button
            onClick={onMobileClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={onToggle} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Collapse sidebar">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-2 pt-3 pb-1 space-y-0.5">
        {MAIN_NAV.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} onClick={handleNavClick} className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors', checkActive(href) ? 'bg-primary/8 text-[#7b68ee] font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className="px-2 pt-2 flex-1 overflow-y-auto space-y-3">
        {/* Favorites */}
        <div>
          <button onClick={() => toggle('favorites')} className="flex items-center justify-between w-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group">
            <div className="flex items-center gap-1.5"><Star className="h-3 w-3" /><span>Favorites</span></div>
            <ChevronDown className={cn('h-3 w-3 transition-transform opacity-0 group-hover:opacity-100', !sections.favorites && '-rotate-90')} />
          </button>
          {sections.favorites && (
            <div className="mt-1 space-y-0.5">
              {FAVORITES.map(({ label, href, icon: Icon, color }) => (
                <Link key={`fav-${label}`} href={href} onClick={handleNavClick} className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors', checkActive(href) ? 'bg-primary/8 text-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                  <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}><Icon className="h-3 w-3" style={{ color }} /></div>
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Spaces */}
        <div>
          <button onClick={() => toggle('spaces')} className="flex items-center justify-between w-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group">
            <div className="flex items-center gap-1.5"><LayoutDashboard className="h-3 w-3" /><span>Spaces</span></div>
            <ChevronDown className={cn('h-3 w-3 transition-transform opacity-0 group-hover:opacity-100', !sections.spaces && '-rotate-90')} />
          </button>
          {sections.spaces && (
            <div className="mt-1 space-y-0.5">
              {SPACE_NAV.map(({ label, href, icon: Icon, color }) => (
                <Link key={`space-${label}`} href={href} onClick={handleNavClick} className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors', checkActive(href) ? 'bg-primary/8 text-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                  <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}><Icon className="h-3 w-3" style={{ color }} /></div>
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-2 py-2 border-t border-border space-y-0.5">
        {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} onClick={handleNavClick} className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors', checkActive(href) ? 'bg-primary/8 text-[#7b68ee] font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      {user && (
        <div className="px-3 py-2.5 border-t border-border">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="bg-[#7b68ee]/15 text-[#7b68ee] text-xs font-medium">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-foreground">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
