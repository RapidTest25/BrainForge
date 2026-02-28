'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, FolderKanban, MoreHorizontal, Pencil, Trash2,
  CheckSquare, MessageSquare, GitBranch, Target,
  Hash, Palette, Search, LayoutGrid, List,
  Rocket, Package, PaintBucket, Lightbulb, Zap, Flame, Star,
  BarChart3, Wrench, Crosshair, Smartphone, Globe,
  FlaskConical, FileText, Gamepad2, Building2,
  type LucideIcon
} from 'lucide-react';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore, Project } from '@/stores/project-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PROJECT_COLORS = [
  '#7b68ee', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
  '#6366f1', '#84cc16',
];

// Icon map: icon name string → Lucide component
export const PROJECT_ICON_MAP: Record<string, LucideIcon> = {
  rocket: Rocket,
  package: Package,
  paintBucket: PaintBucket,
  lightbulb: Lightbulb,
  zap: Zap,
  flame: Flame,
  star: Star,
  barChart: BarChart3,
  wrench: Wrench,
  crosshair: Crosshair,
  smartphone: Smartphone,
  globe: Globe,
  flask: FlaskConical,
  fileText: FileText,
  gamepad: Gamepad2,
  building: Building2,
};

const PROJECT_ICONS = Object.keys(PROJECT_ICON_MAP);

function ProjectIcon({ icon, className, style }: { icon: string; className?: string; style?: React.CSSProperties }) {
  const Icon = PROJECT_ICON_MAP[icon] || FolderKanban;
  return <Icon className={className} style={style} />;
}

export default function ProjectsPage() {
  const { activeTeam } = useTeamStore();
  const { setActiveProject, activeProject } = useProjectStore();
  const queryClient = useQueryClient();
  const teamId = activeTeam?.id;

  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);

  const { data: projectsRes, isLoading } = useQuery({
    queryKey: ['projects', teamId],
    queryFn: () => api.get<{ data: Project[] }>(`/teams/${teamId}/projects`),
    enabled: !!teamId,
  });

  const projects = projectsRes?.data || [];
  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color: string; icon: string }) =>
      api.post<Project>(`/teams/${teamId}/projects`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
      resetForm();
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; description?: string; color: string; icon: string }) =>
      api.patch<Project>(`/teams/${teamId}/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
      setEditProject(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${teamId}/projects/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
      if (activeProject?.id === id) setActiveProject(null);
      setDeleteConfirm(null);
    },
  });

  function resetForm() {
    setName('');
    setDescription('');
    setColor(PROJECT_COLORS[0]);
    setIcon(PROJECT_ICONS[0]);
  }

  function openEdit(project: Project) {
    setName(project.name);
    setDescription(project.description || '');
    setColor(project.color);
    setIcon(project.icon);
    setEditProject(project);
  }

  function handleCreate() {
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined, color, icon });
  }

  function handleUpdate() {
    if (!editProject || !name.trim()) return;
    updateMutation.mutate({ id: editProject.id, name: name.trim(), description: description.trim() || undefined, color, icon });
  }

  function handleSelect(project: Project) {
    if (activeProject?.id === project.id) {
      setActiveProject(null);
    } else {
      setActiveProject(project);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize your work into separate projects, like workspaces in Figma.
            </p>
          </div>
          <Button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="bg-[#7b68ee] hover:bg-[#6c5ce7] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Active Project Banner */}
        {activeProject && (
          <div
            className="mb-6 rounded-xl p-4 border flex items-center gap-4"
            style={{ backgroundColor: `${activeProject.color}08`, borderColor: `${activeProject.color}30` }}
          >
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${activeProject.color}18` }}
            >
              <ProjectIcon icon={activeProject.icon} className="h-6 w-6" style={{ color: activeProject.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: activeProject.color }}>Active Project</p>
              <p className="text-lg font-semibold text-foreground truncate">{activeProject.name}</p>
              {activeProject.description && (
                <p className="text-sm text-muted-foreground truncate">{activeProject.description}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveProject(null)}
              className="shrink-0"
            >
              Show All
            </Button>
          </div>
        )}

        {/* Search + View Toggle */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Projects */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-xl border bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-[#7b68ee]/10 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="h-8 w-8 text-[#7b68ee]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {search ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {search
                ? 'Try a different search term.'
                : 'Create your first project to organize tasks, brainstorms, diagrams, and goals into separate workspaces.'}
            </p>
            {!search && (
              <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-[#7b68ee] hover:bg-[#6c5ce7] text-white gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                isActive={activeProject?.id === project.id}
                onSelect={() => handleSelect(project)}
                onEdit={() => openEdit(project)}
                onDelete={() => setDeleteConfirm(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
                isActive={activeProject?.id === project.id}
                onSelect={() => handleSelect(project)}
                onEdit={() => openEdit(project)}
                onDelete={() => setDeleteConfirm(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            color={color} setColor={setColor}
            icon={icon} setIcon={setIcon}
            onSubmit={handleCreate}
            loading={createMutation.isPending}
            submitLabel="Create Project"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProject} onOpenChange={v => { if (!v) setEditProject(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            color={color} setColor={setColor}
            icon={icon} setIcon={setIcon}
            onSubmit={handleUpdate}
            loading={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this project? Items within the project won&apos;t be deleted, but they will be unlinked from this project.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Project Card (Grid View) ──
function ProjectCard({
  project, isActive, onSelect, onEdit, onDelete

}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const counts = project._count || { tasks: 0, brainstormSessions: 0, diagrams: 0, goals: 0 };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative rounded-xl border bg-card p-5 cursor-pointer transition-all hover:shadow-md',
        isActive && 'ring-0'
      )}
      style={isActive ? { boxShadow: `0 0 0 2px ${project.color}`, borderColor: `${project.color}50` } : undefined}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-11 w-11 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${project.color}18` }}
        >
          <ProjectIcon icon={project.icon} className="h-5 w-5" style={{ color: project.color }} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Name + Description */}
      <h3 className="font-semibold text-foreground mb-1 truncate">{project.name}</h3>
      {project.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
      )}
      {!project.description && <div className="mb-4" />}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> {counts.tasks}</span>
        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {counts.brainstormSessions}</span>
        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {counts.diagrams}</span>
        <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {counts.goals}</span>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div
          className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: project.color }}
        />
      )}

      {/* Bottom color bar */}
      <div
        className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full opacity-40"
        style={{ backgroundColor: project.color }}
      />
    </div>
  );
}

// ── Project Row (List View) ──
function ProjectRow({
  project, isActive, onSelect, onEdit, onDelete
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const counts = project._count || { tasks: 0, brainstormSessions: 0, diagrams: 0, goals: 0 };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-4 rounded-lg border bg-card px-4 py-3 cursor-pointer transition-all hover:shadow-sm',
        isActive && 'ring-0'
      )}
      style={isActive ? { boxShadow: `0 0 0 2px ${project.color}`, borderColor: `${project.color}50` } : undefined}
    >
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${project.color}18` }}
      >
        <ProjectIcon icon={project.icon} className="h-4 w-4" style={{ color: project.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{project.name}</h3>
        {project.description && (
          <p className="text-xs text-muted-foreground truncate">{project.description}</p>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> {counts.tasks}</span>
        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {counts.brainstormSessions}</span>
        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {counts.diagrams}</span>
        <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {counts.goals}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent shrink-0"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isActive && (
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />
      )}
    </div>
  );
}

// ── Project Form ──
function ProjectForm({
  name, setName, description, setDescription,
  color, setColor, icon, setIcon,
  onSubmit, loading, submitLabel,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  color: string; setColor: (v: string) => void;
  icon: string; setIcon: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-accent/30">
        <div
          className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18` }}
        >
          <ProjectIcon icon={icon} className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{name || 'Project Name'}</p>
          <p className="text-xs text-muted-foreground truncate">{description || 'Description'}</p>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
        <Input
          placeholder="e.g., Mobile App, Marketing Site"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
        <Textarea
          placeholder="What is this project about?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Icon */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Icon</label>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_ICONS.map(i => {
            const Icon = PROJECT_ICON_MAP[i];
            return (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center transition-all',
                  icon === i ? 'bg-accent ring-2 ring-[#7b68ee] scale-110' : 'hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Color</label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'h-7 w-7 rounded-full transition-all',
                color === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110'
              )}
              style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={onSubmit}
        disabled={!name.trim() || loading}
        className="w-full bg-[#7b68ee] hover:bg-[#6c5ce7] text-white"
      >
        {loading ? 'Saving...' : submitLabel}
      </Button>
    </div>
  );
}
