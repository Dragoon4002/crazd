# CRAZD — Bet on-chain. Win on-chain. No middlemen.

> Provably fair multiplayer betting on Stellar. Every outcome verifiable. Every payout instant.

---

## Why CRAZD?

Most crypto betting platforms are just casinos with a blockchain logo slapped on. The house controls the RNG, holds your funds, and pays out whenever they feel like it.

CRAZD is different. Bets go directly into a Soroban smart contract. Outcomes are hash-verified before the round starts. Payouts are on-chain. The house literally cannot cheat — the math is public.

---

## The Games

### Crash
A multiplier climbs from 1x. Could hit 2x. Could hit 100x. Could crash at 1.01x. You decide when to pull out.

- Watch other players bet and bail in real-time
- 60fps live chart
- Cash out at any point before the crash

**The thrill:** You're not betting against a machine. You're betting against everyone else's nerve.

### Candleflip
8 seconds. Bull or bear. Double or nothing.

- 40 price ticks, 200ms each — watch the candle form live
- Multiple rooms run simultaneously
- No waiting around — next round starts immediately

### Battles & Keno
More ways to lose your XLM responsibly.

---

## How It's Built

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Next.js 16      │────▶│  Go WebSocket    │────▶│  Stellar/Soroban │
│  React 19        │◀────│  Game Engine     │     │  CrashHouse      │
│  Tailwind v4     │     │                  │     │  Contract        │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │
        ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│  Freighter       │     │  PostgreSQL       │
│  Wallet          │     │  + Redis          │
└──────────────────┘     └──────────────────┘
```

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4 |
| Backend | Go 1.24, Gorilla WebSocket |
| Blockchain | Stellar / Soroban |
| Wallet | Freighter |
| Database | PostgreSQL, Redis |

---

## Provably Fair — Actually

Before every round:
1. Server generates a seed and publishes `SHA256(seed)` — locked in before bets open
2. Round plays out
3. Seed is revealed — anyone can verify `SHA256(seed) === committed_hash`

The house **cannot** change the outcome after seeing where players placed their bets. The commitment is on-chain. The math is open source. Don't trust — verify.

---

## Smart Contract

**CrashHouse** — deployed on Stellar Testnet:

```
CBHMMQBK6ERVGROJZFHQ56QLBCBWNL5NXLCTV2X2ZBZ5LCWU3ORZUJP3
```

Player bets flow: `Freighter signs → contract holds XLM → server calls pay_player on win`

No custodial wallets. No withdrawal delays. No rugs (except the game kind).

---

## Live Demo

**App:** [https://crazd.vercel.app](https://crazd.vercel.app)

---

## Screenshots

### Crash
![Crash game — active bettor, live candlestick chart](screenshot-crash.png)
Crash game shown with real time game updates

### CandleFlip
![CandleFlip — YOU WON +0.02 XLM, live chat active](screenshot-candleflip-win.png)
3 games going on — 1 won, 1 in progress, 1 waiting for next round

### Keno — Drawing
![Keno — Result revealing state](screenshot-keno-drawing.png)
Result revealing of the Keno game

### Keno — Win
![Keno — Win/Loss result](screenshot-keno-win.png)
Choose only 1 correct tile — unable to win prize (prize tiers shown below the board)

---

## User Feedback

[View feedback document →](https://docs.google.com/document/d/PLACEHOLDER)

---

## Run It Yourself

### Prerequisites
- Node.js 20+
- Go 1.24+
- PostgreSQL + Redis
- [Freighter](https://freighter.app) browser extension — set to **Testnet**

### Frontend
```bash
cd crash-frontend
npm install
cp .env.example .env
npm run dev
```

### Backend
```bash
cd crash-backend
go mod download
cp .env.example .env
go run main.go
```

### Environment

**`crash-frontend/.env`**
```env
NEXT_PUBLIC_CONTRACT_ID=<soroban contract id>
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

**`crash-backend/.env`**
```env
SERVER_PRIVATE_KEY=<hex ed25519 key>
CONTRACT_ID=<soroban contract id>
RPC_URL=https://soroban-testnet.stellar.org
DATABASE_URL=postgres://...
REDIS_URL=...
REDIS_PASSWORD=...
```
