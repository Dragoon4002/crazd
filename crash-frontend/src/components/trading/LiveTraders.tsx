'use client'

import { ScrollArea } from '@/components/ui/scroll-area';

export function LiveTraders() {
  return (
    <div className="w-72 bg-transparent border-l border-border">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-white">Live Traders</h3>
      </div>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="p-2 space-y-1">
          {/* {mockTraders.map((trader) => (
            <div
              key={trader.id}
              className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar className="h-6 w-6 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {trader.username.slice(0, 2).toUpperCase()}
                </Avatar>
                <span className="text-sm text-white truncate">{trader.username}</span>
              </div>
              <div className="text-right ml-2 shrink-0">
                <div className="text-xs text-green-400 font-medium">
                  +{trader.pnl.toFixed(3)}
                </div>
                <div className="text-[10px] text-green-400/70">
                  +{trader.pnlPercentage.toFixed(2)}%
                </div>
              </div>
            </div>
          ))} */}
        </div>
      </ScrollArea>
    </div>
  );
}
