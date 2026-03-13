'use client'

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Flame, Gift, Swords, Wallet, Trophy, Cuboid } from 'lucide-react';
import { GameMode } from '@/lib/types';
import Link from 'next/link';

interface HeaderProps {
  currentMode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

const NAV_ITEMS = [
  { id: 'standard', label: 'Crash', icon: Flame },
  { id: 'candleflip', label: 'CandleFlip', icon: Gift },
  // { id: 'battles', label: 'Battle', icon: Swords },
  { id: 'keno', label: 'Keno', icon: Cuboid },
] as const;

export function Header({ currentMode, onModeChange }: HeaderProps) {
  const { walletAddress, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Update indicator position when active item changes
  useEffect(() => {
    const activeIndex = NAV_ITEMS.findIndex(item => item.id === currentMode);
    const activeItem = itemRefs.current[activeIndex];

    if (activeItem && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      setIndicatorStyle({
        left: itemRect.left - navRect.left,
        width: itemRect.width,
      });
    }
  }, [currentMode]);

  const getShortAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-sidebar/95 backdrop-blur supports-backdrop-filter:bg-sidebar/80">
      <div className="flex h-20 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-65">
          <div className="text-2xl">🏔️</div>
          <div className="flex items-baseline gap-1">
            <h1 className="text-2xl font-black text-white tracking-tight">RUGS.FUN</h1>
            <span className="text-[9px] text-primary font-bold px-1 py-0.5 bg-primary/10 rounded">BETA</span>
          </div>
        </div>

        {/* Animated Navigation */}
        <nav
          ref={navRef}
          className="relative flex items-center bg-sidebar rounded-full p-1.5"
        >
          {/* Animated background indicator */}
          <div
            className="absolute top-1.5 bottom-1.5 rounded-full bg-gradient-to-br from-[#9B61DB] to-[#7457CC] transition-all duration-300 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />

          {/* Nav items */}
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentMode === item.id;

            return (
              <button
                key={item.id}
                ref={(el) => { itemRefs.current[index] = el; }}
                onClick={() => onModeChange(item.id as GameMode)}
                className={`
                  relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  transition-colors duration-200
                  ${isActive ? 'text-white' : 'text-white/60 hover:text-white/80'}
                `}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Leaderboard & Connect */}
        <div className="flex items-center gap-3 min-w-[180px] justify-end">
          {/* Leaderboard Link */}
          <Link href="/leaderboard">
            <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/5 text-white/60 hover:text-white">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">Leaderboard</span>
            </Button>
          </Link>

          {/* Connect/Wallet Button */}
          {walletAddress ? (
            <div className="flex items-center gap-2">
              <div className="bg-sidebar border border-border px-3 py-1.5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs font-mono text-white">
                    {getShortAddress(walletAddress)}
                  </span>
                </div>
              </div>
              <Button
                onClick={disconnectWallet}
                variant="outline"
                className="h-9 text-xs px-4 border-white/10 hover:bg-white/5 text-white"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-gradient-to-br from-[#9B61DB] to-[#7457CC] hover:opacity-90 text-white font-bold px-5 h-9 text-xs rounded-full flex items-center gap-2"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
