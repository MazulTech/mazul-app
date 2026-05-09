import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const UNIDADES = ['kg', 'g', 'litro', 'ml', 'pieza', 'docena', 'caja', 'bolsa', 'lata', 'botella']

export default function NuevoInsumoModal({ insumo, onClose, onSaved }) {
  const editando = !!insumo
  const [form, setForm] = useState({
    nombre:          insumo?.nombre          ?? '',
    unidad:          insumo?.unidad          ?? 'kg',
    precio_unitario: insumo?.precio_unitario ?? '',
    stock_actual:    insumo?.stock_actual    ?? '',
    stock_minimo:    insumo?.stock_minimo    ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.unidad)        { setError('Selecciona una unidad'); return }
    setLoading(true)
    setError('')

    const data = {
      nombre:          form.nombre.trim(),
      unidad:          form.unidad,
      precio_unitario: Number(form.precio_unitario) || 0,
      stock_actual:    Number(form.stock_actual)    || 0,
      stock_minimo:    Number(form.stock_minimo)    || 0,
      updated_at:      new Date().toISOString(),
    }

    const { error } = editando
      ? await supabase.from('insumos').update(data).eq('id', insumo.id)
      : await supabase.from('insumos').insert(data)

    setLoading(false)
    if (error) { setError('Error al guardar'); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-mazul-cream w-full max-w-md rounded-t-3xl" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="w-10 h-1 bg-mazul-sand rounded-full mx-auto mb-5" />
          <h2 className="text-base font-medium text-mazul-bark mb-5">
            {editando ? 'Editar insumo' : 'Nuevo insumo'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Nombre del insumo</label>
              <input
                className="input"
                placeholder="Ej. Queso quesillo, Maíz azul, Chile pasilla..."
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                autoFocus={!editando}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Unidad</label>
                <select className="input" value={form.unidad} onChange={e => set('unidad', e.target.value)}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Precio / unidad</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mazul-stone text-sm">$</span>
                  <input
                    className="input pl-8"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.precio_unitario}
                    onChange={e => set('precio_unitario', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Stock actual</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.stock_actual}
                  onChange={e => set('stock_actual', e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">Stock mínimo</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.stock_minimo}
                  onChange={e => set('stock_minimo', e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-mazul-stone">El stock mínimo activa la alerta de recompra cuando el inventario baja de ese nivel.</p>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar insumo'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          </form>
        </div>
      </div>
    </div>
  )
}
