import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import TopNavBar from './TopNavBar'
import Sidebar from './Sidebar'
import BottomNavBar from './BottomNavBar'
import { useStore } from '../store/useStore'

export default function Layout() {
  const initEngine = useStore(s => s.initEngine)
  const togglePlay = useStore(s => s.togglePlay)

  useEffect(() => { initEngine() }, [initEngine])

  // Spacebar → Play/Pause, locked exclusively
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        togglePlay()
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay])

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
