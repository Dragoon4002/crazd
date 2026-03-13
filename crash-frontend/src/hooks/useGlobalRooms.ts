'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface GlobalRoom {
  roomId: string;
  gameType: 'crash' | 'candleflip';
  betAmount: number;
  trend?: 'bullish' | 'bearish';
  status: 'active' | 'running' | 'finished';
  createdAt: string;
  players: number;
}

export function useGlobalRooms(wsUrl: string) {
  const [rooms, setRooms] = useState<GlobalRoom[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🌍 Global rooms already connected');
      return;
    }

    console.log('🌍 Connecting to global rooms:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Global rooms connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'rooms_update') {
          setRooms(message.rooms || []);
        }
      } catch (error) {
        console.error('❌ Failed to parse global rooms message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Global rooms WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log(`🔌 Global rooms disconnected (code: ${event.code})`);
      setIsConnected(false);

      // Reconnect after 2 seconds if not a normal close
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Reconnecting to global rooms...');
          connect();
        }, 2000);
      }
    };

    wsRef.current = ws;
  }, [wsUrl]);

  const createRoom = useCallback((roomId: string, gameType: string, betAmount: number, trend?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'create_room',
        data: {
          roomId,
          gameType,
          betAmount,
          trend,
        },
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    rooms,
    isConnected,
    createRoom,
  };
}
