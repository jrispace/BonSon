interface ConfirmDialogProps {
  message: string
  trackName: string
  clipName: string
  onReplace: () => void
  onNewTrack: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, trackName, clipName, onReplace, onNewTrack, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="w-96 bg-surface-low border border-surface-high rounded-lg shadow-xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm text-on-surface font-semibold mb-2">{message}</h3>
        <p className="text-[11px] text-on-surface-variant mb-1">
          Track: <span className="text-on-surface">{trackName}</span>
        </p>
        <p className="text-[11px] text-on-surface-variant mb-4">
          File: <span className="text-on-surface">{clipName}</span>
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-[11px] text-outline hover:text-on-surface hover:bg-surface-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onReplace}
            className="px-3 py-1.5 rounded text-[11px] bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            Replace
          </button>
          <button
            onClick={onNewTrack}
            className="px-3 py-1.5 rounded text-[11px] bg-primary text-on-primary hover:bg-primary/80 transition-colors"
          >
            New Track
          </button>
        </div>
      </div>
    </div>
  )
}
