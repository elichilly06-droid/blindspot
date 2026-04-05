interface ProgressBarProps {
  current: number
  total?: number
}

export function ProgressBar({ current, total = 5 }: ProgressBarProps) {
  const pct = Math.min((current / total) * 100, 100)
  return (
    <div className="w-full">
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-700 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right">{current}/{total} messages to reveal</p>
    </div>
  )
}
