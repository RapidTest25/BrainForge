'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

let socket: Socket | null = null;

function getProjectSocket() {
  if (!socket) {
    socket = io(`${SOCKET_URL}/project`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export type EntityType = 'task' | 'goal' | 'note' | 'diagram' | 'brainstorm' | 'sprint' | 'calendar';
export type EntityAction = 'create' | 'update' | 'delete';

export interface EntityChangedEvent {
  projectId: string;
  type: EntityType;
  action: EntityAction;
  entityId?: string;
}

export function useProjectSocket(projectId: string | null | undefined) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const s = getProjectSocket();
    socketRef.current = s;

    if (!s.connected) {
      s.connect();
    }
    s.emit('join-project', { projectId });

    return () => {
      s.emit('leave-project', projectId);
    };
  }, [projectId]);

  const emitEntityChange = useCallback((type: EntityType, action: EntityAction, entityId?: string) => {
    const s = socketRef.current;
    const pid = socketRef.current?.connected ? undefined : null;
    if (!s) return;
    // Get projectId from the hook closure
    s.emit('entity:changed', { projectId: projectId || '', type, action, entityId });
  }, [projectId]);

  const emitDiagramUpdate = useCallback((diagramId: string, content: any) => {
    socketRef.current?.emit('diagram:update', { projectId: projectId || '', diagramId, content });
  }, [projectId]);

  const emitNoteUpdate = useCallback((noteId: string, content: string, title?: string) => {
    socketRef.current?.emit('note:update', { projectId: projectId || '', noteId, content, title });
  }, [projectId]);

  const emitTaskMove = useCallback((taskId: string, status: string, order?: number) => {
    socketRef.current?.emit('task:move', { projectId: projectId || '', taskId, status, order });
  }, [projectId]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = getProjectSocket();
    s.on(event, handler);
    return () => { s.off(event, handler); };
  }, []);

  return {
    emitEntityChange,
    emitDiagramUpdate,
    emitNoteUpdate,
    emitTaskMove,
    on,
    socket: socketRef.current,
  };
}
