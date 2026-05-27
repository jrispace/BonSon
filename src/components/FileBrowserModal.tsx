import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'

interface FileEntry {
  name: string
  kind: 'file' | 'directory'
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
}

const AUDIO_EXTS = new Set(['.wav', '.mp3', '.ogg', '.flac', '.aac', '.m4a', '.webm', '.opus'])

function isAudioFile(name: string) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  return AUDIO_EXTS.has(ext)
}

interface Props {
  onClose: () => void
}

export default function FileBrowserModal({ onClose }: Props) {
  const rootHandle = useStore(s => s.projectRootHandle)
  const loadTrackAudio = useStore(s => s.loadTrackAudio)
  const selectTrack = useStore(s => s.selectTrack)
  const tracks = useStore(s => s.tracks)
  const selectedTrackId = useStore(s => s.selectedTrackId)

  const [currentHandle, setCurrentHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [path, setPath] = useState<{ name: string; handle: FileSystemDirectoryHandle }[]>([])
  const [busy, setBusy] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const loadEntries = useCallback(async (dir: FileSystemDirectoryHandle) => {
    setBusy('Loading…')
    const list: FileEntry[] = []
    try {
      for await (const entry of dir.values()) {
        list.push({
          name: entry.name,
          kind: entry.kind as 'file' | 'directory',
          handle: entry,
        })
      }
    } catch {
      setBusy('Could not read folder')
      return
    }
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    setEntries(list)
    setBusy('')
  }, [])

  const navigateTo = useCallback(async (handle: FileSystemDirectoryHandle, name: string) => {
    setPath(p => [...p, { name, handle }])
    setCurrentHandle(handle)
    await loadEntries(handle)
  }, [loadEntries])

  const goUp = useCallback(async () => {
    if (path.length <= 1) return
    const newPath = path.slice(0, -1)
    const parent = newPath[newPath.length - 1].handle
    setPath(newPath)
    setCurrentHandle(parent)
    await loadEntries(parent)
  }, [path, loadEntries])

  const goRoot = useCallback(async () => {
    if (!rootHandle) return
    setPath([{ name: rootHandle.name, handle: rootHandle }])
    setCurrentHandle(rootHandle)
    await loadEntries(rootHandle)
  }, [rootHandle, loadEntries])

  useEffect(() => {
    goRoot()
  }, [goRoot])

  const handleLoadAudio = async (entry: FileEntry) => {
    setLoadingId(entry.name)
    try {
      const file = await (entry.handle as FileSystemFileHandle).getFile()
      const url = URL.createObjectURL(file)
      let targetId = selectedTrackId
      if (!targetId) {
        const firstEmpty = tracks.find(t => !t.hasAudio)
        targetId = firstEmpty?.id || tracks[0]?.id
      }
      if (targetId) {
        await loadTrackAudio(targetId, url, entry.name)
        selectTrack(targetId)
      }
    } catch { /* ignore */ }
    setLoadingId(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-surface-low border border-surface-high rounded-xl shadow-2xl overflow-hidden w-[580px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with breadcrumb */}
        <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-high">
          <span className="material-symbols-outlined text-base text-primary">folder_open</span>
          <div className="flex items-center gap-1 text-[11px] text-outline flex-1 min-w-0">
            {path.length === 0 ? (
              <span className="text-on-surface-variant">Loading…</span>
            ) : (
              path.map((p, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <span className="text-outline/40 mx-0.5">/</span>}
                  <button
                    onClick={() => {
                      const target = p.handle
                      setPath(path.slice(0, i + 1))
                      setCurrentHandle(target)
                      loadEntries(target)
                    }}
                    className="truncate max-w-[120px] hover:text-on-surface transition-colors"
                  >
                    {p.name}
                  </button>
                </span>
              ))
            )}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-high text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-2 max-h-[55vh] overflow-y-auto">
          {/* Go up */}
          {path.length > 1 && (
            <button
              onClick={goUp}
              className="w-full flex items-center gap-3 px-3 py-2 rounded text-xs text-outline hover:bg-surface-mid transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_upward</span>
              <span>.. (go up)</span>
            </button>
          )}

          {busy && (
            <div className="flex items-center justify-center py-8 text-xs text-outline">{busy}</div>
          )}

          {!busy && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-outline/50">
              <span className="material-symbols-outlined text-3xl mb-2">folder_off</span>
              <p className="text-xs">This folder is empty</p>
            </div>
          )}

          {!busy && entries.map(entry => {
            const audio = entry.kind === 'file' && isAudioFile(entry.name)
            return (
              <div
                key={entry.name}
                className="flex items-center gap-3 px-3 py-2 rounded group hover:bg-surface-mid transition-colors"
              >
                <span className={`material-symbols-outlined text-lg shrink-0 ${
                  entry.kind === 'directory' ? 'text-primary/60' : audio ? 'text-accent/80' : 'text-outline/40'
                }`}>
                  {entry.kind === 'directory' ? 'folder' : audio ? 'music_note' : 'description'}
                </span>

                {entry.kind === 'directory' ? (
                  <button
                    onClick={() => navigateTo(entry.handle as FileSystemDirectoryHandle, entry.name)}
                    className="flex-1 text-left text-xs text-on-surface truncate hover:text-primary transition-colors"
                  >
                    {entry.name}
                  </button>
                ) : (
                  <span className="flex-1 text-xs text-on-surface-variant truncate">{entry.name}</span>
                )}

                {audio && (
                  <button
                    onClick={() => handleLoadAudio(entry)}
                    disabled={loadingId === entry.name}
                    className="shrink-0 px-2.5 py-1 rounded text-[10px] bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {loadingId === entry.name ? '…' : 'Load'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 h-9 border-t border-surface-high text-[10px] text-outline/50">
          <span>{entries.length} item{entries.length !== 1 ? 's' : ''}</span>
          {currentHandle && (
            <span className="truncate max-w-[200px]">{currentHandle.name}</span>
          )}
        </div>
      </div>
    </div>
  )
}
