'use client'

import { Card } from '@/components/ui/card';
import { CandlestickChartCanvas } from '@/components/crash/CandlestickChartCanvas';
import { useAdvancedCrashGame } from '@/hooks/useAdvancedCrashGame';
import { useMemo } from 'react';

export function LiveCandlestickChart() {
  const { status, currentValue, countdown, groups, currentCandle, gameId, rugged } = useAdvancedCrashGame();

  // Get previous candles (completed ones) from groups
  const previousCandles = useMemo(() => {
    return groups.filter(g => g.isComplete);
  }, [groups]);

  // Determine if game ended
  const gameEnded = status === 'crashed' || rugged;

  return (
    <Card className="bg-transparent border-border p-0 overflow-hidden w-full h-full">
      {/* Stats Bar
      <div className="flex items-center gap-6 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Status:</span>
          <span className={`text-xs font-semibold ${
            status === 'running' ? 'text-green-400' :
            status === 'crashed' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>
        {status === 'countdown' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Next game in:</span>
            <span className="text-xs font-bold text-blue-400">{countdown}s</span>
          </div>
        )}
        {currentValue > 0 && status === 'playing' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Current:</span>
            <span className="text-xs font-bold text-blue-400">{currentValue.toFixed(2)}x</span>
          </div>
        )}
      </div> */}

      {/* Chart Area */}
      <div className="relative h-full bg-transparent">
        {/* Game Status Overlay */}
        {status === 'countdown' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
            <div className="text-[18px] text-gray-400 mb-3 font-medium">
              Next round in...
            </div>
            <div className="text-[72px] font-bold text-white font-mono" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
              {countdown.toFixed(2)}s
            </div>
          </div>
        )}

        {status === 'connecting' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
            <div className="text-lg text-gray-400 mb-3">Connecting to server...</div>
          </div>
        )}

        {/* Live Candlestick Chart */}
        <CandlestickChartCanvas
          previousCandles={previousCandles}
          currentCandle={currentCandle}
          currentPrice={currentValue}
          gameEnded={gameEnded}
          isHistoryMode={false}
          status={status}
        />

        {/* Game ID Badge */}
        {gameId && (
          <div className="absolute top-4 left-4 bg-sidebar/90 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs text-gray-400">Game: </span>
            <span className="text-xs text-blue-400 font-mono">{gameId.slice(-8)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
