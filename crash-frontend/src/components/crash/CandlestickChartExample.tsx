'use client';

import React, { useState, useEffect } from 'react';
import { CandlestickChartCanvas, CandleGroup } from './CandlestickChartCanvas';

interface PriceUpdateMessage {
  type: 'price_update';
  data: {
    tick: number;
    price: number;
    multiplier: number;
    gameEnded: boolean;
    currentCandle?: CandleGroup;
    previousCandles: CandleGroup[];
  };
}

interface CandlestickChartExampleProps {
  wsUrl?: string;
  isHistoryMode?: boolean;
  historyMergeCount?: number;
}

export function CandlestickChartExample({
  wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws`,
  isHistoryMode = false,
  historyMergeCount = 20,
}: CandlestickChartExampleProps) {
  const [previousCandles, setPreviousCandles] = useState<CandleGroup[]>([]);
  const [currentCandle, setCurrentCandle] = useState<CandleGroup | undefined>(undefined);
  const [currentPrice, setCurrentPrice] = useState(1.0);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to WebSocket');

      // Subscribe to crash channel
      ws.send(JSON.stringify({
        type: 'subscribe',
        data: { channel: 'crash' }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'price_update') {
          const data = message.data as PriceUpdateMessage['data'];

          setPreviousCandles(data.previousCandles || []);
          setCurrentCandle(data.currentCandle);
          setCurrentPrice(data.multiplier);
          setGameEnded(data.gameEnded);
        } else if (message.type === 'game_end') {
          setGameEnded(true);
        } else if (message.type === 'game_start') {
          // Reset for new game
          setPreviousCandles([]);
          setCurrentCandle(undefined);
          setCurrentPrice(1.0);
          setGameEnded(false);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);

  return (
    <div className="w-full h-full">
      <CandlestickChartCanvas
        previousCandles={previousCandles}
        currentCandle={currentCandle}
        currentPrice={currentPrice}
        gameEnded={gameEnded}
        isHistoryMode={isHistoryMode}
        historyMergeCount={historyMergeCount}
      />
    </div>
  );
}

// Usage Examples:

// Live Mode (default):
// <CandlestickChartExample />

// History Mode (merged to 15 candles):
// <CandlestickChartExample isHistoryMode={true} historyMergeCount={15} />

// Custom WebSocket URL:
// <CandlestickChartExample wsUrl="ws://custom-url:8080/ws" />
