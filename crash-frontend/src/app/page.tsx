'use client'

import { NewHeader } from "@/components/newUI/newHeader"
import { NewStandardMode } from "@/components/newUI/newStandard"
import { BattlesMode } from "@/components/pages/BattlesMode"
import { CandleflipMode } from "@/components/pages/CandleflipMode"
import Keno from "@/components/pages/Keno"
import { GameMode } from "@/lib/types"
import { useState } from "react"

const page = () => {
  const [currentMode, setCurrentMode] = useState<GameMode>('standard');

  const renderContent = () => {
    switch (currentMode) {
      case 'standard':
        return <NewStandardMode />;
      case 'candleflip':
        return <CandleflipMode />;
      case 'battles':
        return <BattlesMode />;
      case 'keno':
        return <Keno />;
      default:
        return <NewStandardMode />;
    }
  };
  
  return (
    <div className='flex flex-col h-screen w-full'>

        <main className='flex-1 flex flex-col'>
          <NewHeader currentMode={currentMode} onModeChange={setCurrentMode} />

          {/* <div className="h-4 border-t border-[#30363d]"/> */}

          {renderContent()}
        </main>
    </div>
  )
}

export default page
