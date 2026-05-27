import { useStore } from '../store/useStore'
import Modal from './Modal'

interface TrackEffectsModalProps {
  trackId: string
  onClose: () => void
}

const effectLabels: Record<string, string> = {
  eq: 'Equalizer',
  compressor: 'Compressor',
  delay: 'Delay',
  reverb: 'Reverb',
}

const effectIcons: Record<string, string> = {
  eq: 'tune',
  compressor: 'compress',
  delay: 'timer',
  reverb: 'graphic_eq',
}

export default function TrackEffectsModal({ trackId, onClose }: TrackEffectsModalProps) {
  const tracks = useStore(s => s.tracks)
  const toggleTrackEffect = useStore(s => s.toggleTrackEffect)
  const setTrackEffectParam = useStore(s => s.setTrackEffectParam)
  const track = tracks.find(t => t.id === trackId)
  if (!track) return null

  return (
    <Modal title="Track Effects" onClose={onClose} wide>
      <div className="space-y-3">
        {track.effects.map((fx, i) => (
          <div key={fx.type} className={`rounded-lg border transition-colors ${fx.enabled ? 'border-primary/30 bg-primary/5' : 'border-surface-high bg-surface-mid/50'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-9">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-outline">{effectIcons[fx.type]}</span>
                <span className="text-xs font-medium text-on-surface">{effectLabels[fx.type]}</span>
              </div>
              <button
                onClick={() => toggleTrackEffect(trackId, i)}
                className={`relative w-8 h-4 rounded-full transition-colors ${fx.enabled ? 'bg-primary' : 'bg-surface-highest'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${fx.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Params */}
            {fx.enabled && (
              <div className="px-3 pb-3 space-y-2">
                {fx.type === 'eq' && (
                  <>
                    <SliderParam label="Low Gain" value={fx.params.lowGain} min={-12} max={12} step={0.5} unit="dB" onChange={v => setTrackEffectParam(trackId, i, 'lowGain', v)} />
                    <SliderParam label="Mid Gain" value={fx.params.midGain} min={-12} max={12} step={0.5} unit="dB" onChange={v => setTrackEffectParam(trackId, i, 'midGain', v)} />
                    <SliderParam label="Mid Freq" value={fx.params.midFreq} min={200} max={8000} step={10} unit="Hz" onChange={v => setTrackEffectParam(trackId, i, 'midFreq', v)} />
                    <SliderParam label="High Gain" value={fx.params.highGain} min={-12} max={12} step={0.5} unit="dB" onChange={v => setTrackEffectParam(trackId, i, 'highGain', v)} />
                  </>
                )}
                {fx.type === 'compressor' && (
                  <>
                    <SliderParam label="Threshold" value={fx.params.threshold} min={-60} max={0} step={1} unit="dB" onChange={v => setTrackEffectParam(trackId, i, 'threshold', v)} />
                    <SliderParam label="Ratio" value={fx.params.ratio} min={1} max={20} step={0.5} unit=":1" onChange={v => setTrackEffectParam(trackId, i, 'ratio', v)} />
                    <SliderParam label="Attack" value={fx.params.attack} min={0.1} max={50} step={0.1} unit="ms" onChange={v => setTrackEffectParam(trackId, i, 'attack', v)} />
                    <SliderParam label="Release" value={fx.params.release} min={10} max={500} step={10} unit="ms" onChange={v => setTrackEffectParam(trackId, i, 'release', v)} />
                  </>
                )}
                {fx.type === 'delay' && (
                  <>
                    <SliderParam label="Time" value={fx.params.time} min={0.05} max={1} step={0.01} unit="s" onChange={v => setTrackEffectParam(trackId, i, 'time', v)} />
                    <SliderParam label="Feedback" value={fx.params.feedback} min={0} max={0.95} step={0.01} unit="" onChange={v => setTrackEffectParam(trackId, i, 'feedback', v)} />
                    <SliderParam label="Mix" value={fx.params.mix} min={0} max={1} step={0.01} unit="" onChange={v => setTrackEffectParam(trackId, i, 'mix', v)} />
                  </>
                )}
                {fx.type === 'reverb' && (
                  <>
                    <SliderParam label="Mix" value={fx.params.mix} min={0} max={1} step={0.01} unit="" onChange={v => setTrackEffectParam(trackId, i, 'mix', v)} />
                    <SliderParam label="Decay" value={fx.params.decay} min={0.5} max={10} step={0.1} unit="s" onChange={v => setTrackEffectParam(trackId, i, 'decay', v)} />
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

function SliderParam({ label, value, min, max, step, unit, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-outline w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 appearance-none bg-surface-highest rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
      <span className="text-[10px] font-mono text-on-surface-variant w-12 text-right">{value}{unit}</span>
    </div>
  )
}
