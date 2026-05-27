import { useEffect, useRef } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}

export default function Modal({ title, onClose, children, wide }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className={`bg-surface-low border border-surface-high rounded-xl shadow-2xl overflow-hidden ${wide ? 'w-[560px]' : 'w-[420px]'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-10 border-b border-surface-high">
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">{title}</span>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-high text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
