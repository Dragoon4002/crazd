'use client'

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockCandleflipGames } from '@/lib/mockData';
import { CandleflipGame } from '@/lib/types';
import { Check } from 'lucide-react';

export function CandleflipGrid() {
  const renderGameCard = (game: CandleflipGame) => {
    const isCompleted = game.status === 'completed';
    const winner = game.winner === 'player1' ? game.player1 : game.player2;
    const winningSide = winner?.side;

    return (
      <Card
        key={game.id}
        className="bg-sidebar border-border p-4 relative overflow-hidden hover:border-white/20 transition-colors"
      >
        {/* Completed Indicator */}
        {isCompleted && (
          <div className="absolute top-2 left-2 bg-green-500 rounded-full p-1">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Player 1 */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-xs">
              🐸
            </div>
            <span className="text-sm text-white font-medium">{game.player1.username}</span>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            +{game.player1.bet.toFixed(3)} XLM
          </Badge>
        </div>

        {/* VS / Prize */}
        <div className="my-3 text-center">
          {isCompleted && winningSide ? (
            <div className={`text-lg font-bold ${winningSide === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
              {winningSide === 'bullish' ? 'BULLISH!' : 'BEARISH!'}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">VS</div>
          )}
          <div className="text-2xl font-black text-white mt-1">
            +{game.prize.toFixed(3)} XLM
          </div>
          <div className="text-xs text-gray-400">Prize Pool</div>
        </div>

        {/* Player 2 */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-xs">
              🤖
            </div>
            <span className="text-sm text-white font-medium">{game.player2.username}</span>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
            +{game.player2.bet.toFixed(3)} XLM
          </Badge>
        </div>

        {/* Mini Chart for Active Games */}
        {!isCompleted && (
          <div className="mt-3 h-16 bg-transparent rounded border border-border flex items-end justify-center gap-1 p-2">
            {[0.8, 1.2, 0.9, 1.5, 1.8, 1.3, 1.1].map((value, idx) => (
              <div
                key={idx}
                className={`flex-1 ${value >= 1 ? 'bg-green-500' : 'bg-red-500'} rounded-sm opacity-60`}
                style={{ height: `${value * 30}%` }}
              />
            ))}
          </div>
        )}

        {/* Result Indicator */}
        {isCompleted && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="flex-1 h-12 bg-transparent rounded border border-border flex items-center justify-center">
              <div className={`h-8 w-16 ${winningSide === 'bullish' ? 'bg-green-500' : 'bg-red-500/20'} rounded`} />
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex-1 h-12 bg-transparent rounded border border-border flex items-center justify-center">
              <div className={`h-8 w-16 ${winningSide === 'bearish' ? 'bg-red-500' : 'bg-green-500/20'} rounded`} />
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
      {mockCandleflipGames.map(renderGameCard)}
    </div>
  );
}
