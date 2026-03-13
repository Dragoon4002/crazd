'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CandleflipRoomCard } from '@/components/candleflip/CandleflipRoomCard';
import { TrendType } from '@/types/candleflip';
import { TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useGameHouseContract } from '@/hooks/useGameHouseContract';
import { showGlobalToast } from '@/components/ui/Toast';

interface ActiveBatch {
  batchId: string;
  roomCount: number;
  betAmount: number;
  trend: TrendType;
  finishedRooms: Set<number>;
}

export function CandleflipMode() {
  const { isConnected } = useWebSocket();
  const { bet, isConnected: walletConnected, getWalletAddress } = useGameHouseContract();

  const [betAmount, setBetAmount] = useState<number>(0.01);
  const [numberOfRooms, setNumberOfRooms] = useState<number>(1);
  const [trend, setTrend] = useState<TrendType>('bullish');
  const [balance] = useState<number>(10.0); // Mock balance
  const [isPlacing, setIsPlacing] = useState(false);
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Count total active rooms across all batches
  const totalActiveRooms = activeBatches.reduce((sum, batch) =>
    sum + (batch.roomCount - batch.finishedRooms.size), 0
  );

  const quickAmounts = [0.01, 0.1, 0.5, 1, 5];

  const handleVerify = (gameId: string, serverSeed: string) => {
    console.log('Verify game:', gameId, serverSeed);
  };

  const handleRoomFinished = useCallback((batchId: string, roomNumber: number) => {
    setActiveBatches(prev => {
      const updated = prev.map(batch => {
        if (batch.batchId === batchId) {
          const newFinished = new Set(batch.finishedRooms);
          newFinished.add(roomNumber);
          return { ...batch, finishedRooms: newFinished };
        }
        return batch;
      });
      // Remove batches where all rooms are finished
      return updated.filter(batch => batch.finishedRooms.size < batch.roomCount);
    });
  }, []);

  const handleCreateRooms = async () => {
    if (!canPlaceBet || !isConnected || !walletConnected) {
      showGlobalToast('Please connect your wallet first!', 'error');
      return;
    }

    setIsPlacing(true);

    try {
      // Get player's wallet address
      const playerAddress = await getWalletAddress();
      if (!playerAddress) {
        showGlobalToast('Failed to get wallet address. Please reconnect your wallet.', 'error');
        setIsPlacing(false);
        return;
      }

      console.log('🎮 Creating batch for player:', playerAddress);

      // Calculate total bet amount for all rooms
      const totalBet = betAmount * numberOfRooms;

      // Call smart contract bet() function
      const result = await bet(totalBet);

      if (result.success && result.transactionHash) {
        console.log('✅ Bet placed! TX:', result.transactionHash);

        // Connect to /candleflip and create batch
        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/candleflip`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('🔌 Connected to /candleflip, sending create_batch');
          ws.send(JSON.stringify({
            type: 'create_batch',
            address: playerAddress,
            roomCount: numberOfRooms,
            amountPerRoom: String(Math.floor(betAmount * 1e18)), // wei
            side: trend === 'bullish' ? 'bull' : 'bear'
          }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            console.log('📨 Received from /candleflip:', msg.type);

            if (msg.type === 'batch_created') {
              const newBatch: ActiveBatch = {
                batchId: msg.batchId,
                roomCount: numberOfRooms,
                betAmount: betAmount,
                trend: trend,
                finishedRooms: new Set()
              };
              setActiveBatches(prev => [...prev, newBatch]);
              console.log(`✅ Batch created: ${msg.batchId} with ${numberOfRooms} rooms`);
            } else if (msg.type === 'error') {
              console.error('❌ Batch creation error:', msg.error);
              showGlobalToast(`Failed to create batch: ${msg.error}`, 'error');
            }
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('🔌 Batch creation WebSocket closed');
        };
      } else {
        showGlobalToast(`Failed to place bet: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      showGlobalToast('Failed to place bet!', 'error');
    } finally {
      setIsPlacing(false);
    }
  };

  const canPlaceBet = betAmount * numberOfRooms <= balance;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Rooms Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-300">
              Open Lobbies <span className="text-primary">{totalActiveRooms}</span>
            </h2>
            {!isConnected && (
              <p className="text-sm text-red-400">
                Connecting to server...
              </p>
            )}
            {isConnected && totalActiveRooms === 0 && (
              <p className="text-sm text-gray-500">
                Configure your bet and click "Create" to start playing
              </p>
            )}
          </div>

          {totalActiveRooms === 0 ? (
            <div className="flex items-center justify-center h-64 ">
              <div className="text-center">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-gray-400 text-lg mb-2">No active rooms</p>
                <p className="text-gray-500 text-sm">
                  {isConnected
                    ? "Set your bet amount and click \"Create\" to start"
                    : "Connecting to server..."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {activeBatches.flatMap((batch) =>
                Array.from({ length: batch.roomCount }, (_, i) => i + 1)
                  .filter(roomNum => !batch.finishedRooms.has(roomNum))
                  .map((roomNumber) => (
                    <CandleflipRoomCard
                      key={`${batch.batchId}-${roomNumber}`}
                      batchId={batch.batchId}
                      roomNumber={roomNumber}
                      betAmount={batch.betAmount}
                      trend={batch.trend}
                      onVerify={handleVerify}
                      onFinished={() => handleRoomFinished(batch.batchId, roomNumber)}
                    />
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Betting Controls Panel - Bottom */}
      <div className="bg-transparent shrink-0 border-t">
        <div className="px-6 py-5">
          <div className="flex items-center gap-6">
            {/* Left: Controls Panel */}
            <div className="flex flex-col gap-4 border border-border rounded-lg p-4 bg-sidebar">
              {/* Top Row: BET AMOUNT */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm font-medium w-24">BET AMOUNT</span>
                <button
                  onClick={() => setBetAmount(Math.max(0.01, parseFloat((betAmount / 2).toFixed(2))))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  /2
                </button>
                <button
                  onClick={() => setBetAmount(Math.max(0.01, parseFloat((betAmount - 0.1).toFixed(2))))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  - 0.1
                </button>
                <button
                  onClick={() => setBetAmount(Math.max(0.01, parseFloat((betAmount - 0.01).toFixed(2))))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  - 0.01
                </button>
                <input
                  type="text"
                  value={betAmount.toFixed(2)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0.01) setBetAmount(parseFloat(val.toFixed(2)));
                  }}
                  className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-center text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-gray-400 text-sm">XLM</span>
                <button
                  onClick={() => setBetAmount(parseFloat((betAmount + 0.01).toFixed(2)))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  + 0.01
                </button>
                <button
                  onClick={() => setBetAmount(parseFloat((betAmount + 0.1).toFixed(2)))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  + 0.1
                </button>
                <button
                  onClick={() => setBetAmount(parseFloat((betAmount * 2).toFixed(2)))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  *2
                </button>
              </div>

              {/* Bottom Row: ROOMS + TREND */}
              <div className="flex items-center gap-2">
                {/* Rooms Section */}
                <span className="text-gray-400 text-sm font-medium w-24">ROOMS</span>
                <button
                  onClick={() => setNumberOfRooms(Math.max(1, Math.floor(numberOfRooms / 2)))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  /2
                </button>
                <button
                  onClick={() => setNumberOfRooms(Math.max(1, numberOfRooms - 2))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  - 2
                </button>
                <button
                  onClick={() => setNumberOfRooms(Math.max(1, numberOfRooms - 1))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  - 1
                </button>
                <input
                  type="text"
                  value={numberOfRooms}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 10) setNumberOfRooms(val);
                  }}
                  className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-center text-white font-mono focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => setNumberOfRooms(Math.min(10, numberOfRooms + 1))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  + 1
                </button>
                <button
                  onClick={() => setNumberOfRooms(Math.max(1, numberOfRooms + 2))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  + 2
                </button>
                <button
                  onClick={() => setNumberOfRooms(Math.min(10, numberOfRooms * 2))}
                  className="w-14 py-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] rounded-lg text-sm text-white font-medium hover:opacity-90 transition-all active:scale-95"
                >
                  *2
                </button>

                <div className="h-8 w-px bg-border mx-2"></div>

                {/* Trend Section */}
                <span className="text-gray-400 text-sm font-medium">Trend</span>
                <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
                  <button
                    onClick={() => setTrend('bearish')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all active:scale-95 ${
                      trend === 'bearish'
                        ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Bearish
                  </button>
                  <button
                    onClick={() => setTrend('bullish')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all active:scale-95 ${
                      trend === 'bullish'
                        ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Bullish
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Create Button & Info */}
            <div className="flex flex-col gap-3 ml-auto items-end">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-gray-400">Total: <span className="font-mono font-bold text-white">{(betAmount * numberOfRooms).toFixed(3)} XLM</span></span>
                <span className="text-gray-400">Balance: <span className="font-mono font-bold text-primary">{balance.toFixed(3)} XLM</span></span>
              </div>
              <button
                onClick={handleCreateRooms}
                disabled={!canPlaceBet || !isConnected || !walletConnected || isPlacing}
                className={`px-16 py-4 rounded-lg font-bold text-lg transition-all ${
                  canPlaceBet && isConnected && walletConnected && !isPlacing
                    ? 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC] text-white hover:opacity-90 active:scale-95'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isPlacing ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>

          {/* Warning if insufficient balance */}
          {!canPlaceBet && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
              Insufficient balance. Total bet ({(betAmount * numberOfRooms).toFixed(3)} XLM) exceeds balance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
