'use client';

import React from 'react';

interface ActiveBettor {
  address: string;
  betAmount: number;
  entryMultiplier: number;
  betTime: string;
}

interface ActiveBettorsListProps {
  bettors: ActiveBettor[];
  currentMultiplier: number;
}

export function ActiveBettorsList({ bettors, currentMultiplier }: ActiveBettorsListProps) {
  if (!bettors || bettors.length === 0) {
    return (
      <div className="h-full bg-sidebar border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-white">Active Bettors</h3>
        </div>
        <div className="text-sm text-gray-500 text-center py-6">
          No active bettors in this game
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-sidebar border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-white">Active Bettors</h3>
        <span className="text-sm text-gray-400">
          {bettors.length} {bettors.length === 1 ? 'bettor' : 'bettors'}
        </span>
      </div>

      <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {bettors.map((bettor, idx) => (
          <BettorRow
            key={bettor.address || idx}
            bettor={bettor}
            currentMultiplier={currentMultiplier}
          />
        ))}
      </div>
    </div>
  );
}

function BettorRow({ bettor, currentMultiplier }: { bettor: ActiveBettor; currentMultiplier: number }) {
  // Shorten address for display
  const shortAddress = `${bettor.address.slice(0, 6)}...${bettor.address.slice(-4)}`;

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
      {/* Avatar + Wallet */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9B61DB] to-[#7457CC] flex items-center justify-center text-xs font-bold text-white">
          {bettor.address.slice(2, 4).toUpperCase()}
        </div>
        <span className="text-sm text-white font-mono">{shortAddress}</span>
      </div>

      {/* Bet Amount */}
      <span className="text-sm text-gray-300">{bettor.betAmount.toFixed(4)} XLM</span>

      {/* Entry */}
      <div className="text-sm">
        <span className="text-gray-400">Entry: </span>
        <span className="text-primary font-bold">{bettor.entryMultiplier.toFixed(2)}x</span>
      </div>

      {/* Current */}
      <div className="text-sm">
        <span className="text-gray-400">Current: </span>
        <span className="text-green-400 font-bold">{currentMultiplier.toFixed(2)}x</span>
        {(() => {
          const pnl = bettor.betAmount * (currentMultiplier - bettor.entryMultiplier);
          const isPositive = pnl >= 0;
          return (
            <span className={`text-xs ml-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{pnl.toFixed(4)} XLM
            </span>
          );
        })()}
      </div>
    </div>
  );
}
