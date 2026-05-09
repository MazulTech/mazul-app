import { useAuth } from '../../context/AuthContext'

export default function AppHeader({ title, subtitle, action }) {
  const { profile, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 bg-mazul-cream/95 backdrop-blur-sm border-b border-mazul-sand/60">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-base font-medium text-mazul-bark tracking-wide">{title}</h1>
          {subtitle && <p className="text-xs text-mazul-stone">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {/* Avatar del usuario */}
          <button
            onClick={signOut}
            className="w-8 h-8 rounded-full bg-mazul-bark flex items-center justify-center"
            title={`${profile?.nombre} · Salir`}
          >
            <span className="text-mazul-cream text-xs font-medium">
              {profile?.nombre?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
