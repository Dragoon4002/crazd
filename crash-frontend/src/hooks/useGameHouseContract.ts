/**
 * useGameHouseContract Hook
 *
 * Provides Soroban contract interaction for CrashHouse.
 * Uses Freighter wallet for signing via WalletContext.
 */

import { useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { buildBetTx, submitTransaction, xlmToStroops } from '@/lib/stellar';
import { signTx } from '@/lib/freighter';
import { CRASH_HOUSE_CONTRACT } from '@/contracts/config';

export interface BetResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export function useGameHouseContract() {
  const { walletAddress } = useWallet();

  /**
   * Place a bet by sending XLM to the contract house pool.
   * @param betAmount Bet amount in XLM (e.g., 0.1)
   */
  const bet = useCallback(
    async (betAmount: number | string): Promise<BetResult> => {
      try {
        if (!walletAddress) {
          return { success: false, error: 'Wallet not connected' };
        }

        const amountStroops = xlmToStroops(Number(betAmount));

        console.log('🎮 Building bet tx:', { amount: betAmount, stroops: amountStroops.toString() });

        // Build transaction XDR
        const xdr = await buildBetTx(walletAddress, amountStroops);

        // Sign with Freighter
        console.log('✍️ Requesting Freighter signature...');
        const signedXdr = await signTx(xdr);

        // Submit to network
        console.log('📡 Submitting to Stellar...');
        const result = await submitTransaction(signedXdr);

        if (result.status === 'SUCCESS') {
          const txHash = result.txHash || 'unknown';
          console.log('✅ Bet confirmed:', txHash);
          return { success: true, transactionHash: txHash };
        }

        return { success: false, error: `Transaction status: ${result.status}` };
      } catch (error: any) {
        console.error('❌ Bet failed:', error);

        let errorMsg = 'Transaction failed';
        if (error.message?.includes('User declined')) {
          errorMsg = 'User rejected transaction';
        } else if (error.message?.includes('Paused')) {
          errorMsg = 'Contract is paused';
        } else if (error.message?.includes('ZeroValue')) {
          errorMsg = 'Bet amount must be greater than 0';
        } else if (error.message?.includes('insufficient')) {
          errorMsg = 'Insufficient XLM balance';
        } else if (error.message) {
          errorMsg = error.message;
        }

        return { success: false, error: errorMsg };
      }
    },
    [walletAddress],
  );

  /**
   * Get current user's wallet address.
   */
  const getWalletAddress = useCallback(async (): Promise<string | null> => {
    return walletAddress;
  }, [walletAddress]);

  return {
    // Contract info
    contractId: CRASH_HOUSE_CONTRACT.id,
    network: CRASH_HOUSE_CONTRACT.network,

    // Main functions
    bet,

    // View functions
    getWalletAddress,

    // Utilities
    isConnected: !!walletAddress,
  };
}
