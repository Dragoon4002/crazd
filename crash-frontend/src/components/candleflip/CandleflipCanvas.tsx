'use client';

import React, { useEffect, useRef } from 'react';
import { GameStatus } from '@/types/candleflip';

interface CandleflipCanvasProps {
  priceHistory: number[];
  currentPrice: number;
  status: GameStatus;
  countdown: number;
  countdownMessage?: string;
  finalPrice?: number;
  winner?: 'RED' | 'GREEN' | null;
}

export function CandleflipCanvas({
  priceHistory,
  currentPrice,
  status,
  countdown,
  countdownMessage,
  finalPrice,
  winner,
}: CandleflipCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

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

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#12051C';
      ctx.fillRect(0, 0, width, height);

      // Show countdown or messages
      if (status === 'countdown') {
        drawCountdown(ctx, width, height, countdown, countdownMessage);
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Show waiting state
      if (status === 'waiting') {
        drawWaiting(ctx, width, height);
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Draw chart during running or finished
      if (status === 'running' || status === 'finished') {
        drawPriceChart(ctx, width, height, priceHistory, currentPrice, status, winner);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [priceHistory, currentPrice, status, countdown, countdownMessage, winner]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}

function drawCountdown(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  countdown: number,
  countdownMessage?: string
) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (countdown > 0) {
    // Number countdown (3, 2, 1)
    ctx.font = 'bold 72px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#9263E1';
    ctx.shadowBlur = 20;
    ctx.fillText(countdown.toString(), width / 2, height / 2);
    ctx.shadowBlur = 0;
  } else if (countdownMessage) {
    // "candle" or "flip!" messages
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#9263E1';
    ctx.shadowColor = '#9263E1';
    ctx.shadowBlur = 25;
    ctx.fillText(countdownMessage.toUpperCase(), width / 2, height / 2);
    ctx.shadowBlur = 0;
  }
}

function drawWaiting(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '20px monospace';
  ctx.fillStyle = '#8b949e';
  ctx.fillText('Waiting for next game...', width / 2, height / 2);
}

function drawPriceChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  priceHistory: number[],
  currentPrice: number,
  status: GameStatus,
  winner?: 'RED' | 'GREEN' | null
) {
  if (priceHistory.length < 2) return;

  const padding = { top: 20, right: 60, bottom: 20, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate Y-axis range
  const allPrices = [...priceHistory];
  const minPrice = Math.min(...allPrices, 0.5);
  const maxPrice = Math.max(...allPrices, 1.5);
  const priceRange = maxPrice - minPrice;
  const yMin = minPrice - priceRange * 0.1;
  const yMax = maxPrice + priceRange * 0.1;

  // Helper: price to Y coordinate
  const priceToY = (price: number): number => {
    const normalized = (price - yMin) / (yMax - yMin);
    return padding.top + chartHeight * (1 - normalized);
  };

  // Draw horizontal line at price = 1.0
  const y1 = priceToY(1.0);
  ctx.strokeStyle = '#9263E1';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(padding.left, y1);
  ctx.lineTo(padding.left + chartWidth, y1);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw "1.0" label
  ctx.fillStyle = '#8b949e';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('1.00', padding.left - 10, y1);

  // Draw price line
  ctx.strokeStyle = status === 'finished' && winner === 'GREEN' ? '#26a69a' : '#ef5350';
  ctx.lineWidth = 3;
  ctx.beginPath();

  priceHistory.forEach((price, index) => {
    const x = padding.left + (chartWidth / (priceHistory.length - 1)) * index;
    const y = priceToY(price);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw current price indicator
  if (status === 'running') {
    const lastX = padding.left + chartWidth;
    const lastY = priceToY(currentPrice);

    ctx.fillStyle = '#9263E1';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Current price label
    ctx.fillStyle = '#9263E1';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentPrice.toFixed(2), padding.left + chartWidth + 10, lastY);
  }

  // Draw final price and winner
  if (status === 'finished' && winner) {
    const finalY = priceToY(priceHistory[priceHistory.length - 1]);
    const color = winner === 'GREEN' ? '#26a69a' : '#ef5350';

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(padding.left + chartWidth, finalY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Winner text overlay
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillText(winner + ' WINS!', width / 2, height / 2);
    ctx.shadowBlur = 0;
  }
}
