'use client';

import React, { useEffect, useRef } from 'react';
import { CandleGroup } from '@/hooks/useAdvancedCrashGame';

interface AdvancedCandlestickCanvasProps {
  groups: CandleGroup[];
  currentValue: number;
  status: 'connecting' | 'countdown' | 'running' | 'crashed';
  rugged: boolean;
}

export function AdvancedCandlestickCanvas({ groups, currentValue, status, rugged }: AdvancedCandlestickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const yRangeRef = useRef<{ min: number; max: number }>({ min: 0.5, max: 1.5 });

  // Smooth transition state - stores interpolated values for each candle
  const smoothValuesRef = useRef<Map<number, {
    open: number;
    close: number;
    max: number;
    min: number;
    targetOpen: number;
    targetClose: number;
    targetMax: number;
    targetMin: number;
    isComplete: boolean; // Track if candle is complete (should snap, not animate)
  }>>(new Map());

  // Reset Y-range when game restarts
  useEffect(() => {
    if (status === 'countdown' && groups.length === 0) {
      yRangeRef.current = { min: 0.5, max: 1.5 };
      smoothValuesRef.current.clear();
      console.log('🔄 Crash game canvas: Y-axis range reset to 0.5-1.5');
    }
  }, [status, groups.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Padding constant
    const padding = { top: 40, right: 100, bottom: 50, left: 80 };

    // Update smooth transitions for all candles
    groups.forEach((group, index) => {
      const candleId = index;
      const existing = smoothValuesRef.current.get(candleId);

      // Determine the actual close value (last value in valueList for current candle)
      let closeValue: number;
      if (group.isComplete) {
        closeValue = group.close ?? group.open;
      } else {
        // For incomplete candles, use the latest value from valueList
        closeValue = group.valueList.length > 0
          ? group.valueList[group.valueList.length - 1]
          : group.open;
      }

      if (!existing) {
        // NEW CANDLE - Initialize immediately visible
        // Show candle right away with current values (no animation delay)
        smoothValuesRef.current.set(candleId, {
          open: group.open,
          close: closeValue,  // Use actual close immediately for visibility
          max: group.max,     // Use actual max immediately
          min: group.min,     // Use actual min immediately
          targetOpen: group.open,
          targetClose: closeValue,
          targetMax: group.max,
          targetMin: group.min,
          isComplete: group.isComplete,
        });
      } else {
        // EXISTING CANDLE
        // If candle just became complete, snap to final values immediately
        if (group.isComplete && !existing.isComplete) {
          existing.open = group.open;
          existing.close = closeValue;
          existing.max = group.max;
          existing.min = group.min;
          existing.isComplete = true;
        }

        // Update targets
        existing.targetOpen = group.open;
        existing.targetClose = closeValue;
        existing.targetMax = group.max;
        existing.targetMin = group.min;
        existing.isComplete = group.isComplete;
      }
    });

    // Clean up old candles beyond visible range
    const visibleCandleIds = new Set(groups.map((_, i) => i));
    smoothValuesRef.current.forEach((_, id) => {
      if (!visibleCandleIds.has(id)) {
        smoothValuesRef.current.delete(id);
      }
    });

    // Expand Y-axis range dynamically when data exceeds current range
    if (currentValue > 0 && status === 'running') {
      if (currentValue > yRangeRef.current.max) {
        yRangeRef.current.max = currentValue * 1.1;
      }
      if (currentValue < yRangeRef.current.min) {
        yRangeRef.current.min = currentValue * 0.9;
      }
    }

    // Also check all candles to ensure they're visible
    if (groups.length > 0) {
      groups.forEach(g => {
        if (g.max > yRangeRef.current.max) {
          yRangeRef.current.max = g.max * 1.1;
        }
        if (g.min < yRangeRef.current.min) {
          yRangeRef.current.min = g.min * 0.9;
        }
      });
    }

    const displayMin = yRangeRef.current.min;
    const displayMax = yRangeRef.current.max;

    // Ensure minimum range for visibility
    const dataRange = displayMax - displayMin;
    let yMin = displayMin;
    let yMax = displayMax;

    if (dataRange < 0.3) {
      const center = (displayMax + displayMin) / 2;
      yMin = center - 0.2;
      yMax = center + 0.2;
    } else {
      yMin = Math.max(0, displayMin - dataRange * 0.15);
      yMax = displayMax + dataRange * 0.15;
    }

    // Render function with smooth animation
    const render = () => {
      // Get current canvas dimensions
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      // Update canvas size if needed
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }

      // Chart dimensions
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Helper function: convert value to Y coordinate
      const valueToY = (value: number): number => {
        const normalizedRange = yMax - yMin;
        const normalized = (value - yMin) / normalizedRange;
        return padding.top + chartHeight * (1 - normalized);
      };

      // Clear canvas
      ctx.fillStyle = '#12051C';
      ctx.fillRect(0, 0, width, height);

      // Update smooth values using interpolation formula: (target - current) / 120
      // ONLY animate incomplete candles - completed candles snap immediately
      smoothValuesRef.current.forEach((smooth) => {
        if (smooth.isComplete) {
          // Completed candles: SNAP to target values immediately (no animation)
          smooth.open = smooth.targetOpen;
          smooth.close = smooth.targetClose;
          smooth.max = smooth.targetMax;
          smooth.min = smooth.targetMin;
        } else {
          // Incomplete candles: SMOOTH animation using interpolation
          const step = 120;

          smooth.open += (smooth.targetOpen - smooth.open) / step;
          smooth.close += (smooth.targetClose - smooth.close) / step;
          smooth.max += (smooth.targetMax - smooth.max) / step;
          smooth.min += (smooth.targetMin - smooth.min) / step;
        }
      });

      // Draw grid
      drawGrid(ctx, padding, chartWidth, chartHeight);

      // Draw Y-axis
      drawYAxis(ctx, padding, chartWidth, chartHeight, yMin, yMax, valueToY);

      // Draw X-axis
      drawXAxis(ctx, padding, chartWidth, chartHeight, groups);

      // Draw current multiplier text (only when running)
      // if (status === 'running') {
      //   drawMultiplierText(ctx, currentValue, width, height, status);
      // }/re

      // Draw crash effect and GAME OVER text
      if (status === 'crashed') {
        drawGameOverText(ctx, width, height);
        drawCrashEffect(ctx, width, height);
      }

      // Draw candle groups with smooth values
      if (groups.length > 0) {
        drawCandleGroupsSmooth(ctx, groups, smoothValuesRef.current, padding, chartWidth, chartHeight, valueToY);
      }

      // Draw current price line
      if (status === 'running' && currentValue > 0) {
        drawCurrentPriceLine(ctx, currentValue, padding, chartWidth, valueToY);
      }

      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    render();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [groups, currentValue, status, rugged]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ display: 'block' }}
    />
  );
}

// Helper drawing functions

function drawGrid(
  ctx: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  chartHeight: number
) {
  ctx.strokeStyle = '#1a1e24';
  ctx.lineWidth = 1;

  const horizontalLines = 10;
  for (let i = 0; i <= horizontalLines; i++) {
    const y = padding.top + (chartHeight / horizontalLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
  }

  const verticalLines = 20;
  for (let i = 0; i <= verticalLines; i++) {
    const x = padding.left + (chartWidth / verticalLines) * i;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();
  }
}

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
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const range = yMax - yMin;
  let step = 0.5;
  if (range > 50) step = 10;
  else if (range > 20) step = 5;
  else if (range > 10) step = 2;
  else if (range > 5) step = 1;

  let currentValue = Math.ceil(yMin / step) * step;
  while (currentValue <= yMax) {
    const y = valueToY(currentValue);
    ctx.fillText(`${currentValue.toFixed(2)}x`, padding.left + chartWidth + 10, y);
    currentValue += step;
  }

  ctx.strokeStyle = '#9263E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.stroke();
}

function drawXAxis(
  ctx: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  chartHeight: number,
  groups: CandleGroup[]
) {
  ctx.strokeStyle = '#9263E1';
  ctx.lineWidth = 2;
  ctx.font = '12px monospace';
  ctx.fillStyle = '#9263E1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  if (groups.length === 0) return;

  const totalDuration = groups.reduce((sum, g) => sum + g.durationMs, 0);
  const numLabels = 5;

  for (let i = 0; i <= numLabels; i++) {
    const x = padding.left + (chartWidth / numLabels) * i;
    const timeMs = (totalDuration / numLabels) * i;
    const timeLabel = `${(timeMs / 1000).toFixed(1)}s`;
    ctx.fillText(timeLabel, x, padding.top + chartHeight + 10);
  }
}

function drawCandleGroupsSmooth(
  ctx: CanvasRenderingContext2D,
  groups: CandleGroup[],
  smoothValues: Map<number, any>,
  padding: any,
  chartWidth: number,
  chartHeight: number,
  valueToY: (value: number) => number
) {
  if (groups.length === 0) return;

  const totalCandles = Math.min(groups.length, 50);
  const visibleGroups = groups.slice(-totalCandles);

  const candleWidth = Math.max(4, Math.min(18, chartWidth / (totalCandles * 2)));
  const spacing = candleWidth * 0.3;

  const totalCandlesWidth = visibleGroups.length * (candleWidth + spacing) - spacing;
  const startX = padding.left + (chartWidth - totalCandlesWidth) / 2;

  visibleGroups.forEach((group, index) => {
    const candleId = groups.length - totalCandles + index;
    const smooth = smoothValues.get(candleId);

    if (!smooth) return;

    // Use smoothed values instead of raw values
    const openValue = smooth.open;
    const closeValue = smooth.close;
    const maxValue = smooth.max;
    const minValue = smooth.min;

    const isGreen = closeValue >= openValue;
    const isRugPull = group.close === 0;

    const color = isRugPull ? '#ff0000' : (isGreen ? '#26a69a' : '#ef5350');
    const wickColor = color;

    const x = startX + (index * (candleWidth + spacing));

    const yOpen = valueToY(openValue);
    const yClose = valueToY(closeValue);
    const yHigh = valueToY(maxValue);
    const yLow = valueToY(minValue);

    const bodyTop = Math.min(yOpen, yClose);
    const bodyBottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.max(2, bodyBottom - bodyTop);

    // Draw wick (from high to low)
    ctx.strokeStyle = wickColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, yHigh);
    ctx.lineTo(x + candleWidth / 2, yLow);
    ctx.stroke();

    // Draw body
    if (bodyHeight < 3) {
      // For very small bodies (doji), draw a horizontal line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, bodyTop);
      ctx.lineTo(x + candleWidth, bodyTop);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

      if (isRugPull) {
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
        ctx.shadowBlur = 0;
      }

      // Draw border
      ctx.strokeStyle = color;
      ctx.lineWidth = isRugPull ? 2 : 1;
      ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
    }

    // Add visual indicator for incomplete candles (current candle)
    if (!group.isComplete) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, bodyTop - 2, candleWidth + 4, bodyHeight + 4);
    }
  });
}

function drawCurrentPriceLine(
  ctx: CanvasRenderingContext2D,
  currentPrice: number,
  padding: any,
  chartWidth: number,
  valueToY: (value: number) => number
) {
  const y = valueToY(currentPrice);

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#9263E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, y);
  ctx.lineTo(padding.left + chartWidth, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw multiplier number above the line
  const text = `${currentPrice.toFixed(2)}x`;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Measure text to create background
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = 20;

  const xCenter = padding.left + chartWidth / 2;
  const yText = y - 8;

  // Draw background
  ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
  ctx.fillRect(
    xCenter - textWidth / 2 - 6,
    yText - textHeight,
    textWidth + 12,
    textHeight
  );

  // Draw text
  ctx.fillStyle = '#9263E1';
  ctx.fillText(text, xCenter, yText);

  // Also draw on the right side
  ctx.fillStyle = '#9263E1';
  ctx.fillRect(padding.left + chartWidth + 5, y - 12, 70, 24);
  ctx.fillStyle = '#12051C';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${currentPrice.toFixed(2)}x`, padding.left + chartWidth + 40, y);
}

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

  ctx.shadowColor = status === 'crashed' ? '#ff4444' : '#9263E1';
  ctx.shadowBlur = 30;

  ctx.fillText(text, width / 2, height / 2);

  ctx.shadowBlur = 0;
}

function drawCrashEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.fillStyle = 'rgba(255, 68, 68, 0.1)';
  ctx.fillRect(0, 0, width, height);
}

function drawGameOverText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const text = 'GAME OVER';

  ctx.font = 'bold 72px monospace';
  ctx.fillStyle = '#aa1122';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add shadow for better visibility
  ctx.shadowColor = '#aa1122';
  ctx.shadowBlur = 40;

  ctx.fillText(text, width / 2, height / 2);

  ctx.shadowBlur = 0;
}
