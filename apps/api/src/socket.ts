import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

// Track room members for presence
const roomMembers = new Map<string, Map<string, { userId: string; userName: string; avatarUrl?: string }>>();

export function setupSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
    path: '/socket.io',
  });

  // Brainstorm namespace for realtime whiteboard/flow
  const brainstormNs = io.of('/brainstorm');

  brainstormNs.on('connection', (socket) => {
    const socketRooms: string[] = [];

    // Join a brainstorm session room
    socket.on('join-session', (data: string | { sessionId: string; user?: { id: string; name: string; avatarUrl?: string } }) => {
      const sessionId = typeof data === 'string' ? data : data.sessionId;
      const user = typeof data === 'object' ? data.user : undefined;
      socket.join(sessionId);
      socket.data.sessionId = sessionId;
      socketRooms.push(sessionId);

      // Presence tracking
      if (!roomMembers.has(sessionId)) roomMembers.set(sessionId, new Map());
      const members = roomMembers.get(sessionId)!;
      members.set(socket.id, {
        userId: user?.id || socket.id,
        userName: user?.name || 'Anonymous',
        avatarUrl: user?.avatarUrl,
      });
      brainstormNs.to(sessionId).emit('presence:members', Array.from(members.values()));
    });

    // Leave session room
    socket.on('leave-session', (sessionId: string) => {
      socket.leave(sessionId);
      const members = roomMembers.get(sessionId);
      if (members) {
        members.delete(socket.id);
        brainstormNs.to(sessionId).emit('presence:members', Array.from(members.values()));
        if (members.size === 0) roomMembers.delete(sessionId);
      }
      const idx = socketRooms.indexOf(sessionId);
      if (idx >= 0) socketRooms.splice(idx, 1);
    });

    // Whiteboard: new element drawn
    socket.on('whiteboard:draw', (data: { sessionId: string; element: any }) => {
      socket.to(data.sessionId).emit('whiteboard:draw', data.element);
    });

    // Whiteboard: undo last element
    socket.on('whiteboard:undo', (data: { sessionId: string }) => {
      socket.to(data.sessionId).emit('whiteboard:undo');
    });

    // Whiteboard: clear all
    socket.on('whiteboard:clear', (data: { sessionId: string }) => {
      socket.to(data.sessionId).emit('whiteboard:clear');
    });

    socket.on('disconnect', () => {
      // Clean up presence from all rooms
      for (const sessionId of socketRooms) {
        const members = roomMembers.get(sessionId);
        if (members) {
          members.delete(socket.id);
          brainstormNs.to(sessionId).emit('presence:members', Array.from(members.values()));
          if (members.size === 0) roomMembers.delete(sessionId);
        }
      }
    });
  });

  // ── Project namespace for realtime collaboration ──
  const projectNs = io.of('/project');

  projectNs.on('connection', (socket) => {
    let currentProjectId: string | null = null;

    socket.on('join-project', (data: { projectId: string; user?: { id: string; name: string } }) => {
      if (currentProjectId) {
        socket.leave(currentProjectId);
      }
      currentProjectId = data.projectId;
      socket.join(data.projectId);
    });

    socket.on('leave-project', (projectId: string) => {
      socket.leave(projectId);
      if (currentProjectId === projectId) currentProjectId = null;
    });

    // Generic entity change broadcast
    socket.on('entity:changed', (data: { projectId: string; type: string; action: string; entityId?: string }) => {
      socket.to(data.projectId).emit('entity:changed', data);
    });

    // Diagram realtime collaboration
    socket.on('diagram:update', (data: { projectId: string; diagramId: string; content: any }) => {
      socket.to(data.projectId).emit('diagram:update', data);
    });

    // Note realtime editing
    socket.on('note:update', (data: { projectId: string; noteId: string; content: string; title?: string }) => {
      socket.to(data.projectId).emit('note:update', data);
    });

    // Task move / status change (for board views)
    socket.on('task:move', (data: { projectId: string; taskId: string; status: string; order?: number }) => {
      socket.to(data.projectId).emit('task:move', data);
    });

    socket.on('disconnect', () => {
      if (currentProjectId) {
        socket.leave(currentProjectId);
      }
    });
  });

  return io;
}

export function getIO() {
  return io;
}
