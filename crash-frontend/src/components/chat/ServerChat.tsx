'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useWallet } from '@/contexts/WalletContext';
import { Send, Wifi, WifiOff } from 'lucide-react';

const formatRelativeTime = (ts: string | number | Date | undefined | null) => {
  if (!ts) return 'now';

  let timestamp: number;

  if (ts instanceof Date) {
    timestamp = ts.getTime();
  } else if (typeof ts === 'number') {
    timestamp = ts < 1e12 ? ts * 1000 : ts;
  } else {
    const tsStr = String(ts).trim();

    if (/^\d+$/.test(tsStr)) {
      const num = parseInt(tsStr, 10);
      timestamp = num < 1e12 ? num * 1000 : num;
    } else {
      // Handle SQL format: "2026-01-15 02:36:36.256662" -> parse as local time
      // Handle RFC3339: "2026-01-15T02:36:36Z" (UTC)
      let normalized = tsStr;

      // Remove microseconds if present (JS Date doesn't handle them well)
      normalized = normalized.replace(/\.\d{3,}$/, '');

      if (normalized.includes(' ') && !normalized.includes('T')) {
        // SQL format without timezone - treat as local time by NOT adding Z
        normalized = normalized.replace(' ', 'T');
      }

      const parsed = new Date(normalized).getTime();
      timestamp = isNaN(parsed) ? Date.now() : parsed;
    }
  }

  const diff = Date.now() - timestamp;
  if (diff < 0) return 'now'; // Future date protection

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr`;
  return `${Math.floor(hrs / 24)}d`;
};

const formatAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

export function ServerChat() {
  const { chatMessages, isConnected, connectedUsers, sendChatMessage, subscribe, unsubscribe } = useWebSocket();
  const { walletAddress } = useWallet();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    subscribe('chat');
    return () => unsubscribe('chat');
  }, [subscribe, unsubscribe]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      sendChatMessage(inputMessage, walletAddress || '');
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-y border-border px-4 py-3 shrink-0">
        Server Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary">
        {chatMessages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            No messages yet. Be the first to say something!
          </div>
        )}
        {chatMessages.map((msg, index) => {
          const isOwnMessage = walletAddress && msg.walletAddress?.toLowerCase() === walletAddress.toLowerCase();

          return (
            <div
              key={index}
              className={`${
                msg.type === 'system'
                  ? 'text-center'
                  : `flex flex-col max-w-[70%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`
              }`}
            >
              {msg.type === 'system' ? (
                <div className="text-xs text-gray-500 italic">
                  {msg.message}
                </div>
              ) : (
                <>
                  <div className={`flex items-center gap-2 mb-1 justify-between`}>
                    {(!isOwnMessage && msg.walletAddress && (
                      <span className="text-xs text-gray-500 mt-1">
                        {formatAddress(msg.walletAddress)}
                      </span>
                    )) || <div />}
                    <span className="text-xs text-gray-500">
                      {/* {formatRelativeTime(msg.timestamp)} */}
                    </span>
                  </div>
                  <div className={`bg-sidebar border border-border px-3 py-2 text-sm text-white ${
                    isOwnMessage
                      ? 'rounded-lg rounded-br-none bg-border'
                      : 'rounded-lg rounded-bl-none bg-linear-to-br from-[#9B61DB] to-[#7457CC]'
                  }`}>
                    {msg.message}
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-transparent border-t border-border p-4 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !inputMessage.trim()}
            className="p-2 bg-gradient-to-br from-[#9B61DB] to-[#7457CC] hover:opacity-90 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
