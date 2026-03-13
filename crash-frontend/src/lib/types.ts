export type GameMode = 'standard' | 'candleflip' | 'battles' | 'keno';

export interface Trader {
  id: string;
  username: string;
  avatar?: string;
  position: number;
  pnl: number;
  pnlPercentage: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  level: number;
  avatar?: string;
  message: string;
  timestamp: Date;
  badges?: string[];
  isAchievement?: boolean;
  achievementData?: {
    type: string;
    amount: number;
  };
}

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: Date;
  multiplier: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar?: string;
  pnl: number;
}

export interface CandleflipGame {
  id: string;
  status: 'active' | 'completed';
  player1: {
    username: string;
    bet: number;
    side: 'bullish' | 'bearish';
  };
  player2: {
    username: string;
    bet: number;
    side: 'bullish' | 'bearish';
  };
  prize: number;
  winner?: 'player1' | 'player2';
  candleData?: CandleData[];
}

export interface UserLevel {
  level: number;
  xp: number;
  maxXp: number;
}
