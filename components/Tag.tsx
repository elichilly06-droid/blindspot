export function Tag({ label }: { label: string }) {
  return (
    <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
      {label}
    </span>
  )
}
