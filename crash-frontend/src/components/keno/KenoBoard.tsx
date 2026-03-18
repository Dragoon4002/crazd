'use client';

import { useMemo } from 'react';

export type RiskLevel = 'classic' | 'low' | 'medium' | 'high';
type GamePhase = 'picking' | 'drawing' | 'result';
type CellState = 'default' | 'selected' | 'pending' | 'drawn-hit' | 'drawn-miss';

interface KenoBoardProps {
  selectedNumbers: Set<number>;
  drawnNumbers: number[];
  pendingNumbers: Set<number>;
  gamePhase: GamePhase;
  onToggleNumber: (n: number) => void;
  payoutRow: number[];
  hits: number;
}

const NUMBERS = Array.from({ length: 40 }, (_, i) => i + 1);

function getCellState(
  num: number,
  selectedNumbers: Set<number>,
  drawnNumbers: number[],
  pendingNumbers: Set<number>,
  gamePhase: GamePhase
): CellState {
  const isSelected = selectedNumbers.has(num);
  const isDrawn = drawnNumbers.includes(num);
  const isPending = pendingNumbers.has(num);

  if (gamePhase === 'picking') {
    return isSelected ? 'selected' : 'default';
  }
  // Phase 1: tile is in pending set → show as "?"
  if (isPending) return 'pending';
  // Phase 2+: tile has been revealed
  if (isDrawn && isSelected) return 'drawn-hit';
  if (isDrawn && !isSelected) return 'drawn-miss';
  if (isSelected) return 'selected';
  return 'default';
}

const cellBaseClass =
  'w-full aspect-square rounded-lg border text-xl font-bold transition-all duration-200 flex items-center justify-center cursor-pointer select-none';

const cellStyles: Record<CellState, string> = {
  default: 'bg-sidebar border-border text-gray-300 hover:border-primary/50',
  selected:
    'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] border-primary text-white scale-105',
  pending:
    'bg-yellow-400/20 border-yellow-400/40 text-yellow-200 animate-pulse',
  'drawn-hit':
    'bg-green-500/80 border-green-400 text-white animate-keno-hit',
  'drawn-miss': 'bg-red-500/30 border-red-500/50 text-red-300',
};

export function KenoBoard({
  selectedNumbers,
  drawnNumbers,
  pendingNumbers,
  gamePhase,
  onToggleNumber,
  payoutRow,
  hits,
}: KenoBoardProps) {
  const lastDrawn = drawnNumbers[drawnNumbers.length - 1];
  const drawnSet = useMemo(() => new Set(drawnNumbers), [drawnNumbers]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 8x5 Grid */}
      <div className="grid grid-cols-8 gap-3 rounded-lg p-5 bg-sidebar border border-border">
        {NUMBERS.map((num) => {
          const state = getCellState(num, selectedNumbers, drawnNumbers, pendingNumbers, gamePhase);
          const isJustRevealed = num === lastDrawn && !pendingNumbers.has(num);
          const disabled =
            gamePhase !== 'picking' ||
            (selectedNumbers.size >= 10 && !selectedNumbers.has(num));

          return (
            <button
              key={num}
              className={`${cellBaseClass} ${cellStyles[state]} ${
                isJustRevealed ? 'animate-keno-reveal' : ''
              } ${disabled && gamePhase === 'picking' ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={disabled}
              onClick={() => onToggleNumber(num)}
            >
              {state === 'pending' ? '?' : num}
            </button>
          );
        })}
      </div>

      {/* Payout Strip */}
      {payoutRow.length > 0 ? (
        <div className="flex gap-1 overflow-x-auto rounded-lg p-3 bg-sidebar border border-border">
          {payoutRow.map((multiplier, idx) => {
            const hitCount = idx + 1;
            const liveHits = drawnNumbers.filter((n) => selectedNumbers.has(n)).length;
            const isActive = gamePhase === 'result' && hitCount === hits;
            const isCurrentHit = gamePhase === 'drawing' && hitCount === liveHits;

            return (
              <div
                key={idx}
                className={`flex-1 min-w-14 text-center py-2 rounded-md text-xs font-mono border transition-all ${
                  isActive
                    ? 'bg-linear-to-br from-[#9B61DB] to-[#7457CC] text-white border-primary scale-105'
                    : isCurrentHit
                      ? 'bg-primary/20 border-primary/50 text-white'
                      : multiplier === 0
                        ? 'bg-background border-border text-gray-600'
                        : 'bg-background border-border text-gray-400'
                }`}
              >
                <div className="text-[10px] text-gray-500">{hitCount}x</div>
                <div className={`font-bold ${multiplier === 0 ? 'text-gray-600' : ''}`}>
                  {multiplier}x
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg p-3 bg-sidebar border border-border text-center text-sm text-gray-500">
          Pick numbers to see payouts
        </div>
      )}
    </div>
  );
}
