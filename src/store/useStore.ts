import { create } from 'zustand'
import { audioEngine } from '../engine/AudioEngine'
import { pushSnapshot, clearHistory } from './history'

const AUTO_SAVE_KEY = 'bonson_autosave'
const AUTO_SAVE_INTERVAL = 30000

async function finishRecording(targetTrackId: string) {
  const blob = audioEngine.stopRecording()
  if (!blob) return

  const state = useStore.getState()
  const audioDir = state.audioDirHandle

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '_')
  const filename = `Recording_${timestamp}.webm`

  let savedName = filename
  let url: string

  if (audioDir) {
    const fileHandle = await audioDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    savedName = fileHandle.name
    const file = await fileHandle.getFile()
    url = URL.createObjectURL(file)
  } else {
    url = URL.createObjectURL(blob)
  }

  await useStore.getState().loadTrackAudio(targetTrackId, url, savedName)
}

export async function copyFileToAudioFolder(file: File): Promise<string> {
  const { audioDirHandle } = useStore.getState()
  if (!audioDirHandle) return URL.createObjectURL(file)
  const fileHandle = await audioDirHandle.getFileHandle(file.name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(await file.arrayBuffer())
  await writable.close()
  const savedFile = await fileHandle.getFile()
  return URL.createObjectURL(savedFile)
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bitsPerSample = 16
  const numChannels = 1
  const byteRate = sampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8
  const dataSize = samples.length * numChannels * bitsPerSample / 8
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)

  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    off += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export interface TrackEffect {
  type: 'eq' | 'compressor' | 'delay' | 'reverb'
  enabled: boolean
  params: Record<string, number>
}

export interface TrackSend {
  busId: string
  label: string
  level: number
  enabled: boolean
}

export interface TrackIOConfig {
  input: 'none' | 'mic' | 'audio-file'
  output: 'master'
}

export interface TrackAutomation {
  param: 'volume' | 'pan'
  enabled: boolean
}

export interface Track {
  id: string
  name: string
  color: string
  mute: boolean
  solo: boolean
  recordArm: boolean
  volume: number
  pan: number
  hasAudio: boolean
  clipName: string | null
  clipDuration: number
  comment: string
  ioConfig: TrackIOConfig
  effects: TrackEffect[]
  sends: TrackSend[]
  automations: TrackAutomation[]
}

export interface TransportState {
  isPlaying: boolean
  isRecording: boolean
  position: number
  duration: number
  bpm: number
  timeSignature: [number, number]
  zoom: number
}

interface Store {
  tracks: Track[]
  transport: TransportState
  selectedTrackId: string | null
  projectName: string
  projectRootHandle: FileSystemDirectoryHandle | null
  projectRootName: string
  audioDirHandle: FileSystemDirectoryHandle | null
  addTrack: (name: string, color: string) => void
  removeTrack: (id: string) => void
  selectTrack: (id: string) => void
  setTrackProp: (id: string, key: keyof Track, value: unknown) => void
  loadTrackAudio: (id: string, url: string, name: string) => Promise<void>
  renameTrack: (id: string, name: string) => void
  setTransport: (partial: Partial<TransportState>) => void
  setZoom: (zoom: number) => void
  setProjectName: (name: string) => void
  setProjectRoot: (handle: FileSystemDirectoryHandle) => Promise<void>
  togglePlay: () => void
  stopPlayback: () => void
  toggleRecord: () => Promise<void>
  recordOnTrack: (id: string) => Promise<void>
  newProject: () => void
  saveProject: () => Promise<void>
  exportWav: () => Promise<void>
  initEngine: () => Promise<void>
  loadProject: (data: any) => void
  toggleTrackEffect: (trackId: string, index: number) => void
  setTrackEffectParam: (trackId: string, index: number, param: string, value: number) => void
  setTrackSendLevel: (trackId: string, index: number, level: number) => void
  toggleTrackSend: (trackId: string, index: number) => void
  toggleTrackAutomation: (trackId: string, index: number) => void
}

const defaultColors = [
  '#00dbe7', '#ff6b35', '#a8e06c', '#ffd700',
  '#ff4080', '#7b68ee', '#32cd32', '#ff8c00',
]

let trackCounter = 0

function defaultTrack(id: string, name: string, color: string): Track {
  return {
    id, name, color,
    mute: false, solo: false, recordArm: false,
    volume: 0.8, pan: 0, hasAudio: false, clipName: null, clipDuration: 0, comment: '',
    ioConfig: { input: 'none', output: 'master' },
    effects: [
      { type: 'eq', enabled: false, params: { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0 } },
      { type: 'compressor', enabled: false, params: { threshold: -24, ratio: 4, attack: 3, release: 100 } },
      { type: 'delay', enabled: false, params: { time: 0.25, feedback: 0.3, mix: 0.3 } },
      { type: 'reverb', enabled: false, params: { mix: 0.2, decay: 2 } },
    ],
    sends: [
      { busId: 'reverb', label: 'Reverb Bus', level: 0, enabled: false },
      { busId: 'delay', label: 'Delay Bus', level: 0, enabled: false },
    ],
    automations: [
      { param: 'volume', enabled: false },
      { param: 'pan', enabled: false },
    ],
  }
}

export const useStore = create<Store>((set) => {
  audioEngine.onPlayStateChange = (playing) => {
    set(s => ({ transport: { ...s.transport, isPlaying: playing } }))
  }
  audioEngine.onRecordStateChange = (recording) => {
    set(s => ({ transport: { ...s.transport, isRecording: recording } }))
  }
  audioEngine.onPositionUpdate = (pos) => {
    set(s => ({ transport: { ...s.transport, position: pos } }))
  }
  audioEngine.onInfoChange = () => {
    set(s => ({ transport: { ...s.transport, duration: audioEngine.duration } }))
  }

  return {
    tracks: [],

    selectedTrackId: null,
    projectName: 'Untitled',
    projectRootHandle: null,
    projectRootName: '',
    audioDirHandle: null,

    transport: {
      isPlaying: false,
      isRecording: false,
      position: 0,
      duration: 0,
      bpm: 120,
      timeSignature: [4, 4],
      zoom: 1,
    },

    selectTrack: (id) => set({ selectedTrackId: id }),

    renameTrack: (id, name) => set(state => ({
      tracks: state.tracks.map(t => t.id === id ? { ...t, name } : t),
    })),

    addTrack: (name, color) => set(state => {
      const id = `track_${++trackCounter}`
      audioEngine.createTrack(id)
      const track = defaultTrack(id, name, color)
      audioEngine.rebuildEffects(id, track.effects)
      return {
        tracks: [...state.tracks, track],
      }
    }),

    removeTrack: (id) => set(state => {
      audioEngine.removeTrack(id)
      return { tracks: state.tracks.filter(t => t.id !== id) }
    }),

    setTrackProp: (id, key, value) => set(state => {
      if (key === 'volume') audioEngine.setTrackVolume(id, value as number)
      if (key === 'pan') audioEngine.setTrackPan(id, value as number)
      if (key === 'effects') audioEngine.rebuildEffects(id, value as any[])
      return {
        tracks: state.tracks.map(t => t.id === id ? { ...t, [key]: value } : t),
      }
    }),

    loadTrackAudio: async (id, url, name) => {
      const info = await audioEngine.loadTrackBuffer(id, url, name)
      if (info) {
        set(s => ({
          transport: { ...s.transport, duration: audioEngine.duration },
          tracks: s.tracks.map(t => t.id === id ? { ...t, hasAudio: true, clipName: info.name, clipDuration: info.duration } : t),
        }))
      }
    },

    setTransport: (partial) => set(state => ({
      transport: { ...state.transport, ...partial },
    })),

    setZoom: (zoom) => set(state => ({
      transport: { ...state.transport, zoom: Math.max(0.25, Math.min(4, zoom)) },
    })),

    setProjectName: (name) => set({ projectName: name }),

    setProjectRoot: async (handle: FileSystemDirectoryHandle) => {
      const audioDir = await handle.getDirectoryHandle('Audio', { create: true })
      set({
        projectRootHandle: handle,
        projectRootName: handle.name,
        audioDirHandle: audioDir,
      })
      // Create default tracks for the fresh project
      const colorList = defaultColors
      const defaultNames = ['Vocal Lead', 'Arp Synth', 'Sub Bass', 'Drum Kit', 'Pad Texture', 'FX Noise', 'Strings High']
      audioEngine.stop()
      audioEngine.destroy()
      audioEngine.init()
      trackCounter = 0
      const newTracks = defaultNames.map((name, i) => {
        const id = `track_${++trackCounter}`
        audioEngine.createTrack(id)
        const track = defaultTrack(id, name, colorList[i % colorList.length])
        audioEngine.rebuildEffects(id, track.effects)
        return track
      })
      set({ tracks: newTracks, selectedTrackId: null })
      clearHistory()
    },

    initEngine: async () => {
      await audioEngine.init()
      // create audio nodes for existing tracks
      const { tracks } = useStore.getState()
      for (const t of tracks) {
        audioEngine.createTrack(t.id)
        audioEngine.setTrackVolume(t.id, t.volume)
        audioEngine.setTrackPan(t.id, t.pan)
      }
    },

    loadProject: (data) => {
      if (!data || !data.tracks) return
      // Rebuild the audio engine for the new project
      audioEngine.stop()
      audioEngine.destroy()
      audioEngine.init()
      trackCounter = 0

      const tracks = data.tracks.map((t: any, i: number) => {
        const track = defaultTrack(t.id || `track_${++trackCounter}`, t.name, t.color || defaultColors[i % defaultColors.length])
        return track
      })
      set({
        projectName: data.projectName || 'Untitled',
        transport: {
          isPlaying: false,
          isRecording: false,
          position: 0,
          duration: 0,
          bpm: data.transport?.bpm ?? 120,
          timeSignature: data.transport?.timeSignature ?? [4, 4],
          zoom: data.transport?.zoom ?? 1,
        },
        tracks,
        selectedTrackId: null,
      })
      for (const t of useStore.getState().tracks) {
        audioEngine.createTrack(t.id)
        audioEngine.rebuildEffects(t.id, t.effects)
      }
      clearHistory()
    },

    toggleTrackEffect: (trackId, index) => set(state => {
      const newEffects = state.tracks
        .find(t => t.id === trackId)
        ?.effects.map((e, i) => i === index ? { ...e, enabled: !e.enabled } : e)
      if (newEffects) audioEngine.rebuildEffects(trackId, newEffects)
      return {
        tracks: state.tracks.map(t => t.id === trackId ? { ...t, effects: newEffects || t.effects } : t),
      }
    }),

    setTrackEffectParam: (trackId, index, param, value) => set(state => {
      const newEffects = state.tracks
        .find(t => t.id === trackId)
        ?.effects.map((e, i) => i === index ? { ...e, params: { ...e.params, [param]: value } } : e)
      if (newEffects) audioEngine.rebuildEffects(trackId, newEffects)
      return {
        tracks: state.tracks.map(t => t.id === trackId ? { ...t, effects: newEffects || t.effects } : t),
      }
    }),

    setTrackSendLevel: (trackId, index, level) => set(state => ({
      tracks: state.tracks.map(t => t.id === trackId ? {
        ...t,
        sends: t.sends.map((s, i) => i === index ? { ...s, level } : s),
      } : t),
    })),

    toggleTrackSend: (trackId, index) => set(state => ({
      tracks: state.tracks.map(t => t.id === trackId ? {
        ...t,
        sends: t.sends.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s),
      } : t),
    })),

    toggleTrackAutomation: (trackId, index) => set(state => ({
      tracks: state.tracks.map(t => t.id === trackId ? {
        ...t,
        automations: t.automations.map((a, i) => i === index ? { ...a, enabled: !a.enabled } : a),
      } : t),
    })),

    togglePlay: () => {
      audioEngine.togglePlay()
    },

    stopPlayback: () => {
      audioEngine.stop()
    },

    toggleRecord: async () => {
      if (audioEngine.isRecording) {
        const { tracks } = useStore.getState()
        const armedTrack = tracks.find(t => t.recordArm) || tracks[0]
        if (armedTrack) await finishRecording(armedTrack.id)
      } else {
        await audioEngine.startRecording()
      }
    },

    recordOnTrack: async (id) => {
      if (audioEngine.isRecording) {
        await finishRecording(id)
      } else {
        const { tracks } = useStore.getState()
        const track = tracks.find(t => t.id === id)
        if (track && !track.recordArm) {
          set(state => ({
            tracks: state.tracks.map(t => t.id === id ? { ...t, recordArm: true } : t),
          }))
        }
        await audioEngine.startRecording()
      }
    },

    newProject: () => {
      clearHistory()
      clearAutoSave()
      audioEngine.stop()
      audioEngine.destroy()
      audioEngine.init()
      trackCounter = 0
      set({
        selectedTrackId: null,
        projectName: 'Untitled',
        transport: { isPlaying: false, isRecording: false, position: 0, duration: 0, bpm: 120, timeSignature: [4, 4], zoom: 1 },
        tracks: defaultColors.map((color, i) => defaultTrack(
          `track_${++trackCounter}`,
          ['Vocal Lead', 'Arp Synth', 'Sub Bass', 'Drum Kit', 'Pad Texture', 'FX Noise', 'Strings High'][i] || `Track ${i + 1}`,
          color,
        )),
      })
      const newTracks = useStore.getState().tracks
      for (const t of newTracks) audioEngine.createTrack(t.id)
    },

    saveProject: async () => {
      const { tracks, transport, projectName, projectRootHandle } = useStore.getState()
      if (!projectRootHandle) return
      const data = { version: 1, projectName, tracks, transport: { bpm: transport.bpm, timeSignature: transport.timeSignature, zoom: transport.zoom } }
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const fileHandle = await projectRootHandle.getFileHandle(`${projectName}.bonson`, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
    },

    exportWav: async () => {
      const { tracks, audioDirHandle } = useStore.getState()
      const firstWithAudio = tracks.find(t => t.hasAudio)
      if (!firstWithAudio) return
      const data = audioEngine.getTrackBufferData(firstWithAudio.id)
      if (!data || data.length === 0) return
      const blob = encodeWav(data[0], 44100)
      if (audioDirHandle) {
        const filename = (firstWithAudio.clipName || 'export').replace(/\.[^.]+$/, '') + '.wav'
        const fileHandle = await audioDirHandle.getFileHandle(filename, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      }
    },
  }
})

// --- History: push snapshot on every state change ---
useStore.subscribe((state, prev) => {
  if (state.tracks !== prev.tracks || state.transport.bpm !== prev.transport.bpm || state.transport.zoom !== prev.transport.zoom) {
    pushSnapshot()
  }
})

// --- Auto-save to localStorage ---
function autoSave() {
  try {
    const state = useStore.getState()
    const data = {
      projectName: state.projectName,
      transport: { bpm: state.transport.bpm, timeSignature: state.transport.timeSignature, zoom: state.transport.zoom },
      tracks: state.tracks,
      savedAt: Date.now(),
    }
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data))
  } catch { /* storage full or unavailable */ }
}

let autoSaveTimer: ReturnType<typeof setInterval> | null = null

export function startAutoSave() {
  stopAutoSave()
  autoSaveTimer = setInterval(autoSave, AUTO_SAVE_INTERVAL)
}

export function stopAutoSave() {
  if (autoSaveTimer !== null) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}

export function loadAutoSave(): any {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function clearAutoSave() {
  localStorage.removeItem(AUTO_SAVE_KEY)
}

// Start auto-save on import
startAutoSave()
