import { useStore } from '../store/useStore'

const MAX_HISTORY = 50
let undoStack: string[] = []
let redoStack: string[] = []
let ignoreNext = false

export function pushSnapshot() {
  if (ignoreNext) { ignoreNext = false; return }
  const state = useStore.getState()
  const snapshot = JSON.stringify({
    tracks: state.tracks,
    transport: { bpm: state.transport.bpm, timeSignature: state.transport.timeSignature, zoom: state.transport.zoom },
    selectedTrackId: state.selectedTrackId,
    projectName: state.projectName,
  })
  undoStack.push(snapshot)
  if (undoStack.length > MAX_HISTORY) undoStack.shift()
  redoStack = []
}

export function undo() {
  const state = useStore.getState()
  if (undoStack.length === 0) return false
  const current = JSON.stringify({
    tracks: state.tracks,
    transport: { bpm: state.transport.bpm, timeSignature: state.transport.timeSignature, zoom: state.transport.zoom },
    selectedTrackId: state.selectedTrackId,
    projectName: state.projectName,
  })
  redoStack.push(current)
  const prev = undoStack.pop()!
  ignoreNext = true
  useStore.setState(JSON.parse(prev))
  return true
}

export function redo() {
  if (redoStack.length === 0) return false
  const state = useStore.getState()
  const current = JSON.stringify({
    tracks: state.tracks,
    transport: { bpm: state.transport.bpm, timeSignature: state.transport.timeSignature, zoom: state.transport.zoom },
    selectedTrackId: state.selectedTrackId,
    projectName: state.projectName,
  })
  undoStack.push(current)
  const next = redoStack.pop()!
  ignoreNext = true
  useStore.setState(JSON.parse(next))
  return true
}

export function clearHistory() {
  undoStack = []
  redoStack = []
  ignoreNext = false
}
