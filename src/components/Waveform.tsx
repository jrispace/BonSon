import { useRef, useEffect } from 'react'
import { audioEngine } from '../engine/AudioEngine'

interface WaveformProps {
  trackId: string
  color: string
  clipDuration: number
}

function drawWaveform(canvas: HTMLCanvasElement, trackId: string, color: string) {
  const data = audioEngine.getTrackBufferData(trackId)
  if (!data) return false

  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (w === 0 || h === 0) return false

  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.scale(dpr, dpr)

  const channel = data[0]
  const centerY = h / 2
  const step = Math.floor(channel.length / w) || 1

  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5

  ctx.beginPath()
  for (let x = 0; x < w; x++) {
    const i = Math.min(Math.floor(x * step), channel.length - 1)
    const val = Math.abs(channel[i])
    const barH = Math.max(1, val * centerY * 0.9)
    ctx.moveTo(x, centerY - barH)
    ctx.lineTo(x, centerY + barH)
  }
  ctx.stroke()
  return true
}

export default function Waveform({ trackId, color, clipDuration }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let retries = 0
    const maxRetries = 20
    function tryDraw(c: HTMLCanvasElement) {
      if (drawWaveform(c, trackId, color)) return
      retries++
      if (retries < maxRetries) setTimeout(() => tryDraw(c), 50)
    }
    tryDraw(canvas)

    const ro = new ResizeObserver(() => drawWaveform(canvas, trackId, color))
    ro.observe(canvas)

    return () => {
      ro.disconnect()
    }
  }, [trackId, color, clipDuration])

  return (
    <div className="w-full h-full" style={{ opacity: 0.7 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  )
}
