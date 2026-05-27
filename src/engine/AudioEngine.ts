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
  // Effect nodes (inserted between gainNode → panNode)
  compressorNode: DynamicsCompressorNode | null
  filterNodes: BiquadFilterNode[]
  delayNode: DelayNode | null
  delayFeedback: GainNode | null
  delayMix: GainNode | null
  reverbNode: ConvolverNode | null
  reverbMix: GainNode | null
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

    this.tracks.set(id, { gainNode, panNode, source: null, buffer: null, startOffset: 0, compressorNode: null, filterNodes: [], delayNode: null, delayFeedback: null, delayMix: null, reverbNode: null, reverbMix: null })
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

  rebuildEffects(id: string, effects: any[]) {
    const ch = this.tracks.get(id)
    if (!ch || !this.ctx) return

    // Disconnect existing effects
    try { ch.gainNode.disconnect() } catch {}
    try { ch.panNode.disconnect() } catch {}
    if (ch.compressorNode) { try { ch.compressorNode.disconnect() } catch {}; ch.compressorNode.disconnect(); ch.compressorNode = null }
    ch.filterNodes.forEach(n => { try { n.disconnect() } catch {} })
    ch.filterNodes = []
    if (ch.delayNode) { try { ch.delayNode.disconnect() } catch {}; ch.delayNode.disconnect(); ch.delayNode = null }
    if (ch.delayFeedback) { try { ch.delayFeedback.disconnect() } catch {}; ch.delayFeedback.disconnect(); ch.delayFeedback = null }
    if (ch.delayMix) { try { ch.delayMix.disconnect() } catch {}; ch.delayMix.disconnect(); ch.delayMix = null }
    if (ch.reverbNode) { try { ch.reverbNode.disconnect() } catch {}; ch.reverbNode.disconnect(); ch.reverbNode = null }
    if (ch.reverbMix) { try { ch.reverbMix.disconnect() } catch {}; ch.reverbMix.disconnect(); ch.reverbMix = null }

    // Build chain: gainNode → [effects] → panNode → masterGain
    let lastNode: AudioNode = ch.gainNode

    for (const fx of effects) {
      if (!fx.enabled) continue
      switch (fx.type) {
        case 'compressor': {
          const comp = this.ctx.createDynamicsCompressor()
          comp.threshold.value = fx.params.threshold ?? -24
          comp.ratio.value = fx.params.ratio ?? 4
          comp.attack.value = (fx.params.attack ?? 3) / 1000
          comp.release.value = (fx.params.release ?? 100) / 1000
          lastNode.connect(comp)
          lastNode = comp
          ch.compressorNode = comp
          break
        }
        case 'eq': {
          if (fx.params.lowGain !== 0) {
            const low = this.ctx.createBiquadFilter()
            low.type = 'lowshelf'
            low.frequency.value = 250
            low.gain.value = fx.params.lowGain
            lastNode.connect(low); lastNode = low; ch.filterNodes.push(low)
          }
          if (fx.params.midGain !== 0) {
            const mid = this.ctx.createBiquadFilter()
            mid.type = 'peaking'
            mid.frequency.value = fx.params.midFreq ?? 1000
            mid.Q.value = 1
            mid.gain.value = fx.params.midGain
            lastNode.connect(mid); lastNode = mid; ch.filterNodes.push(mid)
          }
          if (fx.params.highGain !== 0) {
            const high = this.ctx.createBiquadFilter()
            high.type = 'highshelf'
            high.frequency.value = 4000
            high.gain.value = fx.params.highGain
            lastNode.connect(high); lastNode = high; ch.filterNodes.push(high)
          }
          break
        }
        case 'delay': {
          if ((fx.params.mix ?? 0) <= 0) break
          const delay = this.ctx.createDelay(2)
          delay.delayTime.value = fx.params.time ?? 0.25
          const feedback = this.ctx.createGain()
          feedback.gain.value = fx.params.feedback ?? 0.3
          const mixGain = this.ctx.createGain()
          mixGain.gain.value = fx.params.mix ?? 0.3

          // Dry/wet: send to delay, mix back
          const dryGain = this.ctx.createGain()
          dryGain.gain.value = 1 - (fx.params.mix ?? 0.3)
          const wetGain = this.ctx.createGain()
          wetGain.gain.value = (fx.params.mix ?? 0.3)

          lastNode.connect(dryGain)
          lastNode.connect(delay)
          delay.connect(feedback)
          feedback.connect(delay)
          delay.connect(wetGain)
          // For now, just mix dry + wet into panNode
          dryGain.connect(ch.panNode)
          wetGain.connect(ch.panNode)
          ch.delayNode = delay
          ch.delayFeedback = feedback
          ch.delayMix = mixGain
          // lastNode stays as dryGain (we've already connected to panNode)
          return // Skip normal connection
        }
        case 'reverb': {
          if ((fx.params.mix ?? 0) <= 0) break
          const reverb = this.ctx.createConvolver()
          // Generate a simple impulse response (white noise decay)
          const sr = this.ctx.sampleRate
          const len = sr * (fx.params.decay ?? 2)
          const impulse = this.ctx.createBuffer(2, len, sr)
          for (let c = 0; c < 2; c++) {
            const data = impulse.getChannelData(c)
            for (let i = 0; i < len; i++) {
              data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * (fx.params.decay ?? 2) * 0.3))
            }
          }
          reverb.buffer = impulse

          const dryGain = this.ctx.createGain()
          dryGain.gain.value = 1 - (fx.params.mix ?? 0.2)
          const wetGain = this.ctx.createGain()
          wetGain.gain.value = (fx.params.mix ?? 0.2)

          lastNode.connect(dryGain)
          lastNode.connect(reverb)
          reverb.connect(wetGain)
          dryGain.connect(ch.panNode)
          wetGain.connect(ch.panNode)
          ch.reverbNode = reverb
          ch.reverbMix = wetGain
          return
        }
      }
    }

    // Connect final node to panNode → masterGain
    lastNode.connect(ch.panNode)
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
