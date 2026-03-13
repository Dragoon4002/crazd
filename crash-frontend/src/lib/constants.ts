export const COLORS = {
  background: {
    primary: '#190D2C',
    secondary: '#251337',
    card: '#251337',
  },
  primary: '#9263E1',
  button: {
    gradient: {
      from: '#9B61DB',
      to: '#7457CC',
    },
  },
  accent: {
    green: '#22c55e',
    red: '#ef4444',
    gold: '#f59e0b',
    purple: '#9263E1',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.6)',
    muted: 'rgba(255, 255, 255, 0.4)',
  },
} as const;

export const GAME_MODES = [
  { id: 'standard', label: 'Standard', icon: '🔥' },
  { id: 'candleflip', label: 'Candleflip', icon: '💖' },
  { id: 'battles', label: 'Battles', icon: '⚔️' },
] as const;

export const MULTIPLIER_LEVELS = [0.5, 1, 1.5, 2, 2.5];

export const PERCENTAGE_OPTIONS = [10, 25, 50, 100];

export const QUICK_ADD_AMOUNTS = [0.001, 0.01, 0.1, 1];

export const LEADERBOARD_TIME_FILTERS = ['24 Hours', '7 Days', '30 Days'] as const;
