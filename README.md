# CRAZD

Multiplayer betting platform on Mantle. Provably fair. Fast settlements.

## What is CRAZD?

Two game modes built for degens who want transparent, real-time betting:

### Crash
Classic multiplier game. A chart starts at 1x and climbs - could hit 2x, 10x, 100x, or crash instantly. Place your bet, watch it climb, cash out whenever. Wait too long? It crashes and you lose everything. Cash out early? You might miss a 50x run.

- Real-time multiplayer - see other players betting live
- 60fps chart updates for smooth action
- Watch cashouts and rugs happen in real-time

### Candleflip
Quick 8-second rounds. Pick bullish or bearish on the next candle. Right = 2x. Wrong = 0. Multiple rooms running simultaneously for parallel positions.

- Real-time candle formation
- Instant results
- Run multiple rooms at once

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Go, Gorilla WebSocket |
| Blockchain | Mantle Sepolia, Solidity |
| Auth | Privy |
| Database | PostgreSQL, Redis |

## Provably Fair

Both games use predetermined hash-based outcomes:
1. Server generates seed + hash before any bets
2. Hash is published to players before betting
3. After game ends, seed is revealed
4. Players can verify: `SHA256(seed) === published_hash`

The house can't change results after seeing player positions.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Next.js App    │────▶│  Go WebSocket   │────▶│  Mantle Chain   │
│  (React 19)     │     │  Server         │     │  (Contracts)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Privy Auth     │     │  PostgreSQL     │
│  (Wallet)       │     │  + Redis        │
└─────────────────┘     └─────────────────┘
```

## Features

- **Live Chat** - Talk trash in real-time
- **Leaderboard** - Top players ranked by profit
- **Instant Payouts** - Smart contract settlements
- **Mobile Ready** - Responsive design

## Smart Contract

Deployed on Mantle Sepolia:
- GameHouseV3: `0x80Fc067cDDCDE4a78199a7A6751F2f629654b93A`

## Getting Started

### Prerequisites
- Node.js 20+
- Go 1.21+
- PostgreSQL
- Redis (optional)

### Frontend
```bash
cd crash-frontend
npm install
npm run dev
```

### Backend
```bash
cd crash-backend
go mod download
go run main.go
```

### Environment Variables

Frontend (`.env`):
```
NEXT_PUBLIC_WS_URL=wss://your-backend-url
NEXT_PUBLIC_API_URL=https://your-backend-url
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

Backend:
```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
PRIVATE_KEY=your-contract-signer-key
RPC_URL=https://rpc.sepolia.mantle.xyz
```

## Game Mechanics

### Crash Formula
```
multiplier = e^(elapsed_time * growth_rate)
crash_point = hash_to_float(server_seed) * max_multiplier
```

### Candleflip Formula
```
40 ticks × 200ms = 8 seconds
price_change = seeded_random(-5%, +5%) per tick
winner = final_price >= 1.0 ? "bull" : "bear"
payout = 2x bet if correct
```

## Team

Built for Mantle Hackathon 2025

## License

MIT
