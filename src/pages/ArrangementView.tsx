import { useCallback, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import Waveform from '../components/Waveform'
import RecordingWaveform from '../components/RecordingWaveform'
import ContextMenu from '../components/ContextMenu'
import IOConfigModal from '../components/IOConfigModal'
import TrackEffectsModal from '../components/TrackEffectsModal'
import TrackSendsModal from '../components/TrackSendsModal'
import AutomationsModal from '../components/AutomationsModal'

const PX_PER_SEC = 40

export default function ArrangementView() {
  const tracks = useStore(s => s.tracks)
  const selectedTrackId = useStore(s => s.selectedTrackId)
  const selectTrack = useStore(s => s.selectTrack)
  const setTrackProp = useStore(s => s.setTrackProp)
  const loadTrackAudio = useStore(s => s.loadTrackAudio)
  const recordOnTrack = useStore(s => s.recordOnTrack)
  const transport = useStore(s => s.transport)
  const setZoom = useStore(s => s.setZoom)
  const renameTrack = useStore(s => s.renameTrack)
  const removeTrack = useStore(s => s.removeTrack)

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; trackId: string } | null>(null)
  const [modal, setModal] = useState<{ type: string; trackId: string } | null>(null)

  const pxPerSec = PX_PER_SEC * transport.zoom
  const timelineWidth = Math.max(transport.duration * pxPerSec, 600)

  const measureMarkers = useMemo(() => {
    if (transport.duration <= 0) return []
    const secondsPerBeat = 60 / transport.bpm
    const beatsPerMeasure = transport.timeSignature[0]
    const secPerMeasure = secondsPerBeat * beatsPerMeasure
    const totalMeasures = Math.ceil(transport.duration / secPerMeasure) + 1
    const markers: { measure: number; px: number }[] = []
    for (let m = 1; m <= totalMeasures; m++) {
      markers.push({ measure: m, px: (m - 1) * secPerMeasure * pxPerSec })
    }
    return markers
  }, [transport.duration, transport.bpm, transport.timeSignature, pxPerSec])

  const handleDrop = useCallback(async (e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('audio/')) return
    const url = URL.createObjectURL(file)
    await loadTrackAudio(trackId, url, file.name)
  }, [loadTrackAudio])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, trackId })
  }, [])

  const handleRename = (id: string) => {
    const t = tracks.find(t => t.id === id)
    if (!t) return
    const name = prompt('Rename track:', t.name)
    if (name && name.trim()) renameTrack(id, name.trim())
  }

  return (
    <div className="h-full flex bg-surface">
      {/* Track headers */}
      <div className="w-52 shrink-0 border-r border-surface-high overflow-y-auto">
        {tracks.map(t => {
          const isSelected = selectedTrackId === t.id
          return (
            <div
              key={t.id}
              onClick={() => selectTrack(t.id)}
              onContextMenu={(e) => handleContextMenu(e, t.id)}
              className={`h-20 px-3 flex flex-col justify-center gap-1 border-b transition-colors cursor-pointer ${
                isSelected
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-surface-high hover:bg-surface-low'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className={`text-[11px] truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                  {t.name}
                </span>
              </div>

              {t.hasAudio && (
                <span className="text-[9px] text-on-surface-variant truncate">{t.clipName}</span>
              )}

              <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={e => { e.stopPropagation(); setTrackProp(t.id, 'mute', !t.mute) }}
                  className={`w-6 h-5 rounded text-[9px] font-semibold transition-colors ${
                    t.mute
                      ? 'bg-recording/60 text-white'
                      : 'bg-surface-high text-outline hover:text-on-surface'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setTrackProp(t.id, 'solo', !t.solo) }}
                  className={`w-6 h-5 rounded text-[9px] font-semibold transition-colors ${
                    t.solo
                      ? 'bg-primary/60 text-white'
                      : 'bg-surface-high text-outline hover:text-on-surface'
                  }`}
                >
                  S
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setTrackProp(t.id, 'recordArm', !t.recordArm) }}
                  className={`w-6 h-5 rounded text-[9px] font-semibold transition-colors ${
                    t.recordArm
                      ? 'bg-recording text-white'
                      : 'bg-surface-high text-outline hover:text-on-surface'
                  }`}
                >
                  R
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Timeline lanes */}
      <div className="flex-1 overflow-auto relative">
        {/* Time ruler */}
        <div className="h-6 border-b border-surface-high bg-surface-low flex items-center sticky top-0 z-10" style={{ width: timelineWidth, minWidth: '100%' }}>
          <div className="relative w-full h-full">
            {measureMarkers.map(m => (
              <div
                key={m.measure}
                className="absolute top-0 h-full flex items-center"
                style={{ left: m.px }}
              >
                <span className="text-[10px] text-outline font-mono">{m.measure}.1.1</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1">
          <button
            onClick={() => setZoom(transport.zoom - 0.25)}
            className="w-6 h-6 flex items-center justify-center rounded bg-surface-high/80 hover:bg-surface-highest text-on-surface text-xs transition-colors"
            title="Zoom out"
          >
            <span className="material-symbols-outlined text-sm">zoom_out</span>
          </button>
          <span className="text-[10px] text-outline font-mono min-w-[32px] text-center">
            {Math.round(transport.zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(transport.zoom + 0.25)}
            className="w-6 h-6 flex items-center justify-center rounded bg-surface-high/80 hover:bg-surface-highest text-on-surface text-xs transition-colors"
            title="Zoom in"
          >
            <span className="material-symbols-outlined text-sm">zoom_in</span>
          </button>
        </div>

        <div className="relative" style={{ width: timelineWidth, minWidth: '100%' }}>
          {/* Playhead line — inside the scrollable timeline so it tracks full width */}
          {transport.position > 0 && transport.duration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-px bg-primary z-20 pointer-events-none"
              style={{
                left: `${(transport.position / transport.duration) * 100}%`,
              }}
            />
          )}

          {tracks.map(t => {
            const isSelected = selectedTrackId === t.id
            return (
              <div
                key={t.id}
                onClick={() => selectTrack(t.id)}
                onContextMenu={(e) => handleContextMenu(e, t.id)}
                className={`h-20 border-b group relative transition-colors cursor-pointer ${
                  isSelected ? 'border-primary/30 bg-primary/[0.02]' : 'border-surface-high'
                }`}
                onDrop={(e) => handleDrop(e, t.id)}
                onDragOver={handleDragOver}
              >
                {/* Record button overlay */}
                <button
                  onClick={e => { e.stopPropagation(); recordOnTrack(t.id) }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all opacity-0 group-hover:opacity-100 ${
                    transport.isRecording && t.recordArm
                      ? 'bg-recording text-white animate-pulse'
                      : 'bg-surface-highest/80 text-recording hover:bg-recording hover:text-white'
                  }`}
                  title="Record on this track"
                >
                  <span className="material-symbols-outlined text-sm">fiber_manual_record</span>
                </button>

                {/* Empty lane hint */}
                <div className="absolute inset-0 flex items-center pointer-events-none">
                  {!t.hasAudio && (
                    <span className="mx-4 text-[10px] text-outline/30 group-hover:text-outline/50 transition-colors">
                      Drop audio or click record
                    </span>
                  )}
                </div>

                {/* Waveform clip — width scales with zoom */}
                {t.hasAudio && t.clipDuration > 0 && (
                  <div
                    className="absolute inset-y-1 left-1 rounded overflow-hidden"
                    style={{
                      width: t.clipDuration * pxPerSec,
                      backgroundColor: `${t.color}15`,
                      borderLeft: `3px solid ${t.color}`,
                    }}
                  >
                    <Waveform trackId={t.id} color={t.color} />
                  </div>
                )}

                {/* Live recording waveform */}
                {t.recordArm && <RecordingWaveform />}
              </div>
            )
          })}
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={[
            { label: 'I/O Settings', icon: 'input', onClick: () => setModal({ type: 'io', trackId: ctxMenu.trackId }) },
            {
              label: 'Track Color', icon: 'palette', onClick: () => {
                const t = tracks.find(t => t.id === ctxMenu.trackId)
                if (!t) return
                const color = prompt('Set track color (hex):', t.color)
                if (color && /^#[0-9a-f]{6}$/i.test(color)) setTrackProp(ctxMenu.trackId, 'color', color)
              }
            },
            {
              label: 'Track Comments', icon: 'comment', onClick: () => {
                const t = tracks.find(t => t.id === ctxMenu.trackId)
                if (!t) return
                const comment = prompt('Track comment:', t.comment)
                if (comment != null) setTrackProp(ctxMenu.trackId, 'comment', comment)
              }
            },
            { label: 'Rename', icon: 'edit', onClick: () => handleRename(ctxMenu.trackId) },
            { label: 'Delete', icon: 'delete', danger: true, onClick: () => removeTrack(ctxMenu.trackId) },
            { label: 'Track Effects', icon: 'tune', onClick: () => setModal({ type: 'effects', trackId: ctxMenu.trackId }) },
            { label: 'Track Sends', icon: 'send', onClick: () => setModal({ type: 'sends', trackId: ctxMenu.trackId }) },
            { label: 'Automations', icon: 'show_chart', onClick: () => setModal({ type: 'automations', trackId: ctxMenu.trackId }) },
          ]}
        />
      )}

      {modal?.type === 'io' && <IOConfigModal trackId={modal.trackId} onClose={() => setModal(null)} />}
      {modal?.type === 'effects' && <TrackEffectsModal trackId={modal.trackId} onClose={() => setModal(null)} />}
      {modal?.type === 'sends' && <TrackSendsModal trackId={modal.trackId} onClose={() => setModal(null)} />}
      {modal?.type === 'automations' && <AutomationsModal trackId={modal.trackId} onClose={() => setModal(null)} />}
    </div>
  )
}
