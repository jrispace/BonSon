import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ArrangementView from './pages/ArrangementView'
import MixerConsole from './pages/MixerConsole'
import PianoRollEditor from './pages/PianoRollEditor'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/arrangement" replace />} />
        <Route path="/arrangement" element={<ArrangementView />} />
        <Route path="/mixer" element={<MixerConsole />} />
        <Route path="/piano-roll" element={<PianoRollEditor />} />
      </Route>
    </Routes>
  )
}
