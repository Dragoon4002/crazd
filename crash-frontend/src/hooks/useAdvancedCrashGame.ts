'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

export interface CandleGroup {
  open: number;
  close?: number;
  max: number;
  min: number;
  valueList: number[];
  startTime: number;
  durationMs: number;
  isComplete: boolean;
}

export interface UseAdvancedCrashGameReturn {
  status: 'connecting' | 'countdown' | 'running' | 'crashed';
  currentValue: number;
  targetValue: number;
  countdown: number;
  groups: CandleGroup[];
  currentCandle?: CandleGroup;
  gameId: string;
  rugged: boolean;
  reconnect: () => void;
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
    currentCandle?: CandleGroup;
    previousCandles: CandleGroup[];
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
    previousCandles: CandleGroup[];
  };
}

type ServerMessage = GameStartMessage | PriceUpdateMessage | GameEndMessage;

const COUNTDOWN_DURATION = 5.0; // 5 seconds
const COUNTDOWN_TICK_MS = 100; // 100ms per tick
const INTERPOLATION_TICK_MS = 50; // 50ms interpolation

export function useAdvancedCrashGame(): UseAdvancedCrashGameReturn {
  const { currentCrashGame, crashHistory, subscribe, unsubscribe, isConnected } = useWebSocket();

  const [status, setStatus] = useState<UseAdvancedCrashGameReturn['status']>('connecting');
  const [currentValue, setCurrentValue] = useState<number>(1.0);
  const [targetValue, setTargetValue] = useState<number>(1.0);
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_DURATION);
  const [groups, setGroups] = useState<CandleGroup[]>([]);
  const [currentCandle, setCurrentCandle] = useState<CandleGroup | undefined>(undefined);
  const [gameId, setGameId] = useState<string>('');
  const [rugged, setRugged] = useState<boolean>(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const interpolationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to crash game on mount
  useEffect(() => {
    subscribe('crash');
    return () => unsubscribe('crash');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only subscribe/unsubscribe on mount/unmount

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setStatus('connecting');
    }
  }, [isConnected]);

  // Handle crash game messages
  useEffect(() => {
    if (!currentCrashGame) return;

    const message = currentCrashGame;

    if (message.type === 'game_start') {
      setGameId(message.data.gameId);
      setCurrentValue(1.0);
      setTargetValue(1.0);
      setCountdown(COUNTDOWN_DURATION);
      setGroups([]);
      setCurrentCandle(undefined);
      setRugged(false);
      setStatus('countdown');
    } else if (message.type === 'countdown') {
      setCountdown(message.data.countdown || 0);
    } else if (message.type === 'price_update') {
      const newTarget = message.data.price;
      setTargetValue(newTarget);

      // Set gameId if provided and not already set (for mid-game joins)
      if (message.data.gameId) {
        setGameId((currentGameId) => currentGameId || message.data.gameId!);
      }

      // Update groups and current candle
      if (message.data.previousCandles) {
        setGroups(message.data.previousCandles);
      }
      if (message.data.currentCandle) {
        setCurrentCandle(message.data.currentCandle);
      }

      // Update current candle
      if (message.data.currentCandle) {
        setCurrentCandle(message.data.currentCandle);
      } else {
        setCurrentCandle(undefined);
      }

      setStatus('running');
    } else if (message.type === 'game_end') {
      setCurrentValue(message.data.rugged ? 0 : message.data.peakMultiplier);
      setTargetValue(message.data.rugged ? 0 : message.data.peakMultiplier);
      setRugged(message.data.rugged);
      setGroups(message.data.previousCandles || []);
      setCurrentCandle(undefined);
      setStatus('crashed');
    }
  }, [currentCrashGame]);

  // Smooth interpolation loop — use ref for targetValue to avoid re-creating interval on every WS tick
  const targetValueRef = useRef(targetValue);
  targetValueRef.current = targetValue;

  useEffect(() => {
    if (status !== 'running') return;

    interpolationIntervalRef.current = setInterval(() => {
      setCurrentValue((current) => {
        const target = targetValueRef.current;
        const delta = (target - current) / 10;
        const newValue = current + delta;

        if (Math.abs(newValue - target) < 0.0001) {
          return target;
        }

        return newValue;
      });
    }, INTERPOLATION_TICK_MS);

    return () => {
      if (interpolationIntervalRef.current) {
        clearInterval(interpolationIntervalRef.current);
      }
    };
  }, [status]);

  const reconnect = () => {
    // Reconnect logic handled by useUnifiedWebSocket
    console.log('🔄 Crash game reconnect requested');
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (interpolationIntervalRef.current) {
        clearInterval(interpolationIntervalRef.current);
      }
    };
  }, []);

  return {
    status,
    currentValue,
    targetValue,
    countdown,
    groups,
    currentCandle,
    gameId,
    rugged,
    reconnect
  };
}
