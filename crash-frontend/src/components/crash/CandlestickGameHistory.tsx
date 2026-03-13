'use client';

import React, { useState, useEffect, useRef } from 'react';

interface CandleGroup {
  open: number;
  close: number;
  max: number;
  min: number;
  valueList?: number[];
  startTime?: number;
  durationMs?: number;
  isComplete?: boolean;
}

interface GameHistoryItem {
  gameId: string;
  peakMultiplier: number;
  rugged: boolean;
  candles?: CandleGroup[];
  timestamp: string;
}

interface CandlestickGameHistoryProps {
  history: GameHistoryItem[];
}

export function CandlestickGameHistory({ history }: CandlestickGameHistoryProps) {
  const [displayedHistory, setDisplayedHistory] = useState<GameHistoryItem[]>([]);
  const [newGameIds, setNewGameIds] = useState<Set<string>>(new Set());
  const previousHistoryRef = useRef<GameHistoryItem[]>([]);

  // Detect new games and add them with animation
  useEffect(() => {
    if (!history || history.length === 0) {
      setDisplayedHistory([]);
      return;
    }

    const currentGameIds = new Set(previousHistoryRef.current.map(g => g.gameId));
    const newGames: GameHistoryItem[] = [];

    // Find new games
    history.forEach(game => {
      if (!currentGameIds.has(game.gameId)) {
        newGames.push(game);
      }
    });

    if (newGames.length > 0) {
      // Mark new games for animation
      const newIds = new Set(newGames.map(g => g.gameId));
      setNewGameIds(newIds);

      // Remove animation class after animation completes
      setTimeout(() => {
        setNewGameIds(new Set());
      }, 600);
    }

    setDisplayedHistory(history.slice(0, 15));
    previousHistoryRef.current = history;
  }, [history]);

  if (!displayedHistory || displayedHistory.length === 0) {
    return (
      <div className="bg-transparent border border-border rounded-lg p-6 pb-0">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Games</h3>
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          No game history yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent border-t border-border p-4 pb-0">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {displayedHistory.map((game, index) => (
          <MiniGameBlock
            key={game.gameId || index}
            game={game}
            isNew={newGameIds.has(game.gameId)}
          />
        ))}
      </div>
    </div>
  );
}

// Helper to get multiplier color (primary to white gradient based on value)
function getMultiplierColor(multiplier: number, rugged: boolean): string {
  if (rugged) return '#ef4444';

  // Clamp multiplier between 1 and 10 for color interpolation
  const t = Math.min(Math.max((multiplier - 1) / 9, 0), 1);

  // Interpolate from primary (#9263E1) to white (#ffffff)
  const r = Math.round(146 + (255 - 146) * t);
  const g = Math.round(99 + (255 - 99) * t);
  const b = Math.round(225 + (255 - 225) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

// Merge candles to fit within target count
function mergeCandles(candles: CandleGroup[], targetCount: number): CandleGroup[] {
  if (candles.length <= targetCount) return candles;

  let merged = [...candles];

  while (merged.length > targetCount) {
    const newMerged: CandleGroup[] = [];

    for (let i = 0; i < merged.length - 1; i += 2) {
      const c1 = merged[i];
      const c2 = merged[i + 1];

      newMerged.push({
        open: c1.open,
        close: c2.close,
        max: Math.max(c1.max, c2.max),
        min: Math.min(c1.min, c2.min),
        isComplete: true,
      });
    }

    if (merged.length % 2 === 1) {
      newMerged.push(merged[merged.length - 1]);
    }

    merged = newMerged;
  }

  return merged;
}

function MiniGameBlock({ game, isNew }: { game: GameHistoryItem; isNew?: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Slimmer card dimensions
  const cardWidth = 80;
  const cardHeight = 50;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = cardWidth;
    canvas.height = cardHeight;

    // Clear canvas
    ctx.fillStyle = '#251337';
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Check if we have candle data
    if (!game.candles || !Array.isArray(game.candles) || game.candles.length === 0) {
      drawSimplePeakIndicator(ctx, cardWidth, cardHeight, game.peakMultiplier, game.rugged);
      return;
    }

    // Convert CandleGroup data
    let candleGroups: CandleGroup[] = game.candles.map((candle) => ({
      open: candle.open || 1.0,
      close: candle.close ?? candle.open ?? 1.0,
      max: candle.max || 1.0,
      min: candle.min || 1.0,
      isComplete: candle.isComplete ?? true,
    }));

    // Calculate max candles that fit (candleWidth=2, spacing=1)
    const padding = 4;
    const availableWidth = cardWidth - padding * 2;
    const candleWidth = 2;
    const spacing = 1;
    const maxCandles = Math.floor((availableWidth + spacing) / (candleWidth + spacing));

    // Merge candles if needed
    candleGroups = mergeCandles(candleGroups, maxCandles);

    drawMiniCandlestickChart(ctx, cardWidth, cardHeight, candleGroups, game.rugged);
  }, [game, cardWidth, cardHeight]);

  const peakColor = getMultiplierColor(game.peakMultiplier, game.rugged);

  return (
    <div className={`flex-shrink-0 bg-sidebar border border-border rounded-md overflow-hidden hover:border-primary transition-all cursor-pointer ${
      isNew ? 'animate-slideInScale' : ''
    }`} style={{ width: cardWidth }}>
      {/* Canvas */}
      <div className="relative" style={{ height: cardHeight }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />

        {/* Multiplier overlay */}
        <div className="absolute bottom-0.5 right-0.5 bg-black/60 px-1 py-0.5 rounded text-[10px] font-mono font-bold">
          <span style={{ color: peakColor }}>
            {game.peakMultiplier.toFixed(2)}x
          </span>
        </div>

        {game.rugged && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
            <span className="text-red-500 text-[9px] font-bold">RUG</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Draw mini candlestick chart
function drawMiniCandlestickChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  candles: CandleGroup[],
  rugged: boolean
) {
  if (candles.length === 0) return;

  const padding = { top: 4, right: 4, bottom: 4, left: 4 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate Y-axis range
  const allValues = candles.flatMap(c => [c.open, c.close, c.max, c.min]);
  const minValue = Math.min(...allValues, 0.5);
  const maxValue = Math.max(...allValues, 1.5);
  const range = maxValue - minValue;
  const yMin = Math.max(0, minValue - range * 0.1);
  const yMax = maxValue + range * 0.1;

  // Helper: value to Y coordinate
  const valueToY = (value: number): number => {
    const normalized = (value - yMin) / (yMax - yMin);
    return padding.top + chartHeight * (1 - normalized);
  };

  // Draw candles with smaller width for slim cards
  const candleWidth = 2;
  const spacing = 1;
  const totalCandlesWidth = candles.length * candleWidth + (candles.length - 1) * spacing;
  const startX = padding.left + (chartWidth - totalCandlesWidth) / 2;

  candles.forEach((candle, index) => {
    const x = startX + index * (candleWidth + spacing);

    const isGreen = candle.close >= candle.open;
    const color = rugged && index === candles.length - 1
      ? '#ef4444'
      : isGreen
      ? '#26a69a'
      : '#ef5350';

    const yOpen = valueToY(candle.open);
    const yClose = valueToY(candle.close);
    const yHigh = valueToY(candle.max);
    const yLow = valueToY(candle.min);

    const bodyTop = Math.min(yOpen, yClose);
    const bodyBottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    // Draw wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, yHigh);
    ctx.lineTo(x + candleWidth / 2, yLow);
    ctx.stroke();

    // Draw body
    ctx.fillStyle = color;
    ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
  });

  // Draw 1.0x reference line
  if (yMin <= 1.0 && yMax >= 1.0) {
    const y1 = valueToY(1.0);
    ctx.strokeStyle = 'rgba(146, 99, 225, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y1);
    ctx.lineTo(padding.left + chartWidth, y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Draw simple peak indicator when no candle data available
function drawSimplePeakIndicator(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  peak: number,
  rugged: boolean
) {
  const padding = { top: 6, right: 6, bottom: 6, left: 6 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Draw a simple line from 1.0x to peak
  const startY = padding.top + chartHeight;
  const peakY = padding.top + chartHeight * (1 - Math.min(peak / 10, 1));

  // Use primary-to-white color based on multiplier
  const color = rugged ? '#ef4444' : getMultiplierColor(peak, false);

  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, startY);
  ctx.lineTo(padding.left + chartWidth, peakY);
  ctx.stroke();

  // Draw start point
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(padding.left, startY, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Draw end point
  ctx.beginPath();
  ctx.arc(padding.left + chartWidth, peakY, 2, 0, Math.PI * 2);
  ctx.fill();

  if (rugged) {
    // Draw crash effect
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left + chartWidth, peakY);
    ctx.lineTo(padding.left + chartWidth, startY);
    ctx.stroke();
  }
}