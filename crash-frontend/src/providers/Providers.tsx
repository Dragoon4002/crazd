'use client'

import ThemeProvider from './ThemeProvider'
import { WalletProvider } from '@/contexts/WalletContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { SidebarProvider } from '@/components/ui/sidebar'
import { ToastProvider } from '@/components/ui/Toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <WalletProvider>
          <WebSocketProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </WebSocketProvider>
        </WalletProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
