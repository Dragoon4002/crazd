/**
 * Crash Game WebSocket Mock Server
 * Run with: npx ts-node mocks/crash-server.ts
 * Or: npm run mock:crash
 */

import { WebSocketServer, WebSocket } from 'ws';

interface GameState {
  status: 'countdown' | 'running' | 'crashed';
  multiplier: number;
  countdown: number;
  crashPoint?: number;
}

type ServerMessage = {
  type: 'tick';
  multiplier: number;
  status: 'countdown' | 'running' | 'crashed';
  countdown?: number;
};

class CrashGameServer {
  private wss: WebSocketServer;
  private gameState: GameState;
  private tickInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({ port });

    this.gameState = {
      status: 'countdown',
      multiplier: 1.0,
      countdown: 10,
      crashPoint: undefined
    };

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('✅ Client connected');

      // Send current state immediately
      this.sendToClient(ws, {
        type: 'tick',
        multiplier: this.gameState.multiplier,
        status: this.gameState.status,
        countdown: this.gameState.countdown
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('📨 Received:', data);
          // Handle client messages (cashout, etc.) here if needed
        } catch (error) {
          console.error('❌ Invalid message:', error);
        }
      });

      ws.on('close', () => {
        console.log('❌ Client disconnected');
      });
    });

    console.log(`🎮 Crash Game Server running on ws://localhost:${port}`);
    this.startGame();
  }

  /**
   * Generate crash point using house edge formula
   * crashPoint = 0.99 / (1 - Math.random())
   * This creates realistic distribution with house edge
   */
  private generateCrashPoint(): number {
    const random = Math.random();
    const crashPoint = 0.99 / (1 - random);

    // Cap at 1000x for sanity
    return Math.min(crashPoint, 1000);
  }

  /**
   * Calculate current multiplier based on elapsed time
   */
  private calculateMultiplier(elapsedMs: number): number {
    // Exponential growth: 1.00x at t=0, increases exponentially
    // Formula: multiplier = e^(0.00006 * t)
    const growth = Math.exp(0.00006 * elapsedMs);
    return Math.max(1.0, growth);
  }

  /**
   * Start game loop
   */
  private startGame() {
    this.startCountdown();
  }

  /**
   * Countdown phase (10 seconds)
   */
  private startCountdown() {
    console.log('\n⏱️  COUNTDOWN STARTED (10 seconds)');
    this.gameState.status = 'countdown';
    this.gameState.countdown = 10;
    this.gameState.multiplier = 1.0;

    // Clear any existing interval
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    // Update every 100ms for smooth countdown
    this.tickInterval = setInterval(() => {
      this.gameState.countdown -= 0.1;

      // Broadcast countdown
      this.broadcast({
        type: 'tick',
        multiplier: 1.0,
        status: 'countdown',
        countdown: Math.max(0, this.gameState.countdown)
      });

      // Countdown complete, start running phase
      if (this.gameState.countdown <= 0) {
        clearInterval(this.tickInterval!);
        this.tickInterval = null;
        this.startRunning();
      }
    }, 100);
  }

  /**
   * Running phase (multiplier increases until crash)
   */
  private startRunning() {
    this.gameState.status = 'running';
    this.gameState.multiplier = 1.0;
    this.gameState.crashPoint = this.generateCrashPoint();
    this.startTime = Date.now();

    console.log(`🚀 GAME STARTED - Crash point: ${this.gameState.crashPoint.toFixed(2)}x`);

    // Update every 200ms
    this.tickInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      this.gameState.multiplier = this.calculateMultiplier(elapsed);

      // Check if crashed
      if (this.gameState.multiplier >= this.gameState.crashPoint!) {
        this.crash();
        return;
      }

      // Broadcast current multiplier
      this.broadcast({
        type: 'tick',
        multiplier: this.gameState.multiplier,
        status: 'running'
      });
    }, 200);
  }

  /**
   * Crash phase
   */
  private crash() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.gameState.status = 'crashed';
    this.gameState.multiplier = this.gameState.crashPoint!;

    console.log(`💥 CRASHED at ${this.gameState.multiplier.toFixed(2)}x\n`);

    // Broadcast crash
    this.broadcast({
      type: 'tick',
      multiplier: this.gameState.multiplier,
      status: 'crashed'
    });

    // Wait 3 seconds then restart
    setTimeout(() => {
      this.startCountdown();
    }, 3000);
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: ServerMessage) {
    const payload = JSON.stringify(message);

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

// Start server
new CrashGameServer(3001);
