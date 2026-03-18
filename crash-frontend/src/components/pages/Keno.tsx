'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import KenoTradingPanel from '../trading/KenoTradingPanel';
import { KenoBoard, type RiskLevel } from '../keno/KenoBoard';
import { showGlobalToast } from '../ui/Toast';
import { useGameHouseContract } from '@/hooks/useGameHouseContract';
import { useWallet } from '@/contexts/WalletContext';
import { deriveHashes, generateNumbers } from '@/lib/kenoNumbers';
import { API_ENDPOINTS } from '@/config/api';

type GamePhase = 'picking' | 'drawing' | 'result';

// PAYOUT_TABLES[risk][picksCount][hitCount-1] → multiplier (1-indexed: index 0 = 1 hit)
const PAYOUT_TABLES: Record<RiskLevel, Record<number, number[]>> = {
  classic: {
    1: [3.4],
    2: [1.0, 6],
    3: [0, 1.8, 25],
    4: [0, 1.4, 6, 60],
    5: [0, 0.7, 3, 14, 200],
    6: [0, 0, 2, 6, 30, 400],
    7: [0, 0, 1.5, 4, 14, 80, 700],
    8: [0, 0, 1, 2.8, 7, 35, 200, 1000],
    9: [0, 0, 0, 2, 5, 18, 80, 400, 1500],
    10: [0, 0, 0, 1.5, 4, 12, 45, 200, 800, 2500],
  },
  low: {
    1: [2.85],
    2: [1.7, 4],
    3: [1, 1.4, 15],
    4: [0.5, 1.4, 4, 40],
    5: [0.3, 1.2, 2, 10, 100],
    6: [0.3, 0.8, 1.8, 5, 20, 200],
    7: [0, 0.5, 1.5, 3, 10, 50, 400],
    8: [0, 0.5, 1, 2.5, 5, 20, 100, 500],
    9: [0, 0.3, 0.8, 2, 4, 10, 50, 200, 800],
    10: [0, 0.3, 0.6, 1.5, 3, 8, 25, 100, 400, 1000],
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

async function fetchNewGame(): Promise<{ gameId: string; clientSeed: string; serverSeedHash: string } | null> {
  try {
    const res = await fetch(API_ENDPOINTS.kenoInit);
    if (!res.ok) {
      console.error('keno init failed:', res.status, await res.text());
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('keno init error:', err);
    return null;
  }
}

export default function Keno() {
  const { bet } = useGameHouseContract();
  const { walletAddress } = useWallet();

  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [pendingNumbers, setPendingNumbers] = useState<Set<number>>(new Set());
  const [betAmount, setBetAmount] = useState<number>(0);
  const [risk, setRisk] = useState<RiskLevel>('classic');
  const [gamePhase, setGamePhase] = useState<GamePhase>('picking');

  // Provably fair seeds
  const [gameId, setGameId] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState('');
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [serverSeed, setServerSeed] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [initFailed, setInitFailed] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const initGame = useCallback(() => {
    setIsInitializing(true);
    setInitFailed(false);
    fetchNewGame().then((g) => {
      if (g) {
        setGameId(g.gameId);
        setClientSeed(g.clientSeed);
        setServerSeedHash(g.serverSeedHash);
        setInitFailed(false);
      } else {
        setInitFailed(true);
      }
      setIsInitializing(false);
    });
  }, []);

  // Fetch a new game on mount
  useEffect(() => {
    initGame();
    return clearTimeouts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived
  const hits = drawnNumbers.filter((n) => selectedNumbers.has(n)).length;
  const payoutRow =
    selectedNumbers.size > 0
      ? PAYOUT_TABLES[risk][selectedNumbers.size] ?? []
      : [];
  const currentMultiplier = hits > 0 ? (payoutRow[hits - 1] ?? 0) : 0;
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
    setPendingNumbers(new Set());
    setGamePhase('picking');
  }, [gamePhase]);

  const handleAutoPick = useCallback(() => {
    if (gamePhase !== 'picking') return;
    const count = selectedNumbers.size > 0 ? selectedNumbers.size : 5;
    const pool = shuffle(Array.from({ length: 40 }, (_, i) => i + 1));
    setSelectedNumbers(new Set(pool.slice(0, Math.min(count, 10))));
  }, [gamePhase, selectedNumbers.size]);

  const runAnimation = useCallback(
    (drawn: number[], snapshotSelected: Set<number>) => {
      clearTimeouts();
      setDrawnNumbers([]);
      setPendingNumbers(new Set());

      // Phase 1: reveal tiles as "?" staggered 60ms apart
      drawn.forEach((num, i) => {
        const t = setTimeout(() => {
          setPendingNumbers((prev) => new Set([...prev, num]));
        }, i * 60);
        timeoutsRef.current.push(t);
      });

      // Phase 2: flip each "?" to actual state, 150ms apart starting at 800ms
      drawn.forEach((num, i) => {
        const t = setTimeout(() => {
          setPendingNumbers((prev) => {
            const next = new Set(prev);
            next.delete(num);
            return next;
          });
          setDrawnNumbers((prev) => [...prev, num]);
        }, 800 + i * 150);
        timeoutsRef.current.push(t);
      });

      // Phase 3: show result after last tile flips
      const resultAt = 800 + 9 * 150 + 400;
      const t = setTimeout(() => {
        setGamePhase('result');
        const finalHits = drawn.filter((n) => snapshotSelected.has(n)).length;
        const mult = finalHits > 0 ? (PAYOUT_TABLES[risk][snapshotSelected.size]?.[finalHits - 1] ?? 0) : 0;
        const winAmount = mult * betAmount;
        if (winAmount > 0) {
          showGlobalToast(`Won ${winAmount.toFixed(4)} XLM (${mult}x)`, 'success', winAmount);
        } else {
          showGlobalToast('No win this round', 'error');
        }
      }, resultAt);
      timeoutsRef.current.push(t);
    },
    [risk, betAmount]
  );

  const handlePlay = useCallback(async () => {
    // New Game from result
    if (gamePhase === 'result') {
      setDrawnNumbers([]);
      setPendingNumbers(new Set());
      setServerSeed('');
      setShowVerify(false);
      setGamePhase('picking');
      initGame();
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
    if (!walletAddress) {
      showGlobalToast('Connect wallet first', 'error');
      return;
    }
    if (!gameId) {
      showGlobalToast('Game not ready, try again', 'error');
      return;
    }

    setGamePhase('drawing');
    const snapshotSelected = new Set(selectedNumbers);

    // 1. Place bet on-chain and wait for confirmation
    const betResult = await bet(betAmount);
    if (!betResult.success) {
      showGlobalToast(betResult.error ?? 'Bet failed', 'error');
      setGamePhase('picking');
      return;
    }

    // 2. Tell server to reveal seeds + compute payout
    let revealed: string | null = null;
    try {
      const res = await fetch(API_ENDPOINTS.kenoPlay, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          picks: Array.from(snapshotSelected),
          riskLevel: risk,
          playerAddress: walletAddress,
          betAmount,
          txHash: betResult.transactionHash ?? '',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      revealed = data.serverSeed as string;
    } catch (err: any) {
      showGlobalToast('Server error: ' + (err.message ?? 'unknown'), 'error');
      setGamePhase('picking');
      return;
    }

    setServerSeed(revealed);

    // 3. Derive drawn numbers client-side using both seeds
    const { hash1, hash2 } = await deriveHashes(revealed, clientSeed);
    const drawn = generateNumbers(hash1, hash2);

    // 4. Run Option B animation
    runAnimation(drawn, snapshotSelected);
  }, [gamePhase, selectedNumbers, betAmount, walletAddress, gameId, clientSeed, risk, bet, runAnimation, initGame]);

  // Wrapper for setBetAmount (supports updater fn)
  const handleSetBetAmount = useCallback(
    (v: number | ((prev: number) => number)) => setBetAmount(v),
    []
  );

  return (
    <div className="flex items-start justify-center h-full w-full px-6 py-8 gap-6 mt-12">
      {/* Left: Trading Panel */}
      <div className="w-70 shrink-0">
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
          clientSeed={clientSeed}
          serverSeedHash={serverSeedHash}
          serverSeed={serverSeed}
          isInitializing={isInitializing}
          initFailed={initFailed}
          onRetry={initGame}
        />
      </div>

      {/* Right: Board + Payout + Result */}
      <div className="flex-1 max-w-4xl">
        <KenoBoard
          selectedNumbers={selectedNumbers}
          drawnNumbers={drawnNumbers}
          pendingNumbers={pendingNumbers}
          gamePhase={gamePhase}
          onToggleNumber={handleToggleNumber}
          payoutRow={payoutRow}
          hits={hits}
        />

        {/* Result Summary */}
        {gamePhase === 'result' && (
          <div className="mt-4 flex flex-col gap-2">
            <div
              className={`rounded-lg p-4 border ${
                payout > 0
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {payout > 0 ? `+${payout.toFixed(4)} XLM` : '0.00 XLM'}
                  </div>
                  <div className="text-sm text-gray-400">
                    {hits}/{selectedNumbers.size} hits @ {currentMultiplier}x
                  </div>
                </div>
                {/* Verify link — only available once server seed is revealed (post-payment) */}
                {serverSeed && (
                  <button
                    onClick={() => setShowVerify((v) => !v)}
                    className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                  >
                    {showVerify ? 'Hide verify' : 'Verify →'}
                  </button>
                )}
              </div>
            </div>

            {/* Verify panel */}
            {showVerify && serverSeed && (
              <div className="rounded-lg p-4 bg-sidebar border border-border font-mono text-xs flex flex-col gap-2">
                <div className="text-gray-400 font-sans text-[11px] mb-1">Provably fair verification</div>
                <div className="flex gap-2">
                  <span className="text-gray-500 shrink-0 w-24">clientSeed</span>
                  <span className="text-gray-300 break-all">{clientSeed}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-400 shrink-0 w-24">serverSeed</span>
                  <span className="text-green-300 break-all">{serverSeed}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 shrink-0 w-24">drawn</span>
                  <span className="text-white">[{drawnNumbers.join(', ')}]</span>
                </div>
                <div className="text-gray-500 font-sans text-[10px] mt-1 leading-relaxed">
                  Run in browser console to verify:<br />
                  <span className="text-gray-400">
                    {'(await import("/lib/kenoNumbers.js")).verifyKenoGame("'}
                    {serverSeed.slice(0, 8)}{'...","'}{clientSeed.slice(0, 8)}{'...")'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
