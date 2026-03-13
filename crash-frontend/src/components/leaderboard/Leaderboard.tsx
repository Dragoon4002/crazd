'use client'

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Crown, Loader2, Medal } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  pnl: number;
}

interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  userPosition?: LeaderboardEntry;
}

// Truncate wallet address: 0x1234...ab
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-2)}`;
}

export function Leaderboard() {
  const { walletAddress } = useWallet();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const url = walletAddress
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/leaderboard?wallet=${walletAddress}`
          : `${process.env.NEXT_PUBLIC_API_URL}/api/leaderboard`;

        const response = await fetch(url);
        const data: LeaderboardResponse = await response.json();

        if (data.success) {
          setLeaderboard(data.leaderboard);
          setUserPosition(data.userPosition || null);
        } else {
          setError('Failed to load leaderboard');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error('Leaderboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [walletAddress]);

  const formatPnl = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(10)}`;
  };

  // Get top 3 and remaining
  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  // Find user in leaderboard array (case-insensitive)
  const userInLeaderboard = walletAddress
    ? leaderboard.find(entry => entry.walletAddress.toLowerCase() === walletAddress.toLowerCase())
    : null;

  // Use leaderboard entry if found, otherwise fall back to API userPosition
  const displayUserPosition = userInLeaderboard || userPosition;

  if (loading) {
    return (
      <Card className="bg-sidebar border-border p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-sidebar border-border p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-red-400">{error}</p>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="bg-sidebar border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="h-6 w-6" />
          <h2 className="text-2xl font-black text-primary">LEADERBOARD</h2>
        </div>
        <p className="text-gray-400 text-center py-8">No players yet. Be the first!</p>
      </Card>
    );
  }

  return (
    <Card className="bg-sidebar border-border p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-primary flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          LEADERBOARD
        </h2>
      </div>

      {/* Top 3 Podium */}
      {topThree.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            {/* Player Info */}
            <div className="flex flex-col items-center mb-2">
              <Medal className="h-5 w-5 text-gray-300 mb-1" />
              <span className="text-gray-300 text-sm font-mono">{truncateAddress(topThree[1].walletAddress)}</span>
              <span className="text-gray-200 text-lg font-bold">{topThree[1].pnl.toFixed(3)} XLM</span>
            </div>
            {/* Podium */}
            <div className="w-28 h-24 rounded-2xl flex items-center justify-center bg-gradient-to-b from-gray-400 to-gray-500 border-2 border-gray-300/50">
              <span className="text-2xl font-bold text-white">2nd</span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            {/* Player Info */}
            <div className="flex flex-col items-center mb-2">
              <Crown className="h-6 w-6 text-yellow-400 mb-1 rotate-[-15deg]" fill="currentColor" />
              <span className="text-yellow-400 text-sm font-mono">{truncateAddress(topThree[0].walletAddress)}</span>
              <span className="text-yellow-300 text-xl font-bold">{topThree[0].pnl.toFixed(3)} XLM</span>
            </div>
            {/* Podium */}
            <div className="w-32 h-36 rounded-2xl flex items-center justify-center bg-gradient-to-b from-yellow-400 to-orange-500 border-2 border-yellow-300/50 shadow-lg shadow-yellow-500/30">
              <span className="text-3xl font-bold text-white">1st</span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            {/* Player Info */}
            <div className="flex flex-col items-center mb-2">
              <Medal className="h-5 w-5 text-orange-400 mb-1"/>
              <span className="text-orange-400 text-sm font-mono">{truncateAddress(topThree[2].walletAddress)}</span>
              <span className="text-orange-300 text-lg font-bold">{topThree[2].pnl.toFixed(3)} XLM</span> 
            </div>
            {/* Podium */}
            <div className="w-28 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-b from-orange-400 to-orange-600 border-2 border-orange-300/50">
              <span className="text-2xl font-bold text-white">3rd</span>
            </div>
          </div>
        </div>
      )}

      {/* Remaining Rankings Table */}
      {remaining.length > 0 && (
        <div className="mt-8 max-h-80 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-sidebar">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-gray-400">Rank</TableHead>
                <TableHead className="text-gray-400">Player</TableHead>
                <TableHead className="text-right text-gray-400">PnL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remaining.map((entry) => (
                <TableRow key={entry.rank} className="border-border hover:bg-white/5">
                  <TableCell className="font-medium text-white">#{entry.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className={`h-6 w-6 ${
                        entry.rank <= 6 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                        entry.rank <= 12 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                        'bg-gradient-to-br from-orange-500 to-red-500'
                      } flex items-center justify-center text-[10px] font-bold text-white`}>
                        {entry.walletAddress.slice(2, 4).toUpperCase()}
                      </Avatar>
                      <span className="text-white font-medium font-mono">{truncateAddress(entry.walletAddress)}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-medium ${entry.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPnl(entry.pnl)} XLM
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Your Position Row */}
      {walletAddress && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="text-xs text-gray-500 mb-2">Your Position</div>
          <div className="flex items-center py-2 px-1">
            <div className="w-20 font-medium text-primary">
              {displayUserPosition ? `#${displayUserPosition.rank}` : '-'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-[10px] font-bold text-white border border-primary/50">
                  {walletAddress.slice(2, 4).toUpperCase()}
                </Avatar>
                <span className="text-primary font-medium font-mono">{truncateAddress(walletAddress)}</span>
              </div>
            </div>
            <div className={`text-right font-mono font-medium ${displayUserPosition && displayUserPosition.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {displayUserPosition ? formatPnl(displayUserPosition.pnl) : '0.000'}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
