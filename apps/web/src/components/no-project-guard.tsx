'use client';

import { FolderKanban, Plus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '@/components/ui/button';

interface NoProjectGuardProps {
  children: React.ReactNode;
  /** Page name to show in the prompt, e.g. "Tasks", "Notes" */
  pageName?: string;
}

/**
 * Wrapper component that checks if a project is selected.
 * If no project exists or none is selected, shows a prompt to create/select one.
 * Otherwise renders children normally.
 */
export function NoProjectGuard({ children, pageName = 'items' }: NoProjectGuardProps) {
  const router = useRouter();
  const { projects, activeProject } = useProjectStore();

  // If a project is active, render children normally
  if (activeProject) {
    return <>{children}</>;
  }

  // No projects at all — prompt to create one
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <FolderKanban className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Create a Project First</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You need to create a project before you can manage {pageName}.
              Projects help you organize all your work — tasks, notes, brainstorms, and more — in one place.
            </p>
          </div>
          <Button
            onClick={() => router.push('/projects')}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Create Your First Project
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Projects exist but none selected — prompt to select one
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-linear-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
          <FolderKanban className="h-10 w-10 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Select a Project</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please select a project from the sidebar to view and manage {pageName}.
            All {pageName.toLowerCase()} are organized within projects.
          </p>
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
          <ArrowRight className="h-3 w-3 rotate-180" />
          Use the project selector in the sidebar
        </div>
      </div>
    </div>
  );
}
