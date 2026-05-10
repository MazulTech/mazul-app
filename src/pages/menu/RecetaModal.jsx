import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function RecetaModal({ platillo, onClose }) {
  const [insumos, setInsumos]     = useState([])
  const [receta, setReceta]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [showAdd, setShowAdd]     = useState(false)
  const [insumoSel, setInsumoSel] = useState('')
  const [cantidad, setCantidad]   = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: ins }, { data: rec }] = await Promise.all([
      supabase.from('insumos').select('*').order('nombre'),
      supabase.from('recetas').select('*, insumos(nombre, unidad, precio_unitario)').eq('platillo_id', platillo.id),
    ])
    setInsumos(ins ?? [])
    setReceta(rec ?? [])
    setLoading(false)
  }

  const costo = receta.reduce((s, r) => {
    return s + (Number(r.cantidad) * Number(r.insumos?.precio_unitario ?? 0))
  }, 0)
  const margen = platillo.precio_venta > 0
    ? ((platillo.precio_venta - costo) / platillo.precio_venta * 100).toFixed(1)
    : 0

  async function handleAgregar() {
    if (!insumoSel || !cantidad || Number(cantidad) <= 0) return
    setSaving(true)
    const { error } = await supabase.from('recetas').upsert({
      platillo_id: platillo.id,
      insumo_id:   insumoSel,
      cantidad:    Number(cantidad),
    }, { onConflict: 'platillo_id,insumo_id' })
    setSaving(false)
    if (!error) {
      setShowAdd(false)
      setInsumoSel('')
      setCantidad('')
      fetchData()
    }
  }

  async function handleEliminar(recetaId) {
    await supabase.from('recetas').delete().eq('id', recetaId)
    fetchData()
  }

  const insumosDisponibles = insumos.filter(i => !receta.find(r => r.insumo_id === i.id))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-mazul-cream w-full max-w-md rounded-t-3xl flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="p-5 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-mazul-sand rounded-full mx-auto mb-4" />
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{platillo.emoji}</span>
            <div>
              <h2 className="text-base font-medium text-mazul-bark">{platillo.nombre}</h2>
              <p className="text-xs text-mazul-stone">Receta y costeo</p>
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="px-5 mb-3 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <div className="card p-3 text-center">
              <p className="text-base font-semibold text-mazul-bark">${Number(platillo.precio_venta).toFixed(0)}</p>
              <p className="text-[10px] text-mazul-stone">Precio venta</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-base font-semibold text-mazul-bark">${costo.toFixed(2)}</p>
              <p className="text-[10px] text-mazul-stone">Costo receta</p>
            </div>
            <div className={`card p-3 text-center ${Number(margen) >= 65 ? 'bg-emerald-50' : Number(margen) >= 50 ? 'bg-amber-50' : 'bg-red-50'}`}>
              <p className={`text-base font-semibold ${Number(margen) >= 65 ? 'text-emerald-700' : Number(margen) >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
                {margen}%
              </p>
              <p className="text-[10px] text-mazul-stone">Margen</p>
            </div>
          </div>
        </div>

        {/* Lista de ingredientes */}
        <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-3">
          <p className="section-title">Ingredientes</p>
          {loading ? (
            <p className="text-center text-mazul-stone text-sm py-4">Cargando…</p>
          ) : receta.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🧾</p>
              <p className="text-sm text-mazul-stone">Sin ingredientes — agrega los insumos que usa este platillo</p>
            </div>
          ) : receta.map(r => (
            <div key={r.id} className="card-compact flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-mazul-bark">{r.insumos?.nombre}</p>
                <p className="text-xs text-mazul-stone">
                  {Number(r.cantidad)} {r.insumos?.unidad} · ${(Number(r.cantidad) * Number(r.insumos?.precio_unitario ?? 0)).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleEliminar(r.id)}
                className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-sm flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}

          {/* Agregar ingrediente */}
          {showAdd ? (
            <div className="card p-4 space-y-3 mt-2">
              <p className="text-sm font-medium text-mazul-bark">Agregar ingrediente</p>
              <div>
                <label className="input-label">Insumo</label>
                <select className="input" value={insumoSel} onChange={e => setInsumoSel(e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {insumosDisponibles.map(i => (
                    <option key={i.id} value={i.id}>{i.nombre} (${Number(i.precio_unitario).toFixed(2)}/{i.unidad})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">
                  Cantidad {insumoSel ? `(${insumos.find(i => i.id === insumoSel)?.unidad})` : ''}
                </label>
                <input
                  className="input"
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="0.000"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                />
              </div>
              {insumoSel && cantidad && (
                <div className="bg-mazul-mist rounded-lg px-3 py-2 flex justify-between">
                  <span className="text-xs text-mazul-stone">Costo de este ingrediente</span>
                  <span className="text-xs font-semibold text-mazul-bark">
                    ${(Number(cantidad) * Number(insumos.find(i => i.id === insumoSel)?.precio_unitario ?? 0)).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button className="btn-primary py-2 text-xs" onClick={handleAgregar} disabled={saving || !insumoSel || !cantidad}>
                  {saving ? 'Guardando…' : 'Agregar'}
                </button>
                <button className="btn-secondary py-2 text-xs" onClick={() => { setShowAdd(false); setInsumoSel(''); setCantidad('') }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : insumosDisponibles.length > 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-3 border-2 border-dashed border-mazul-sand rounded-xl text-sm text-mazul-stone hover:border-mazul-moss hover:text-mazul-moss transition-colors mt-2"
            >
              + Agregar ingrediente
            </button>
          )}
        </div>

        <div className="p-5 pt-3 flex-shrink-0 border-t border-mazul-sand/60">
          <button className="btn-secondary" onClick={onClose}>← Volver al menú</button>
        </div>
      </div>
    </div>
  )
}
