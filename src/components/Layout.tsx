import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import TopNavBar from './TopNavBar'
import Sidebar from './Sidebar'
import BottomNavBar from './BottomNavBar'
import { useStore, loadAutoSave } from '../store/useStore'
import { undo, redo } from '../store/history'

export default function Layout() {
  const navigate = useNavigate()
  const initEngine = useStore(s => s.initEngine)
  const loadProject = useStore(s => s.loadProject)
  const togglePlay = useStore(s => s.togglePlay)
  const saveProject = useStore(s => s.saveProject)
  const newProject = useStore(s => s.newProject)
  const removeTrack = useStore(s => s.removeTrack)
  const selectedTrackId = useStore(s => s.selectedTrackId)
  const projectRootHandle = useStore(s => s.projectRootHandle)

  useEffect(() => {
    if (!projectRootHandle) {
      navigate('/', { replace: true })
      return
    }
    initEngine()
    // Restore auto-saved project if available
    const saved = loadAutoSave()
    if (saved && saved.tracks && saved.tracks.length > 0) {
      const hasData = saved.tracks.some((t: any) => t.hasAudio || t.comment)
      if (hasData) loadProject(saved)
    }
  }, [projectRootHandle, navigate, initEngine, loadProject])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Space → Play/Pause
      if (e.code === 'Space' || e.key === ' ') {
        if (isInput) return
        e.preventDefault()
        togglePlay()
        return
      }

      // Don't handle other shortcuts when in an input
      if (isInput) return

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
        return
      }
      if (isMod && e.key === 'Z') {
        e.preventDefault()
        redo()
        return
      }
      if (isMod && e.key === 's') {
        e.preventDefault()
        saveProject()
        return
      }
      if (isMod && e.key === 'n') {
        e.preventDefault()
        newProject()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTrackId) {
        e.preventDefault()
        removeTrack(selectedTrackId)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, saveProject, newProject, removeTrack, selectedTrackId])

  return (
    <div className="h-dvh flex flex-col bg-surface overflow-hidden">
      <TopNavBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <BottomNavBar />
    </div>
  )
}
