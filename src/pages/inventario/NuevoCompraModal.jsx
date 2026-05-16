import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const UNIDADES = ['kg', 'g', 'litro', 'ml', 'pieza', 'docena', 'caja', 'bolsa', 'lata', 'botella']

const CATEGORIAS = [
  { key: 'materia_prima',   label: '🥩 Materia prima'    },
  { key: 'bebidas',         label: '🍺 Bebidas'           },
  { key: 'enlatados_secos', label: '🥫 Enlatados / secos' },
  { key: 'servicios',       label: '⚡ Servicios'         },
  { key: 'limpieza',        label: '🧹 Limpieza'          },
  { key: 'otros',           label: '📦 Otros'             },
]

export default function NuevoCompraModal({ insumos: insumosProp, onClose, onSaved }) {
  const { user } = useAuth()
  const [insumos, setInsumos]       = useState(insumosProp)
  const [insumoId, setInsumoId]     = useState('')
  const [cantidad, setCantidad]     = useState('')
  const [precio, setPrecio]         = useState('')
  const [proveedor, setProveedor]   = useState('')
  const [formaPago, setFormaPago]   = useState('efectivo')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  // Estado para crear nuevo insumo inline
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false)
  const [nuevoNombre, setNuevoNombre]         = useState('')
  const [nuevoUnidad, setNuevoUnidad]         = useState('kg')
  const [nuevoCat, setNuevoCat]               = useState('materia_prima')
  const [creandoInsumo, setCreandoInsumo]     = useState(false)
  const [busqueda, setBusqueda]               = useState('')

  const insumoSel  = insumos.find(i => i.id === insumoId)
  const costoUnit  = insumoSel && cantidad && precio ? (Number(precio) / Number(cantidad)).toFixed(2) : null
  const insumosFiltrados = busqueda
    ? insumos.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : insumos

  async function handleCrearInsumo() {
    if (!nuevoNombre.trim()) return
    setCreandoInsumo(true)
    const { data, error } = await supabase.from('insumos').insert({
      nombre:          nuevoNombre.trim(),
      unidad:          nuevoUnidad,
      categoria:       nuevoCat,
      precio_unitario: 0,
      stock_actual:    0,
      stock_minimo:    0,
      updated_at:      new Date().toISOString(),
    }).select().single()

    if (!error && data) {
      const nuevosInsumos = [...insumos, data].sort((a, b) => a.nombre.localeCompare(b.nombre))
      setInsumos(nuevosInsumos)
      setInsumoId(data.id)
      setBusqueda(data.nombre)
    }
    setCreandoInsumo(false)
    setShowNuevoInsumo(false)
    setNuevoNombre('')
  }

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
      forma_pago:     formaPago,
      registrado_por: user.id,
    })

    setLoading(false)
    if (error) { setError('Error al registrar compra'); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-mazul-cream w-full max-w-md rounded-t-3xl flex flex-col" style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="p-5 flex-shrink-0">
          <div className="w-10 h-1 bg-mazul-sand rounded-full mx-auto mb-5" />
          <h2 className="text-base font-medium text-mazul-bark mb-1">Registrar compra</h2>
          <p className="text-xs text-mazul-stone mb-5">El stock se actualiza automáticamente al guardar</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">

          {/* Búsqueda de insumo */}
          <div>
            <label className="input-label">Insumo comprado</label>
            <input
              className="input mb-2"
              placeholder="Buscar insumo..."
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setInsumoId('') }}
            />

            {/* Lista de resultados */}
            {busqueda && !insumoId && (
              <div className="bg-white border border-mazul-sand rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {insumosFiltrados.length === 0 ? (
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-mazul-stone mb-2">No encontrado — ¿lo creamos ahora?</p>
                    <button
                      type="button"
                      onClick={() => { setNuevoNombre(busqueda); setShowNuevoInsumo(true) }}
                      className="text-xs bg-mazul-moss text-mazul-cream px-3 py-1.5 rounded-lg font-medium"
                    >
                      + Crear "{busqueda}"
                    </button>
                  </div>
                ) : (
                  insumosFiltrados.slice(0, 6).map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => { setInsumoId(i.id); setBusqueda(i.nombre) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-mazul-mist border-b border-mazul-sand/40 last:border-0"
                    >
                      <p className="text-sm text-mazul-bark">{i.nombre}</p>
                      <p className="text-xs text-mazul-stone">{i.unidad} · stock: {Number(i.stock_actual).toFixed(2)}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Insumo seleccionado */}
            {insumoSel && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-emerald-800">{insumoSel.nombre}</p>
                  <p className="text-xs text-emerald-600">Stock actual: {Number(insumoSel.stock_actual).toFixed(2)} {insumoSel.unidad}</p>
                </div>
                <button type="button" onClick={() => { setInsumoId(''); setBusqueda('') }} className="text-emerald-400 text-lg">×</button>
              </div>
            )}
          </div>

          {/* Mini formulario para crear insumo nuevo */}
          {showNuevoInsumo && (
            <div className="bg-mazul-mist border border-mazul-sand rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-mazul-bark">Crear nuevo insumo</p>
              <div>
                <label className="input-label">Nombre</label>
                <input className="input" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre del insumo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Unidad</label>
                  <select className="input" value={nuevoUnidad} onChange={e => setNuevoUnidad(e.target.value)}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Categoría</label>
                  <select className="input" value={nuevoCat} onChange={e => setNuevoCat(e.target.value)}>
                    {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleCrearInsumo} disabled={creandoInsumo || !nuevoNombre.trim()} className="btn-primary py-2 text-xs">
                  {creandoInsumo ? 'Creando…' : 'Crear y seleccionar'}
                </button>
                <button type="button" onClick={() => setShowNuevoInsumo(false)} className="btn-secondary py-2 text-xs">Cancelar</button>
              </div>
            </div>
          )}

          {/* Botón para crear si no se está buscando */}
          {!busqueda && !showNuevoInsumo && (
            <button type="button" onClick={() => setShowNuevoInsumo(true)} className="text-xs text-mazul-moss font-medium">
              + Crear nuevo insumo
            </button>
          )}

          {/* Cantidad y precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Cantidad {insumoSel ? `(${insumoSel.unidad})` : ''}</label>
              <input className="input" type="number" min="0.01" step="0.01" placeholder="0" value={cantidad} onChange={e => setCantidad(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Precio total</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mazul-stone text-sm">$</span>
                <input className="input pl-8" type="number" min="0" step="0.01" placeholder="0.00" value={precio} onChange={e => setPrecio(e.target.value)} />
              </div>
            </div>
          </div>

          {costoUnit && (
            <div className="bg-mazul-mist rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-mazul-stone">Costo por {insumoSel?.unidad}</span>
              <span className="text-sm font-semibold text-mazul-bark">${costoUnit}</span>
            </div>
          )}

          {insumoSel && cantidad && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <p className="text-xs text-emerald-700 font-medium">Stock después de esta compra</p>
              <p className="text-base font-semibold text-emerald-800 mt-0.5">
                {(Number(insumoSel.stock_actual) + Number(cantidad)).toFixed(2)} {insumoSel.unidad}
              </p>
            </div>
          )}

          <div>
            <label className="input-label">Forma de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'efectivo',      label: '💵 Efectivo'      },
                { id: 'transferencia', label: '📲 Transferencia'  },
                { id: 'tarjeta',       label: '💳 Tarjeta'        },
                { id: 'credito',       label: '📋 Crédito/Fiado'  },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFormaPago(p.id)}
                  className={`py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                    formaPago === p.id
                      ? 'bg-mazul-moss text-mazul-cream border-mazul-moss'
                      : 'border-mazul-sand text-mazul-stone bg-white/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">Proveedor <span className="normal-case font-normal">(opcional)</span></label>
            <input className="input" placeholder="Ej. Mercado Central, Don Aurelio..." value={proveedor} onChange={e => setProveedor(e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <button type="button" onClick={handleSubmit} className="btn-primary" disabled={loading}>
            {loading ? 'Registrando…' : '✓ Registrar compra'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
