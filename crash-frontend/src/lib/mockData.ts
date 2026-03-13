import { CandleflipGame } from './types';

export const mockCandleflipGames: CandleflipGame[] = [
  {
    id: '1',
    status: 'active',
    player1: { username: 'trader_01', bet: 0.025, side: 'bullish' },
    player2: { username: 'whale_99', bet: 0.025, side: 'bearish' },
    prize: 0.05,
  },
  {
    id: '2',
    status: 'completed',
    player1: { username: 'degen_42', bet: 0.1, side: 'bullish' },
    player2: { username: 'moon_boy', bet: 0.1, side: 'bearish' },
    prize: 0.2,
    winner: 'player1',
  },
  {
    id: '3',
    status: 'active',
    player1: { username: 'crypto_king', bet: 0.05, side: 'bearish' },
    player2: { username: 'hodler_69', bet: 0.05, side: 'bullish' },
    prize: 0.1,
  },
  {
    id: '4',
    status: 'completed',
    player1: { username: 'paper_hands', bet: 0.015, side: 'bearish' },
    player2: { username: 'diamond_hands', bet: 0.015, side: 'bullish' },
    prize: 0.03,
    winner: 'player2',
  },
];
