'use client'

import { Card } from '@/components/ui/card';
import { AdvancedCandlestickCanvas } from '@/components/crash/AdvancedCandlestickCanvas';
import { useAdvancedCrashGame } from '@/hooks/useAdvancedCrashGame';

export function TradingChart() {
  const { status, currentValue, countdown, groups, gameId, rugged } = useAdvancedCrashGame();

  return (
    <Card className="bg-sidebar border-border p-0 overflow-hidden">
      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-2.5 border-b border-border">
      </div>

      {/* Chart Area */}
      <div className="relative h-80 bg-transparent/30">
        {/* Game Status Overlay */}
        {status === 'countdown' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
            <div className="text-6xl font-bold text-white mb-2">{countdown}</div>
            <div className="text-lg text-gray-400">Next game starting...</div>
          </div>
        )}

        {status === 'connecting' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
            <div className="text-lg text-gray-400 mb-3">Connecting to server...</div>
          </div>
        )}

        {/* Real-time Advanced Trading Chart */}
        <AdvancedCandlestickCanvas
          groups={groups}
          currentValue={currentValue}
          status={status}
          rugged={rugged}
        />

        {/* Game ID Badge */}
        {gameId && (
          <div className="absolute top-4 left-4 bg-sidebar/90 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs text-gray-400">Game: </span>
            <span className="text-xs text-blue-400 font-mono">{gameId.slice(-8)}</span>
          </div>
        )}

        {/* <div className="absolute top-4 right-4">
          <LiveTraders />
        </div> */}
      </div>
    </Card>
  );
}
