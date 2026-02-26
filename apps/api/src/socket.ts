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

    // Flow: node added
    socket.on('flow:node-add', (data: { sessionId: string; node: any }) => {
      socket.to(data.sessionId).emit('flow:node-add', data.node);
    });

    // Flow: node moved/updated
    socket.on('flow:node-update', (data: { sessionId: string; node: any }) => {
      socket.to(data.sessionId).emit('flow:node-update', data.node);
    });

    // Flow: node deleted
    socket.on('flow:node-delete', (data: { sessionId: string; nodeId: string }) => {
      socket.to(data.sessionId).emit('flow:node-delete', data.nodeId);
    });

    // Flow: edge added
    socket.on('flow:edge-add', (data: { sessionId: string; edge: any }) => {
      socket.to(data.sessionId).emit('flow:edge-add', data.edge);
    });

    // Flow: edge deleted
    socket.on('flow:edge-delete', (data: { sessionId: string; edgeId: string }) => {
      socket.to(data.sessionId).emit('flow:edge-delete', data.edgeId);
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

  return io;
}

export function getIO() {
  return io;
}
