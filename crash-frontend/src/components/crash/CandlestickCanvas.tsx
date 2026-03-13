'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';

interface CandlestickCanvasProps {
  history: number[];
  currentMultiplier: number;
  status: 'connecting' | 'countdown' | 'running' | 'crashed';
  rugged: boolean;
  finalPrice: number;
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  startIndex: number;
  endIndex: number;
  timestamp: number;
  isRugPull?: boolean;
}

export function CandlestickCanvas({ history, currentMultiplier, status, rugged, finalPrice }: CandlestickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Memoize candles to prevent recalculation on every render
  const candles = useMemo(() => {
    return generateCandles(history, rugged, finalPrice, status);
  }, [history.length, rugged, finalPrice, status]); // Only regenerate when history length changes

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Chart dimensions
    const padding = { top: 40, right: 100, bottom: 50, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Determine Y-axis range with better scaling
    let minValue = 1.0;
    let maxValue = 2.0;

    if (history.length > 0) {
      minValue = Math.min(...history, currentMultiplier);
      maxValue = Math.max(...history, currentMultiplier);
    }

    // Add padding to y-axis range
    const range = maxValue - minValue;
    const yMin = Math.max(0, minValue - range * 0.1);
    const yMax = maxValue + range * 0.1;

    // Helper function: convert value to Y coordinate
    const valueToY = (value: number): number => {
      const normalizedRange = yMax - yMin;
      const normalized = (value - yMin) / normalizedRange;
      return padding.top + chartHeight * (1 - normalized);
    };

    // Render function (60fps)
    const render = () => {
      // Clear canvas - use transparent to blend with page background
      ctx.clearRect(0, 0, width, height);

      // Draw grid
      drawGrid(ctx, padding, chartWidth, chartHeight);

      // Draw Y-axis grid and labels
      drawYAxis(ctx, padding, chartWidth, chartHeight, yMin, yMax, valueToY);

      // Draw X-axis
      drawXAxis(ctx, padding, chartWidth, chartHeight, history.length);

      // Draw candlesticks or line chart
      if (candles.length > 0) {
        drawCandles(ctx, candles, padding, chartWidth, chartHeight, valueToY);
      } else if (history.length > 0) {
        // If not enough data for candles, draw line
        drawLineChart(ctx, history, padding, chartWidth, chartHeight, valueToY);
      }

      // Draw current price line
      if (status === 'running' && currentMultiplier > 0) {
        drawCurrentPriceLine(ctx, currentMultiplier, padding, chartWidth, valueToY);
      }

      // Draw current multiplier text
      if (status === 'running' || status === 'crashed') {
        drawMultiplierText(ctx, currentMultiplier, width, height, status);
      }

      // Draw crash effect
      if (status === 'crashed') {
        drawCrashEffect(ctx, width, height);
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    render();

    // Mouse move handler for crosshair
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    // Cleanup
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [candles, currentMultiplier, status, mousePos]); // Removed redundant dependencies

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ display: 'block' }}
    />
  );
}

/**
 * Generate candlesticks from data points
 * Each candle represents 5 seconds (100 ticks at 50ms intervals)
 */
function generateCandles(
  history: number[],
  rugged: boolean,
  finalPrice: number,
  status: string
): Candle[] {
  if (history.length < 5) return [];

  const candles: Candle[] = [];
  const pointsPerCandle = 100; // 100 ticks * 50ms = 5 seconds per candle

  // Check if the last value is 0 (indicating a rug pull)
  const hasRugPullPoint = history.length > 0 && history[history.length - 1] === 0;

  // Process history excluding the rug pull point if it exists
  const historyToProcess = hasRugPullPoint ? history.slice(0, -1) : history;

  for (let i = 0; i < historyToProcess.length; i += pointsPerCandle) {
    const slice = historyToProcess.slice(i, i + pointsPerCandle);
    if (slice.length < 2) continue;

    candles.push({
      open: slice[0],                      // First value
      high: Math.max(...slice),            // Highest value
      low: Math.min(...slice),             // Lowest value
      close: slice[slice.length - 1],      // Last value
      startIndex: i,
      endIndex: i + slice.length - 1,
      timestamp: Date.now() - (history.length - i) * 50,
      isRugPull: false
    });
  }

  // If rugged and we have a rug pull point, create a final candle
  if (rugged && hasRugPullPoint && finalPrice > 0) {
    candles.push({
      open: finalPrice,                    // Open at final price
      high: finalPrice,                    // High is the final price
      low: 0,                              // Low is 0 (crashed)
      close: 0,                            // Close at 0
      startIndex: historyToProcess.length,
      endIndex: history.length - 1,
      timestamp: Date.now(),
      isRugPull: true
    });
  }

  return candles;
}

/**
 * Draw background grid
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  chartHeight: number
) {
  ctx.strokeStyle = '#1a1e24';
  ctx.lineWidth = 1;

  // Horizontal grid lines
  const horizontalLines = 10;
  for (let i = 0; i <= horizontalLines; i++) {
    const y = padding.top + (chartHeight / horizontalLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
  }

  // Vertical grid lines
  const verticalLines = 20;
  for (let i = 0; i <= verticalLines; i++) {
    const x = padding.left + (chartWidth / verticalLines) * i;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();
  }
}

/**
 * Draw Y-axis with grid lines and labels
 */
function drawYAxis(
  ctx: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  chartHeight: number,
  yMin: number,
  yMax: number,
  valueToY: (value: number) => number
) {
  ctx.font = '13px monospace';
  ctx.fillStyle = '#9263E1';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // Calculate appropriate step size
  const range = yMax - yMin;
  let step = 0.5;
  if (range > 50) step = 10;
  else if (range > 20) step = 5;
  else if (range > 10) step = 2;
  else if (range > 5) step = 1;

  // Draw Y-axis labels and price levels
  let currentValue = Math.ceil(yMin / step) * step;
  while (currentValue <= yMax) {
    const y = valueToY(currentValue);

    // Draw price label on the right
    ctx.fillStyle = '#9263E1';
    ctx.textAlign = 'left';
    ctx.fillText(`${currentValue.toFixed(2)}x`, padding.left + chartWidth + 10, y);

    currentValue += step;
  }

  // Draw Y-axis line
  ctx.strokeStyle = '#9263E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.stroke();
}

/**
 * Draw X-axis with time labels
 */
function drawXAxis(
  ctx: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  chartHeight: number,
  dataPoints: number
) {
  ctx.strokeStyle = '#9263E1';
  ctx.lineWidth = 2;
  ctx.font = '12px monospace';
  ctx.fillStyle = '#9263E1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Draw X-axis line
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  // Draw time labels
  const seconds = Math.floor(dataPoints / 20); // Assuming ~20 ticks per second
  const numLabels = 5;
  for (let i = 0; i <= numLabels; i++) {
    const x = padding.left + (chartWidth / numLabels) * i;
    const timeLabel = `${Math.floor((seconds / numLabels) * i)}s`;
    ctx.fillText(timeLabel, x, padding.top + chartHeight + 10);
  }
}

/**
 * Draw candlesticks
 */
function drawCandles(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  padding: any,
  chartWidth: number,
  chartHeight: number,
  valueToY: (value: number) => number
) {
  if (candles.length === 0) return;

  const totalCandles = Math.min(candles.length, 50); // Show max 50 candles
  const visibleCandles = candles.slice(-totalCandles);

  const candleWidth = Math.max(4, Math.min(20, chartWidth / (totalCandles * 1.5)));
  const spacing = candleWidth * 0.3;

  visibleCandles.forEach((candle, index) => {
    const isRugPull = candle.isRugPull;
    // Green when close > open, Red when close < open
    const isGreen = candle.close > candle.open;

    // Use bright red for rug pull candle
    const color = isRugPull ? '#ff0000' : (isGreen ? '#26a69a' : '#ef5350');
    // Dimmer wick colors
    const wickColor = isRugPull ? '#aa0000' : (isGreen ? '#1a756c' : '#a63a38');

    const x = padding.left + (index * (candleWidth + spacing));

    const yOpen = valueToY(candle.open);
    const yClose = valueToY(candle.close);
    const yHigh = valueToY(candle.high);
    const yLow = valueToY(candle.low);

    const bodyTop = Math.min(yOpen, yClose);
    const bodyBottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    // Draw wick (high to low)
    ctx.strokeStyle = wickColor;
    ctx.lineWidth = isRugPull ? 3 : 1;
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, yHigh);
    ctx.lineTo(x + candleWidth / 2, yLow);
    ctx.stroke();

    // Draw body with rounded corners
    const borderRadius = 2;
    if (isRugPull) {
      // Rug pull candle - extra thick red candle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, bodyTop, candleWidth, bodyHeight, borderRadius);
      ctx.fill();

      // Add glow effect for rug pull
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(x, bodyTop, candleWidth, bodyHeight, borderRadius);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Normal candle - filled with rounded corners
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, bodyTop, candleWidth, bodyHeight, borderRadius);
      ctx.fill();
    }

    // Draw border with rounded corners
    ctx.strokeStyle = color;
    ctx.lineWidth = isRugPull ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, bodyTop, candleWidth, bodyHeight, borderRadius);
    ctx.stroke();
  });
}

/**
 * Draw line chart (when not enough data for candles)
 */
function drawLineChart(
  ctx: CanvasRenderingContext2D,
  history: number[],
  padding: any,
  chartWidth: number,
  chartHeight: number,
  valueToY: (value: number) => number
) {
  if (history.length < 2) return;

  const maxPoints = Math.min(history.length, 500);
  const visibleHistory = history.slice(-maxPoints);
  const xStep = chartWidth / (maxPoints - 1);

  // Draw gradient fill under line
  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
  gradient.addColorStop(0, 'rgba(38, 166, 154, 0.3)');
  gradient.addColorStop(1, 'rgba(38, 166, 154, 0)');

  ctx.beginPath();
  ctx.moveTo(padding.left, valueToY(visibleHistory[0]));

  visibleHistory.forEach((value, index) => {
    const x = padding.left + index * xStep;
    const y = valueToY(value);
    ctx.lineTo(x, y);
  });

  ctx.lineTo(padding.left + (maxPoints - 1) * xStep, padding.top + chartHeight);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw line
  ctx.beginPath();
  ctx.moveTo(padding.left, valueToY(visibleHistory[0]));

  visibleHistory.forEach((value, index) => {
    const x = padding.left + index * xStep;
    const y = valueToY(value);
    ctx.lineTo(x, y);
  });

  ctx.strokeStyle = '#26a69a';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Draw current price line (horizontal line at current price)
 */
function drawCurrentPriceLine(
  ctx: CanvasRenderingContext2D,
  currentPrice: number,
  padding: any,
  chartWidth: number,
  valueToY: (value: number) => number
) {
  const y = valueToY(currentPrice);

  // Draw dashed line
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#9263E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, y);
  ctx.lineTo(padding.left + chartWidth, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw price label
  ctx.fillStyle = '#9263E1';
  ctx.fillRect(padding.left + chartWidth + 5, y - 12, 70, 24);
  ctx.fillStyle = '#12051C';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${currentPrice.toFixed(2)}x`, padding.left + chartWidth + 40, y);
}

/**
 * Draw current multiplier text (large, centered)
 */
function drawMultiplierText(
  ctx: CanvasRenderingContext2D,
  multiplier: number,
  width: number,
  height: number,
  status: string
) {
  const text = `${multiplier.toFixed(2)}x`;
  const color = status === 'crashed' ? '#ff4444' : '#ffffff';

  ctx.font = 'bold 64px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow effect
  ctx.shadowColor = status === 'crashed' ? '#ff4444' : '#9263E1';
  ctx.shadowBlur = 30;

  ctx.fillText(text, width / 2, height / 2);

  // Reset shadow
  ctx.shadowBlur = 0;
}

/**
 * Draw crash red flash effect
 */
function drawCrashEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.fillStyle = 'rgba(255, 68, 68, 0.1)';
  ctx.fillRect(0, 0, width, height);
}
