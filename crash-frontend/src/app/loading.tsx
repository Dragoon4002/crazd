export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-[#0d1117]">
      <span className="text-white text-2xl font-mono">
        Loading
        <span className="animate-pulse">...</span>
      </span>
    </div>
  )
}
