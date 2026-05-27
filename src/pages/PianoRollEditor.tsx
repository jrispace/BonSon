export default function PianoRollEditor() {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  return (
    <div className="h-full flex flex-col bg-surface-dim">
      <div className="flex items-center h-9 px-4 border-b border-surface-high bg-surface-low gap-2">
        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-sm">edit</span> Pencil
        </button>
        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-outline hover:text-on-surface hover:bg-surface-mid">
          <span className="material-symbols-outlined text-sm">ink_eraser</span> Eraser
        </button>
        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-outline hover:text-on-surface hover:bg-surface-mid">
          <span className="material-symbols-outlined text-sm">content_cut</span> Scissor
        </button>
        <div className="w-px h-4 bg-surface-high mx-1" />
        <button className="px-2 py-1 rounded text-[10px] text-outline hover:text-on-surface hover:bg-surface-mid">Quantize</button>
        <button className="px-2 py-1 rounded text-[10px] text-outline hover:text-on-surface hover:bg-surface-mid">Chord Assist</button>
        <select className="px-2 py-1 rounded text-[10px] bg-surface-high text-on-surface border-0 outline-none">
          <option>C MINOR</option>
        </select>
        <button className="ml-auto px-3 py-1 rounded text-[10px] bg-primary/10 text-primary font-medium hover:bg-primary/20">
          AI Suggest
        </button>
      </div>

      <div className="flex-1 flex overflow-auto">
        <div className="w-20 bg-surface-low border-r border-surface-high shrink-0 overflow-y-auto">
          {[...Array(36)].map((_, i) => {
            const noteIndex = i % 12
            const octave = Math.floor(i / 12) + 2
            const label = `${notes[noteIndex]}${octave}`
            const isBlack = notes[noteIndex].includes('#')
            return (
              <div
                key={i}
                className={`h-8 border-b border-surface-high flex items-center px-2 text-[9px] font-mono ${
                  isBlack ? 'text-outline' : 'text-on-surface-variant'
                } ${notes[noteIndex] === 'C' ? 'bg-surface-mid/30' : ''}`}
              >
                {label}
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-auto relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, transparent calc(100% - 1px), var(--color-surface-high) calc(100% - 1px)),
                linear-gradient(to bottom, transparent calc(100% - 1px), var(--color-surface-high) calc(100% - 1px))
              `,
              backgroundSize: '80px 32px',
            }}
          >
            <div className="absolute top-[calc(3*32px)] left-[calc(1*80px)] w-16 h-7 rounded bg-primary/20 border border-primary/40" />
            <div className="absolute top-[calc(3*32px)] left-[calc(3*80px)] w-16 h-7 rounded bg-primary/20 border border-primary/40" />
            <div className="absolute top-[calc(5*32px)] left-[calc(2*80px)] w-16 h-7 rounded bg-primary/20 border border-primary/40" />
            <div className="absolute top-[calc(7*32px)] left-[calc(4*80px)] w-16 h-7 rounded bg-primary/20 border border-primary/40" />
          </div>
        </div>
      </div>

      <div className="h-8 bg-surface-low border-t border-surface-high flex items-center px-4 gap-1 overflow-x-auto">
        {[60, 70, 80, 90, 100, 110].map(v => (
          <div key={v} className="flex items-end gap-px h-5">
            <div className="w-2 rounded-sm" style={{ height: `${v * 0.3}px`, backgroundColor: v === 100 ? 'var(--color-primary)' : 'var(--color-surface-highest)', opacity: v === 100 ? 1 : 0.5 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
