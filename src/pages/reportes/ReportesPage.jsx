import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'

const PERIODOS = [
  { key: '7',  label: '7 días'  },
  { key: '30', label: '30 días' },
  { key: '90', label: '90 días' },
]

export default function ReportesPage() {
  const [periodo, setPeriodo]       = useState('30')
  const [loading, setLoading]       = useState(true)
  const [stats, setStats]           = useState(null)
  const [ventasDia, setVentasDia]   = useState([])
  const [topPlatillos, setTopPlatillos] = useState([])
  const [topVillas, setTopVillas]   = useState([])
  const [bajoStock, setBajoStock]   = useState([])
  const [formasPago, setFormasPago] = useState([])

  useEffect(() => { fetchReportes() }, [periodo])

  async function fetchReportes() {
    setLoading(true)
    const desde = new Date()
    desde.setDate(desde.getDate() - Number(periodo))
    const desdeISO = desde.toISOString()

    const [
      { data: cuentasCerradas },
      { data: cargosData },
      { data: insumosData },
    ] = await Promise.all([
      supabase.from('cuentas').select('total_cobrado, forma_pago, closed_at, nombre, tipo').eq('estado', 'cerrada').gte('closed_at', desdeISO),
      supabase.from('cargos').select('cantidad, precio_unit, subtotal, created_at, platillos(nombre, emoji, costo_calculado), cuentas(nombre, tipo)').gte('created_at', desdeISO),
      supabase.from('insumos').select('*'),
    ])

    const cuentas = cuentasCerradas ?? []
    const cargos  = cargosData ?? []
    const insumos = insumosData ?? []

    // KPIs principales
    const totalVentas  = cuentas.reduce((s, c) => s + Number(c.total_cobrado ?? 0), 0)
    const numCuentas   = cuentas.length
    const ticketProm   = numCuentas > 0 ? totalVentas / numCuentas : 0
    const totalCostos  = cargos.reduce((s, c) => s + (Number(c.cantidad) * Number(c.platillos?.costo_calculado ?? 0)), 0)
    const rentabilidad = totalVentas > 0 ? ((totalVentas - totalCostos) / totalVentas * 100).toFixed(1) : 0

    setStats({ totalVentas, numCuentas, ticketProm, totalCostos, rentabilidad })

    // Ventas por día
    const porDia = {}
    cuentas.forEach(c => {
      const dia = new Date(c.closed_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
      porDia[dia] = (porDia[dia] || 0) + Number(c.total_cobrado ?? 0)
    })
    const diasOrdenados = Object.entries(porDia)
      .slice(-14)
      .map(([dia, total]) => ({ dia, total }))
    setVentasDia(diasOrdenados)

    // Top platillos
    const mapaPlatillos = {}
    cargos.forEach(c => {
      const nombre = c.platillos?.nombre ?? 'Desconocido'
      const emoji  = c.platillos?.emoji  ?? '🍽️'
      if (!mapaPlatillos[nombre]) mapaPlatillos[nombre] = { nombre, emoji, unidades: 0, ingresos: 0 }
      mapaPlatillos[nombre].unidades += c.cantidad
      mapaPlatillos[nombre].ingresos += Number(c.subtotal)
    })
    setTopPlatillos(Object.values(mapaPlatillos).sort((a, b) => b.unidades - a.unidades).slice(0, 8))

    // Top villas
    const mapaVillas = {}
    cuentas.forEach(c => {
      const nombre = c.nombre
      if (!mapaVillas[nombre]) mapaVillas[nombre] = { nombre, tipo: c.tipo, total: 0, visitas: 0 }
      mapaVillas[nombre].total   += Number(c.total_cobrado ?? 0)
      mapaVillas[nombre].visitas += 1
    })
    setTopVillas(Object.values(mapaVillas).sort((a, b) => b.total - a.total).slice(0, 6))

    // Formas de pago
    const mapaFP = {}
    cuentas.forEach(c => {
      const fp = c.forma_pago ?? 'sin_registrar'
      mapaFP[fp] = (mapaFP[fp] || 0) + Number(c.total_cobrado ?? 0)
    })
    setFormasPago(Object.entries(mapaFP).map(([fp, total]) => ({ fp, total })).sort((a, b) => b.total - a.total))

    // Insumos bajo stock
    setBajoStock(insumos.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0))

    setLoading(false)
  }

  const maxVenta = Math.max(...ventasDia.map(d => d.total), 1)

  return (
    <div className="pb-24">
      <AppHeader title="Reportes" subtitle="Dashboard del dueño" />

      {/* Selector de periodo */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-mazul-sand/60">
        {PERIODOS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              periodo === p.key ? 'bg-mazul-moss text-mazul-cream' : 'bg-mazul-mist text-mazul-stone'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-mazul-stone text-sm">Cargando datos…</div>
      ) : (
        <div className="px-4 pt-4 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <KPICard label="Ventas totales" value={`$${(stats.totalVentas/1000).toFixed(1)}k`} color="text-mazul-moss" sub={`${stats.numCuentas} cuentas`} />
            <KPICard label="Ticket promedio" value={`$${stats.ticketProm.toFixed(0)}`} sub="por cuenta" />
            <KPICard label="Costo de recetas" value={`$${(stats.totalCostos/1000).toFixed(1)}k`} sub="consumo estimado" />
            <KPICard label="Rentabilidad" value={`${stats.rentabilidad}%`} color={Number(stats.rentabilidad) >= 60 ? 'text-emerald-600' : 'text-amber-600'} sub="margen bruto" />
          </div>

          {/* Gráfica de ventas por día */}
          {ventasDia.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Ventas por día</p>
              <div className="flex items-end gap-1 h-24">
                {ventasDia.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-mazul-moss rounded-t-sm"
                      style={{ height: `${Math.max(4, (d.total / maxVenta) * 80)}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1 mt-1">
                {ventasDia.map((d, i) => (
                  <div key={i} className="flex-1 text-center">
                    <p className="text-[8px] text-mazul-stone truncate">{d.dia.split(' ')[1]}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between">
                <p className="text-xs text-mazul-stone">
                  Mejor día: <span className="font-medium text-mazul-bark">
                    ${Math.max(...ventasDia.map(d => d.total)).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </span>
                </p>
                <p className="text-xs text-mazul-stone">
                  Promedio: <span className="font-medium text-mazul-bark">
                    ${(ventasDia.reduce((s, d) => s + d.total, 0) / ventasDia.length).toFixed(0)}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Formas de pago */}
          {formasPago.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Por forma de pago</p>
              <div className="space-y-2">
                {formasPago.map(({ fp, total }) => {
                  const pct = stats.totalVentas > 0 ? (total / stats.totalVentas * 100) : 0
                  return (
                    <div key={fp}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-mazul-bark capitalize">{fp.replace('_', ' ')}</span>
                        <span className="text-xs font-medium text-mazul-bark">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-mazul-sand rounded-full overflow-hidden">
                        <div className="h-full bg-mazul-moss rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top platillos */}
          {topPlatillos.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Platillos más vendidos</p>
              <div className="space-y-2">
                {topPlatillos.map((p, i) => (
                  <div key={p.nombre} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-mazul-stone/40 w-4">{i + 1}</span>
                    <span className="text-lg">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-mazul-bark truncate">{p.nombre}</p>
                      <p className="text-xs text-mazul-stone">{p.unidades} porciones</p>
                    </div>
                    <span className="text-sm font-semibold text-mazul-bark flex-shrink-0">
                      ${p.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top villas/clientes */}
          {topVillas.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Clientes que más consumen</p>
              <div className="space-y-2">
                {topVillas.map((v, i) => (
                  <div key={v.nombre} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-mazul-stone/40 w-4">{i + 1}</span>
                    <span className="text-base">{v.tipo === 'villa' ? '🏡' : '👤'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-mazul-bark truncate">{v.nombre}</p>
                      <p className="text-xs text-mazul-stone">{v.visitas} {v.visitas === 1 ? 'visita' : 'visitas'}</p>
                    </div>
                    <span className="text-sm font-semibold text-mazul-bark flex-shrink-0">
                      ${v.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alertas de stock */}
          {bajoStock.length > 0 && (
            <div className="card p-4 border-red-200">
              <p className="section-title text-red-500 mb-3">⚠️ Insumos bajo mínimo</p>
              <div className="space-y-2">
                {bajoStock.map(i => (
                  <div key={i.id} className="flex items-center justify-between">
                    <p className="text-sm text-mazul-bark">{i.nombre}</p>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{Number(i.stock_actual).toFixed(2)} {i.unidad}</p>
                      <p className="text-xs text-mazul-stone">mín. {Number(i.stock_minimo).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sin datos */}
          {stats.numCuentas === 0 && (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-mazul-stone text-sm">Sin datos en este periodo</p>
              <p className="text-xs text-mazul-stone/60 mt-1">Cierra cuentas para ver reportes</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, color = 'text-mazul-bark', sub }) {
  return (
    <div className="card p-4">
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-mazul-bark mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-mazul-stone mt-0.5">{sub}</p>}
    </div>
  )
}
