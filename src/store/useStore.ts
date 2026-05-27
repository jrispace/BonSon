import { create } from 'zustand'
import { audioEngine } from '../engine/AudioEngine'

let projectHandle: any = null

async function saveBlobToDisk(blob: Blob, suggestedName: string, extraTypes?: { description: string; accept: Record<string, string[]> }[]): Promise<string | null> {
  try {
    const w = window as any
    const fileTypes = extraTypes || [{
      description: 'Audio Files',
      accept: { 'audio/webm': ['.webm'], 'audio/wav': ['.wav'] },
    }]
    const handle = await w.showSaveFilePicker({
      suggestedName,
      types: fileTypes,
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return handle.name
  } catch {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    a.click()
    URL.revokeObjectURL(url)
    return suggestedName
  }
}

async function saveProjectToDisk(blob: Blob, suggestedName: string) {
  try {
    const w = window as any
    if (!projectHandle) {
      projectHandle = await w.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'BonSon Project', accept: { 'application/json': ['.bonson'] } }],
      })
    }
    const writable = await projectHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    return projectHandle.name
  } catch {
    // If user cancels or API fails, fall back to download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    a.click()
    URL.revokeObjectURL(url)
    return suggestedName
  }
}

async function finishRecording(targetTrackId: string) {
  const blob = audioEngine.stopRecording()
  if (!blob) return

  const suggestedName = `Recording_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '_')}.webm`
  const savedName = await saveBlobToDisk(blob, suggestedName) || suggestedName

  // Load into the track's buffer for playback
  const url = URL.createObjectURL(blob)
  await useStore.getState().loadTrackAudio(targetTrackId, url, savedName)
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
  addTrack: (name: string, color: string) => void
  removeTrack: (id: string) => void
  selectTrack: (id: string) => void
  setTrackProp: (id: string, key: keyof Track, value: unknown) => void
  loadTrackAudio: (id: string, url: string, name: string) => Promise<void>
  renameTrack: (id: string, name: string) => void
  setTransport: (partial: Partial<TransportState>) => void
  setZoom: (zoom: number) => void
  setProjectName: (name: string) => void
  togglePlay: () => void
  stopPlayback: () => void
  toggleRecord: () => Promise<void>
  recordOnTrack: (id: string) => Promise<void>
  newProject: () => void
  saveProject: () => Promise<void>
  exportWav: () => Promise<void>
  initEngine: () => Promise<void>
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
    tracks: [
      defaultTrack('1', 'Vocal Lead',   defaultColors[0]),
      defaultTrack('2', 'Arp Synth',    defaultColors[1]),
      defaultTrack('3', 'Sub Bass',     defaultColors[2]),
      defaultTrack('4', 'Drum Kit',     defaultColors[3]),
      defaultTrack('5', 'Pad Texture',  defaultColors[4]),
      defaultTrack('6', 'FX Noise',     defaultColors[5]),
      defaultTrack('7', 'Strings High', defaultColors[6]),
    ],

    selectedTrackId: null,
    projectName: 'Untitled',

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
      return {
        tracks: [...state.tracks, defaultTrack(id, name, color)],
      }
    }),

    removeTrack: (id) => set(state => {
      audioEngine.removeTrack(id)
      return { tracks: state.tracks.filter(t => t.id !== id) }
    }),

    setTrackProp: (id, key, value) => set(state => {
      if (key === 'volume') audioEngine.setTrackVolume(id, value as number)
      if (key === 'pan') audioEngine.setTrackPan(id, value as number)
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

    toggleTrackEffect: (trackId, index) => set(state => ({
      tracks: state.tracks.map(t => t.id === trackId ? {
        ...t,
        effects: t.effects.map((e, i) => i === index ? { ...e, enabled: !e.enabled } : e),
      } : t),
    })),

    setTrackEffectParam: (trackId, index, param, value) => set(state => ({
      tracks: state.tracks.map(t => t.id === trackId ? {
        ...t,
        effects: t.effects.map((e, i) => i === index ? { ...e, params: { ...e.params, [param]: value } } : e),
      } : t),
    })),

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
      projectHandle = null
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
      const { tracks, transport, projectName } = useStore.getState()
      const data = { version: 1, projectName, tracks, transport: { bpm: transport.bpm, timeSignature: transport.timeSignature, zoom: transport.zoom } }
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      await saveProjectToDisk(blob, `${projectName}.bonson`)
    },

    exportWav: async () => {
      const { tracks } = useStore.getState()
      const firstWithAudio = tracks.find(t => t.hasAudio)
      if (!firstWithAudio) return
      const data = audioEngine.getTrackBufferData(firstWithAudio.id)
      if (!data || data.length === 0) return
      const blob = encodeWav(data[0], 44100)
      await saveBlobToDisk(blob, firstWithAudio.clipName?.replace(/\.[^.]+$/, '') + '.wav')
    },
  }
})
