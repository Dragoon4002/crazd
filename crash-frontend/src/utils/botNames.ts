// Bot names and emojis for Candleflip opponents
export const BOT_NAMES = [
  { name: 'CryptoBot', emoji: '🤖' },
  { name: 'TradeWizard', emoji: '🧙' },
  { name: 'BullBot', emoji: '🐂' },
  { name: 'BearBot', emoji: '🐻' },
];

export function getRandomBot(): { name: string; emoji: string } {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

// Generate consistent bot for a room (always returns AI)
export function getBotForRoom(roomId: string): { name: string; emoji: string } {
  // Always return AI bot for consistency
  return { name: 'AI', emoji: '🤖' };
}
