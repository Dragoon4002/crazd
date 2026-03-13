import { useState, useEffect, useRef, useCallback } from 'react';
import { CandleflipGameState, GameStatus } from '@/types/candleflip';
import { showGlobalToast } from '@/components/ui/Toast';

interface BatchStartData {
  batchId: string;
  playerAddress: string;
  totalRooms: number;
  amountPerRoom: string;
  playerSide: 'bull' | 'bear';
  aiSide: 'bull' | 'bear';
  serverSeedHash: string;
}

interface RoomStartData {
  batchId: string;
  roomNumber: number;
}

interface PriceUpdateData {
  batchId: string;
  roomNumber: number;
  tick: number;
  price: number;
  totalTicks: number;
}

interface RoomEndData {
  batchId: string;
  roomNumber: number;
  finalPrice: number;
  winner: 'bull' | 'bear';
  playerWon: boolean;
}

interface BatchEndData {
  batchId: string;
  totalRooms: number;
  wonRooms: number;
  serverSeed: string;
}

interface PayoutFailedData {
  batchId: string;
  error: string;
}

interface BatchCreatedData {
  batchId: string;
}

interface CandleflipMessage {
  type: 'batch_created' | 'batch_start' | 'room_start' | 'price_update' | 'room_end' | 'batch_end' | 'payout_failed' | 'error';
  batchId?: string;
  data?: BatchStartData | RoomStartData | PriceUpdateData | RoomEndData | BatchEndData | PayoutFailedData | BatchCreatedData | any;
  error?: string;
}

/**
 * Hook to manage a single CandleFlip room within a batch
 * Connects to /candleflip WebSocket endpoint
 */
export function useCandleflipRoom(wsUrl: string, batchId: string, roomNumber: number) {
  const [gameState, setGameState] = useState<CandleflipGameState>({
    batchId: batchId,
    roomNumber: roomNumber,
    playerSide: 'bull',
    aiSide: 'bear',
    playerWon: false,
    gameId: '',
    status: 'waiting',
    serverSeedHash: '',
    startingPrice: 1.0,
    currentPrice: 1.0,
    priceHistory: [1.0],
    countdown: 0,
    tick: 0,
    totalTicks: 40,
  });

  const [countdownMessage, setCountdownMessage] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFinishedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const connect = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        console.log(`⚠️ CandleFlip already connected/connecting`);
        return;
      }
    }

    console.log(`🔌 Connecting to CandleFlip WebSocket for batch ${batchId}, room ${roomNumber}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`✅ Connected to CandleFlip WebSocket`);
      setGameState(prev => ({ ...prev, status: 'waiting' }));
    };

    ws.onmessage = (event) => {
      try {
        const message: CandleflipMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'batch_created':
            console.log('📦 Batch created:', message.batchId);
            break;

          case 'batch_start':
            const batchStartData = message.data as BatchStartData;
            // Only update if this is our batch
            if (batchStartData.batchId === batchId) {
              console.log(`🎮 Batch ${batchId} started`);
              setGameState(prev => ({
                ...prev,
                batchId: batchStartData.batchId,
                playerSide: batchStartData.playerSide,
                aiSide: batchStartData.aiSide,
                serverSeedHash: batchStartData.serverSeedHash,
                status: 'waiting',
              }));
            }
            break;

          case 'room_start':
            const roomStartData = message.data as RoomStartData;
            // Only handle if this is our room
            if (roomStartData.batchId === batchId && roomStartData.roomNumber === roomNumber) {
              console.log(`🚀 Room ${roomNumber} started`);
              isFinishedRef.current = false;
              setGameState(prev => ({
                ...prev,
                status: 'running',
                currentPrice: 1.0,
                priceHistory: [1.0],
                tick: 0,
              }));
            }
            break;

          case 'price_update':
            const priceUpdateData = message.data as PriceUpdateData;
            // Only handle if this is our room
            if (priceUpdateData.batchId === batchId && priceUpdateData.roomNumber === roomNumber) {
              setGameState(prev => ({
                ...prev,
                status: 'running',
                tick: priceUpdateData.tick,
                currentPrice: priceUpdateData.price,
                priceHistory: [...prev.priceHistory, priceUpdateData.price],
                totalTicks: priceUpdateData.totalTicks,
              }));
            }
            break;

          case 'room_end':
            const roomEndData = message.data as RoomEndData;
            // Only handle if this is our room
            if (roomEndData.batchId === batchId && roomEndData.roomNumber === roomNumber) {
              console.log(`🏁 Room ${roomNumber} ended. Winner: ${roomEndData.winner}, Player won: ${roomEndData.playerWon}`);
              isFinishedRef.current = true;
              setGameState(prev => ({
                ...prev,
                status: 'finished',
                finalPrice: roomEndData.finalPrice,
                winner: roomEndData.winner === 'bull' ? 'GREEN' : 'RED',
                playerWon: roomEndData.playerWon,
              }));
            }
            break;

          case 'batch_end':
            const batchEndData = message.data as BatchEndData;
            // Reveal server seed for our batch
            if (batchEndData.batchId === batchId) {
              console.log(`📝 Batch ${batchId} ended. Server seed revealed`);
              setGameState(prev => ({
                ...prev,
                serverSeed: batchEndData.serverSeed,
              }));
            }
            break;

          case 'payout_failed':
            const payoutFailedData = message.data as PayoutFailedData;
            if (payoutFailedData.batchId === batchId) {
              console.error('❌ Payout failed:', payoutFailedData.error);
              showGlobalToast(`Payout failed: ${payoutFailedData.error}`, 'error');
            }
            break;

          case 'error':
            console.error('❌ CandleFlip error:', message.error);
            break;

          default:
            console.log('📨 Unhandled CandleFlip message:', message.type);
        }
      } catch (error) {
        console.error(`❌ Error parsing CandleFlip message:`, error);
      }
    };

    ws.onerror = (error) => {
      console.error(`❌ CandleFlip WebSocket error:`, error);
      setGameState(prev => ({ ...prev, status: 'waiting' }));
    };

    ws.onclose = (event) => {
      console.log(`🔌 CandleFlip WebSocket closed (code: ${event.code})`);
      wsRef.current = null;

      if (!isMountedRef.current) {
        console.log(`✅ Component unmounted, not reconnecting`);
        return;
      }

      if (isFinishedRef.current) {
        console.log(`✅ Game finished, not reconnecting`);
        return;
      }

      if (event.code !== 1000) {
        console.log(`🔄 Attempting reconnect...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      }
    };
  }, [wsUrl, batchId, roomNumber]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { ...gameState, countdownMessage };
}