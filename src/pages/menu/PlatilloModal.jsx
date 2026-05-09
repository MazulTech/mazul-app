import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const CATEGORIAS = [
  { key: 'platos_fuertes', label: 'Platos fuertes' },
  { key: 'antojitos',      label: 'Antojitos' },
  { key: 'bebidas',        label: 'Bebidas' },
  { key: 'postres',        label: 'Postres' },
  { key: 'extras',         label: 'Extras' },
]

const EMOJIS = ['🍽️','🫓','🍲','🫔','🍛','🌽','🍃','🧀','🫙','🍺','☕','🍮','🍫','🌶️','🥑','🍋','🥗','🫕','🍤','🥤']

export default function PlatilloModal({ platillo, onClose, onSaved }) {
  const editando = !!platillo

  const [form, setForm] = useState({
    nombre:      platillo?.nombre      ?? '',
    descripcion: platillo?.descripcion ?? '',
    categoria:   platillo?.categoria   ?? 'platos_fuertes',
    precio_venta: platillo?.precio_venta ?? '',
    emoji:       platillo?.emoji       ?? '🍽️',
    activo:      platillo?.activo      ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showEmojis, setShowEmojis] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.precio_venta || isNaN(form.precio_venta) || Number(form.precio_venta) <= 0) {
      setError('El precio debe ser mayor a 0'); return
    }
    setLoading(true)
    setError('')

    const data = {
      nombre:       form.nombre.trim(),
      descripcion:  form.descripcion.trim() || null,
      categoria:    form.categoria,
      precio_venta: Number(form.precio_venta),
      emoji:        form.emoji,
      activo:       form.activo,
    }

    const { error } = editando
      ? await supabase.from('platillos').update(data).eq('id', platillo.id)
      : await supabase.from('platillos').insert(data)

    setLoading(false)
    if (error) { setError('Error al guardar'); return }
    onSaved()
  }

  async function handleDesactivar() {
    setLoading(true)
    await supabase.from('platillos').update({ activo: !platillo.activo }).eq('id', platillo.id)
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-mazul-cream w-full max-w-md rounded-t-3xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 pb-0 flex-shrink-0">
          <div className="w-10 h-1 bg-mazul-sand rounded-full mx-auto mb-5" />
          <h2 className="text-base font-medium text-mazul-bark mb-5">
            {editando ? 'Editar platillo' : 'Nuevo platillo'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Emoji picker */}
            <div>
              <label className="input-label">Icono</label>
              <button
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className="w-14 h-14 rounded-2xl bg-mazul-mist border border-mazul-sand text-3xl flex items-center justify-center"
              >
                {form.emoji}
              </button>
              {showEmojis && (
                <div className="mt-2 flex flex-wrap gap-2 bg-white border border-mazul-sand rounded-xl p-3">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { set('emoji', e); setShowEmojis(false) }}
                      className={`text-2xl p-1 rounded-lg ${form.emoji === e ? 'bg-mazul-sand' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nombre */}
            <div>
              <label className="input-label">Nombre del platillo</label>
              <input
                className="input"
                placeholder="Ej. Tlayuda oaxaqueña"
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                autoFocus={!editando}
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="input-label">Descripción <span className="normal-case font-normal">(opcional)</span></label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Ingredientes principales, forma de preparación..."
                value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)}
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="input-label">Categoría</label>
              <select
                className="input"
                value={form.categoria}
                onChange={e => set('categoria', e.target.value)}
              >
                {CATEGORIAS.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Precio */}
            <div>
              <label className="input-label">Precio de venta (MXN)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mazul-stone text-sm">$</span>
                <input
                  className="input pl-8"
                  type="number"
                  min="1"
                  step="0.50"
                  placeholder="0.00"
                  value={form.precio_venta}
                  onChange={e => set('precio_venta', e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Botones */}
        <div className="p-5 pt-3 flex-shrink-0 border-t border-mazul-sand/60 space-y-2">
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar platillo'}
          </button>
          {editando && (
            <button className="btn-danger" onClick={handleDesactivar} disabled={loading}>
              {platillo.activo ? '🚫 Desactivar platillo' : '✓ Reactivar platillo'}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
