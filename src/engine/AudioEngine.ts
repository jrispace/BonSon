export interface AudioFileInfo {
  name: string
  duration: number
  sampleRate: number
  channels: number
}

interface TrackChannel {
  gainNode: GainNode
  panNode: StereoPannerNode
  source: AudioBufferSourceNode | null
  buffer: AudioBuffer | null
  startOffset: number
}

export interface WaveformFrame {
  data: Float32Array
  position: number
  duration: number
}

export class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null

  private tracks = new Map<string, TrackChannel>()
  private _isPlaying = false
  private playbackStartTime = 0
  private pausedPosition = 0
  private rafId: number | null = null

  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private micStream: MediaStream | null = null
  private _isRecording = false
  private micSource: MediaStreamAudioSourceNode | null = null
  private recordingAnalyser: AnalyserNode | null = null
  private recordingRafId: number | null = null
  private recordingStartTime = 0
  private _recordingPosition = 0

  onPositionUpdate: ((pos: number) => void) | null = null
  onPlayStateChange: ((playing: boolean) => void) | null = null
  onRecordStateChange: ((recording: boolean) => void) | null = null
  onInfoChange: (() => void) | null = null
  onRecordingWaveform: ((frame: WaveformFrame) => void) | null = null

  get context() { return this.ctx }
  get isPlaying() { return this._isPlaying }
  get isRecording() { return this._isRecording }
  get currentPosition() { return this.pausedPosition }
  get recordingPosition() { return this._recordingPosition }

  get duration(): number {
    let max = 0
    for (const ch of this.tracks.values()) {
      if (ch.buffer) max = Math.max(max, ch.buffer.duration)
    }
    return max
  }

  async init() {
    if (this.ctx) return
    this.ctx = new AudioContext({ sampleRate: 44100 })
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.8
    this.masterGain.connect(this.ctx.destination)
  }

  createTrack(id: string) {
    if (!this.ctx || !this.masterGain) return
    if (this.tracks.has(id)) return

    const gainNode = this.ctx.createGain()
    gainNode.gain.value = 0.8
    const panNode = this.ctx.createStereoPanner()
    panNode.pan.value = 0
    gainNode.connect(panNode)
    panNode.connect(this.masterGain)

    this.tracks.set(id, { gainNode, panNode, source: null, buffer: null, startOffset: 0 })
  }

  removeTrack(id: string) {
    const ch = this.tracks.get(id)
    if (!ch) return
    ch.source?.stop()
    ch.source?.disconnect()
    ch.gainNode.disconnect()
    ch.panNode.disconnect()
    this.tracks.delete(id)
    this.onInfoChange?.()
  }

  setTrackVolume(id: string, volume: number) {
    const ch = this.tracks.get(id)
    if (!ch) return
    ch.gainNode.gain.setValueAtTime(volume, this.ctx?.currentTime ?? 0)
  }

  setTrackPan(id: string, pan: number) {
    const ch = this.tracks.get(id)
    if (!ch) return
    ch.panNode.pan.setValueAtTime(pan, this.ctx?.currentTime ?? 0)
  }

  async loadTrackBuffer(id: string, url: string, name?: string): Promise<AudioFileInfo | null> {
    if (!this.ctx) await this.init()
    if (!this.ctx) return null

    const ch = this.tracks.get(id)
    if (!ch) return null

    this.stop()

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)

    ch.buffer = audioBuffer

    const info: AudioFileInfo = {
      name: name ?? url.split('/').pop() ?? 'Unknown',
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    }
    this.onInfoChange?.()
    return info
  }

  clearTrackBuffer(id: string) {
    const ch = this.tracks.get(id)
    if (!ch) return
    ch.source?.stop()
    ch.source?.disconnect()
    ch.source = null
    ch.buffer = null
    ch.startOffset = 0
    this.onInfoChange?.()
  }

  private createSources() {
    for (const ch of this.tracks.values()) {
      ch.source?.stop()
      ch.source?.disconnect()
      ch.source = null
    }

    if (!this.ctx) return

    const startTime = this.ctx.currentTime + 0.003

    for (const ch of this.tracks.values()) {
      if (!ch.buffer) continue
      const src = this.ctx.createBufferSource()
      src.buffer = ch.buffer
      src.connect(ch.gainNode)
      src.start(startTime, this.pausedPosition)
      ch.source = src
    }
  }

  private stopSources() {
    for (const ch of this.tracks.values()) {
      ch.source?.stop()
      ch.source?.disconnect()
      ch.source = null
    }
  }

  play() {
    if (!this.ctx || this.duration === 0) return

    if (this.ctx.state === 'suspended')
      this.ctx.resume()

    this.createSources()
    this.playbackStartTime = this.ctx.currentTime + 0.003
    this._isPlaying = true
    this.onPlayStateChange?.(true)
    this.startPositionTracking()
  }

  pause() {
    if (!this.ctx || !this._isPlaying) return

    this.pausedPosition += this.ctx.currentTime - this.playbackStartTime
    this.stopSources()
    this._isPlaying = false
    this.onPlayStateChange?.(false)
    this.stopPositionTracking()
  }

  stop() {
    if (!this.ctx) return

    this.stopSources()
    this._isPlaying = false
    this.pausedPosition = 0
    this.onPlayStateChange?.(false)
    this.onPositionUpdate?.(0)
    this.stopPositionTracking()
  }

  togglePlay() {
    if (this._isPlaying) this.pause()
    else this.play()
  }

  seek(position: number) {
    const wasPlaying = this._isPlaying
    if (wasPlaying) this.pause()
    this.pausedPosition = Math.max(0, Math.min(position, this.duration))
    this.onPositionUpdate?.(this.pausedPosition)
    if (wasPlaying) this.play()
  }

  private startPositionTracking() {
    this.stopPositionTracking()
    const dur = this.duration
    const tick = () => {
      if (!this._isPlaying || !this.ctx) return
      this.pausedPosition = this.ctx.currentTime - this.playbackStartTime
      this.onPositionUpdate?.(this.pausedPosition)

      if (dur > 0 && this.pausedPosition >= dur) {
        this.stop()
        return
      }
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopPositionTracking() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      if (!this.ctx) await this.init()
      if (!this.ctx) return false

      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true })

      this.micSource = this.ctx.createMediaStreamSource(this.micStream)
      this.recordingAnalyser = this.ctx.createAnalyser()
      this.recordingAnalyser.fftSize = 2048
      this.micSource.connect(this.recordingAnalyser)

      this.recordedChunks = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      this.mediaRecorder = new MediaRecorder(this.micStream, { mimeType })
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data)
      }
      this.mediaRecorder.start()

      this.recordingStartTime = this.ctx.currentTime
      this._isRecording = true
      this.onRecordStateChange?.(true)
      this.startRecordingWaveformCapture()
      return true
    } catch {
      return false
    }
  }

  private startRecordingWaveformCapture() {
    this.stopRecordingWaveformCapture()
    if (!this.recordingAnalyser) return

    const bufferLength = this.recordingAnalyser.frequencyBinCount
    const dataArray = new Float32Array(bufferLength)

    const tick = () => {
      if (!this._isRecording || !this.recordingAnalyser || !this.ctx) return

      this.recordingAnalyser.getFloatTimeDomainData(dataArray)
      this._recordingPosition = this.ctx.currentTime - this.recordingStartTime

      this.onRecordingWaveform?.({
        data: new Float32Array(dataArray),
        position: this._recordingPosition,
        duration: this._recordingPosition,
      })

      this.recordingRafId = requestAnimationFrame(tick)
    }
    this.recordingRafId = requestAnimationFrame(tick)
  }

  private stopRecordingWaveformCapture() {
    if (this.recordingRafId !== null) {
      cancelAnimationFrame(this.recordingRafId)
      this.recordingRafId = null
    }
  }

  stopRecording(): Blob | null {
    if (!this.mediaRecorder || !this._isRecording) return null

    this.stopRecordingWaveformCapture()

    this.mediaRecorder.stop()
    this.micStream?.getTracks().forEach(t => t.stop())
    this.micStream = null

    this.micSource?.disconnect()
    this.micSource = null
    this.recordingAnalyser?.disconnect()
    this.recordingAnalyser = null

    this._isRecording = false
    this._recordingPosition = 0
    this.onRecordStateChange?.(false)

    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' })
    this.recordedChunks = []
    return blob
  }

  getTrackBufferData(id: string): Float32Array[] | null {
    const ch = this.tracks.get(id)
    if (!ch?.buffer) return null
    const b = ch.buffer
    const channels: Float32Array[] = []
    for (let i = 0; i < b.numberOfChannels; i++) {
      channels.push(b.getChannelData(i))
    }
    return channels
  }

  destroy() {
    this.stop()
    this.stopRecording()
    this.ctx?.close()
    this.ctx = null
    this.masterGain = null
    this.tracks.clear()
  }
}

export const audioEngine = new AudioEngine()
