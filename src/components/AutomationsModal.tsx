import { useStore } from '../store/useStore'
import Modal from './Modal'

interface AutomationsModalProps {
  trackId: string
  onClose: () => void
}

const paramLabels: Record<string, string> = {
  volume: 'Volume',
  pan: 'Pan',
}

const paramIcons: Record<string, string> = {
  volume: 'volume_up',
  pan: 'swap_horiz',
}

export default function AutomationsModal({ trackId, onClose }: AutomationsModalProps) {
  const tracks = useStore(s => s.tracks)
  const toggleTrackAutomation = useStore(s => s.toggleTrackAutomation)
  const track = tracks.find(t => t.id === trackId)
  if (!track) return null

  const hasAudio = track.hasAudio

  return (
    <Modal title="Automations" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-[10px] text-outline/70 leading-relaxed">
          Enable automation lanes for <strong className="text-on-surface">{track.name}</strong>.
          {!hasAudio && <span className="text-outline/50"> Load audio onto this track to record automation.</span>}
        </p>

        {track.automations.map((a, i) => (
          <div key={a.param} className="bg-surface-mid rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-outline">{paramIcons[a.param]}</span>
                <span className="text-xs text-on-surface">{paramLabels[a.param]}</span>
              </div>
              <button
                onClick={() => toggleTrackAutomation(trackId, i)}
                className={`relative w-8 h-4 rounded-full transition-colors ${a.enabled ? 'bg-primary' : 'bg-surface-highest'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${a.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {a.enabled && (
              <div className="mt-2 pt-2 border-t border-surface-high">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-outline/50">info</span>
                  <span className="text-[10px] text-outline/60">
                    Automation armed. Draw or record automation curves in the timeline editor.
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}
