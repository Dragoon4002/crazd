'use client';

import React, { useMemo } from 'react';

interface GameHeaderProps {
  recentResults: number[]; // Last 100 crash multipliers
}

export function GameHeader({ recentResults }: GameHeaderProps) {
  // Calculate stats
  const stats = useMemo(() => {
    return {
      '2x': recentResults.filter(m => m >= 2).length,
      '10x': recentResults.filter(m => m >= 10).length,
      '50x': recentResults.filter(m => m >= 50).length,
      last: recentResults[recentResults.length - 1] || 0
    };
  }, [recentResults]);

  // Get last 15 results for mini charts
  const last15 = recentResults.slice(-15);

  return (
    <div className="flex justify-between items-center px-6 py-4 bg-sidebar border-b border-border">
      {/* Left: Stats */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="text-gray-400">
            Last 100 🔥 <span className="text-white">{stats.last.toFixed(2)}x</span>
          </span>

          {/* 2x Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-border rounded-full">
            <div className="w-6 h-6 rounded-full bg-sidebar flex items-center justify-center text-[10px] font-bold text-white">
              2X
            </div>
            <span className="text-white font-semibold">{stats['2x']}</span>
          </div>

          {/* 10x Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-border rounded-full">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
              10X
            </div>
            <span className="text-white font-semibold">{stats['10x']}</span>
          </div>

          {/* 50x Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-border rounded-full">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
              50X
            </div>
            <span className="text-white font-semibold">{stats['50x']}</span>
          </div>
        </div>
      </div>

      {/* Right: Recent Results Mini Charts */}
      <div className="flex gap-2">
        {last15.map((multiplier, index) => (
          <MiniChart key={index} multiplier={multiplier} />
        ))}
      </div>
    </div>
  );
}

function MiniChart({ multiplier }: { multiplier: number }) {
  const isGreen = multiplier >= 1.5;

  // Generate random bar heights based on multiplier
  const bars = useMemo(() => {
    const maxHeight = Math.min(18, multiplier * 5);
    return Array.from({ length: 5 }, (_, i) => {
      const progress = i / 4;
      return Math.max(2, Math.floor(maxHeight * progress * (0.8 + Math.random() * 0.4)));
    });
  }, [multiplier]);

  return (
    <div className="w-[60px] h-[40px] bg-background border border-border rounded-md p-1 flex flex-col items-center justify-center">
      <div className="flex gap-0.5 items-end h-[18px]">
        {bars.map((height, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-sm ${isGreen ? 'bg-primary' : 'bg-red-500'}`}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
      <div className={`text-[11px] font-bold mt-0.5 ${isGreen ? 'text-primary' : 'text-red-500'}`}>
        {multiplier.toFixed(2)}x
      </div>
    </div>
  );
}
