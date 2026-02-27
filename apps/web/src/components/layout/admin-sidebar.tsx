'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Brain, Shield, BarChart3, Users, Building2, Activity,
  ArrowLeft, Settings, Database, Key, Bot,
  ChevronsLeft, ChevronsRight, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { useState, useRef } from 'react';

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: BarChart3, color: '#7b68ee' },
  { label: 'Users', href: '/admin/users', icon: Users, color: '#3b82f6' },
  { label: 'Teams', href: '/admin/teams', icon: Building2, color: '#22c55e' },
  { label: 'Activity', href: '/admin/activity', icon: Activity, color: '#f59e0b' },
  { label: 'AI Usage', href: '/admin/ai-usage', icon: Bot, color: '#8b5cf6' },
  { label: 'API Keys', href: '/admin/api-keys', icon: Key, color: '#ef4444' },
  { label: 'System', href: '/admin/system', icon: Database, color: '#6366f1' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, color: '#f97316' },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/* ── Tooltip for collapsed mode ── */
function NavTooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0 });

  if (!show) return <>{children}</>;

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top + rect.height / 2 });
    }
    setHovered(true);
  };

  return (
    <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setHovered(false)}>
      {children}
      {hovered && (
        <div
          className="fixed left-14 px-2.5 py-1 rounded-md bg-popover border shadow-md text-xs font-medium text-foreground whitespace-nowrap z-60 pointer-events-none animate-in fade-in duration-100"
          style={{ top: pos.top, transform: 'translateY(-50%)' }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isExpanded = !collapsed;

  const checkActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-border bg-sidebar shrink-0 overflow-hidden',
        'transition-all duration-300 ease-in-out hidden md:flex',
        collapsed ? 'w-13' : 'w-60',
      )}
    >
      {/* ── Header ── */}
      <div className={cn(
        'flex items-center h-12 border-b border-border shrink-0 transition-all duration-300',
        isExpanded ? 'gap-2 px-3' : 'justify-center px-0'
      )}>
        <button
          onClick={isExpanded ? onToggle : onToggle}
          className="h-7 w-7 rounded-lg bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0 hover:shadow-md transition-shadow"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Shield className="h-4 w-4 text-white" />
        </button>
        {isExpanded && (
          <>
            <span className="text-sm font-semibold text-foreground truncate flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
              Admin Panel
            </span>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group"
              title="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
          </>
        )}
      </div>

      {/* ── Expand button (collapsed only) ── */}
      {!isExpanded && (
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <button
            onClick={onToggle}
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Expand sidebar"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Back to app button ── */}
      <div className={cn('shrink-0', isExpanded ? 'px-2 pt-3 pb-1' : 'px-1.5 pt-3 pb-1')}>
        <NavTooltip label="Back to Dashboard" show={!isExpanded}>
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center rounded-md transition-colors text-muted-foreground hover:bg-accent hover:text-foreground',
              isExpanded ? 'gap-2.5 px-2.5 py-1.5 text-[13px]' : 'justify-center h-8',
            )}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {isExpanded && <span>Back to Dashboard</span>}
          </Link>
        </NavTooltip>
      </div>

      {/* ── Divider ── */}
      <div className={cn('my-1 transition-all duration-300', isExpanded ? 'mx-3 border-t border-border' : 'mx-auto w-6 border-t border-border')} />

      {/* ── Admin Section Label ── */}
      {isExpanded && (
        <div className="px-4 pt-2 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Management
          </span>
        </div>
      )}

      {/* ── Admin Navigation ── */}
      <div className={cn('flex-1 overflow-y-auto', isExpanded ? 'px-2 pt-1 space-y-0.5' : 'px-1.5 pt-2 space-y-1')}>
        {ADMIN_NAV.map(({ label, href, icon: Icon, color }) => (
          <NavTooltip key={href} label={label} show={!isExpanded}>
            <Link
              href={href}
              className={cn(
                'relative flex items-center rounded-md transition-colors',
                isExpanded ? 'gap-2.5 px-2.5 py-2 text-[13px]' : 'justify-center h-8',
                checkActive(href)
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <div className={cn(
                'shrink-0 flex items-center justify-center',
                isExpanded ? 'h-5 w-5 rounded' : ''
              )}
                style={isExpanded ? { backgroundColor: `${color}18` } : undefined}
              >
                <Icon className={cn(isExpanded ? 'h-3 w-3' : 'h-4 w-4')} style={isExpanded ? { color } : undefined} />
              </div>
              {isExpanded && <span className="flex-1 truncate">{label}</span>}
              {checkActive(href) && !isExpanded && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-lg bg-red-500" />
              )}
            </Link>
          </NavTooltip>
        ))}
      </div>

      {/* ── Bottom: Settings ── */}
      <div className={cn(
        'border-t border-border shrink-0',
        isExpanded ? 'px-2 py-2 space-y-0.5' : 'py-2 px-1.5 space-y-1'
      )}>
        <NavTooltip label="Admin Settings" show={!isExpanded}>
          <Link
            href="/admin/settings"
            className={cn(
              'flex items-center rounded-md transition-colors',
              isExpanded ? 'gap-2.5 px-2.5 py-1.5 text-[13px]' : 'justify-center h-8',
              checkActive('/admin/settings')
                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {isExpanded && <span>Settings</span>}
          </Link>
        </NavTooltip>
      </div>

      {/* ── User ── */}
      {user && (
        <div className={cn(
          'border-t border-border shrink-0 transition-all duration-300',
          isExpanded ? 'px-3 py-2.5' : 'py-2.5 flex justify-center'
        )}>
          {isExpanded ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-red-500/15 text-red-600 text-xs font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate text-foreground">{user.name}</p>
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-full">
                    <Shield className="h-2.5 w-2.5" />
                    Admin
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <NavTooltip label={`${user.name} (Admin)`} show>
              <Avatar className="h-7 w-7">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-red-500/15 text-red-600 text-xs font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </NavTooltip>
          )}
        </div>
      )}
    </aside>
  );
}
