'use client';

import React from 'react';

interface CountdownProps {
  countdown: number;
  show: boolean;
}

export function Countdown({ countdown, show }: CountdownProps) {
  if (!show) return null;

  return (
    <>
      {/* PRESALE Banner */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-white/5 border-2 border-border rounded-xl px-10 py-5 backdrop-blur-md">
        <div className="text-[32px] font-bold text-white tracking-[2px] mb-2">
          PRESALE
        </div>
        <div className="text-[14px] text-gray-400 text-center">
          Buy a guaranteed position at <span className="text-primary font-bold">1.00x</span>
          <br />
          before the round starts
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
        <div className="text-[18px] text-gray-400 mb-3 font-medium">
          Next round in...
        </div>
        <div className="text-[72px] font-bold text-white font-mono" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
          {countdown.toFixed(2)}s
        </div>
      </div>
    </>
  );
}
