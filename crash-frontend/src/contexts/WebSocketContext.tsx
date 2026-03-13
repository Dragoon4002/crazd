'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';

interface WebSocketContextType {
  isConnected: boolean;
  clientId: string;
  chatMessages: any[];
  rooms: any[];
  crashHistory: any[];
  currentCrashGame: any;
  activeBettors: any[];
  connectedUsers: number;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  sendChatMessage: (message: string, walletAddress?: string) => void;
  createRoom: (roomId: string, gameType: string, betAmount: number, trend?: string, creatorId?: string, botNameSeed?: string, contractGameId?: string, roomsCount?: number) => void;
  sendMessage: (type: string, data: any) => void;
  createCandleflipBatch: (address: string, roomCount: number, amountPerRoom: string, side: 'bull' | 'bear') => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const ws = useUnifiedWebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws`);
  const value = useMemo(() => ws, [ws]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}