import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const CATS = [
  { key: 'todos', label: 'Todos' },
  { key: 'platos_fuertes', label: 'Platos' },
  { key: 'antojitos', label: 'Antojitos' },
  { key: 'bebidas', label: 'Bebidas' },
  { key: 'postres', label: 'Postres' },
  { key: 'extras', label: 'Extras' },
]

export default function NuevoCargoModal({ cuenta, onClose, onSaved }) {
  const { user } = useAuth()
  const [platillos, setPlatillos] = useState([])
  const [qty, setQty] = useState({})
  const [cat, setCat] = useState('todos')
  const [nota, setNota] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMenu, setLoadingMenu] = useState(true)

  useEffect(() => {
    supabase.from('platillos').select('*').eq('activo', true).order('categoria').order('nombre')
      .then(({ data }) => { setPlatillos(data ?? []); setLoadingMenu(false) })
  }, [])

  const filtrados = cat === 'todos' ? platillos : platillos.filter(p => p.categoria === cat)
  const total = platillos.reduce((s, p) => s + (qty[p.id] || 0) * Number(p.precio_venta), 0)
  const hasItems = Object.values(qty).some(v => v > 0)

  function cambiarQty(id, delta) {
    setQty(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }))
  }

  async function handleGuardar() {
    if (!hasItems) return
    setLoading(true)
    const items = platillos.filter(p => (qty[p.id] || 0) > 0)
    const inserts = items.map(p => ({
      cuenta_id: cuenta.id,
      platillo_id: p.id,
      cantidad: qty[p.id],
      precio_unit: Number(p.precio_venta),
      nota: nota || null,
      registrado_por: user.id,
    }))
    const { error } = await supabase.from('cargos').insert(inserts)
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-mazul-cream w-full max-w-md rounded-t-3xl flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="p-5 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-mazul-sand rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-mazul-bark">Agregar cargo</h2>
              <p className="text-xs text-mazul-stone">{cuenta.nombre}</p>
            </div>
            {hasItems && (
              <div className="text-right">
                <p className="text-sm font-semibold text-mazul-moss">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                <p className="text-xs text-mazul-stone">total cargo</p>
              </div>
            )}
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto flex-shrink-0">
          {CATS.map(c => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                cat === c.key ? 'bg-mazul-moss text-mazul-cream' : 'bg-mazul-sand/60 text-mazul-stone'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Lista de platillos */}
        <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-3">
          {loadingMenu ? (
            <p className="text-center text-mazul-stone text-sm py-8">Cargando menú…</p>
          ) : filtrados.map(p => {
            const q = qty[p.id] || 0
            return (
              <div key={p.id} className={`card p-3 flex items-center gap-3 ${q > 0 ? 'border-mazul-moss/50 bg-emerald-50/30' : ''}`}>
                <span className="text-xl flex-shrink-0">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-mazul-bark truncate">{p.nombre}</p>
                  <p className="text-xs text-mazul-stone">${p.precio_venta}</p>
                </div>
                {q === 0 ? (
                  <button
                    onClick={() => cambiarQty(p.id, 1)}
                    className="w-8 h-8 rounded-full bg-mazul-moss text-mazul-cream flex items-center justify-center text-lg font-light flex-shrink-0"
                  >+</button>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => cambiarQty(p.id, -1)} className="w-7 h-7 rounded-full border border-mazul-sand bg-white text-mazul-bark flex items-center justify-center text-sm">−</button>
                    <span className="text-sm font-semibold text-mazul-bark w-5 text-center">{q}</span>
                    <button onClick={() => cambiarQty(p.id, 1)} className="w-7 h-7 rounded-full bg-mazul-moss text-mazul-cream flex items-center justify-center text-sm">+</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Nota y botones */}
        <div className="p-5 pt-3 flex-shrink-0 border-t border-mazul-sand/60 space-y-3">
          <input
            className="input text-xs"
            placeholder="Nota opcional (sin chile, extra limón...)"
            value={nota}
            onChange={e => setNota(e.target.value)}
          />
          <button className="btn-primary" onClick={handleGuardar} disabled={!hasItems || loading}>
            {loading ? 'Guardando…' : `Cargar a cuenta · $${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
