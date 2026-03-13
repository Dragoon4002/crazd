'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { CandlestickChartCanvas, CandleGroup } from '@/components/crash/CandlestickChartCanvas';

interface CandleData {
  open: number;
  close?: number;
  max: number;
  min: number;
}

interface GameHistoryItem {
  gameId: string;
  peakMultiplier: number;
  rugged: boolean;
  candles: CandleData[];
  timestamp: string;
}

interface GameHistoryProps {
  history: GameHistoryItem[];
}

export function GameHistory({ history }: GameHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <Card className="bg-sidebar border-border p-4 pb-0">
        <h3 className="text-sm text-gray-400 mb-3">Game History</h3>
        <div className="text-xs text-gray-500 text-center py-4">
          No game history available
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-sidebar border-border p-4 pb-0">
      <h3 className="text-sm text-gray-400 mb-3">Game History (Last 15 Games)</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {history.map((game, idx) => (
          <MiniGameBlock key={game.gameId || idx} game={game} />
        ))}
      </div>
    </Card>
  );
}

function MiniGameBlock({ game }: { game: GameHistoryItem }) {
  const isRugged = game.rugged;
  const peakColor = isRugged ? 'text-red-400' : game.peakMultiplier > 10 ? 'text-yellow-400' : 'text-green-400';

  // Convert CandleData to CandleGroup format
  const candleGroups: CandleGroup[] = game.candles.map((candle, idx) => ({
    open: candle.open,
    close: candle.close ?? candle.open,
    max: candle.max,
    min: candle.min,
    valueList: [],
    startTime: Date.now() - (game.candles.length - idx) * 1000,
    durationMs: 1000,
    isComplete: true,
  }));

  return (
    <div className="bg-transparent rounded-lg p-2 border border-border hover:border-white/10 transition-colors">
      {/* Mini Candlestick Chart */}
      <div className="h-16 mb-2 relative">
        <CandlestickChartCanvas
          previousCandles={candleGroups}
          currentCandle={undefined}
          currentPrice={0}
          gameEnded={true}
          isHistoryMode={true}
          historyMergeCount={15}
        />
      </div>

      {/* Peak Value */}
      <div className={`text-center text-xs font-bold ${peakColor}`}>
        {isRugged ? (
          <span className="flex items-center justify-center gap-1">
            <span className="text-red-500">💥</span>
            {game.peakMultiplier.toFixed(2)}x
          </span>
        ) : (
          `${game.peakMultiplier.toFixed(2)}x`
        )}
      </div>
    </div>
  );
}

