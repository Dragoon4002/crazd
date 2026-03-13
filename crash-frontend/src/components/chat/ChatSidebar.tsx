'use client'

import { ServerChat } from './ServerChat';
import { ChevronLeft } from 'lucide-react';

interface ChatSidebarProps {
  isConnected: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatSidebar({ isConnected, isCollapsed = false, onToggleCollapse }: ChatSidebarProps) {
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="w-80 bg-transparent border-r border-border flex flex-col h-full relative">
      <ServerChat />

      {/* Collapse Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 bottom-20 bg-sidebar border border-border rounded-full p-1 hover:bg-white/5 transition-colors z-10"
        >
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
