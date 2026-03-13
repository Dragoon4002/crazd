# 🏗️ Crash Game Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CRASH GAME SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐                        ┌──────────────────┐
│  WebSocket Server│◄──────────────────────►│   Next.js Client │
│   (Port 3001)    │    JSON Messages       │  (Port 3000)     │
│                  │                        │                  │
│  crash-server.ts │                        │  /crash-game     │
└──────────────────┘                        └──────────────────┘
        │                                            │
        │                                            │
        ▼                                            ▼
┌──────────────────┐                        ┌──────────────────┐
│   Game Logic     │                        │  UI Components   │
│                  │                        │                  │
│ • Countdown (10s)│                        │ • Canvas Chart   │
│ • Running        │                        │ • Header         │
│ • Crashed        │                        │ • Countdown      │
│ • Auto-loop      │                        │ • Leaderboard    │
└──────────────────┘                        └──────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      MESSAGE FLOW                           │
└─────────────────────────────────────────────────────────────┘

Server (crash-server.ts)              Client (useCrashGame.ts)
──────────────────────                ──────────────────────

   COUNTDOWN STATE
   ===============
   Every 100ms:
   {
     type: 'tick',
     multiplier: 1.0,
     status: 'countdown',        ──────►  countdown: 9.90
     countdown: 9.90                      status: 'countdown'
   }                                      ↓
                                          Countdown.tsx renders
                                          "Next round in... 9.90s"

   RUNNING STATE
   =============
   Every 200ms:
   {
     type: 'tick',
     multiplier: 1.52,           ──────►  multiplier: 1.52
     status: 'running'                    status: 'running'
   }                                      history: [..., 1.52]
                                          ↓
                                          CandlestickCanvas renders
                                          Chart at 60fps

   CRASHED STATE
   =============
   Once:
   {
     type: 'tick',
     multiplier: 2.34,           ──────►  multiplier: 2.34
     status: 'crashed'                    status: 'crashed'
   }                                      ↓
                                          Red flash effect
                                          Loss indicator shows
```

## Component Hierarchy

```
page.tsx (Main Container)
│
├─── GameHeader.tsx
│    ├─── Stats Badges (2x, 10x, 50x)
│    └─── MiniChart[] (10 recent results)
│
├─── Game Area
│    │
│    ├─── Status Badge ("Hit Level 🐱 10 to Play")
│    │
│    ├─── Countdown.tsx (if status === 'countdown')
│    │    ├─── PRESALE Banner
│    │    └─── Timer Display
│    │
│    ├─── CandlestickCanvas.tsx
│    │    │
│    │    ├─── Render Loop (60fps)
│    │    │    ├─── Clear canvas
│    │    │    ├─── Draw Y-axis
│    │    │    ├─── Draw candlesticks
│    │    │    ├─── Draw multiplier text
│    │    │    └─── Draw crash effect
│    │    │
│    │    └─── Data Processing
│    │         ├─── Generate candles from history
│    │         ├─── Auto-scale Y-axis
│    │         └─── Calculate positions
│    │
│    └─── BottomUI.tsx
│         ├─── Promo Badge (bottom-left)
│         └─── Loss Indicator (bottom-right, conditional)
│
└─── Leaderboard.tsx
     ├─── Header ("PLAYERS")
     └─── Player List (12 players)
          ├─── Avatar (emoji)
          ├─── Username
          ├─── Bet Amount
          └─── Profit/Loss (real-time)
```

## State Management

```
┌───────────────────────────────────────────────────────────────┐
│                    STATE FLOW                                 │
└───────────────────────────────────────────────────────────────┘

useCrashGame Hook (WebSocket)
│
├─── status: 'connecting' | 'countdown' | 'running' | 'crashed'
│    └─► Controls which UI components render
│
├─── multiplier: number
│    └─► Used by Canvas & Leaderboard
│
├─── countdown: number
│    └─► Used by Countdown component
│
└─── history: number[]
     └─► Fed to CandlestickCanvas for chart rendering

Local State (page.tsx)
│
├─── recentResults: number[]
│    └─► Tracks last 100 crash multipliers
│    └─► Used by GameHeader for stats
│
└─── showLoss: boolean
     └─► Controls loss indicator visibility
     └─► Auto-hides after 2 seconds
```

## Canvas Rendering Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                CANVAS RENDERING (60fps)                      │
└──────────────────────────────────────────────────────────────┘

useEffect(() => {
  requestAnimationFrame(render)
})
│
▼
render() {
  │
  ├─► 1. Clear canvas (fillRect)
  │
  ├─► 2. Draw Y-axis
  │    ├─ Grid lines (0.5x, 1x, 1.5x, 2x...)
  │    └─ Labels (right-aligned, 12px mono)
  │
  ├─► 3. Draw candlesticks
  │    │
  │    ├─ For each candle:
  │    │   ├─ Calculate positions (valueToY)
  │    │   ├─ Draw wick (line from high to low)
  │    │   └─ Draw body (filled rect)
  │    │
  │    └─ Color: green if close >= open, else red
  │
  ├─► 4. Draw multiplier text (if running/crashed)
  │    ├─ Font: bold 64px monospace
  │    ├─ Color: white (running) or red (crashed)
  │    ├─ Shadow blur: 30px glow effect
  │    └─ Position: centered
  │
  ├─► 5. Draw crash effect (if crashed)
  │    └─ Semi-transparent red overlay
  │
  └─► 6. Schedule next frame
       └─ requestAnimationFrame(render)
}
```

## Candlestick Formation Logic

```
History Array (200ms intervals)
[1.00, 1.02, 1.04, 1.03, 1.05, 1.07, 1.09, 1.08, 1.10, 1.12, ...]
 │     │     │     │     │     │     │     │     │     │
 └─────┴─────┴─────┴─────┘     └─────┴─────┴─────┴─────┘
       Candle 1 (~1s)                 Candle 2 (~1s)

Candle 1:
  open:  1.00 (first value)
  high:  1.05 (max value)
  low:   1.00 (min value)
  close: 1.05 (last value)
  color: GREEN (close >= open)

Candle 2:
  open:  1.07 (first value)
  high:  1.12 (max value)
  low:   1.07 (min value)
  close: 1.12 (last value)
  color: GREEN (close >= open)
```

## Server State Machine

```
┌──────────────────────────────────────────────────────────────┐
│               SERVER STATE MACHINE                           │
└──────────────────────────────────────────────────────────────┘

   ┌─────────────┐
   │  COUNTDOWN  │
   │             │
   │ Duration: 10s
   │ Tick: 100ms │
   │ countdown--  │
   └──────┬──────┘
          │
          │ countdown <= 0
          ▼
   ┌─────────────┐
   │   RUNNING   │
   │             │
   │ Tick: 200ms │
   │ multiplier++│
   │             │
   └──────┬──────┘
          │
          │ multiplier >= crashPoint
          ▼
   ┌─────────────┐
   │   CRASHED   │
   │             │
   │ Duration: 3s │
   │ Freeze final │
   └──────┬──────┘
          │
          │ setTimeout(3000)
          └──────────────┐
                         │
                         ▼
                  Back to COUNTDOWN
```

## Performance Characteristics

```
Component             Update Rate    Method
─────────────────────────────────────────────────────────
WebSocket Server      200ms          setInterval
Countdown Updates     100ms          setInterval
Canvas Rendering      60fps (~16ms)  requestAnimationFrame
Candlestick Formation ~1s (5 ticks)  Generated from history
React Re-renders      On state change React hooks
```

## Memory Management

```
Component              Memory Strategy
───────────────────────────────────────────────────
history array          Keep last 100 points only
recentResults          Keep last 100 crash values
Canvas buffer          Auto-managed by browser
WebSocket messages     Processed and discarded
Candles array          Generated on-the-fly from history
```

## Type Definitions

```typescript
// Server → Client Message
interface ServerMessage {
  type: 'tick'
  multiplier: number
  status: 'countdown' | 'running' | 'crashed'
  countdown?: number
}

// Game State (Server)
interface GameState {
  status: 'countdown' | 'running' | 'crashed'
  multiplier: number
  countdown: number
  crashPoint?: number
}

// Hook Return Type
interface UseCrashGameReturn {
  status: 'connecting' | 'countdown' | 'running' | 'crashed'
  multiplier: number
  countdown: number
  history: number[]
  reconnect: () => void
}

// Candle Data Structure
interface Candle {
  open: number
  high: number
  low: number
  close: number
  startIndex: number
  endIndex: number
}
```

## Network Protocol

```
Client                                Server
──────                                ──────

WebSocket connection
────────────────────────────────────►

                                      ◄────
                                      Connection accepted

                                      ◄────
                                      {type: 'tick', status: 'countdown', ...}

                                      ◄────
                                      {type: 'tick', status: 'running', ...}
                                      (every 200ms)

                                      ◄────
                                      {type: 'tick', status: 'crashed', ...}

[Future]
{type: 'cashout'}
────────────────────────────────────►

Disconnect
────────────────────────────────────►

[Auto-reconnect after 3s]
WebSocket connection
────────────────────────────────────►
```

## File Dependencies

```
page.tsx
  ├─ import useCrashGame from '@/hooks/useCrashGame'
  ├─ import CandlestickCanvas from '@/components/crash/CandlestickCanvas'
  ├─ import GameHeader from '@/components/crash/GameHeader'
  ├─ import Countdown from '@/components/crash/Countdown'
  ├─ import Leaderboard from '@/components/crash/Leaderboard'
  └─ import BottomUI from '@/components/crash/BottomUI'

useCrashGame.ts
  └─ WebSocket connection (browser API)

CandlestickCanvas.tsx
  ├─ Canvas API (browser)
  └─ requestAnimationFrame (browser)

crash-server.ts (Server)
  ├─ ws (WebSocket library)
  └─ Node.js APIs
```

## Deployment Considerations

```
Development:
  ├─ Server: localhost:3001
  └─ Client: localhost:3000

Production:
  ├─ Server: wss://your-domain.com/ws
  │   └─ Deploy to: Heroku, Railway, Fly.io, etc.
  │
  └─ Client: https://your-domain.com
      └─ Deploy to: Vercel, Netlify, AWS, etc.

Environment Variables:
  └─ NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
```

---

**Architecture Highlights:**
- Clean separation of concerns
- Type-safe communication
- Efficient rendering (Canvas at 60fps)
- Minimal network overhead (200ms ticks)
- Auto-recovery (reconnect logic)
- Scalable (multiple clients supported)
