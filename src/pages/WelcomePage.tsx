import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'

interface ProjectFile {
  name: string
  handle: FileSystemFileHandle
}

export default function WelcomePage() {
  const navigate = useNavigate()
  const setProjectRoot = useStore(s => s.setProjectRoot)
  const loadProject = useStore(s => s.loadProject)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [projects, setProjects] = useState<ProjectFile[]>([])

  const scanForProjects = async (dir: FileSystemDirectoryHandle) => {
    const found: ProjectFile[] = []
    try {
      for await (const entry of dir.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.bonson')) {
          found.push({ name: entry.name.replace(/\.bonson$/i, ''), handle: entry as FileSystemFileHandle })
        }
      }
    } catch { /* ignore */ }
    found.sort((a, b) => a.name.localeCompare(b.name))
    return found
  }

  const handlePickFolder = async () => {
    setError('')
    setBusy(true)
    try {
      const w = window as any
      if (!w.showDirectoryPicker) {
        setError('Your browser does not support the File System Access API. Please use Chrome or Edge.')
        setBusy(false)
        return
      }
      const handle: FileSystemDirectoryHandle = await w.showDirectoryPicker()

      // Scan for existing .bonson projects
      const found = await scanForProjects(handle)
      if (found.length > 0) {
        setRootHandle(handle)
        setProjects(found)
        setBusy(false)
        return
      }

      // No projects found — create a new one
      await setProjectRoot(handle)
      navigate('/arrangement', { replace: true })
    } catch (err: any) {
      if (err?.name !== 'AbortError' && err?.message !== 'The user aborted a request.') {
        setError('Could not access the chosen folder. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleCreateNew = async () => {
    if (!rootHandle) return
    setBusy(true)
    try {
      await setProjectRoot(rootHandle)
      navigate('/arrangement', { replace: true })
    } catch {
      setError('Could not create project.')
    } finally {
      setBusy(false)
    }
  }

  const handleOpenProject = async (pf: ProjectFile) => {
    if (!rootHandle) return
    setBusy(true)
    try {
      // Set up the project folder
      await setProjectRoot(rootHandle)
      // Load the project data
      const file = await pf.handle.getFile()
      const text = await file.text()
      const data = JSON.parse(text)
      loadProject(data)
      navigate('/arrangement', { replace: true })
    } catch {
      setError('Could not open project file.')
    } finally {
      setBusy(false)
    }
  }

  // Step 2: Show project picker
  if (rootHandle && projects.length > 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-surface overflow-hidden select-none">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 px-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">music_note</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-on-surface tracking-tight">BonSon</h1>
              <p className="text-[11px] text-outline/60 tracking-widest uppercase mt-0.5">Music Production Suite</p>
            </div>
          </div>

          <div className="max-w-md w-full bg-surface-low border border-surface-high rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-semibold text-on-surface mb-1">Open Project</h2>
            <p className="text-[11px] text-on-surface-variant/70 mb-4">
              Choose a project from <span className="font-mono text-outline/60">{rootHandle.name}</span>
            </p>

            <div className="space-y-1 max-h-[240px] overflow-y-auto mb-4">
              {projects.map(pf => (
                <button
                  key={pf.name}
                  onClick={() => handleOpenProject(pf)}
                  disabled={busy}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-mid/30 hover:bg-surface-mid border border-surface-high/50 text-left transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg text-primary/70">audio_file</span>
                  <span className="text-xs text-on-surface truncate">{pf.name}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-surface-high pt-3">
              <button
                onClick={handleCreateNew}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 border border-primary/25 text-primary text-xs font-medium hover:bg-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Create New Project
              </button>
            </div>

            {error && (
              <p className="mt-3 text-xs text-recording bg-recording/10 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <p className="text-[10px] text-outline/30 tracking-wider">
            Designed by <span className="text-outline/50">Sylvenson Richard</span>
          </p>
        </div>
      </div>
    )
  }

  // Step 1: Pick folder
  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-surface overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary">music_note</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">BonSon</h1>
            <p className="text-[11px] text-outline/60 tracking-widest uppercase mt-0.5">Music Production Suite</p>
          </div>
        </div>

        <div className="max-w-md w-full bg-surface-low border border-surface-high rounded-2xl p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-on-surface mb-2">Welcome</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            To get started, choose a folder on your computer where BonSon will store all project files, recordings, and imported audio.
          </p>

          <button
            onClick={handlePickFolder}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-primary/15 border border-primary/30 text-primary font-medium text-sm hover:bg-primary/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-xl">{busy ? 'hourglass_top' : 'create_new_folder'}</span>
            {busy ? 'Opening...' : 'Choose Project Folder'}
          </button>

          {error && (
            <p className="mt-4 text-xs text-recording bg-recording/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="mt-6 pt-5 border-t border-surface-high">
            <p className="text-[11px] text-outline/50 leading-relaxed">
              BonSon will create an <span className="font-mono text-outline/70">Audio/</span> folder inside your project folder to organise recordings and imported files.
            </p>
          </div>
        </div>

        <p className="text-[10px] text-outline/30 tracking-wider">
          Designed by <span className="text-outline/50">Sylvenson Richard</span>
        </p>
      </div>
    </div>
  )
}
