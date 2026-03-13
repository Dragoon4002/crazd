import seedrandom from 'seedrandom';

// Price generator for candleflip (matches server-side logic)
function generatePrice(random: () => number, lastPrice: number): number {
  const chance = random();
  let percentChange: number;

  if (chance < 0.01) {
    // 1% chance for big move (±20%)
    percentChange = random() < 0.5 ? -0.20 : 0.20;
  } else {
    // 99% chance for small move (±1% to ±5%)
    const magnitude = 0.01 + random() * 0.04; // 0.01 to 0.05
    percentChange = random() < 0.5 ? -magnitude : magnitude;
  }

  const newPrice = lastPrice * (1 + percentChange);
  // Prevent negative prices
  return newPrice < 0 ? 0 : newPrice;
}

// Main verification logic
export function verifyCandleflip(serverSeed: string): {
  winner: 'RED' | 'GREEN';
  finalPrice: number;
  priceHistory: number[];
} {
  const combined = serverSeed + '-candleflip';
  const rng = seedrandom(combined);
  const startingPrice = 1.0;
  const numTicks = 40;
  let currentPrice = startingPrice;
  const priceHistory = [currentPrice];

  // Run exactly 40 price updates
  for (let i = 0; i < numTicks; i++) {
    currentPrice = generatePrice(() => rng(), currentPrice);
    if (currentPrice < 0) {
      currentPrice = 0;
    }
    priceHistory.push(currentPrice);
  }

  // RED wins if final price < 1.0, GREEN wins if >= 1.0
  const winner = currentPrice < 1.0 ? 'RED' : 'GREEN';

  return {
    winner,
    finalPrice: currentPrice,
    priceHistory,
  };
}

// Hash verification (you'll need to implement SHA-256 hashing)
export function hashServerSeed(serverSeed: string): string {
  // TODO: Implement SHA-256 hash
  // For now, return a placeholder
  return 'hash-' + serverSeed;
}
