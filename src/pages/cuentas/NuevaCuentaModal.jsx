import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function NuevaCuentaModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const [tipo, setTipo] = useState('villa')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const villas = Array.from({ length: 21 }, (_, i) => `Villa ${i + 1}`)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) { setError('Escribe un nombre'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.from('cuentas').insert({
      tipo,
      nombre: nombre.trim(),
      estado: 'abierta',
      abierta_por: user.id,
    })
    if (error) { setError('Error al crear cuenta'); setLoading(false); return }
    setLoading(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-mazul-cream w-full max-w-md rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-mazul-sand rounded-full mx-auto mb-6" />
        <h2 className="text-base font-medium text-mazul-bark mb-5">Nueva cuenta</h2>

        {/* Tipo */}
        <div className="flex gap-3 mb-5">
          {['villa','externo'].map(t => (
            <button
              key={t}
              onClick={() => { setTipo(t); setNombre('') }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                tipo === t
                  ? 'bg-mazul-moss text-mazul-cream border-mazul-moss'
                  : 'border-mazul-sand text-mazul-stone bg-white/60'
              }`}
            >
              {t === 'villa' ? '🏡 Villa' : '👤 Externo'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tipo === 'villa' ? (
            <div>
              <label className="input-label">Selecciona la villa</label>
              <select
                className="input"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              >
                <option value="">— Elige una villa —</option>
                {villas.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="input-label">Nombre del cliente</label>
              <input
                className="input"
                placeholder="Ej. Carlos Fuentes, Familia Rodríguez..."
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading || !nombre}>
            {loading ? 'Abriendo cuenta…' : 'Abrir cuenta'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}
