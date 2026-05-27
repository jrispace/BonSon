import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useCallback } from 'react'
import { useStore, copyFileToAudioFolder } from '../store/useStore'

const libraryItems = [
  { label: 'Arrangement', icon: 'view_timeline' },
  { label: 'Files', icon: 'folder' },
  { label: 'Samples', icon: 'music_note' },
  { label: 'Instruments', icon: 'piano' },
  { label: 'Plugins', icon: 'extension' },
  { label: 'AI Tools', icon: 'auto_awesome' },
]

const NEW_TRACK_COLORS = ['#00dbe7', '#ff6b35', '#a8e06c', '#ffd700', '#ff4080', '#7b68ee', '#32cd32', '#ff8c00']

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const samplesInputRef = useRef<HTMLInputElement>(null)
  const loadTrackAudio = useStore(s => s.loadTrackAudio)
  const addTrack = useStore(s => s.addTrack)
  const selectTrack = useStore(s => s.selectTrack)
  const tracks = useStore(s => s.tracks)

  const doLoad = useCallback(async (url: string, name: string) => {
    const firstEmpty = tracks.find(t => !t.hasAudio)
    const targetId = firstEmpty?.id || tracks[0]?.id
    if (!targetId) return
    await loadTrackAudio(targetId, url, name)
    selectTrack(targetId)
  }, [tracks, loadTrackAudio, selectTrack])

  const handleImportAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await copyFileToAudioFolder(file)
    await doLoad(url, file.name)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImportSample = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const color = NEW_TRACK_COLORS[tracks.length % NEW_TRACK_COLORS.length]
    addTrack(file.name.replace(/\.[^.]+$/, ''), color)
    const newTracks = useStore.getState().tracks
    const url = await copyFileToAudioFolder(file)
    await loadTrackAudio(newTracks[newTracks.length - 1].id, url, file.name)
    if (samplesInputRef.current) samplesInputRef.current.value = ''
  }

  return (
    <aside className="w-[280px] bg-surface-low border-r border-surface-high flex flex-col shrink-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-[10px] font-bold tracking-[0.1em] text-outline uppercase mb-3 px-2">
          Library
        </div>

        <nav className="space-y-0.5">
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleImportAudio} className="hidden" />
          <input ref={samplesInputRef} type="file" accept="audio/*" onChange={handleImportSample} className="hidden" />

          {libraryItems.map(item => {
            let onClick: () => void
            switch (item.label) {
              case 'Arrangement':
                onClick = () => navigate('/arrangement')
                break
              case 'Files':
                onClick = () => fileInputRef.current?.click()
                break
              case 'Samples':
                onClick = () => samplesInputRef.current?.click()
                break
              case 'Instruments':
                onClick = () => navigate('/piano-roll')
                break
              case 'Plugins':
                onClick = () => navigate('/mixer')
                break
              case 'AI Tools':
                onClick = () => navigate('/arrangement')
                break
              default:
                onClick = () => {}
            }
            let route: string | null = null
            if (item.label === 'Arrangement') route = '/arrangement'
            else if (item.label === 'Instruments') route = '/piano-roll'
            else if (item.label === 'Plugins') route = '/mixer'
            else if (item.label === 'AI Tools') route = '/arrangement'
            const isActive = route ? location.pathname === route : false

            return (
              <button
                key={item.label}
                onClick={onClick}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded text-xs transition-colors ${
                  isActive
                    ? 'text-on-surface bg-surface-high'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-mid'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-6 px-2">
          <button
            onClick={() => navigate('/arrangement')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Track
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-surface-high space-y-1">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-outline hover:text-on-surface hover:bg-surface-mid transition-colors">
          <span className="material-symbols-outlined text-sm">settings</span>
          Settings
        </button>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-outline hover:text-on-surface hover:bg-surface-mid transition-colors">
          <span className="material-symbols-outlined text-sm">help</span>
          Support
        </button>
        <div className="pt-2 px-2 text-[9px] text-outline/50 border-t border-surface-high mt-2">
          Designed by <span className="text-outline/70">Sylvenson Richard</span>
        </div>
      </div>
    </aside>
  )
}
