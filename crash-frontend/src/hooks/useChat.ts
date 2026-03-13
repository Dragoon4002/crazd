'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ChatMessage {
  type: 'message' | 'system';
  username: string;
  message: string;
  timestamp: string;
  userId: string;
}

export function useChat(wsUrl: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('💬 Chat already connected');
      return;
    }

    console.log('💬 Connecting to chat:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Chat connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
      } catch (error) {
        console.error('❌ Failed to parse chat message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Chat WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log(`🔌 Chat disconnected (code: ${event.code})`);
      setIsConnected(false);

      // Reconnect after 2 seconds if not a normal close
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Reconnecting to chat...');
          connect();
        }, 2000);
      }
    };

    wsRef.current = ws;
  }, [wsUrl]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && message.trim()) {
      wsRef.current.send(JSON.stringify({ message: message.trim() }));
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
    messages,
    isConnected,
    sendMessage,
  };
}
