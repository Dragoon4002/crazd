'use client';

import React from 'react';

interface BottomUIProps {
  showLoss: boolean;
}

export function BottomUI({ showLoss }: BottomUIProps) {
  return (
    <>
      {/* Bottom Left Promo */}
      <div className="absolute bottom-8 left-8 z-10">
        <div className="flex items-center gap-3 bg-primary/10 border-2 border-primary rounded-full px-5 py-3 cursor-pointer hover:scale-105 transition-transform">
          <div className="text-4xl">🦊</div>
          <div className="flex flex-col">
            <div className="text-[13px] font-semibold text-white">
              Rug in 10s?
            </div>
            <div className="text-[15px] font-bold text-primary">
              Win 5 FREE
            </div>
          </div>
          <button className="bg-gradient-to-br from-[#9B61DB] to-[#7457CC] text-white px-4 py-2 rounded-full font-bold text-[13px] hover:scale-110 transition-transform">
            BET 1 FREE
          </button>
        </div>
      </div>

      {/* Bottom Right Loss Indicator */}
      {showLoss && (
        <div className="absolute bottom-8 right-[350px] z-10 flex flex-col items-end gap-2 animate-shake">
          <div className="bg-red-500/10 border-2 border-red-500 rounded-[25px] px-6 py-3">
            <div className="text-[18px] font-bold font-mono text-red-500">
              -1.000 FREE
            </div>
            <div className="text-[24px] font-bold font-mono text-red-500 mt-1">
              -100%
            </div>
          </div>
        </div>
      )}
    </>
  );
}
