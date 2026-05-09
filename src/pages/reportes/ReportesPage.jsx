import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'

export default function ReportesPage() {
  const [stats, setStats] = useState(null)
  const [topPlatillos, setTopPlatillos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReportes() }, [])

  async function fetchReportes() {
    setLoading(true)

    // Ventas últimos 30 días
    const desde = new Date()
    desde.setDate(desde.getDate() - 30)

    const [{ data: cuentasCerradas }, { data: cargosTop }] = await Promise.all([
      supabase
        .from('cuentas')
        .select('total_cobrado, forma_pago')
        .eq('estado', 'cerrada')
        .gte('closed_at', desde.toISOString()),
      supabase
        .from('cargos')
        .select('cantidad, precio_unit, platillos(nombre, emoji)')
        .gte('created_at', desde.toISOString()),
    ])

    const lista = cuentasCerradas ?? []
    const totalMes = lista.reduce((s, c) => s + Number(c.total_cobrado ?? 0), 0)
    const ticketProm = lista.length > 0 ? totalMes / lista.length : 0

    // Agrupar top platillos
    const mapa = {}
    for (const cargo of cargosTop ?? []) {
      const nombre = cargo.platillos?.nombre ?? 'Desconocido'
      const emoji  = cargo.platillos?.emoji ?? '🍽️'
      if (!mapa[nombre]) mapa[nombre] = { nombre, emoji, unidades: 0, ingresos: 0 }
      mapa[nombre].unidades += cargo.cantidad
      mapa[nombre].ingresos += cargo.cantidad * Number(cargo.precio_unit)
    }
    const top = Object.values(mapa)
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 6)

    setStats({ total: totalMes, cuentas: lista.length, ticket: ticketProm })
    setTopPlatillos(top)
    setLoading(false)
  }

  return (
    <div className="pb-24">
      <AppHeader title="Reportes" subtitle="Últimos 30 días" />

      <div className="px-4 pt-4">
        {loading ? (
          <div className="text-center py-12 text-mazul-stone text-sm">Cargando…</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <StatCard label="Ventas 30d" value={`$${(stats.total/1000).toFixed(1)}k`} color="text-mazul-moss" />
              <StatCard label="Cuentas" value={stats.cuentas} />
              <StatCard label="Ticket prom." value={`$${stats.ticket.toFixed(0)}`} />
            </div>

            {/* Top platillos */}
            <p className="section-title">Platillos más pedidos</p>
            <div className="space-y-2 mb-5">
              {topPlatillos.length === 0 ? (
                <p className="text-sm text-mazul-stone text-center py-4">Sin datos aún</p>
              ) : topPlatillos.map((p, i) => (
                <div key={p.nombre} className="card-compact flex items-center gap-3">
                  <span className="text-xs font-bold text-mazul-stone/50 w-4">{i + 1}</span>
                  <span className="text-xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-mazul-bark truncate">{p.nombre}</p>
                    <p className="text-xs text-mazul-stone">{p.unidades} unidades</p>
                  </div>
                  <span className="text-sm font-semibold text-mazul-bark">
                    ${p.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Próximamente */}
            <div className="card p-4 text-center border-dashed border-mazul-sand">
              <p className="text-2xl mb-2">📊</p>
              <p className="text-sm text-mazul-stone">Gráficas de ventas por semana y consumo por villa próximamente</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-mazul-bark' }) {
  return (
    <div className="card p-3 text-center">
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] text-mazul-stone leading-tight mt-0.5">{label}</p>
    </div>
  )
}
