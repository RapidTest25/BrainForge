'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io(`${SOCKET_URL}/brainstorm`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export interface PresenceMember {
  userId: string;
  userName: string;
  avatarUrl?: string;
}

export function useBrainstormSocket(
  sessionId: string | null,
  user?: { id: string; name: string; avatarUrl?: string }
) {
  const socketRef = useRef<Socket | null>(null);
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const s = getSocket();
    socketRef.current = s;

    if (!s.connected) {
      s.connect();
    }
    s.emit('join-session', { sessionId, user: user || {} });

    const handleMembers = (memberList: PresenceMember[]) => {
      setMembers(memberList);
    };
    s.on('presence:members', handleMembers);

    return () => {
      s.emit('leave-session', sessionId);
      s.off('presence:members', handleMembers);
    };
  }, [sessionId, user?.id]);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => { s.off(event, handler); };
  }, []);

  return { emit, on, socket: socketRef.current, members };
}
