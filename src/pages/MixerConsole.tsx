import { useStore } from '../store/useStore'

function dbFromLin(lin: number) {
  return lin > 0 ? `${Math.round(20 * Math.log10(lin))} dB` : '-∞ dB'
}

export default function MixerConsole() {
  const tracks = useStore(s => s.tracks)
  const selectedTrackId = useStore(s => s.selectedTrackId)
  const selectTrack = useStore(s => s.selectTrack)
  const setTrackProp = useStore(s => s.setTrackProp)

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Master strip on the right */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
        <div className="flex-1 flex gap-px">
          {tracks.map(t => {
            const isSelected = selectedTrackId === t.id
            return (
            <div
              key={t.id}
              onClick={() => selectTrack(t.id)}
              className={`w-24 shrink-0 flex flex-col border-r transition-colors cursor-pointer ${
                isSelected ? 'bg-primary/[0.03] border-primary/30' : 'bg-surface-low border-surface-high'
              }`}
            >
              {/* Strip header */}
              <div className="h-6 flex items-center justify-center gap-1 px-1 border-b border-surface-high">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-[10px] text-on-surface truncate">{t.name}</span>
              </div>

              {/* M/S/R buttons */}
              <div className="flex justify-center gap-1 py-1 border-b border-surface-high">
                {(['mute', 'solo', 'recordArm'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={e => { e.stopPropagation(); setTrackProp(t.id, key, !t[key]) }}
                    className={`w-5 h-4 rounded text-[8px] font-bold transition-colors ${
                      t[key]
                        ? key === 'recordArm'
                          ? 'bg-recording text-white'
                          : key === 'solo'
                            ? 'bg-primary/60 text-white'
                            : 'bg-recording/60 text-white'
                        : 'bg-surface-high text-outline hover:text-on-surface'
                    }`}
                  >
                    {key === 'mute' ? 'M' : key === 'solo' ? 'S' : 'R'}
                  </button>
                ))}
              </div>

              {/* VU Meter */}
              <div className="flex-1 flex flex-col items-center justify-end px-2 py-1">
                <div className="w-3 flex-1 rounded-sm bg-surface-high relative overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full rounded-sm transition-all duration-100"
                    style={{
                      height: `${t.volume * 100}%`,
                      background: `linear-gradient(to top, ${t.color}88, ${t.color})`,
                    }}
                  />
                </div>
              </div>

              {/* Pan knob */}
              <div className="flex items-center justify-center gap-2 py-1 border-t border-surface-high">
                <span className="text-[9px] text-outline w-4 text-right">L</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={t.pan}
                  onChange={e => { e.stopPropagation(); setTrackProp(t.id, 'pan', parseFloat(e.target.value)) }}
                  className="w-12 h-1 appearance-none bg-surface-highest rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-on-surface"
                />
                <span className="text-[9px] text-outline w-4">R</span>
              </div>

              {/* Volume fader */}
              <div className="px-3 py-1 border-t border-surface-high flex flex-col items-center gap-0.5">
                <div className="h-16 flex items-center justify-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={t.volume}
                    onChange={e => { e.stopPropagation(); setTrackProp(t.id, 'volume', parseFloat(e.target.value)) }}
                    className="w-16 h-1 appearance-none bg-surface-highest rounded-full cursor-pointer origin-center -rotate-90
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-on-surface
                      [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>
                <span className="text-[9px] text-on-surface-variant font-mono">{dbFromLin(t.volume)}</span>
              </div>
            </div>
            )
          })}
        </div>

        {/* Master strip */}
        <div className="w-28 shrink-0 flex flex-col bg-surface-low border-l border-surface-high">
          <div className="h-6 flex items-center justify-center gap-1 px-1 border-b border-surface-high">
            <span className="text-[10px] text-on-surface font-semibold">Master</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-end px-2 py-1">
            <div className="w-4 flex-1 rounded-sm bg-surface-high relative overflow-hidden">
              <div className="absolute bottom-0 w-full rounded-sm bg-primary" style={{ height: '80%' }} />
            </div>
          </div>
          <div className="px-3 py-1 border-t border-surface-high flex flex-col items-center gap-0.5">
            <div className="w-6 h-20 bg-surface-highest rounded-full" />
            <span className="text-[9px] text-on-surface-variant font-mono">0 dB</span>
          </div>
        </div>
      </div>
    </div>
  )
}
