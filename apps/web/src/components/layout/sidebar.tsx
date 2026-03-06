'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, MessageSquare,
  GitBranch, Calendar, Zap, FileText, Key, Settings,
  ChevronDown, Users, Home, Target, Star,
  PanelLeftClose, PanelLeftOpen, BookOpen, X, Bot,
  FolderKanban, Circle, ChevronsLeft, ChevronsRight, Shield
} from 'lucide-react';
import { BrainForgeLogo } from '@/components/icons/brainforge-logo';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamStore } from '@/stores/team-store';
import { useAuthStore } from '@/stores/auth-store';
import { useProjectStore, Project } from '@/stores/project-store';
import { ProjectIcon } from '@/components/shared/project-icon';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';

const MAIN_NAV = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'AI Chat', href: '/ai-chat', icon: Bot },
];

const PROJECT_DEPENDENT_HREFS = new Set(['/goals', '/tasks', '/brainstorm', '/diagrams', '/calendar', '/sprints', '/notes']);

const DEFAULT_FAVORITES = ['/tasks', '/sprints'];

// All favoritable items (MAIN_NAV + SPACE_NAV + BOTTOM_NAV)
const ALL_NAV_ITEMS: Array<{ label: string; href: string; icon: any; color?: string }> = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'AI Chat', href: '/ai-chat', icon: Bot },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare, color: '#7b68ee' },
  { label: 'Brainstorm', href: '/brainstorm', icon: MessageSquare, color: '#22c55e' },
  { label: 'Diagrams', href: '/diagrams', icon: GitBranch, color: '#f59e0b' },
  { label: 'Calendar', href: '/calendar', icon: Calendar, color: '#3b82f6' },
  { label: 'Sprints', href: '/sprints', icon: Zap, color: '#ef4444' },
  { label: 'Notes', href: '/notes', icon: FileText, color: '#8b5cf6' },
  { label: 'Docs', href: '/docs', icon: BookOpen },
  { label: 'BYOK', href: '/settings/ai-keys', icon: Key },
  { label: 'Team', href: '/settings/team', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const LS_FAV_KEY = 'brainforge-favorites';
function loadFavorites(): string[] {
  if (typeof window === 'undefined') return DEFAULT_FAVORITES;
  try {
    const v = localStorage.getItem(LS_FAV_KEY);
    return v ? JSON.parse(v) : DEFAULT_FAVORITES;
  } catch { return DEFAULT_FAVORITES; }
}
function saveFavorites(favs: string[]) {
  try { localStorage.setItem(LS_FAV_KEY, JSON.stringify(favs)); } catch {}
}

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
  { label: 'BYOK', href: '/settings/ai-keys', icon: Key },
  { label: 'Team', href: '/settings/team', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const ADMIN_NAV = { label: 'Admin', href: '/admin', icon: Shield };

type SectionState = { favorites: boolean; spaces: boolean };

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onMobileClose?: () => void;
}

/* ── Tooltip for collapsed mode (uses fixed positioning to avoid overflow) ── */
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
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
    >
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

// ── Right-click context menu ──
function ContextMenu({ x, y, href, isFav, onToggleFav, onClose }: {
  x: number; y: number; href: string; isFav: boolean;
  onToggleFav: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="fixed z-100 min-w-40 rounded-lg border border-border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
    >
      <button
        onClick={() => { onToggleFav(); onClose(); }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] hover:bg-accent transition-colors text-left"
      >
        <Star className={cn('h-3.5 w-3.5', isFav ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
        <span className={isFav ? 'text-foreground' : 'text-muted-foreground'}>
          {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
        </span>
      </button>
    </div>
  );
}

export function Sidebar({ collapsed, onToggle, mobile, onMobileClose }: SidebarProps) {
  const [sections, setSections] = useState<SectionState>({ favorites: true, spaces: true });
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>(DEFAULT_FAVORITES);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; href: string } | null>(null);
  const pathname = usePathname();
  const { activeTeam } = useTeamStore();
  const { user } = useAuthStore();
  const { activeProject, setActiveProject, setProjects } = useProjectStore();
  const projectPickerRef = useRef<HTMLDivElement>(null);

  // Load favorites from localStorage on mount
  useEffect(() => { setFavoriteHrefs(loadFavorites()); }, []);

  const toggleFavorite = useCallback((href: string) => {
    setFavoriteHrefs(prev => {
      const next = prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((href: string) => favoriteHrefs.includes(href), [favoriteHrefs]);

  const handleContextMenu = useCallback((e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, href });
  }, []);

  const toggle = (key: keyof SectionState) =>
    setSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Fetch projects for the active team
  const { data: projectsRes } = useQuery({
    queryKey: ['projects', activeTeam?.id],
    queryFn: () => api.get<{ data: Project[] }>(`/teams/${activeTeam?.id}/projects`),
    enabled: !!activeTeam?.id,
  });
  const projectList = projectsRes?.data || [];
  const hasProjects = projectList.length > 0;

  // Resolve favorite items from ALL_NAV_ITEMS (hide project-dependent ones when no projects)
  const favoriteItems = favoriteHrefs
    .map(href => ALL_NAV_ITEMS.find(item => item.href === href))
    .filter((item): item is (typeof ALL_NAV_ITEMS)[number] => !!item && (hasProjects || !PROJECT_DEPENDENT_HREFS.has(item.href)));

  // Sync projects to store & auto-select first project if none active
  useEffect(() => {
    if (projectList.length > 0) {
      setProjects(projectList);
      // Auto-select the first project if none is currently active
      if (!activeProject) {
        const saved = localStorage.getItem('brainforge_active_project');
        const savedProject = saved ? projectList.find((p: Project) => p.id === saved) : null;
        setActiveProject(savedProject || projectList[0]);
      }
    }
  }, [projectList, setProjects, activeProject, setActiveProject]);

  // Close project picker on outside click
  useEffect(() => {
    if (!showProjectPicker) return;
    const handle = (e: MouseEvent) => {
      if (projectPickerRef.current && !projectPickerRef.current.contains(e.target as Node)) {
        setShowProjectPicker(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showProjectPicker]);

  // Close project picker when sidebar collapses
  useEffect(() => {
    if (collapsed) setShowProjectPicker(false);
  }, [collapsed]);

  const checkActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/settings') return pathname === '/settings';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleNavClick = () => {
    if (mobile && onMobileClose) onMobileClose();
  };



  const isExpanded = !collapsed || mobile;

  // ── Unified sidebar with smooth transitions ──
  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-border bg-sidebar shrink-0 overflow-hidden',
        'transition-all duration-300 ease-in-out',
        mobile ? 'w-72' : 'hidden md:flex',
        !mobile && collapsed ? 'w-13' : '',
        !mobile && !collapsed ? 'w-60' : '',
      )}
    >
      {/* ── Header ── */}
      <div className={cn(
        'flex items-center h-12 border-b border-border shrink-0 transition-all duration-300',
        isExpanded ? 'gap-2 px-3' : 'justify-center px-0'
      )}>
        <button
          onClick={isExpanded && !mobile ? onToggle : (!mobile ? onToggle : undefined)}
          className="shrink-0 hover:shadow-md transition-shadow rounded-lg"
          title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        >
          <BrainForgeLogo size={28} />
        </button>
        {isExpanded && (
          <>
            <span className="text-sm font-semibold text-foreground truncate flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
              {activeTeam?.name || 'BrainForge'}
            </span>
            {mobile ? (
              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group"
                title="Collapse sidebar (Ctrl+B)"
              >
                <ChevronsLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Expand button (collapsed only) ── */}
      {!isExpanded && (
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <button
            onClick={onToggle}
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Expand sidebar (Ctrl+B)"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Project Switcher (expanded only) ── */}
      <div className={cn(
        'transition-all duration-300',
        isExpanded && projectList.length > 0
          ? 'max-h-20 opacity-100 px-2 pt-2 pb-1'
          : 'max-h-0 opacity-0 px-2 overflow-hidden'
      )}>
        <div className="relative" ref={projectPickerRef}>
          <button
            onClick={() => setShowProjectPicker(!showProjectPicker)}
            className={cn(
              'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[12px] transition-colors',
              'hover:bg-accent group border border-border/50'
            )}
          >
            {activeProject ? (
              <>
                <ProjectIcon icon={activeProject.icon} className="h-3.5 w-3.5" style={{ color: activeProject.color }} />
                <span className="flex-1 text-left truncate font-medium text-foreground">{activeProject.name}</span>
              </>
            ) : (
              <>
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-left truncate text-muted-foreground">Select Project</span>
              </>
            )}
            <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', showProjectPicker && 'rotate-180')} />
          </button>
          {showProjectPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              {projectList.map((p: Project) => (
                <button
                  key={p.id}
                  onClick={() => { setActiveProject(p); setShowProjectPicker(false); }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5 text-[12px] transition-colors hover:bg-accent',
                    activeProject?.id === p.id && 'bg-accent/50 font-medium'
                  )}
                >
                  <ProjectIcon icon={p.icon} className="h-3.5 w-3.5" style={{ color: p.color }} />
                  <span className="flex-1 text-left truncate text-foreground">{p.name}</span>
                  <Circle className="h-2 w-2 shrink-0" style={{ fill: p.color, color: p.color }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main nav ── */}
      <div className={cn('pt-3 pb-1 shrink-0', isExpanded ? 'px-2 space-y-0.5' : 'px-1.5 space-y-1')}>
        {MAIN_NAV.filter(({ href }) => (!isExpanded || !favoriteHrefs.includes(href)) && (hasProjects || !PROJECT_DEPENDENT_HREFS.has(href))).map(({ label, href, icon: Icon }) => (
          <NavTooltip key={href} label={label} show={!isExpanded}>
            <Link
              href={href}
              onClick={handleNavClick}
              onContextMenu={(e) => handleContextMenu(e, href)}
              className={cn(
                'relative flex items-center rounded-md transition-colors',
                isExpanded ? 'gap-2.5 px-2.5 py-1.5 text-[13px]' : 'justify-center h-8',
                checkActive(href) ? 'bg-primary/8 text-[#7b68ee] font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="flex-1 truncate">{label}</span>}
            </Link>
          </NavTooltip>
        ))}
      </div>

      {/* ── Divider ── */}
      <div className={cn('my-1 transition-all duration-300', isExpanded ? 'mx-3 border-t border-border' : 'mx-auto w-6 border-t border-border')} />

      {/* ── Middle scrollable area ── */}
      <div className={cn('flex-1 overflow-y-auto', isExpanded ? 'px-2 pt-1 space-y-3' : 'px-1.5 pt-1 space-y-1')}>
        {!hasProjects ? null : isExpanded ? (
          <>
            {/* Favorites */}
            {favoriteItems.length > 0 && (
            <div>
              <button onClick={() => toggle('favorites')} className="flex items-center justify-between w-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group">
                <div className="flex items-center gap-1.5"><Star className="h-3 w-3" /><span>Favorites</span></div>
                <ChevronDown className={cn('h-3 w-3 transition-transform duration-200 opacity-0 group-hover:opacity-100', !sections.favorites && '-rotate-90')} />
              </button>
              <div className={cn(
                'overflow-hidden transition-all duration-200',
                sections.favorites ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'
              )}>
                <div className="space-y-0.5">
                  {favoriteItems.map(({ label, href, icon: Icon, color }) => (
                    <Link
                      key={`fav-${href}`}
                      href={href}
                      onClick={handleNavClick}
                      onContextMenu={(e) => handleContextMenu(e, href)}
                      className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors', checkActive(href) ? 'bg-primary/8 text-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                    >
                      <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${color || '#6b7280'}18` }}><Icon className="h-3 w-3" style={{ color: color || '#6b7280' }} /></div>
                      <span className="truncate">{label}</span>
                      <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400 ml-auto opacity-60" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* Spaces */}
            <div>
              <button onClick={() => toggle('spaces')} className="flex items-center justify-between w-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group">
                <div className="flex items-center gap-1.5"><LayoutDashboard className="h-3 w-3" /><span>Spaces</span></div>
                <ChevronDown className={cn('h-3 w-3 transition-transform duration-200 opacity-0 group-hover:opacity-100', !sections.spaces && '-rotate-90')} />
              </button>
              <div className={cn(
                'overflow-hidden transition-all duration-200',
                sections.spaces ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
              )}>
                <div className="space-y-0.5">
                  {SPACE_NAV.filter(({ href }) => !favoriteHrefs.includes(href)).map(({ label, href, icon: Icon, color }) => (
                    <Link
                      key={`space-${label}`}
                      href={href}
                      onClick={handleNavClick}
                      onContextMenu={(e) => handleContextMenu(e, href)}
                      className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors', checkActive(href) ? 'bg-primary/8 text-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                    >
                      <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}><Icon className="h-3 w-3" style={{ color }} /></div>
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Collapsed: Space icons only */
          SPACE_NAV.map(({ label, href, icon: Icon, color }) => (
            <NavTooltip key={`c-${label}`} label={label} show>
              <Link href={href} className={cn('flex items-center justify-center h-8 w-full rounded-md transition-colors', checkActive(href) ? 'bg-primary/8' : 'hover:bg-accent')}>
                <div className="h-5 w-5 rounded flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Icon className="h-3 w-3" style={{ color }} />
                </div>
              </Link>
            </NavTooltip>
          ))
        )}
      </div>

      {/* ── Bottom nav ── */}
      <div className={cn(
        'border-t border-border shrink-0',
        isExpanded ? 'px-2 py-2 space-y-0.5' : 'py-2 px-1.5 space-y-1'
      )}>
        {BOTTOM_NAV.filter(({ href }) => !isExpanded || !favoriteHrefs.includes(href)).map(({ label, href, icon: Icon }) => (
          <NavTooltip key={href} label={label} show={!isExpanded}>
            <Link
              href={href}
              onClick={handleNavClick}
              onContextMenu={(e) => handleContextMenu(e, href)}
              className={cn(
                'flex items-center rounded-md transition-colors',
                isExpanded ? 'gap-2.5 px-2.5 py-1.5 text-[13px]' : 'justify-center h-8',
                checkActive(href) ? 'bg-primary/8 text-[#7b68ee] font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {isExpanded && <span>{label}</span>}
            </Link>
          </NavTooltip>
        ))}
        {user && (user as any).isAdmin && (
          <NavTooltip label={ADMIN_NAV.label} show={!isExpanded}>
            <Link
              href={ADMIN_NAV.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center rounded-md transition-colors',
                isExpanded ? 'gap-2.5 px-2.5 py-1.5 text-[13px]' : 'justify-center h-8',
                checkActive(ADMIN_NAV.href) ? 'bg-red-500/10 text-red-600 font-medium' : 'text-red-400 hover:bg-red-500/10 hover:text-red-600'
              )}
            >
              <ADMIN_NAV.icon className="h-4 w-4 shrink-0" />
              {isExpanded && <span>{ADMIN_NAV.label}</span>}
            </Link>
          </NavTooltip>
        )}
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
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} referrerPolicy="no-referrer" />}
                <AvatarFallback className="bg-[#7b68ee]/15 text-[#7b68ee] text-xs font-medium">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate text-foreground">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <NavTooltip label={user.name} show>
              <Avatar className="h-7 w-7">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} referrerPolicy="no-referrer" />}
                <AvatarFallback className="bg-[#7b68ee]/15 text-[#7b68ee] text-xs font-medium">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </NavTooltip>
          )}
        </div>
      )}

      {/* ── Right-click context menu ── */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          href={ctxMenu.href}
          isFav={isFavorite(ctxMenu.href)}
          onToggleFav={() => toggleFavorite(ctxMenu.href)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </aside>
  );
}
