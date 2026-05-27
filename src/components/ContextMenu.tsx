import { useEffect, useRef } from 'react'

interface MenuItem {
  label: string
  icon?: string
  danger?: boolean
  onClick: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[140px] bg-surface-low border border-surface-high rounded-lg shadow-xl py-1 backdrop-blur-xl"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose() }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
            item.danger
              ? 'text-recording hover:bg-recording/10'
              : 'text-on-surface hover:bg-surface-mid'
          }`}
        >
          {item.icon && <span className="material-symbols-outlined text-sm">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  )
}
