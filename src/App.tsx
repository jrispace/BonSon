import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import WelcomePage from './pages/WelcomePage'
import ArrangementView from './pages/ArrangementView'
import MixerConsole from './pages/MixerConsole'
import PianoRollEditor from './pages/PianoRollEditor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route element={<Layout />}>
        <Route path="/arrangement" element={<ArrangementView />} />
        <Route path="/mixer" element={<MixerConsole />} />
        <Route path="/piano-roll" element={<PianoRollEditor />} />
      </Route>
    </Routes>
  )
}
