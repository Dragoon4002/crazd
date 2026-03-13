'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseCrashGameReturn {
  status: 'connecting' | 'countdown' | 'running' | 'crashed';
  multiplier: number;
  countdown: number;
  history: number[]; // last N multipliers for candlestick rendering
  reconnect: () => void;
  gameId: string;
  connectedUsers: number;
  rugged: boolean;
  finalPrice: number;
}

interface GameStartMessage {
  type: 'game_start';
  data: {
    gameId: string;
    serverSeedHash: string;
    startingPrice: number;
    connectedUsers: number;
  };
}

interface PriceUpdateMessage {
  type: 'price_update';
  data: {
    gameId?: string;
    tick: number;
    price: number;
    multiplier: number;
    gameEnded: boolean;
    connectedUsers: number;
  };
}

interface GameEndMessage {
  type: 'game_end';
  data: {
    gameId: string;
    serverSeed: string;
    serverSeedHash: string;
    peakMultiplier: number;
    rugged: boolean;
    totalTicks: number;
    connectedUsers: number;
  };
}

interface CountdownMessage {
  type: 'countdown';
  data: {
    countdown: number;
  };
}

type ServerMessage = GameStartMessage | PriceUpdateMessage | GameEndMessage | CountdownMessage;

const MAX_HISTORY = 500; // Keep last 500 data points for better charting

export function useCrashGame(wsUrl: string = `${process.env.NEXT_PUBLIC_WS_URL}/ws`): UseCrashGameReturn {
  const [status, setStatus] = useState<UseCrashGameReturn['status']>('connecting');
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [countdown, setCountdown] = useState<number>(10);
  const [history, setHistory] = useState<number[]>([]);
  const [gameId, setGameId] = useState<string>('');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const [rugged, setRugged] = useState<boolean>(false);
  const [finalPrice, setFinalPrice] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ Connected to crash game server');
        // Subscribe to crash game updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: { channel: 'crash' }
        }));
        console.log('📡 Subscribed to crash channel');
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);

          if (message.type === 'game_start') {
            console.log('🎮 Game starting:', message.data.gameId);
            setGameId(message.data.gameId);
            setConnectedUsers(message.data.connectedUsers || 0);
            setStatus('countdown');
            setMultiplier(1.0);
            setHistory([]); // Clear history for new game
            setRugged(false);
            setFinalPrice(0);
            setCountdown(3); // Server sends 3-second countdown

            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
          } else if (message.type === 'countdown') {
            // Handle countdown ticks from server
            setCountdown(message.data.countdown);
          } else if (message.type === 'price_update') {
            setStatus('running');
            setMultiplier(message.data.multiplier);
            setConnectedUsers(message.data.connectedUsers);
            setFinalPrice(message.data.price); // Keep track of latest price

            // Set gameId if provided and not already set (for mid-game joins)
            if (message.data.gameId) {
              setGameId((currentGameId) => currentGameId || message.data.gameId!);
            }

            // Add to history for candlestick chart
            setHistory((prev) => {
              const updated = [...prev, message.data.price];
              // Keep only last MAX_HISTORY points
              if (updated.length > MAX_HISTORY) {
                return updated.slice(-MAX_HISTORY);
              }
              return updated;
            });
          } else if (message.type === 'game_end') {
            console.log('💥 Game ended:', message.data.rugged ? 'RUGGED!' : 'Completed', `Peak: ${message.data.peakMultiplier.toFixed(2)}x`);
            setStatus('crashed');
            setConnectedUsers(message.data.connectedUsers);
            setRugged(message.data.rugged);

            // If rugged, add a final candle point at 0
            if (message.data.rugged) {
              setHistory((prev) => [...prev, 0]);
            }

            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('❌ Disconnected from crash game server');
        setStatus('connecting');

        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Reconnecting...');
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('connecting');
    }
  }, [wsUrl]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    status,
    multiplier,
    countdown,
    history,
    reconnect,
    gameId,
    connectedUsers,
    rugged,
    finalPrice
  };
}
