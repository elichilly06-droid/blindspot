interface ProgressBarProps {
  firstMessageAt: string | null
}

export function ProgressBar({ firstMessageAt }: ProgressBarProps) {
  const REVEAL_MS = 48 * 60 * 60 * 1000

  if (!firstMessageAt) {
    return (
      <div className="w-full">
        <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden">
          <div className="h-full bg-pink-500 rounded-full" style={{ width: '0%' }} />
        </div>
        <p className="text-xs text-pink-400 mt-1 text-right">Photos reveal in 48h</p>
      </div>
    )
  }

  const elapsed = Date.now() - new Date(firstMessageAt).getTime()
  const pct = Math.min((elapsed / REVEAL_MS) * 100, 100)
  const hoursLeft = Math.max(0, Math.ceil((REVEAL_MS - elapsed) / (60 * 60 * 1000)))

  return (
    <div className="w-full">
      <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-pink-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-pink-400 mt-1 text-right">
        {hoursLeft > 0 ? `Photos reveal in ${hoursLeft}h` : 'Photos revealing…'}
      </p>
    </div>
  )
}
