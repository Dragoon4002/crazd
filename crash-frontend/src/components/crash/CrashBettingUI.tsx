'use client';

import { useState, useEffect } from 'react';
import { useGameHouseContract } from '@/hooks/useGameHouseContract';
import { API_ENDPOINTS } from '@/config/api';
import { stroopsToXlm } from '@/lib/stellar';
import { showGlobalToast } from '@/components/ui/Toast';

interface CrashBettingUIProps {
  gameId: string | null;
  currentMultiplier: number;
  status: string;
}

export function CrashBettingUI({ gameId, currentMultiplier, status }: CrashBettingUIProps) {
  const { bet, isConnected, getWalletAddress } = useGameHouseContract();

  const [betAmount, setBetAmount] = useState(0.01);
  const [hasBet, setHasBet] = useState(false);
  const [entryMultiplier, setEntryMultiplier] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset bet state when game changes
  useEffect(() => {
    setHasBet(false);
    setEntryMultiplier(0);
  }, [gameId]);

  const handleBuyIn = async () => {
    if (!gameId || !isConnected) {
      showGlobalToast('Wallet not connected or game not started!', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await bet(betAmount);

      if (result.success) {
        console.log('✅ Buy-in successful! TX:', result.transactionHash);
        setHasBet(true);
        setEntryMultiplier(currentMultiplier);
        showGlobalToast(`Buy-in successful at ${currentMultiplier.toFixed(2)}x`, 'success');
      } else {
        showGlobalToast(`Buy-in failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Buy-in error:', error);
      showGlobalToast('Buy-in failed!', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashOut = async () => {
    if (!gameId || !hasBet) return;

    setIsProcessing(true);

    try {
      // Get user's wallet address
      const userAddress = await getWalletAddress();
      if (!userAddress) {
        showGlobalToast('Wallet not connected!', 'error');
        setIsProcessing(false);
        return;
      }

      // Call gasless API endpoint (server pays gas)
      const response = await fetch(API_ENDPOINTS.crashCashout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          gameId: parseInt(gameId, 10).toString(),
          currentMultiplier: currentMultiplier,
        }),
      });

      const result = await response.json();

      if (result.success && result.payout) {
        const payoutXlm = stroopsToXlm(result.payout);
        console.log('✅ Cashed out! Payout:', payoutXlm, 'XLM');
        setHasBet(false);
        showGlobalToast(`Cashed out at ${currentMultiplier.toFixed(2)}x`, 'success', parseFloat(payoutXlm));
      } else {
        showGlobalToast(`Cash-out failed: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Cash-out error:', error);
      showGlobalToast('Cash-out failed!', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const canBuyIn = status === 'running' && !hasBet && !isProcessing && isConnected;
  const canCashOut = status === 'running' && hasBet && !isProcessing && isConnected;

  return (
    <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-3">
      {/* Bet Amount Input */}
      <div className="bg-sidebar border border-border rounded-lg p-4">
        <label className="block text-xs text-gray-400 mb-2">Bet Amount (XLM)</label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0.01)}
          disabled={hasBet || isProcessing}
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-primary disabled:opacity-50"
          step="0.01"
          min="0.01"
        />
      </div>

      {/* Buy In Button */}
      {!hasBet && (
        <button
          onClick={handleBuyIn}
          disabled={!canBuyIn}
          className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${
            canBuyIn
              ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] hover:opacity-90 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? 'Processing...' : `Buy In @ ${currentMultiplier.toFixed(2)}x`}
        </button>
      )}

      {/* Cash Out Button */}
      {hasBet && (
        <div className="flex flex-col gap-2">
          <div className="bg-sidebar border border-primary rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">Entry</div>
            <div className="text-lg font-bold text-primary">{entryMultiplier.toFixed(2)}x</div>
          </div>
          <button
            onClick={handleCashOut}
            disabled={!canCashOut}
            className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${
              canCashOut
                ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] hover:opacity-90 text-white animate-pulse'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Processing...' : `Cash Out @ ${currentMultiplier.toFixed(2)}x`}
          </button>
        </div>
      )}

      {/* Status */}
      {!isConnected && (
        <div className="text-xs text-red-400 text-center">
          Wallet not connected
        </div>
      )}
    </div>
  );
}
