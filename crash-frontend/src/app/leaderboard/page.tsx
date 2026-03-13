'use client'

import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LeaderboardPage() {
  return (
    <div className="h-screen w-full bg-background p-6">
      <div className=" mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-white/60 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Game
            </Button>
          </Link>
        </div>
        <Leaderboard />
      </div>
    </div>
  );
}
