import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function WelcomePage() {
  const navigate = useNavigate()
  const setProjectRoot = useStore(s => s.setProjectRoot)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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

  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-surface overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary">music_note</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">BonSon</h1>
            <p className="text-[11px] text-outline/60 tracking-widest uppercase mt-0.5">Music Production Suite</p>
          </div>
        </div>

        {/* Welcome card */}
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
