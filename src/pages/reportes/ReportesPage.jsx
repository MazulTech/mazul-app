import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'

function fechaLocal(date) {
  return date.toISOString().split('T')[0]
}

function primerDiaMes(date) {
  return fechaLocal(new Date(date.getFullYear(), date.getMonth(), 1))
}

function ultimoDiaMes(date) {
  return fechaLocal(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ReportesPage() {
  const hoy = new Date()
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes(hoy))
  const [fechaFin, setFechaFin]       = useState(fechaLocal(hoy))
  const [loading, setLoading]         = useState(true)
  const [stats, setStats]             = useState(null)
  const [ventasDia, setVentasDia]     = useState([])
  const [topPlatillos, setTopPlatillos] = useState([])
  const [topVillas, setTopVillas]     = useState([])
  const [bajoStock, setBajoStock]     = useState([])
  const [formasPago, setFormasPago]   = useState([])
  const [compras, setCompras]         = useState({ total: 0, items: [] })

  useEffect(() => { fetchReportes() }, [fechaInicio, fechaFin])

  // Atajos rápidos
  function setMesActual() {
    setFechaInicio(primerDiaMes(hoy))
    setFechaFin(fechaLocal(hoy))
  }

  function setMesAnterior() {
    const mesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    setFechaInicio(primerDiaMes(mesAnt))
    setFechaFin(ultimoDiaMes(mesAnt))
  }

  function setMes(offset) {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1)
    setFechaInicio(primerDiaMes(mes))
    setFechaFin(offset === 0 ? fechaLocal(hoy) : ultimoDiaMes(mes))
  }

  async function fetchReportes() {
    setLoading(true)
    const inicio = new Date(fechaInicio + 'T00:00:00').toISOString()
    const fin    = new Date(fechaFin    + 'T23:59:59').toISOString()

    const [
      { data: cuentasCerradas },
      { data: cargosData },
      { data: insumosData },
      { data: comprasData },
    ] = await Promise.all([
      supabase.from('cuentas').select('total_cobrado, forma_pago, nota_cierre, closed_at, nombre, tipo').eq('estado', 'cerrada').gte('closed_at', inicio).lte('closed_at', fin),
      supabase.from('cargos').select('cantidad, precio_unit, subtotal, created_at, platillos(nombre, emoji, costo_calculado), cuentas(nombre, tipo)').gte('created_at', inicio).lte('created_at', fin),
      supabase.from('insumos').select('*'),
      supabase.from('compras').select('cantidad, precio_total, created_at, insumos(nombre, unidad)').gte('created_at', inicio).lte('created_at', fin).order('created_at', { ascending: false }),
    ])

    const cuentas = cuentasCerradas ?? []
    const cargos  = cargosData ?? []
    const insumos = insumosData ?? []
    const comprasList = comprasData ?? []

    // KPIs
    const totalVentas  = cuentas.reduce((s, c) => s + Number(c.total_cobrado ?? 0), 0)
    const numCuentas   = cuentas.length
    const ticketProm   = numCuentas > 0 ? totalVentas / numCuentas : 0
    const totalCostos  = cargos.reduce((s, c) => s + (Number(c.cantidad) * Number(c.platillos?.costo_calculado ?? 0)), 0)
    const totalCompras = comprasList.reduce((s, c) => s + Number(c.precio_total ?? 0), 0)
    const rentabilidad = totalVentas > 0 ? ((totalVentas - totalCostos) / totalVentas * 100).toFixed(1) : 0

    setStats({ totalVentas, numCuentas, ticketProm, totalCostos, totalCompras, rentabilidad })

    // Ventas por día
    const porDia = {}
    cuentas.forEach(c => {
      const dia = new Date(c.closed_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
      porDia[dia] = (porDia[dia] || 0) + Number(c.total_cobrado ?? 0)
    })
    setVentasDia(Object.entries(porDia).map(([dia, total]) => ({ dia, total })))

    // Formas de pago (con mixtos parseados)
    const mapaFP = {}
    const labelPago = { efectivo: '💵 Efectivo', tarjeta: '💳 Tarjeta', transferencia: '📲 Transferencia', a_la_villa: '🏡 A la villa' }
    const mapaNombres = { 'Efectivo': 'efectivo', 'Tarjeta': 'tarjeta', 'Transferencia': 'transferencia', 'A la villa': 'a_la_villa' }
    cuentas.forEach(c => {
      const fp    = c.forma_pago ?? 'sin_registrar'
      const monto = Number(c.total_cobrado ?? 0)
      if (fp === 'mixto' && c.nota_cierre) {
        let encontrado = false
        Object.entries(mapaNombres).forEach(([label, key]) => {
          const match = c.nota_cierre.match(new RegExp(label + ':\\s*\\$([\\d,]+)'))
          if (match) { mapaFP[key] = (mapaFP[key] || 0) + Number(match[1].replace(',', '')); encontrado = true }
        })
        if (!encontrado) mapaFP['mixto'] = (mapaFP['mixto'] || 0) + monto
      } else {
        mapaFP[fp] = (mapaFP[fp] || 0) + monto
      }
    })
    setFormasPago(Object.entries(mapaFP).map(([fp, total]) => ({ fp, label: labelPago[fp] ?? fp.replace('_',' '), total })).sort((a,b) => b.total - a.total))

    // Top platillos
    const mapaPlatillos = {}
    cargos.forEach(c => {
      const nombre = c.platillos?.nombre ?? 'Desconocido'
      const emoji  = c.platillos?.emoji  ?? '🍽️'
      if (!mapaPlatillos[nombre]) mapaPlatillos[nombre] = { nombre, emoji, unidades: 0, ingresos: 0 }
      mapaPlatillos[nombre].unidades += c.cantidad
      mapaPlatillos[nombre].ingresos += Number(c.subtotal)
    })
    setTopPlatillos(Object.values(mapaPlatillos).sort((a,b) => b.unidades - a.unidades).slice(0,8))

    // Top villas
    const mapaVillas = {}
    cuentas.forEach(c => {
      if (!mapaVillas[c.nombre]) mapaVillas[c.nombre] = { nombre: c.nombre, tipo: c.tipo, total: 0, visitas: 0 }
      mapaVillas[c.nombre].total   += Number(c.total_cobrado ?? 0)
      mapaVillas[c.nombre].visitas += 1
    })
    setTopVillas(Object.values(mapaVillas).sort((a,b) => b.total - a.total).slice(0,6))

    // Compras del periodo
    const mapaCompras = {}
    comprasList.forEach(c => {
      const nombre = c.insumos?.nombre ?? 'Desconocido'
      if (!mapaCompras[nombre]) mapaCompras[nombre] = { nombre, unidad: c.insumos?.unidad, total: 0, cantidad: 0 }
      mapaCompras[nombre].total    += Number(c.precio_total ?? 0)
      mapaCompras[nombre].cantidad += Number(c.cantidad)
    })
    setCompras({ total: totalCompras, items: Object.values(mapaCompras).sort((a,b) => b.total - a.total) })

    setBajoStock(insumos.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo) && Number(i.stock_minimo) > 0))
    setLoading(false)
  }

  const maxVenta = Math.max(...ventasDia.map(d => d.total), 1)
  const diasLabel = Math.ceil((new Date(fechaFin) - new Date(fechaInicio)) / (1000 * 60 * 60 * 24)) + 1

  return (
    <div className="pb-24">
      <AppHeader title="Reportes" subtitle="Dashboard del dueño" />

      {/* Selector de periodo */}
      <div className="bg-white border-b border-mazul-sand/60 px-4 py-3 space-y-3">
        {/* Atajos de mes */}
        <div className="flex gap-2 overflow-x-auto">
          {[-2,-1,0].map(offset => {
            const mes = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1)
            const esActivo = primerDiaMes(mes) === fechaInicio && (offset === 0 ? true : ultimoDiaMes(mes) === fechaFin)
            return (
              <button
                key={offset}
                onClick={() => setMes(offset)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  esActivo ? 'bg-mazul-moss text-mazul-cream' : 'bg-mazul-mist text-mazul-stone'
                }`}
              >
                {MESES[mes.getMonth()]} {mes.getFullYear()}
              </button>
            )
          })}
          <button
            onClick={() => { setFechaInicio(fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth()-2, 1))); setFechaFin(fechaLocal(hoy)) }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-mazul-mist text-mazul-stone"
          >
            Últimos 90d
          </button>
        </div>

        {/* Fechas personalizadas */}
        <div className="flex items-center gap-2">
          <input type="date" value={fechaInicio} max={fechaFin} onChange={e => setFechaInicio(e.target.value)}
            className="flex-1 text-xs text-mazul-bark bg-mazul-mist border border-mazul-sand rounded-lg px-3 py-2 outline-none focus:border-mazul-moss" />
          <span className="text-xs text-mazul-stone">→</span>
          <input type="date" value={fechaFin} min={fechaInicio} max={fechaLocal(hoy)} onChange={e => setFechaFin(e.target.value)}
            className="flex-1 text-xs text-mazul-bark bg-mazul-mist border border-mazul-sand rounded-lg px-3 py-2 outline-none focus:border-mazul-moss" />
        </div>
        <p className="text-[10px] text-mazul-stone">{diasLabel} días seleccionados</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-mazul-stone text-sm">Cargando datos…</div>
      ) : (
        <div className="px-4 pt-4 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <KPICard label="Ventas totales" value={`$${(stats.totalVentas/1000).toFixed(1)}k`} color="text-mazul-moss" sub={`${stats.numCuentas} cuentas`} />
            <KPICard label="Ticket promedio" value={`$${stats.ticketProm.toFixed(0)}`} sub="por cuenta" />
            <KPICard label="Compras / insumos" value={`$${(stats.totalCompras/1000).toFixed(1)}k`} color="text-mazul-amber" sub="gasto en cocina" />
            <KPICard label="Rentabilidad" value={`${stats.rentabilidad}%`} color={Number(stats.rentabilidad) >= 60 ? 'text-emerald-600' : 'text-amber-600'} sub="margen bruto" />
          </div>

          {/* Balance ventas vs compras */}
          {stats.totalCompras > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Ventas vs Compras</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-mazul-bark">💰 Ventas</span>
                    <span className="text-xs font-medium">${stats.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="h-2 bg-mazul-sand rounded-full overflow-hidden">
                    <div className="h-full bg-mazul-moss rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-mazul-bark">🛒 Compras</span>
                    <span className="text-xs font-medium">${stats.totalCompras.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="h-2 bg-mazul-sand rounded-full overflow-hidden">
                    <div className="h-full bg-mazul-amber rounded-full" style={{ width: `${Math.min(100, (stats.totalCompras / stats.totalVentas) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-3 bg-mazul-mist rounded-lg px-3 py-2 flex justify-between">
                <span className="text-xs text-mazul-stone">Diferencia</span>
                <span className={`text-sm font-semibold ${stats.totalVentas - stats.totalCompras >= 0 ? 'text-mazul-moss' : 'text-red-600'}`}>
                  ${(stats.totalVentas - stats.totalCompras).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}

          {/* Gráfica de ventas por día */}
          {ventasDia.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Ventas por día</p>
              <div className="flex items-end gap-0.5 h-20">
                {ventasDia.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-mazul-moss rounded-t-sm" style={{ height: `${Math.max(2, (d.total / maxVenta) * 72)}px` }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-mazul-stone">
                <span>{ventasDia[0]?.dia}</span>
                <span>Mejor: ${Math.max(...ventasDia.map(d=>d.total)).toLocaleString('es-MX',{minimumFractionDigits:0})}</span>
                <span>{ventasDia[ventasDia.length-1]?.dia}</span>
              </div>
            </div>
          )}

          {/* Formas de pago */}
          {formasPago.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Por forma de pago</p>
              <div className="space-y-2">
                {formasPago.map(({ fp, label, total }) => {
                  const pct = stats.totalVentas > 0 ? (total / stats.totalVentas * 100) : 0
                  return (
                    <div key={fp}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-mazul-bark">{label}</span>
                        <span className="text-xs font-medium">${total.toLocaleString('es-MX',{minimumFractionDigits:0})} · {pct.toFixed(0)}%</span>
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
                    <span className="text-xs font-bold text-mazul-stone/40 w-4">{i+1}</span>
                    <span className="text-lg">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-mazul-bark truncate">{p.nombre}</p>
                      <p className="text-xs text-mazul-stone">{p.unidades} porciones</p>
                    </div>
                    <span className="text-sm font-semibold text-mazul-bark">${p.ingresos.toLocaleString('es-MX',{minimumFractionDigits:0})}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top villas */}
          {topVillas.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Clientes que más consumen</p>
              <div className="space-y-2">
                {topVillas.map((v, i) => (
                  <div key={v.nombre} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-mazul-stone/40 w-4">{i+1}</span>
                    <span className="text-base">{v.tipo==='villa'?'🏡':'👤'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-mazul-bark truncate">{v.nombre}</p>
                      <p className="text-xs text-mazul-stone">{v.visitas} {v.visitas===1?'visita':'visitas'}</p>
                    </div>
                    <span className="text-sm font-semibold text-mazul-bark">${v.total.toLocaleString('es-MX',{minimumFractionDigits:0})}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compras del periodo */}
          {compras.items.length > 0 && (
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="section-title mb-0">🛒 Compras del periodo</p>
                <span className="text-sm font-semibold text-mazul-amber">${compras.total.toLocaleString('es-MX',{minimumFractionDigits:0})}</span>
              </div>
              <div className="space-y-2">
                {compras.items.map(c => (
                  <div key={c.nombre} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-mazul-bark">{c.nombre}</p>
                      <p className="text-xs text-mazul-stone">{c.cantidad.toFixed(2)} {c.unidad}</p>
                    </div>
                    <span className="text-sm font-medium text-mazul-bark">${Number(c.total).toLocaleString('es-MX',{minimumFractionDigits:0})}</span>
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

          {stats.numCuentas === 0 && (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-mazul-stone text-sm">Sin datos en este periodo</p>
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
