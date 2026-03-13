export type TrendType = 'bullish' | 'bearish';
export type GameStatus = 'waiting' | 'countdown' | 'running' | 'finished';
export type WinnerType = 'RED' | 'GREEN' | null;
export type SideType = 'bull' | 'bear';

export interface CandleflipBet {
  amount: number;
  trend: TrendType;
  roomId: string;
}

export interface PriceUpdate {
  tick: number;
  price: number;
}

export interface CandleflipGameState {
  batchId: string;
  roomNumber: number;
  playerSide: SideType;
  aiSide: SideType;
  playerWon?: boolean;
  gameId: string;
  status: GameStatus;
  serverSeedHash: string;
  serverSeed?: string; // Only revealed after batch ends
  startingPrice: number;
  currentPrice: number;
  finalPrice?: number;
  priceHistory: number[];
  countdown: number;
  tick: number;
  totalTicks: number;
  winner?: WinnerType;
  userBet?: {
    amount: number;
    trend: TrendType;
  };
  result?: {
    won: boolean;
    payout: number;
  };
}

export interface CandleflipRoomMessage {
  type: 'batch_created' | 'batch_start' | 'room_start' | 'price_update' | 'room_end' | 'batch_end' | 'payout_failed' | 'error';
  batchId?: string;
  data: {
    batchId?: string;
    roomNumber?: number;
    playerAddress?: string;
    totalRooms?: number;
    amountPerRoom?: string;
    playerSide?: SideType;
    aiSide?: SideType;
    serverSeedHash?: string;
    serverSeed?: string;
    tick?: number;
    price?: number;
    totalTicks?: number;
    finalPrice?: number;
    winner?: SideType;
    playerWon?: boolean;
    wonRooms?: number;
    error?: string;
  };
  error?: string;
}

// Batch info for tracking multiple rooms
export interface CandleflipBatch {
  batchId: string;
  playerAddress: string;
  totalRooms: number;
  amountPerRoom: string;
  playerSide: SideType;
  aiSide: SideType;
  serverSeedHash: string;
  serverSeed?: string;
  wonRooms?: number;
  status: 'waiting' | 'running' | 'completed' | 'paid';
  rooms: CandleflipRoom[];
}

export interface CandleflipRoom {
  roomNumber: number;
  status: GameStatus;
  finalPrice?: number;
  winner?: SideType;
  playerWon?: boolean;
}