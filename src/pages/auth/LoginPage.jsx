import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-mazul-cream flex flex-col items-center justify-center px-6">
      {/* Logo / nombre */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-full bg-mazul-bark flex items-center justify-center mx-auto mb-4">
          <span className="text-mazul-cream text-2xl font-light tracking-widest">M</span>
        </div>
        <h1 className="text-2xl font-light tracking-[0.2em] text-mazul-bark uppercase">Mazul</h1>
        <p className="text-xs text-mazul-stone mt-1 tracking-wide">Puerto Escondido · Oaxaca</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="input-label">Correo</label>
          <input
            type="email"
            className="input"
            placeholder="nombre@mazul.mx"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="input-label">Contraseña</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="text-xs text-mazul-stone/60 mt-8">
        Sistema interno Mazul · v1.0
      </p>
    </div>
  )
}
