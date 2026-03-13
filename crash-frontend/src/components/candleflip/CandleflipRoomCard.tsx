'use client';

import React, { useEffect } from 'react';
import { useCandleflipRoom } from '@/hooks/useCandleflipRoom';
import { CandleflipCanvas } from './CandleflipCanvas';
import { TrendType } from '@/types/candleflip';
import { Shield } from 'lucide-react';
import { getBotForRoom } from '@/utils/botNames';
import { showGlobalToast } from '@/components/ui/Toast';

interface CandleflipRoomCardProps {
  batchId: string;
  roomNumber: number;
  betAmount: number;
  trend: TrendType;
  onVerify?: (gameId: string, serverSeed: string) => void;
  onFinished: () => void;
}

export function CandleflipRoomCard({ batchId, roomNumber, betAmount, trend, onVerify, onFinished }: CandleflipRoomCardProps) {
  const { countdownMessage, ...gameState } = useCandleflipRoom(`${process.env.NEXT_PUBLIC_WS_URL}/candleflip`, batchId, roomNumber);

  // Get bot opponent for this room (consistent per batchId + roomNumber)
  const roomKey = `${batchId}-${roomNumber}`;
  const bot = getBotForRoom(roomKey);

  // Use batchId as userId placeholder
  const userId = `User-${batchId.slice(0, 12)}`;

  // Show toast and auto-delete room after game finishes
  useEffect(() => {
    if (gameState.status === 'finished') {
      const won = (trend === 'bullish' && gameState.winner === 'GREEN') ||
                  (trend === 'bearish' && gameState.winner === 'RED');
      const payout = won ? betAmount * 2 : 0;

      if (won) {
        showGlobalToast(
          `Room #${roomNumber}: Won +${payout.toFixed(4)} XLM`,
          'success',
          payout
        );
      } else {
        showGlobalToast(
          `Room #${roomNumber}: Lost -${betAmount.toFixed(4)} XLM`,
          'error'
        );
      }

      // Wait 5 seconds to show the result, then remove the room
      const timer = setTimeout(() => {
        onFinished();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [gameState.status, onFinished, gameState.winner, trend, betAmount, roomNumber]);

  const handleVerify = () => {
    if (gameState.gameId && gameState.serverSeed && onVerify) {
      onVerify(gameState.gameId, gameState.serverSeed);
    } else if (!gameState.serverSeed) {
      showGlobalToast('Game has not ended yet. Please wait for the results.', 'info');
    }
  };

  const getUserResult = () => {
    if (!gameState.winner) return null;

    const won = (trend === 'bullish' && gameState.winner === 'GREEN') ||
                (trend === 'bearish' && gameState.winner === 'RED');

    return {
      won,
      payout: won ? betAmount * 2 : 0,
    };
  };

  const result = getUserResult();

  return (
    <div className="relative bg-sidebar rounded-lg border border-border overflow-hidden">
      {/* Shield Icon - Top Right */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={handleVerify}
          className="p-2 bg-background/80 hover:bg-background border border-border rounded-lg transition-colors"
          title="Verify Game"
        >
          <Shield className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Top Banner - Bullish Side */}
      <div
        className={`h-10 flex items-center justify-between px-4 font-bold text-sm border-b border-border ${
          trend === 'bullish'
            ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] text-white'
            : 'bg-sidebar text-gray-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>📈</span>
          <span>{trend === 'bullish' ? userId : `${bot.emoji} ${bot.name}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">BULLISH</span>
          {trend === 'bullish' && <span className="text-xs">({betAmount} XLM)</span>}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative h-64 bg-background">
        <CandleflipCanvas
          priceHistory={gameState.priceHistory}
          currentPrice={gameState.currentPrice}
          status={gameState.status}
          countdown={gameState.countdown}
          countdownMessage={countdownMessage}
          finalPrice={gameState.finalPrice}
          winner={gameState.winner}
        />

        {/* Game Result Overlay */}
        {result && gameState.status === 'finished' && (
          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`text-center p-6 rounded-lg ${result.won ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <div className={`text-4xl font-bold mb-2 ${result.won ? 'text-green-400' : 'text-red-400'}`}>
                {result.won ? 'YOU WON!' : 'YOU LOST'}
              </div>
              <div className="text-2xl text-white font-mono">
                {result.won ? `+${result.payout} XLM` : `-${betAmount} XLM`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Banner - Bearish Side */}
      <div
        className={`h-10 flex items-center justify-between px-4 font-bold text-sm border-t border-border ${
          trend === 'bearish'
            ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] text-white'
            : 'bg-sidebar text-gray-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>📉</span>
          <span>{trend === 'bearish' ? userId : `${bot.emoji} ${bot.name}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">BEARISH</span>
          {trend === 'bearish' && <span className="text-xs">({betAmount} XLM)</span>}
        </div>
      </div>

      {/* Room ID Badge */}
      <div className="absolute bottom-12 left-2 bg-background/90 px-2 py-1 rounded text-xs text-gray-400 border border-border">
        Room #{roomNumber}
      </div>
    </div>
  );
}
