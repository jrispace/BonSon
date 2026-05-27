import { useRef, useEffect } from 'react'
import { audioEngine, type WaveformFrame } from '../engine/AudioEngine'
import { useStore } from '../store/useStore'

export default function RecordingWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<WaveformFrame | null>(null)
  const tracks = useStore(s => s.tracks)
  const transport = useStore(s => s.transport)

  const armedTrack = tracks.find(t => t.recordArm && transport.isRecording)

  useEffect(() => {
    const handler = (frame: WaveformFrame) => {
      frameRef.current = frame
    }
    audioEngine.onRecordingWaveform = handler
    return () => { audioEngine.onRecordingWaveform = null }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !armedTrack) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const draw = () => {
      const frame = frameRef.current
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = 'rgba(0, 219, 231, 0.08)'
      ctx.fillRect(0, 0, w, h)

      if (frame && frame.data.length > 0) {
        const centerY = h / 2
        const step = frame.data.length / w

        ctx.strokeStyle = 'rgba(0, 219, 231, 0.85)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let x = 0; x < w; x++) {
          const idx = Math.min(Math.floor(x * step), frame.data.length - 1)
          const val = Math.abs(frame.data[idx])
          const barH = Math.max(1, val * centerY * 0.9)
          ctx.moveTo(x, centerY - barH)
          ctx.lineTo(x, centerY + barH)
        }
        ctx.stroke()

        const indicatorX = frame.duration > 0 ? ((frame.position / frame.duration) * w) : 0
        ctx.strokeStyle = '#ffb4ab'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(indicatorX, 0)
        ctx.lineTo(indicatorX, h)
        ctx.stroke()

        const sec = frame.position
        const m = Math.floor(sec / 60)
        const s = Math.floor(sec % 60)
        const ms = Math.floor((sec - Math.floor(sec)) * 100)
        const label = `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`

        ctx.fillStyle = '#ffb4ab'
        ctx.font = '10px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(label, Math.min(indicatorX + 30, w - 30), 12)
      } else {
        const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7
        ctx.fillStyle = `rgba(255, 65, 65, ${pulse})`
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.font = '10px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Recording…', w / 2, h / 2 + 18)
      }

      animId = requestAnimationFrame(draw)
    }
    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [armedTrack])

  return (
    <div
      className={`absolute inset-0 z-10 rounded overflow-hidden transition-opacity duration-200 ${
        armedTrack ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  )
}
