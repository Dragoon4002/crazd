/**
 * API Configuration
 */

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
} as const;

export const API_ENDPOINTS = {
  // Crash Game
  crashRegister: `${API_CONFIG.baseUrl}/api/crash/register`,
  crashCashout: `${API_CONFIG.baseUrl}/api/crash/cashout`,

  // CandleFlip
  candleRegister: `${API_CONFIG.baseUrl}/api/candle/register`,
  candlePreviewOdds: `${API_CONFIG.baseUrl}/api/candle/preview-odds`,

  // Verification
  verifyGame: (gameId: string) => `${API_CONFIG.baseUrl}/api/verify/${gameId}`,
  health: `${API_CONFIG.baseUrl}/api/health`,

  // WebSocket
  ws: `${API_CONFIG.wsUrl}/ws`,
  wsCandleflip: `${API_CONFIG.wsUrl}/candleflip`,
} as const;
