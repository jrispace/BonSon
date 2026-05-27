import { useStore } from '../store/useStore'
import Modal from './Modal'

interface TrackSendsModalProps {
  trackId: string
  onClose: () => void
}

export default function TrackSendsModal({ trackId, onClose }: TrackSendsModalProps) {
  const tracks = useStore(s => s.tracks)
  const setTrackSendLevel = useStore(s => s.setTrackSendLevel)
  const toggleTrackSend = useStore(s => s.toggleTrackSend)
  const track = tracks.find(t => t.id === trackId)
  if (!track) return null

  return (
    <Modal title="Track Sends" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-[10px] text-outline/70 leading-relaxed">
          Send audio from <strong className="text-on-surface">{track.name}</strong> to auxiliary buses.
        </p>

        {track.sends.length === 0 && (
          <div className="text-center py-6 text-outline/40 text-xs">
            No sends available
          </div>
        )}

        {track.sends.map((send, i) => (
          <div key={send.busId} className="bg-surface-mid rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-outline">linear_scale</span>
                <span className="text-xs text-on-surface">{send.label}</span>
              </div>
              <button
                onClick={() => toggleTrackSend(trackId, i)}
                className={`relative w-8 h-4 rounded-full transition-colors ${send.enabled ? 'bg-primary' : 'bg-surface-highest'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${send.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {send.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-outline w-8">Level</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={send.level}
                  onChange={e => setTrackSendLevel(trackId, i, parseFloat(e.target.value))}
                  className="flex-1 h-1 appearance-none bg-surface-highest rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <span className="text-[10px] font-mono text-on-surface-variant w-10 text-right">
                  {Math.round(send.level * 100)}%
                </span>
              </div>
            )}
          </div>
        ))}

        <div className="bg-surface-high/50 rounded-lg p-3">
          <p className="text-[10px] text-outline/60">
            Sends route a portion of the track signal to a shared effects bus.
            Enable a send and adjust its level. Aux buses are processed globally.
          </p>
        </div>
      </div>
    </Modal>
  )
}
