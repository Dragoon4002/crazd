'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { showGlobalToast } from '@/components/ui/Toast';

export interface ChatMessage {
  type: string;
  walletAddress: string;
  message: string;
  timestamp: string;
}

export interface GlobalRoom {
  roomId: string;
  gameType: 'crash' | 'candleflip';
  betAmount: number;
  trend?: 'bullish' | 'bearish';
  status: 'active' | 'running' | 'finished';
  createdAt: string;
  players: number;
  maxPlayers: number;
  creatorId?: string;
  botName?: string;
  bearSide?: 'player' | 'bot';
  bullSide?: 'player' | 'bot';
}

export interface CrashGameHistory {
  gameId: string;
  peakMultiplier: number;
  rugged: boolean;
  candles: any[];
  timestamp: string;
}

export interface ActiveBettor {
  address: string;
  betAmount: number;
  entryMultiplier: number;
  betTime: string;
}

interface UnifiedWebSocketState {
  isConnected: boolean;
  chatMessages: ChatMessage[];
  rooms: GlobalRoom[];
  crashHistory: CrashGameHistory[];
  currentCrashGame: any;
  activeBettors: ActiveBettor[];
  connectedUsers: number;
}

// Generate a simple client ID (stored in session)
const getClientId = () => {
  if (typeof window === 'undefined') return 'server-side';

  let clientId = sessionStorage.getItem('clientId');
  if (!clientId) {
    clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('clientId', clientId);
  }
  return clientId;
};

export function useUnifiedWebSocket(wsUrl: string) {
  const [state, setState] = useState<UnifiedWebSocketState>({
    isConnected: false,
    chatMessages: [],
    rooms: [],
    crashHistory: [],
    currentCrashGame: null,
    activeBettors: [],
    connectedUsers: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Map<string, number>>(new Map());
  const clientIdRef = useRef<string>(getClientId());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 Already connected');
      return;
    }

    console.log('🔌 Connecting to unified WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Connected to unified WebSocket');
      setState(prev => ({ ...prev, isConnected: true }));

      // Re-subscribe to all channels
      subscriptionsRef.current.forEach((count, channel) => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: { channel },
        }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'crash_history':
            setState(prev => ({ ...prev, crashHistory: message.history || [] }));
            break;

          case 'game_start':
          case 'countdown':
          case 'price_update':
          case 'game_end':
            setState(prev => ({
              ...prev,
              currentCrashGame: message,
              connectedUsers: message.data?.connectedUsers || prev.connectedUsers
            }));
            break;

          case 'chat_message':
            setState(prev => {
              const newMsg: ChatMessage = {
                type: message.type,
                walletAddress: message.playerAddress || '',
                message: message.message,
                timestamp: message.timestamp,
              };
              // Dedupe by timestamp + wallet + message
              const isDuplicate = prev.chatMessages.some(
                m => m.timestamp === newMsg.timestamp &&
                     m.walletAddress === newMsg.walletAddress &&
                     m.message === newMsg.message
              );
              if (isDuplicate) return prev;
              return { ...prev, chatMessages: [...prev.chatMessages, newMsg] };
            });
            break;

          case 'rooms_update':
            setState(prev => ({ ...prev, rooms: message.rooms || [] }));
            break;

          case 'active_bettors':
            setState(prev => ({ ...prev, activeBettors: message.bettors || [] }));
            console.log('👥 Active bettors updated:', message.bettors?.length || 0);
            break;

          case 'crash_cashout_result':
            // Show toast notification
            const payoutAmount = message.payoutAmount || 0;
            console.log(`💰 Cashout successful! Received ${payoutAmount.toFixed(4)} XLM`);

            showGlobalToast(
              `You have received ${payoutAmount.toFixed(4)} XLM in your wallet`,
              'success',
              payoutAmount
            );
            break;

          default:
            console.log('📨 Unhandled message type:', message.type);
        }
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log(`🔌 Disconnected (code: ${event.code})`);
      setState(prev => ({ ...prev, isConnected: false }));

      // Reconnect after 2 seconds if not a normal close
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Reconnecting...');
          connect();
        }, 2000);
      }
    };

    wsRef.current = ws;
  }, [wsUrl]);

  const subscribe = useCallback((channel: string) => {
    const count = subscriptionsRef.current.get(channel) ?? 0;
    subscriptionsRef.current.set(channel, count + 1);

    if (count === 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        data: { channel },
      }));
      console.log('📡 Subscribed to:', channel);
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    const count = subscriptionsRef.current.get(channel);
    if (!count) return;

    if (count === 1) {
      subscriptionsRef.current.delete(channel);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe',
          data: { channel },
        }));
        console.log('🔴 Unsubscribed from:', channel);
      }
    } else {
      subscriptionsRef.current.set(channel, count - 1);
    }
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const sendChatMessage = useCallback((message: string, walletAddress?: string) => {
    if (message.trim()) {
      sendMessage('chat_message', {
        message: message.trim(),
        playerAddress: walletAddress || '',
      });
    }
  }, [sendMessage]);

  const createRoom = useCallback((roomId: string, gameType: string, betAmount: number, trend?: string, creatorId?: string, botNameSeed?: string, contractGameId?: string, roomsCount?: number) => {
    sendMessage('create_room', { roomId, gameType, betAmount, trend, creatorId, botNameSeed, contractGameId, roomsCount });
  }, [sendMessage]);

  // NEW: Create CandleFlip batch
  const createCandleflipBatch = useCallback((
    address: string,
    roomCount: number,
    amountPerRoom: string, // wei string
    side: 'bull' | 'bear'
  ) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'create_batch',
        address,
        roomCount,
        amountPerRoom,
        side,
      }));
      console.log('🎲 Creating CandleFlip batch:', { address, roomCount, amountPerRoom, side });
    } else {
      console.error('❌ WebSocket not connected, cannot create batch');
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
    ...state,
    clientId: clientIdRef.current,
    subscribe,
    unsubscribe,
    sendChatMessage,
    createRoom,
    sendMessage,
    createCandleflipBatch, // NEW
  };
}