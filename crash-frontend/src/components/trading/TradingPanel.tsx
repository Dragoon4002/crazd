'use client'

import { useState, useEffect } from 'react';
import { useGameHouseContract } from '@/hooks/useGameHouseContract';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { showGlobalToast } from '@/components/ui/Toast';

interface TradingPanelProps {
  gameId: string | null;
  currentMultiplier: number;
  status: string;
  isRugged?: boolean;
}

export function TradingPanel({ gameId, currentMultiplier, status, isRugged = false }: TradingPanelProps) {
  const { bet, isConnected, getWalletAddress } = useGameHouseContract();
  const { sendMessage, clientId } = useWebSocket();

  const [betAmount, setBetAmount] = useState(0);
  const [hasBet, setHasBet] = useState(false);
  const [entryMultiplier, setEntryMultiplier] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset bet state when game gets rugged or crashes
  useEffect(() => {
    if ((isRugged || status === 'crashed') && hasBet) {
      // Clear bet state after a short delay so user can see the result
      const timer = setTimeout(() => {
        setHasBet(false);
        setEntryMultiplier(0);
        console.log('🔄 Bet cleared due to game ending');
      }, 3000); // 3 second delay to show result

      return () => clearTimeout(timer);
    }
  }, [isRugged, status, hasBet]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input or valid decimal numbers
    if (value === '') {
      setBetAmount(0);
    } else if (/^\d*\.?\d{0,3}$/.test(value)) {
      // Allow up to 3 decimal places
      setBetAmount(parseFloat(value) || 0);
    }
  };

  const handleReset = () => {
    setBetAmount(0);
  };

  const handleQuickAdd = (value: number) => {
    setBetAmount((prev) => prev + value);
  };

  const handleHalf = () => {
    setBetAmount((prev) => prev / 2);
  };

  const handleDouble = () => {
    setBetAmount((prev) => prev * 2);
  };

  const handleBuyIn = async () => {
    if (!gameId || !isConnected) {
      console.warn('Wallet not connected or game not started');
      return;
    }

    if (betAmount <= 0) {
      console.warn('Invalid bet amount');
      return;
    }

    setIsProcessing(true);

    try {
      // Get wallet address
      const playerAddress = await getWalletAddress();
      if (!playerAddress) {
        showGlobalToast('Failed to get wallet address. Please reconnect your wallet.', 'error');
        setIsProcessing(false);
        return;
      }

      // Step 1: Place bet on contract
      console.log('🎲 Placing bet on contract...');
      const betResult = await bet(betAmount);

      if (!betResult.success) {
        showGlobalToast(`Bet failed: ${betResult.error}`, 'error');
        setIsProcessing(false);
        return;
      }

      console.log('✅ Bet placed on contract:', betResult.transactionHash);

      // Step 2: Update local state
      setHasBet(true);
      setEntryMultiplier(currentMultiplier);

      // Step 3: Notify server to add to active bettors list and store in DB
      sendMessage('crash_bet_placed', {
        playerAddress: playerAddress,
        userId: clientId,
        gameId: gameId,
        betAmount: betAmount,
        entryMultiplier: currentMultiplier,
        transactionHash: betResult.transactionHash,
      });

      console.log(`✅ Bet placed at ${currentMultiplier.toFixed(2)}x with ${betAmount} XLM`);
    } catch (error: any) {
      console.error('Buy-in error:', error);
      showGlobalToast(`Failed to place bet: ${error.message || 'Unknown error'}`, 'error');
      setHasBet(false);
      setEntryMultiplier(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashOut = async () => {
    if (!gameId || !hasBet) return;

    // Prevent cashout if game is rugged
    if (isRugged) {
      console.warn('⚠️ Game has rugged - cannot cash out');
      return;
    }

    setIsProcessing(true);

    try {
      // Get wallet address
      const playerAddress = await getWalletAddress();
      if (!playerAddress) {
        showGlobalToast('Failed to get wallet address.', 'error');
        setIsProcessing(false);
        return;
      }

      // Send cashout request to server
      // Server will calculate payout and call payPlayer contract function
      sendMessage('crash_cashout', {
        playerAddress: playerAddress,
        userId: clientId,
        gameId: gameId,
        cashoutMultiplier: currentMultiplier,
        betAmount: betAmount,
        entryMultiplier: entryMultiplier,
      });

      console.log(`📤 Cashout request sent at ${currentMultiplier.toFixed(2)}x`);

      // Update local state immediately (server will confirm)
      setHasBet(false);
      setEntryMultiplier(0);
    } catch (error: any) {
      console.error('Cash-out error:', error);
      showGlobalToast(`Failed to cash out: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Allow buy in during "countdown" (betting phase) or "running" (late buy-in)
  // Don't allow buy-in if game is rugged
  const canBuyIn = (status === 'running' || status === 'countdown') && !hasBet && !isProcessing && isConnected && betAmount > 0 && gameId !== null && gameId !== '' && !isRugged;

  // Disable cashout if game is rugged or crashed
  const canCashOut = status === 'running' && hasBet && !isProcessing && isConnected && !isRugged;

  // Debug logging
  // console.log('TradingPanel Debug:', {
  //   status,
  //   hasBet,
  //   isProcessing,
  //   isConnected,
  //   betAmount,
  //   isRugged,
  //   canBuyIn,
  //   canCashOut,
  //   currentMultiplier,
  //   gameId
  // });

  return (
    <div className="rounded-lg p-4 bg-sidebar border border-border">
      {/* Amount input row */}
      <div className="flex justify-between gap-2 mb-3">
        <input
          type="text"
          value={betAmount.toFixed(3)}
          onChange={handleAmountChange}
          className="w-32 px-3 py-2 bg-background border border-border rounded-lg text-white text-sm font-mono focus:outline-none focus:border-primary"
          placeholder="0.000"
        />
        <button
          onClick={handleReset}
          className="px-2 py-2 text-sm text-gray-400 hover:text-white"
        >
          ✕
        </button>

        {/* Quick add buttons */}
        <div className="flex items-center gap-2">
          <button onClick={() => handleQuickAdd(0.001)} className="bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-md px-2 py-1.5 text-xs text-white font-medium hover:opacity-90 transition-all active:scale-95">+0.001</button>
          <button onClick={() => handleQuickAdd(0.01)} className="bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-md px-2 py-1.5 text-xs text-white font-medium hover:opacity-90 transition-all active:scale-95">+0.01</button>
          <button onClick={() => handleQuickAdd(0.1)} className="bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-md px-2 py-1.5 text-xs text-white font-medium hover:opacity-90 transition-all active:scale-95">+0.1</button>
          <button onClick={() => handleQuickAdd(1)} className="bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-md px-2 py-1.5 text-xs text-white font-medium hover:opacity-90 transition-all active:scale-95">+1</button>
          <button onClick={handleHalf} className="bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-md px-2 py-1.5 text-xs text-white font-medium hover:opacity-90 transition-all active:scale-95">1/2</button>
          <button onClick={handleDouble} className="bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-md px-2 py-1.5 text-xs text-white font-medium hover:opacity-90 transition-all active:scale-95">X2</button>
        </div>
      </div>

      {/* Buy/Sell button */}
      {!hasBet ? (
        <div>
          <button
            onClick={handleBuyIn}
            disabled={!canBuyIn}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
              canBuyIn
                ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] hover:opacity-90 text-white active:scale-95'
                : 'bg-background border border-border text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Processing...' : `BUY @ ${currentMultiplier.toFixed(2)}x`}
          </button>

          {!canBuyIn && (
            <div className="text-xs text-center mt-2 text-yellow-400">
              {!isConnected ? '🔒 Wallet not connected' :
               betAmount <= 0 ? '⚠ Enter bet amount' :
               status === 'connecting' ? '⏳ Connecting...' :
               status === 'crashed' ? '⏸ Wait for next round' :
               isRugged ? '⚠ Game rugged' : ''}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-gray-400">Entry: <span className="text-primary font-bold">{entryMultiplier.toFixed(2)}x</span></span>
            <span className="text-xs text-gray-400">Current: <span className="text-white font-bold">{currentMultiplier.toFixed(2)}x</span></span>
          </div>
          <button
            onClick={handleCashOut}
            disabled={!canCashOut}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
              canCashOut
                ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] hover:opacity-90 text-white animate-pulse active:scale-95'
                : 'bg-background border border-border text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Processing...' : isRugged ? 'RUGGED' : status === 'crashed' ? 'CRASHED' : `SELL @ ${currentMultiplier.toFixed(2)}x`}
          </button>

          {!canCashOut && hasBet && (
            <div className="text-xs text-center mt-2">
              {isRugged ? <span className="text-red-500 font-bold">⚠ RUGGED - Bet lost</span> :
               status === 'crashed' ? <span className="text-orange-400">💥 Crashed - Bet lost</span> :
               status === 'countdown' ? <span className="text-gray-400">⏸ Not started</span> : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
