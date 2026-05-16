import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'
import { useAuth } from '../../context/AuthContext'
import NuevoInsumoModal from './NuevoInsumoModal'
import NuevoCompraModal from './NuevoCompraModal'

const CATS = [
  { key: 'materia_prima',   label: '🥩 Materia prima'    },
  { key: 'bebidas',         label: '🍺 Bebidas'           },
  { key: 'enlatados_secos', label: '🥫 Enlatados / secos' },
  { key: 'servicios',       label: '⚡ Servicios'         },
  { key: 'limpieza',        label: '🧹 Limpieza'          },
  { key: 'otros',           label: '📦 Otros'             },
]

const LABEL_PAGO = { efectivo: '💵', transferencia: '📲', tarjeta: '💳', credito: '📋' }

export default function InventarioPage() {
  const { isDueno } = useAuth()
  const [insumos, setInsumos]           = useState([])
  const [compras, setCompras]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadingCompras, setLoadingCompras] = useState(false)
  const [tab, setTab]                   = useState('stock')
  const [catActiva, setCatActiva]       = useState('todos')
  const [showInsumo, setShowInsumo]     = useState(false)
  const [showCompra, setShowCompra]     = useState(false)
  const [editInsumo, setEditInsumo]     = useState(null)
  const [confirmBorrar, setConfirmBorrar] = useState(null)
  const [borrando, setBorrando]         = useState(null)

  useEffect(() => { fetchInsumos() }, [])
  useEffect(() => { if (tab === 'compras') fetchCompras() }, [tab])

  async function fetchInsumos() {
    setLoading(true)
    const { data } = await supabase.from('insumos').select('*').order('categoria').order('nombre')
    setInsumos(data ?? [])
    setLoading(false)
  }

  async function fetchCompras() {
    setLoadingCompras(true)
    const { data } = await supabase
      .from('compras')
      .select('*, insumos(nombre, unidad), registrado:profiles!compras_registrado_por_fkey(nombre)')
      .order('created_at', { ascending: false })
      .limit(50)
    setCompras(data ?? [])
    setLoadingCompras(false)
  }

  async function handleBorrarCompra(compra) {
    setBorrando(compra.id)
    await supabase.from('compras').delete().eq('id', compra.id)
    setBorrando(null)
    setConfirmBorrar(null)
    fetchCompras()
    fetchInsumos()
  }

  const bajos    = insumos.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0)
  const filtrados = catActiva === 'todos' ? insumos : insumos.filter(i => i.categoria === catActiva)
  const bajosFiltrados    = filtrados.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0)
  const normalesFiltrados = filtrados.filter(i => Number(i.stock_actual) > Number(i.stock_minimo) || Number(i.stock_minimo) === 0)

  return (
    <div className="pb-24">
      <AppHeader
        title="Inventario"
        subtitle={`${insumos.length} insumos · ${bajos.length} alertas`}
        action={isDueno && (
          <div className="flex gap-2">
            <button onClick={() => setShowCompra(true)} className="text-xs bg-mazul-amber text-white px-3 py-1.5 rounded-lg font-medium">+ Compra</button>
            <button onClick={() => setShowInsumo(true)} className="text-xs bg-mazul-moss text-mazul-cream px-3 py-1.5 rounded-lg font-medium">+ Insumo</button>
          </div>
        )}
      />

      {/* Tabs */}
      <div className="flex border-b border-mazul-sand/60 bg-white sticky top-[57px] z-30">
        {[
          { key: 'stock',   label: '📦 Stock' },
          { key: 'alertas', label: `⚠️ Alertas${bajos.length > 0 ? ` (${bajos.length})` : ''}` },
          { key: 'compras', label: '🛒 Compras' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? 'border-mazul-moss text-mazul-moss' : 'border-transparent text-mazul-stone'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtro por categoría — solo en stock */}
      {tab === 'stock' && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-mazul-sand/40">
          <button onClick={() => setCatActiva('todos')}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${catActiva === 'todos' ? 'bg-mazul-moss text-mazul-cream' : 'bg-mazul-mist text-mazul-stone'}`}>
            Todos
          </button>
          {CATS.map(c => (
            <button key={c.key} onClick={() => setCatActiva(c.key)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${catActiva === c.key ? 'bg-mazul-moss text-mazul-cream' : 'bg-mazul-mist text-mazul-stone'}`}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pt-4 space-y-2">
        {/* TAB STOCK */}
        {tab === 'stock' && (
          loading ? (
            <div className="text-center py-12 text-mazul-stone text-sm">Cargando…</div>
          ) : (
            <>
              {bajosFiltrados.length > 0 && (
                <>
                  <p className="section-title text-red-500">⚠️ Stock bajo</p>
                  {bajosFiltrados.map(i => <InsumoRow key={i.id} insumo={i} alerta onEdit={() => setEditInsumo(i)} isDueno={isDueno} />)}
                  <p className="section-title mt-4">Stock normal</p>
                </>
              )}
              {normalesFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📦</p>
                  <p className="text-sm text-mazul-stone">Sin insumos en esta categoría</p>
                  {isDueno && <button onClick={() => setShowInsumo(true)} className="mt-3 text-xs bg-mazul-moss text-mazul-cream px-4 py-2 rounded-lg font-medium">+ Agregar insumo</button>}
                </div>
              ) : normalesFiltrados.map(i => <InsumoRow key={i.id} insumo={i} onEdit={() => setEditInsumo(i)} isDueno={isDueno} />)}
            </>
          )
        )}

        {/* TAB ALERTAS */}
        {tab === 'alertas' && (
          bajos.length === 0 ? (
            <div className="text-center py-12"><p className="text-4xl mb-3">✅</p><p className="text-mazul-stone text-sm">Todo el stock está bien</p></div>
          ) : bajos.map(i => <InsumoRow key={i.id} insumo={i} alerta onEdit={() => setEditInsumo(i)} isDueno={isDueno} />)
        )}

        {/* TAB COMPRAS */}
        {tab === 'compras' && (
          loadingCompras ? (
            <div className="text-center py-12 text-mazul-stone text-sm">Cargando…</div>
          ) : compras.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🛒</p>
              <p className="text-sm text-mazul-stone">Sin compras registradas</p>
            </div>
          ) : compras.map(c => (
            <div key={c.id} className={`card p-3 ${confirmBorrar?.id === c.id ? 'border-red-200 bg-red-50/30' : ''}`}>
              {confirmBorrar?.id === c.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-700">¿Borrar esta compra?</p>
                  <p className="text-xs text-mazul-stone">
                    {c.insumos?.nombre} · {Number(c.cantidad).toFixed(2)} {c.insumos?.unidad}
                    {c.precio_total ? ` · $${Number(c.precio_total).toLocaleString('es-MX')}` : ''}
                  </p>
                  <p className="text-xs text-amber-600">⚠️ El stock se revertirá automáticamente</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleBorrarCompra(c)} disabled={borrando === c.id}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-medium">
                      {borrando === c.id ? 'Borrando…' : 'Sí, borrar'}
                    </button>
                    <button onClick={() => setConfirmBorrar(null)} className="flex-1 py-2 border border-mazul-sand text-mazul-stone rounded-lg text-xs">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-mazul-bark">{c.insumos?.nombre ?? 'Insumo eliminado'}</p>
                    <p className="text-xs text-mazul-stone">
                      {Number(c.cantidad).toFixed(2)} {c.insumos?.unidad}
                      {c.precio_total ? ` · $${Number(c.precio_total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}` : ''}
                      {c.forma_pago ? ` · ${LABEL_PAGO[c.forma_pago] ?? ''} ${c.forma_pago}` : ''}
                    </p>
                    <p className="text-xs text-mazul-stone/60">
                      {new Date(c.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      {' · '}{new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      {c.registrado?.nombre ? ` · ${c.registrado.nombre}` : ''}
                      {c.proveedor ? ` · ${c.proveedor}` : ''}
                    </p>
                  </div>
                  {isDueno && (
                    <button onClick={() => setConfirmBorrar(c)}
                      className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-sm flex-shrink-0">
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showInsumo && <NuevoInsumoModal onClose={() => setShowInsumo(false)} onSaved={() => { setShowInsumo(false); fetchInsumos() }} />}
      {editInsumo && <NuevoInsumoModal insumo={editInsumo} onClose={() => setEditInsumo(null)} onSaved={() => { setEditInsumo(null); fetchInsumos() }} />}
      {showCompra && <NuevoCompraModal insumos={insumos} onClose={() => setShowCompra(false)} onSaved={() => { setShowCompra(false); fetchInsumos(); if (tab === 'compras') fetchCompras() }} />}
    </div>
  )
}

function InsumoRow({ insumo: i, alerta, onEdit, isDueno }) {
  const stock   = Number(i.stock_actual)
  const minimo  = Number(i.stock_minimo)
  const pct     = minimo > 0 ? Math.min(100, (stock / minimo) * 100) : 100
  const barColor = alerta ? 'bg-red-400' : pct < 150 ? 'bg-amber-400' : 'bg-mazul-moss'
  const catEmoji = { materia_prima: '🥩', bebidas: '🍺', enlatados_secos: '🥫', servicios: '⚡', limpieza: '🧹', otros: '📦' }

  return (
    <div className={`card p-3 ${alerta ? 'border-red-200 bg-red-50/20' : ''} ${isDueno ? 'cursor-pointer active:bg-mazul-mist' : ''}`}
      onClick={isDueno ? onEdit : undefined}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{catEmoji[i.categoria] ?? '📦'}</span>
            <p className="text-sm font-medium text-mazul-bark truncate">{i.nombre}</p>
          </div>
          <p className="text-xs text-mazul-stone">
            {i.precio_unitario > 0 ? `$${Number(i.precio_unitario).toFixed(2)} / ${i.unidad}` : <span className="text-amber-500">sin precio aún</span>}
          </p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className={`text-base font-semibold ${alerta ? 'text-red-600' : 'text-mazul-bark'}`}>
            {stock.toFixed(2)} {i.unidad}
          </p>
          {minimo > 0 && <p className="text-xs text-mazul-stone">mín. {minimo} {i.unidad}</p>}
        </div>
      </div>
      {minimo > 0 && (
        <div className="h-1.5 bg-mazul-sand rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
