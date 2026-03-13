'use client'

import { useState, useEffect, ReactNode } from 'react'

interface MobileBlockerProps {
  children: ReactNode
}

export const MobileBlocker = ({ children }: MobileBlockerProps) => {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!mounted) return null

  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#0d1117]">
        <span className="text-white text-xl font-mono text-center px-4">
          APP is coming in future
        </span>
      </div>
    )
  }

  return <>{children}</>
}
