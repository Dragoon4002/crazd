'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import KenoTradingPanel from '../trading/KenoTradingPanel';
import { KenoBoard, type RiskLevel } from '../keno/KenoBoard';
import { showGlobalToast } from '../ui/Toast';

type GamePhase = 'picking' | 'drawing' | 'result';

// PAYOUT_TABLES[risk][picksCount][hitCount] → multiplier
const PAYOUT_TABLES: Record<RiskLevel, Record<number, number[]>> = {
  classic: {
    1: [3.96],
    2: [1.8, 5.1],
    3: [0, 2.8, 30],
    4: [0, 1.6, 6, 80],
    5: [0, 1.1, 3, 14, 300],
    6: [0, 0, 2.5, 5, 28, 500],
    7: [0, 0, 1.5, 4, 12, 80, 700],
    8: [0, 0, 1, 3, 7, 30, 200, 1000],
    9: [0, 0, 0, 2.5, 5, 15, 80, 400, 1500],
    10: [0, 0, 0, 2, 3, 10, 40, 200, 800, 2000],
  },
  low: {
    1: [2.85],
    2: [1.7, 4],
    3: [1, 1.4, 15],
    4: [0.5, 1.4, 4, 40],
    5: [0.3, 1.2, 2, 10, 100],
    6: [0.3, 0.8, 1.8, 5, 20, 200],
    7: [0.2, 0.5, 1.5, 3, 10, 50, 400],
    8: [0.2, 0.5, 1, 2.5, 5, 20, 100, 500],
    9: [0.1, 0.3, 0.8, 2, 4, 10, 50, 200, 800],
    10: [0.1, 0.3, 0.6, 1.5, 3, 8, 25, 100, 400, 1000],
  },
  medium: {
    1: [3.96],
    2: [0, 8],
    3: [0, 2.2, 40],
    4: [0, 1.5, 8, 100],
    5: [0, 0, 4, 20, 400],
    6: [0, 0, 2, 8, 50, 800],
    7: [0, 0, 1.5, 5, 20, 150, 1200],
    8: [0, 0, 1, 3, 10, 60, 400, 2000],
    9: [0, 0, 0, 2, 8, 30, 150, 800, 3000],
    10: [0, 0, 0, 1.5, 5, 20, 80, 400, 1500, 5000],
  },
  high: {
    1: [3.96],
    2: [0, 15],
    3: [0, 0, 100],
    4: [0, 0, 10, 250],
    5: [0, 0, 4, 50, 1000],
    6: [0, 0, 0, 15, 100, 2000],
    7: [0, 0, 0, 8, 40, 400, 4000],
    8: [0, 0, 0, 4, 20, 100, 1000, 6000],
    9: [0, 0, 0, 2, 10, 50, 500, 2000, 10000],
    10: [0, 0, 0, 0, 8, 30, 200, 1000, 5000, 20000],
  },
};

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Keno() {
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [risk, setRisk] = useState<RiskLevel>('classic');
  const [gamePhase, setGamePhase] = useState<GamePhase>('picking');
  const drawTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => drawTimeoutsRef.current.forEach(clearTimeout);
  }, []);

  // Derived
  const hits = drawnNumbers.filter((n) => selectedNumbers.has(n)).length;
  const payoutRow =
    selectedNumbers.size > 0
      ? PAYOUT_TABLES[risk][selectedNumbers.size] ?? []
      : [];
  const currentMultiplier = payoutRow[hits] ?? 0;
  const payout = currentMultiplier * betAmount;

  const handleToggleNumber = useCallback(
    (num: number) => {
      if (gamePhase !== 'picking') return;
      setSelectedNumbers((prev) => {
        const next = new Set(prev);
        if (next.has(num)) {
          next.delete(num);
        } else if (next.size < 10) {
          next.add(num);
        } else {
          showGlobalToast('Max 10 numbers', 'info');
          return prev;
        }
        return next;
      });
    },
    [gamePhase]
  );

  const handleClearSelections = useCallback(() => {
    if (gamePhase === 'drawing') return;
    setSelectedNumbers(new Set());
    setDrawnNumbers([]);
    setGamePhase('picking');
  }, [gamePhase]);

  const handleAutoPick = useCallback(() => {
    if (gamePhase !== 'picking') return;
    const count = selectedNumbers.size > 0 ? selectedNumbers.size : 5;
    const pool = shuffle(Array.from({ length: 40 }, (_, i) => i + 1));
    setSelectedNumbers(new Set(pool.slice(0, Math.min(count, 10))));
  }, [gamePhase, selectedNumbers.size]);

  const handlePlay = useCallback(() => {
    // New Game from result
    if (gamePhase === 'result') {
      setDrawnNumbers([]);
      setGamePhase('picking');
      return;
    }

    if (gamePhase !== 'picking') return;
    if (selectedNumbers.size === 0) {
      showGlobalToast('Pick at least 1 number', 'error');
      return;
    }
    if (betAmount <= 0) {
      showGlobalToast('Enter a bet amount', 'error');
      return;
    }

    // Draw 10 random numbers
    const drawn = shuffle(Array.from({ length: 40 }, (_, i) => i + 1)).slice(0, 10);

    setGamePhase('drawing');
    setDrawnNumbers([]);

    // Clear old timeouts
    drawTimeoutsRef.current.forEach(clearTimeout);
    drawTimeoutsRef.current = [];

    // Reveal one-by-one
    drawn.forEach((num, idx) => {
      const t = setTimeout(() => {
        setDrawnNumbers((prev) => [...prev, num]);

        // After last number
        if (idx === 9) {
          const resultTimeout = setTimeout(() => {
            setGamePhase('result');
            const finalHits = drawn.filter((n) => selectedNumbers.has(n)).length;
            const mult =
              PAYOUT_TABLES[risk][selectedNumbers.size]?.[finalHits] ?? 0;
            const winAmount = mult * betAmount;
            if (winAmount > 0) {
              showGlobalToast(
                `Won ${winAmount.toFixed(4)} XLM (${mult}x)`,
                'success',
                winAmount
              );
            } else {
              showGlobalToast('No win this round', 'error');
            }
          }, 500);
          drawTimeoutsRef.current.push(resultTimeout);
        }
      }, (idx + 1) * 300);
      drawTimeoutsRef.current.push(t);
    });
  }, [gamePhase, selectedNumbers, betAmount, risk]);

  // Wrapper for setBetAmount to support both direct values and updater functions
  const handleSetBetAmount = useCallback(
    (v: number | ((prev: number) => number)) => {
      if (typeof v === 'function') {
        setBetAmount(v);
      } else {
        setBetAmount(v);
      }
    },
    []
  );

  return (
    <div className="flex items-start justify-center h-full w-full px-6 py-8 gap-6">
      {/* Left: Trading Panel */}
      <div className="w-[280px] shrink-0">
        <KenoTradingPanel
          betAmount={betAmount}
          setBetAmount={handleSetBetAmount}
          risk={risk}
          setRisk={setRisk}
          gamePhase={gamePhase}
          selectedCount={selectedNumbers.size}
          onPlay={handlePlay}
          onClearSelections={handleClearSelections}
          onAutoPick={handleAutoPick}
        />
      </div>

      {/* Right: Board + Payout + Result */}
      <div className="flex-1 max-w-[700px]">
        <KenoBoard
          selectedNumbers={selectedNumbers}
          drawnNumbers={drawnNumbers}
          gamePhase={gamePhase}
          onToggleNumber={handleToggleNumber}
          payoutRow={payoutRow}
          hits={hits}
        />

        {/* Result Summary */}
        {gamePhase === 'result' && (
          <div
            className={`mt-4 rounded-lg p-4 text-center border ${
              payout > 0
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="text-2xl font-bold text-white">
              {payout > 0 ? `+${payout.toFixed(4)} XLM` : '0.00 XLM'}
            </div>
            <div className="text-sm text-gray-400">
              {hits}/{selectedNumbers.size} hits @ {currentMultiplier}x
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
