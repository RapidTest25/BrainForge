'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTeamStore } from '@/stores/team-store';
import { useProjectStore } from '@/stores/project-store';
import { useProjectSocket, EntityChangedEvent } from '@/hooks/use-project-socket';

const ENTITY_QUERY_MAP: Record<string, string[]> = {
  task: ['tasks'],
  goal: ['goals'],
  note: ['notes'],
  diagram: ['diagrams'],
  brainstorm: ['brainstorm-sessions'],
  sprint: ['sprints'],
  calendar: ['calendar'],
};

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { activeTeam } = useTeamStore();
  const { activeProject } = useProjectStore();
  const teamId = activeTeam?.id;
  const queryClient = useQueryClient();
  const { on } = useProjectSocket(activeProject?.id);

  useEffect(() => {
    if (!activeProject?.id || !teamId) return;

    const cleanup = on('entity:changed', (data: EntityChangedEvent) => {
      const queryKeys = ENTITY_QUERY_MAP[data.type];
      if (queryKeys) {
        for (const key of queryKeys) {
          queryClient.invalidateQueries({ queryKey: [key, teamId] });
        }
      }
      // Also invalidate project-specific queries
      if (data.type === 'task' || data.type === 'goal') {
        queryClient.invalidateQueries({ queryKey: ['project', activeProject.id] });
      }
    });

    // Specific diagram update listener
    const cleanupDiagram = on('diagram:update', (data: { diagramId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['diagram', data.diagramId] });
    });

    // Specific note update listener
    const cleanupNote = on('note:update', () => {
      queryClient.invalidateQueries({ queryKey: ['notes', teamId] });
    });

    // Task move listener
    const cleanupTask = on('task:move', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
    });

    return () => {
      cleanup();
      cleanupDiagram();
      cleanupNote();
      cleanupTask();
    };
  }, [activeProject?.id, teamId, on, queryClient]);

  return <>{children}</>;
}
