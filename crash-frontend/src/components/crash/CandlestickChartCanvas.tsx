'use client';

import { useEffect, useRef, useState } from 'react';

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

interface CandlestickChartCanvasProps {
  previousCandles: CandleGroup[];
  currentCandle?: CandleGroup;
  currentPrice: number;
  gameEnded: boolean;
  isHistoryMode?: boolean; // false = Live Mode, true = History Mode
  historyMergeCount?: number; // How many candles to show in history mode (default 20)
  status?: string; // Game status for better rendering control
}

export function CandlestickChartCanvas({
  previousCandles,
  currentCandle,
  currentPrice,
  gameEnded,
  isHistoryMode = false,
  historyMergeCount = 20,
  status,
}: CandlestickChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [yRange, setYRange] = useState<{ min: number; max: number }>({ min: 0.75, max: 1.25 });
  const yRangeRef = useRef(yRange);
  yRangeRef.current = yRange;
  const [rugAnimationProgress, setRugAnimationProgress] = useState(0); // 0 to 1
  const rugAnimationStartTime = useRef<number | null>(null);
  const previousStatusRef = useRef<string | undefined>(status);

  // Reset range when new game starts
  useEffect(() => {
    // Detect new game start: transition from countdown/crashed to running or countdown
    const isNewGame =
      (previousStatusRef.current === 'crashed' || previousStatusRef.current === 'running') &&
      (status === 'countdown' || status === 'connecting');

    if (isNewGame && !isHistoryMode) {
      // Reset to initial range
      setYRange({ min: 0.75, max: 1.25 });
      setRugAnimationProgress(0);
      rugAnimationStartTime.current = null;
    }

    previousStatusRef.current = status;
  }, [status, isHistoryMode]);

  // Start rug animation when game ends
  useEffect(() => {
    if (gameEnded && !isHistoryMode) {
      rugAnimationStartTime.current = Date.now();
    } else {
      setRugAnimationProgress(0);
    }
  }, [gameEnded, isHistoryMode]);

  // Merge candles for history mode
  const getMergedCandles = (candles: CandleGroup[], targetCount: number): CandleGroup[] => {
    if (candles.length <= targetCount) return candles;

    let merged = [...candles];

    while (merged.length > targetCount) {
      const newMerged: CandleGroup[] = [];

      // Merge pairs
      for (let i = 0; i < merged.length - 1; i += 2) {
        const c1 = merged[i];
        const c2 = merged[i + 1];

        newMerged.push({
          open: c1.open,
          close: c2.close,
          max: Math.max(c1.max, c2.max),
          min: Math.min(c1.min, c2.min),
          valueList: [],
          startTime: c1.startTime,
          durationMs: c1.durationMs + c2.durationMs,
          isComplete: true,
        });
      }

      // Handle odd candle
      if (merged.length % 2 === 1) {
        newMerged.push(merged[merged.length - 1]);
      }

      merged = newMerged;
    }

    return merged;
  };

  // Get candles to display based on mode
  const getDisplayCandles = (): CandleGroup[] => {
    if (isHistoryMode) {
      return getMergedCandles(previousCandles, historyMergeCount);
    }

    // Live mode: previous + current
    const candles = [...previousCandles];
    if (currentCandle) {
      candles.push(currentCandle);
    }
    return candles;
  };

  // Update Y-axis range based on current price
  useEffect(() => {
    // Don't update range during countdown - let the reset take effect
    if (status === 'countdown' || status === 'connecting') return;

    const allCandles = getDisplayCandles();
    if (allCandles.length === 0 && currentPrice === 0) return;

    // Find price range
    let minPrice = currentPrice;
    let maxPrice = currentPrice;

    allCandles.forEach((candle) => {
      minPrice = Math.min(minPrice, candle.min);
      maxPrice = Math.max(maxPrice, candle.max);
    });

    // Check if we need to expand range (within 15% of edge)
    const currentMin = yRangeRef.current.min;
    const currentMax = yRangeRef.current.max;
    const range = currentMax - currentMin;
    const threshold = range * 0.15;

    let needsUpdate = false;
    let newMin = currentMin;
    let newMax = currentMax;

    // Expand upward if needed
    if (maxPrice >= currentMax - threshold) {
      newMax = maxPrice + range * 0.2;
      needsUpdate = true;
    }

    // Expand downward if needed
    if (minPrice <= currentMin + threshold) {
      newMin = Math.max(0, minPrice - range * 0.2); // Never go below 0
      needsUpdate = true;
    }

    if (needsUpdate) {
      setYRange({ min: newMin, max: newMax });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, previousCandles, currentCandle, isHistoryMode, status]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { top: 40, right: 80, bottom: 40, left: 60 };

    const render = () => {
      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const width = rect.width;
      const height = rect.height;
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Clear canvas - transparent to blend with page background
      // Full clear during countdown to ensure no residual candles remain
      if (status === 'countdown' || status === 'connecting') {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#00000066';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#00000033';
        ctx.fillRect(0, 0, width, height);
      }

      // Add crash background overlay when rugged
      if (gameEnded && !isHistoryMode && rugAnimationProgress > 0.3) {
        ctx.fillStyle = '#42071155';
        ctx.fillRect(0, 0, width, height);
      }

      // Value to Y coordinate converter
      const valueToY = (value: number) => {
        const normalized = (value - yRange.min) / (yRange.max - yRange.min);
        return padding.top + chartHeight * (1 - normalized);
      };

      // Draw grid lines
      drawGrid(ctx, padding, chartWidth, chartHeight, yRange.min, yRange.max, valueToY);

      // Draw Y-axis
      drawYAxis(ctx, padding, chartWidth, chartHeight, yRange.min, yRange.max);

      // Draw "RUGGED" text behind candles
      if (gameEnded && !isHistoryMode && rugAnimationProgress > 0.3) {
        drawRuggedText(ctx, width, height);
      }

      // Get candles to draw (skip during countdown to avoid showing previous game candles)
      const shouldDrawCandles = status !== 'countdown' && status !== 'connecting';

      if (shouldDrawCandles) {
        const displayCandles = getDisplayCandles();

        // Filter out incomplete current candle during rug to prevent double bars
        const candlesToDraw = gameEnded && !isHistoryMode
          ? displayCandles.filter(c => c.isComplete)
          : displayCandles;

        // Draw candles
        if (candlesToDraw.length > 0) {
          drawCandles(ctx, candlesToDraw, currentCandle, padding, chartWidth, chartHeight, valueToY, isHistoryMode);
        }
      }

      // Draw current price line (live mode only)
      if (!isHistoryMode && currentPrice > 0 && status === 'running' && shouldDrawCandles) {
        let displayPrice = currentPrice;

        // Rug animation
        if (gameEnded) {
          const now = Date.now();
          if (rugAnimationStartTime.current) {
            const elapsed = now - rugAnimationStartTime.current;
            const progress = Math.min(elapsed / 500, 1); // 500ms animation
            setRugAnimationProgress(progress);
            displayPrice = currentPrice * (1 - progress); // Drop to 0
          }
        }

        // Determine color based on current price vs current candle open
        const currentCandleOpen = currentCandle?.open || 1.0;
        const isGreen = currentPrice >= currentCandleOpen;

        // Calculate current candle position
        const displayCandles = getDisplayCandles();
        const totalCandles = displayCandles.length;
        if (totalCandles > 0) {
          const candleWidth = Math.max(4, Math.min(20, chartWidth / (totalCandles * 1.5)));
          const spacing = candleWidth * 0.3;
          const totalWidth = totalCandles * (candleWidth + spacing) - spacing;
          const startX = padding.left + (chartWidth - totalWidth) / 2;

          // Current candle is the last one
          const currentCandleIndex = totalCandles - 1;
          const candleX = startX + currentCandleIndex * (candleWidth + spacing) + candleWidth / 2;
          const candleY = valueToY(displayPrice);

          drawMultiplierText(ctx, displayPrice, candleX, candleY, isGreen);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [previousCandles, currentCandle, currentPrice, gameEnded, yRange, isHistoryMode, rugAnimationProgress, historyMergeCount]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}

// Helper Functions

function drawGrid(
  ctx: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  _chartHeight: number,
  yMin: number,
  yMax: number,
  valueToY: (value: number) => number
) {
  // Draw horizontal lines at 0.5x intervals: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, etc.
  // Generate values from 0.5 up to the max visible range
  const specificValues: number[] = [];
  for (let value = 0.25; value <= Math.ceil(yMax * 2) / 2; value += 0.5) {
    specificValues.push(value);
  }

  specificValues.forEach((value) => {
    // Only draw if value is within current Y range
    if (value >= yMin && value <= yMax) {
      const y = valueToY(value);

      // Different style for 1.0x line (baseline)
      if (value === 1.0) {
        ctx.strokeStyle = '#9263E1';
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = '#1a1e24';
        ctx.lineWidth = 1;
      }

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }
  });
}

function drawYAxis(
  ctx: CanvasRenderingContext2D,
  padding: any,
  _chartWidth: number,
  chartHeight: number,
  yMin: number,
  yMax: number
) {
  ctx.font = '12px monospace';
  ctx.fillStyle = '#9263E1';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const priceRange = yMax - yMin;
  const numLabels = 8;
  const priceStep = priceRange / numLabels;

  for (let i = 0; i <= numLabels; i++) {
    const price = yMin + priceStep * i;
    const y = padding.top + chartHeight * (1 - i / numLabels);
    ctx.fillText(price.toFixed(2) + 'x', padding.left - 10, y);
  }
}

function drawCandles(
  ctx: CanvasRenderingContext2D,
  candles: CandleGroup[],
  currentCandle: CandleGroup | undefined,
  padding: any,
  chartWidth: number,
  _chartHeight: number,
  valueToY: (value: number) => number,
  isHistoryMode: boolean
) {
  const totalCandles = candles.length;
  if (totalCandles === 0) return;

  const candleWidth = Math.max(4, Math.min(20, chartWidth / (totalCandles * 1.5)));
  const spacing = candleWidth * 0.3;
  const totalWidth = totalCandles * (candleWidth + spacing) - spacing;
  const startX = padding.left + (chartWidth - totalWidth) / 2;

  candles.forEach((candle, index) => {
    const x = startX + index * (candleWidth + spacing);

    const open = candle.open;
    const close = candle.close ?? candle.open;
    const max = candle.max;
    const min = candle.min;

    // Determine if this is the current candle
    const isCurrent = !isHistoryMode && currentCandle && candle === currentCandle;

    // Color based on direction
    let isGreen = close >= open;

    // For current candle, use live price comparison
    if (isCurrent && candle.valueList.length > 0) {
      const latestPrice = candle.valueList[candle.valueList.length - 1];
      isGreen = latestPrice >= open;
    }

    const color = isGreen ? '#26a69a' : '#ef5350';
    // Dimmer wick colors
    const wickColor = isGreen ? '#0a655c77' : '#962a2877';

    const yOpen = valueToY(open);
    const yClose = valueToY(close);
    const yHigh = valueToY(max);
    const yLow = valueToY(min);

    const bodyTop = Math.min(yOpen, yClose);
    const bodyBottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.max(2, bodyBottom - bodyTop);

    // Draw wick
    ctx.strokeStyle = wickColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, yHigh);
    ctx.lineTo(x + candleWidth / 2, yLow);
    ctx.stroke();

    // Draw body with rounded corners
    const borderRadius = 4;
    if (bodyHeight < 3) {
      // Doji - draw horizontal line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, bodyTop);
      ctx.lineTo(x + candleWidth, bodyTop);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, bodyTop, candleWidth, bodyHeight, borderRadius);
      ctx.fill();
    }

    // Add glow for current candle with rounded corners
    if (isCurrent) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.roundRect(x - 2, bodyTop - 2, candleWidth + 4, bodyHeight + 4, borderRadius);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
}

function drawMultiplierText(
  ctx: CanvasRenderingContext2D,
  price: number,
  candleX: number,
  candleY: number,
  isGreen: boolean = true
) {
  const color = isGreen ? '#26a69a' : '#ef5350';

  ctx.save();

  // Position above the current candle
  const textX = candleX + 40;
  const textY = candleY; // 60px above candle

  ctx.translate(textX, textY);
  // ctx.rotate(90 * Math.PI / 180); // Tilt 15 degrees

  // Draw multiplier (no glow)
  ctx.fillStyle = color;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${price.toFixed(2)}x`, 0, 0);

  ctx.restore();
}

function drawRuggedText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();

  // Move to center
  ctx.translate(width / 2, height / 2);

  // Rotate 15 degrees right (clockwise)
  ctx.rotate(15 * Math.PI / 180);

  // Draw text with Lilita One font
  ctx.font = '50px "Lilita One", sans-serif';
  ctx.fillStyle = '#72374199';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText('CRAZD', 0, 0);

  ctx.restore();
}
