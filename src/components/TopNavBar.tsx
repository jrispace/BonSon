import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import ConfirmDialog from './ConfirmDialog'

const NEW_TRACK_COLORS = ['#00dbe7', '#ff6b35', '#a8e06c', '#ffd700', '#ff4080', '#7b68ee', '#32cd32', '#ff8c00']

function fmtTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00.000'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.floor((sec - Math.floor(sec)) * 1000)
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export default function TopNavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadTrackAudio = useStore(s => s.loadTrackAudio)
  const tracks = useStore(s => s.tracks)
  const selectedTrackId = useStore(s => s.selectedTrackId)
  const addTrack = useStore(s => s.addTrack)
  const selectTrack = useStore(s => s.selectTrack)
  const transport = useStore(s => s.transport)
  const togglePlay = useStore(s => s.togglePlay)
  const stopPlayback = useStore(s => s.stopPlayback)
  const toggleRecord = useStore(s => s.toggleRecord)
  const newProject = useStore(s => s.newProject)
  const saveProject = useStore(s => s.saveProject)
  const exportWav = useStore(s => s.exportWav)
  const projectName = useStore(s => s.projectName)
  const setProjectName = useStore(s => s.setProjectName)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)

  type PendingFile = { url: string; name: string; targetTrackId: string }
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null)

  const closeMenu = () => setFileMenuOpen(false)

  const doLoad = useCallback(async (trackId: string, url: string, name: string) => {
    await loadTrackAudio(trackId, url, name)
    selectTrack(trackId)
  }, [loadTrackAudio, selectTrack])

  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    const url = URL.createObjectURL(file)

    // Determine target track
    let targetId = selectedTrackId
    if (!targetId) {
      const firstEmpty = tracks.find(t => !t.hasAudio)
      targetId = firstEmpty?.id || tracks[0]?.id
    }
    if (!targetId) { closeMenu(); return }

    // Check if track already has audio
    const targetTrack = tracks.find(t => t.id === targetId)
    if (targetTrack?.hasAudio) {
      setPendingFile({ url, name: file.name, targetTrackId: targetId })
    } else {
      await doLoad(targetId, url, file.name)
    }
    closeMenu()
  }

  const hasArmed = tracks.some(t => t.recordArm)

  const handleReplace = useCallback(async () => {
    if (!pendingFile) return
    await doLoad(pendingFile.targetTrackId, pendingFile.url, pendingFile.name)
    setPendingFile(null)
  }, [pendingFile, doLoad])

  const handleNewTrack = useCallback(async () => {
    if (!pendingFile) return
    const color = NEW_TRACK_COLORS[tracks.length % NEW_TRACK_COLORS.length]
    addTrack(pendingFile.name.replace(/\.[^.]+$/, ''), color)
    // The new track is added at the end — select and load onto it
    const newTracks = useStore.getState().tracks
    const newTrack = newTracks[newTracks.length - 1]
    await doLoad(newTrack.id, pendingFile.url, pendingFile.name)
    setPendingFile(null)
  }, [pendingFile, tracks.length, addTrack, doLoad])

  return (
    <nav className="h-12 flex items-center px-4 gap-3 bg-surface-low border-b border-surface-high shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <img src="/favicon.png" alt="BonSon" className="w-6 h-6" />
        <span className="text-xs font-semibold tracking-wider uppercase text-primary">BonSon</span>
        <span className="w-px h-5 bg-surface-high mx-1" />
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="bg-transparent text-xs text-on-surface outline-none border-b border-transparent focus:border-primary/50 transition-colors w-28 max-w-[160px] px-1"
          placeholder="Project Name"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center gap-1">
        {/* File menu with dropdown */}
        <div className="relative">
          <button
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            onBlur={() => setTimeout(() => setFileMenuOpen(false), 150)}
            className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
              fileMenuOpen
                ? 'bg-surface-highest text-on-surface'
                : 'text-outline hover:text-on-surface hover:bg-surface-high'
            }`}
          >
            File
          </button>

          {fileMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-surface-low border border-surface-high rounded shadow-lg z-50 py-1">
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleOpenFile} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-3 py-2 text-[11px] text-on-surface hover:bg-surface-mid transition-colors"
              >
                <span className="material-symbols-outlined text-base">folder_open</span>
                Open Audio File
              </button>
              <button
                onClick={() => { newProject(); closeMenu() }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[11px] text-outline hover:bg-surface-mid transition-colors"
              >
                <span className="material-symbols-outlined text-base">note_add</span>
                New Project
              </button>
              <div className="h-px bg-surface-high my-1 mx-2" />
              <button
                onClick={() => { saveProject(); closeMenu() }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[11px] text-outline hover:bg-surface-mid transition-colors"
              >
                <span className="material-symbols-outlined text-base">save</span>
                Save Project
              </button>
              <button
                onClick={() => { exportWav(); closeMenu() }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[11px] text-outline hover:bg-surface-mid transition-colors"
              >
                <span className="material-symbols-outlined text-base">file_download</span>
                Export as WAV
              </button>
            </div>
          )}
        </div>

        {[
          { label: 'Edit', path: '/arrangement' },
          { label: 'Mix', path: '/mixer' },
          { label: 'View', path: '/piano-roll' },
          { label: 'Help', path: '#' },
        ].map(link => (
          <button
            key={link.label}
            onClick={() => link.path !== '#' && navigate(link.path)}
            className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
              location.pathname === link.path
                ? 'bg-surface-highest text-on-surface'
                : 'text-outline hover:text-on-surface hover:bg-surface-high'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* Transport controls — inline in top bar per mockup */}
      <div className="flex items-center gap-1.5 ml-4">
        <button
          onClick={stopPlayback}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm text-outline hover:text-on-surface transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">stop</span>
        </button>

        <button
          onClick={togglePlay}
          className={`w-9 h-8 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
            transport.isPlaying
              ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
              : 'bg-primary/15 hover:bg-primary/25 text-primary backdrop-blur-sm'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {transport.isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          onClick={toggleRecord}
          disabled={!hasArmed}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
            transport.isRecording
              ? 'bg-recording text-white animate-pulse shadow-sm shadow-recording/40'
              : hasArmed
                ? 'bg-white/5 hover:bg-white/10 backdrop-blur-sm text-recording'
                : 'bg-transparent text-outline/20 cursor-not-allowed'
          }`}
        >
          <span className="material-symbols-outlined text-lg">fiber_manual_record</span>
        </button>

        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm text-outline hover:text-on-surface transition-all active:scale-95">
          <span className="material-symbols-outlined text-lg">loop</span>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="font-mono text-xs text-outline">{transport.bpm} BPM</span>
        <span className="font-mono text-xs text-outline">{transport.timeSignature[0]}/{transport.timeSignature[1]}</span>
        <span className="font-mono text-xs text-primary min-w-[60px]">{fmtTime(transport.position)}</span>

        <div className="w-7 h-7 rounded-full bg-surface-highest flex items-center justify-center text-xs text-outline">
          SR
        </div>
      </div>

      {pendingFile && (() => {
        const track = tracks.find(t => t.id === pendingFile.targetTrackId)
        return (
          <ConfirmDialog
            message="This track already has audio."
            trackName={track?.name ?? ''}
            clipName={pendingFile.name}
            onReplace={handleReplace}
            onNewTrack={handleNewTrack}
            onCancel={() => {
              URL.revokeObjectURL(pendingFile.url)
              setPendingFile(null)
            }}
          />
        )
      })()}
    </nav>
  )
}
