import { useStore } from '../store/useStore'
import Modal from './Modal'

interface IOConfigModalProps {
  trackId: string
  onClose: () => void
}

export default function IOConfigModal({ trackId, onClose }: IOConfigModalProps) {
  const tracks = useStore(s => s.tracks)
  const setTrackProp = useStore(s => s.setTrackProp)
  const track = tracks.find(t => t.id === trackId)
  if (!track) return null

  const io = (track as any).ioConfig || { input: 'none', output: 'master' }

  return (
    <Modal title="I/O Settings" onClose={onClose}>
      <div className="space-y-4">
        {/* Input Section */}
        <div>
          <label className="text-[10px] font-bold uppercase text-outline tracking-wider block mb-2">
            Audio Input
          </label>
          <select
            value={io.input}
            onChange={e => setTrackProp(trackId, 'ioConfig' as any, { ...io, input: e.target.value })}
            className="w-full bg-surface-mid border border-surface-high rounded px-3 py-2 text-xs text-on-surface outline-none focus:border-primary/50 transition-colors"
          >
            <option value="none">None</option>
            <option value="mic">Microphone</option>
            <option value="audio-file">Audio File</option>
          </select>
          <p className="text-[10px] text-outline/60 mt-1">
            {io.input === 'none' && 'No input source selected.'}
            {io.input === 'mic' && 'Records from the built-in microphone.'}
            {io.input === 'audio-file' && track.hasAudio ? `Current file: ${track.clipName}` : 'No audio file loaded. Drag audio onto the track.'}
          </p>
        </div>

        {/* Output Section */}
        <div>
          <label className="text-[10px] font-bold uppercase text-outline tracking-wider block mb-2">
            Audio Output
          </label>
          <select
            value={io.output}
            onChange={e => setTrackProp(trackId, 'ioConfig' as any, { ...io, output: e.target.value })}
            className="w-full bg-surface-mid border border-surface-high rounded px-3 py-2 text-xs text-on-surface outline-none focus:border-primary/50 transition-colors"
          >
            <option value="master">Master</option>
            <option value="bus-1" disabled>Bus 1 (coming soon)</option>
            <option value="bus-2" disabled>Bus 2 (coming soon)</option>
          </select>
          <p className="text-[10px] text-outline/60 mt-1">
            Routes the track output to the selected destination.
          </p>
        </div>

        {/* Track Info */}
        <div className="bg-surface-mid rounded-lg p-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-[10px] text-outline">Track</span>
            <span className="text-[10px] text-on-surface font-mono">{track.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-outline">Channels</span>
            <span className="text-[10px] text-on-surface font-mono">Stereo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-outline">Volume</span>
            <span className="text-[10px] text-on-surface font-mono">{Math.round(track.volume * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-outline">Pan</span>
            <span className="text-[10px] text-on-surface font-mono">{track.pan > 0 ? `${Math.round(track.pan * 100)}R` : track.pan < 0 ? `${Math.round(Math.abs(track.pan * 100))}L` : 'C'}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
