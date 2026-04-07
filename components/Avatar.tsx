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
        <div className="w-full h-full bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center"
          style={{ filter: 'blur(4px)' }}>
          <svg viewBox="0 0 24 24" fill="white" className="w-1/2 h-1/2 opacity-60">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
      )}
    </div>
  )
}
