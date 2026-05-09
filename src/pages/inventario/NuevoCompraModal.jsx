import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function NuevoCompraModal({ insumos, onClose, onSaved }) {
  const { user } = useAuth()
  const [insumoId, setInsumoId]     = useState('')
  const [cantidad, setCantidad]     = useState('')
  const [precio, setPrecio]         = useState('')
  const [proveedor, setProveedor]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const insumoSel = insumos.find(i => i.id === insumoId)
  const costoUnit = insumoSel && cantidad ? (Number(precio) / Number(cantidad)).toFixed(2) : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!insumoId)  { setError('Selecciona un insumo'); return }
    if (!cantidad || Number(cantidad) <= 0) { setError('La cantidad debe ser mayor a 0'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.from('compras').insert({
      insumo_id:      insumoId,
      cantidad:       Number(cantidad),
      precio_total:   Number(precio) || null,
      proveedor:      proveedor.trim() || null,
      registrado_por: user.id,
    })

    setLoading(false)
    if (error) { setError('Error al registrar compra'); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-mazul-cream w-full max-w-md rounded-t-3xl" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="w-10 h-1 bg-mazul-sand rounded-full mx-auto mb-5" />
          <h2 className="text-base font-medium text-mazul-bark mb-1">Registrar compra</h2>
          <p className="text-xs text-mazul-stone mb-5">El stock se actualiza automáticamente al guardar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Insumo */}
            <div>
              <label className="input-label">Insumo comprado</label>
              <select
                className="input"
                value={insumoId}
                onChange={e => setInsumoId(e.target.value)}
              >
                <option value="">— Selecciona un insumo —</option>
                {insumos.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} (stock actual: {Number(i.stock_actual).toFixed(2)} {i.unidad})
                  </option>
                ))}
              </select>
            </div>

            {/* Cantidad y precio */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">
                  Cantidad {insumoSel ? `(${insumoSel.unidad})` : ''}
                </label>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">Precio total</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mazul-stone text-sm">$</span>
                  <input
                    className="input pl-8"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={precio}
                    onChange={e => setPrecio(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Costo unitario calculado */}
            {costoUnit && (
              <div className="bg-mazul-mist rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-mazul-stone">Costo por {insumoSel?.unidad}</span>
                <span className="text-sm font-semibold text-mazul-bark">${costoUnit}</span>
              </div>
            )}

            {/* Proveedor */}
            <div>
              <label className="input-label">Proveedor <span className="normal-case font-normal">(opcional)</span></label>
              <input
                className="input"
                placeholder="Ej. Mercado Central, Don Aurelio..."
                value={proveedor}
                onChange={e => setProveedor(e.target.value)}
              />
            </div>

            {/* Stock resultante */}
            {insumoSel && cantidad && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-xs text-emerald-700 font-medium">Stock después de esta compra</p>
                <p className="text-base font-semibold text-emerald-800 mt-0.5">
                  {(Number(insumoSel.stock_actual) + Number(cantidad)).toFixed(2)} {insumoSel.unidad}
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Registrando…' : '✓ Registrar compra'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          </form>
        </div>
      </div>
    </div>
  )
}
