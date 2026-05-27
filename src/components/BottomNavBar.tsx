import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Mixer', icon: 'sliders', path: '/mixer' },
  { label: 'Piano Roll', icon: 'piano', path: '/piano-roll' },
  { label: 'Audio Editor', icon: 'graphic_eq', path: '/arrangement' },
]

export default function BottomNavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <footer className="md:hidden h-12 bg-surface-low border-t border-surface-high flex items-center px-4 gap-3 shrink-0">
      {navItems.map(item => (
        <button
          key={item.label}
          onClick={() => navigate(item.path)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
            location.pathname === item.path
              ? 'text-primary bg-surface-high'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className="ml-auto flex items-center gap-3 text-[9px] text-outline">
        <span>Sylvenson Richard</span>
      </div>
    </footer>
  )
}
