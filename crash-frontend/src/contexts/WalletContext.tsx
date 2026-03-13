'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  isConnected,
  isAllowed,
  getAddress,
  requestAccess,
  getNetwork,
} from '@stellar/freighter-api';

interface WalletContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore session on mount via Freighter API
  useEffect(() => {
    const restore = async () => {
      try {
        const { isConnected: connected } = await isConnected();
        if (!connected) return;

        const allowed = await isAllowed();
        if (!allowed.isAllowed) return;

        const { address } = await getAddress();
        if (address) setWalletAddress(address);
      } catch {
        // Freighter not available or denied
      }
    };
    restore();
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const { isConnected: connected } = await isConnected();
      if (!connected) {
        alert('Please install Freighter wallet extension');
        return;
      }

      const accessResult = await requestAccess();
      if (accessResult.error) {
        console.error('Access denied:', accessResult.error);
        return;
      }

      const { network } = await getNetwork();
      if (network !== 'TESTNET') {
        alert('Please switch Freighter to Testnet');
        return;
      }

      setWalletAddress(accessResult.address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
  };

  return (
    <WalletContext.Provider
      value={{ walletAddress, isConnecting, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
