'use client';

import type { RiskLevel } from '@/components/keno/KenoBoard';

type GamePhase = 'picking' | 'drawing' | 'result';

interface KenoTradingPanelProps {
  betAmount: number;
  setBetAmount: (v: number | ((prev: number) => number)) => void;
  risk: RiskLevel;
  setRisk: (r: RiskLevel) => void;
  gamePhase: GamePhase;
  selectedCount: number;
  onPlay: () => void;
  onClearSelections: () => void;
  onAutoPick: () => void;
}

const RISKS: RiskLevel[] = ['classic', 'low', 'medium', 'high'];

const quickBtnClass =
  'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-md px-2 py-1.5 text-xs text-white font-medium hover:opacity-90 transition-all active:scale-95';

export default function KenoTradingPanel({
  betAmount,
  setBetAmount,
  risk,
  setRisk,
  gamePhase,
  selectedCount,
  onPlay,
  onClearSelections,
  onAutoPick,
}: KenoTradingPanelProps) {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setBetAmount(0);
    } else if (/^\d*\.?\d{0,3}$/.test(value)) {
      setBetAmount(parseFloat(value) || 0);
    }
  };

  const isDrawing = gamePhase === 'drawing';
  const canPlay =
    gamePhase !== 'drawing' && selectedCount > 0 && betAmount > 0;

  const playText =
    gamePhase === 'drawing'
      ? 'Drawing...'
      : gamePhase === 'result'
        ? 'New Game'
        : 'Play';

  return (
    <div className="rounded-lg p-4 bg-sidebar border border-border flex flex-col gap-4">
      {/* Bet Amount */}
      <div>
        <p className="text-sm text-gray-400 font-medium mb-2">Bet Amount</p>
        <div className="flex">
          <input
            type="text"
            value={betAmount.toFixed(3)}
            onChange={handleAmountChange}
            className="px-3 py-2 flex-1 bg-background border border-border rounded-lg text-white text-sm font-mono focus:outline-none focus:border-primary"
            placeholder="0.000"
          />
          <button
            onClick={() => setBetAmount(0)}
            className="px-2 py-2 text-sm text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Quick Add */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button className={quickBtnClass} onClick={() => setBetAmount((p: number) => p + 0.001)}>
          +0.001
        </button>
        <button className={quickBtnClass} onClick={() => setBetAmount((p: number) => p + 0.01)}>
          +0.01
        </button>
        <button className={quickBtnClass} onClick={() => setBetAmount((p: number) => p + 0.1)}>
          +0.1
        </button>
        <button className={quickBtnClass} onClick={() => setBetAmount((p: number) => p + 1)}>
          +1
        </button>
        <button className={quickBtnClass} onClick={() => setBetAmount((p: number) => p / 2)}>
          1/2
        </button>
        <button className={quickBtnClass} onClick={() => setBetAmount((p: number) => p * 2)}>
          X2
        </button>
      </div>

      {/* Risk */}
      <div>
        <p className="text-sm text-gray-400 font-medium mb-2">Risk</p>
        <div className="flex items-center gap-1.5">
          {RISKS.map((r) => (
            <button
              key={r}
              disabled={isDrawing}
              onClick={() => setRisk(r)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all active:scale-95 capitalize ${
                risk === r
                  ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] text-white'
                  : 'text-gray-400 hover:text-white bg-background border border-border'
              } ${isDrawing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Pick Counter */}
      <div className="text-center text-sm text-gray-400">
        <span className="text-primary font-bold">{selectedCount}</span>/10 picked
      </div>

      {/* Auto Pick */}
      <button
        onClick={onAutoPick}
        disabled={isDrawing}
        className={`w-full py-2 rounded-lg text-sm font-medium border border-border text-gray-300 hover:text-white hover:border-primary/50 transition-all ${
          isDrawing ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        Auto Pick
      </button>

      {/* Clear Table */}
      <button
        onClick={onClearSelections}
        disabled={isDrawing}
        className={`w-full py-2 rounded-lg text-sm font-medium border border-border text-gray-300 hover:text-white hover:border-primary/50 transition-all ${
          isDrawing ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        Clear Table
      </button>

      {/* Play */}
      <button
        onClick={onPlay}
        disabled={!canPlay && gamePhase !== 'result'}
        className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
          canPlay || gamePhase === 'result'
            ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] hover:opacity-90 text-white active:scale-95'
            : 'bg-background border border-border text-gray-400 cursor-not-allowed'
        }`}
      >
        {playText}
      </button>
    </div>
  );
}
