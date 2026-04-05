interface AvatarProps {
  uri?: string | null
  size?: number
  revealed?: boolean
}

export function Avatar({ uri, size = 80, revealed = false }: AvatarProps) {
  return (
    <div
      className="relative rounded-full overflow-hidden bg-gray-200 flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {uri ? (
        <img
          src={uri}
          alt="avatar"
          className="w-full h-full object-cover"
          style={!revealed ? { filter: 'blur(12px)', transform: 'scale(1.1)' } : undefined}
        />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-2xl">
          ?
        </div>
      )}
    </div>
  )
}
