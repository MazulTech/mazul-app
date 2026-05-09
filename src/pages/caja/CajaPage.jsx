import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'

export default function CajaPage() {
  const [resumen, setResumen] = useState({ total: 0, cuentas: 0, ticket: 0 })
  const [cierres, setCierres] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCaja() }, [])

  async function fetchCaja() {
    setLoading(true)
    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    const { data } = await supabase
      .from('cuentas')
      .select('*, cargos(subtotal)')
      .eq('estado', 'cerrada')
      .gte('closed_at', inicio)
      .order('closed_at', { ascending: false })

    const lista = data ?? []
    const total = lista.reduce((s, c) => s + Number(c.total_cobrado ?? 0), 0)

    setResumen({
      total,
      cuentas: lista.length,
      ticket: lista.length > 0 ? total / lista.length : 0,
    })
    setCierres(lista)
    setLoading(false)
  }

  const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="pb-24">
      <AppHeader title="Caja del día" subtitle={hoy} />

      {/* Resumen */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricCard label="Total del día" value={`$${resumen.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`} color="text-mazul-moss" />
          <MetricCard label="Cuentas cerradas" value={resumen.cuentas} />
          <MetricCard label="Ticket promedio" value={`$${resumen.ticket.toFixed(0)}`} />
        </div>

        {/* Forma de pago breakdown */}
        <div className="card p-4 mb-4">
          <p className="section-title">Por forma de pago</p>
          {['efectivo', 'tarjeta', 'transferencia', 'a_la_villa'].map(fp => {
            const subtotal = cierres
              .filter(c => c.forma_pago === fp)
              .reduce((s, c) => s + Number(c.total_cobrado ?? 0), 0)
            if (subtotal === 0) return null
            return (
              <div key={fp} className="flex justify-between items-center py-2 border-b border-mazul-sand/40 last:border-0">
                <span className="text-sm text-mazul-bark capitalize">{fp.replace('_', ' ')}</span>
                <span className="text-sm font-medium text-mazul-bark">
                  ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
            )
          })}
          {cierres.length === 0 && (
            <p className="text-xs text-mazul-stone text-center py-2">Sin cierres hoy</p>
          )}
        </div>

        {/* Últimos cierres */}
        <p className="section-title">Cierres de hoy</p>
        {loading ? (
          <div className="text-center py-8 text-mazul-stone text-sm">Cargando…</div>
        ) : cierres.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🌿</p>
            <p className="text-sm text-mazul-stone">Aún no hay cierres hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cierres.map(c => (
              <div key={c.id} className="card-compact flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-mazul-bark">{c.nombre}</p>
                  <p className="text-xs text-mazul-stone">
                    {new Date(c.closed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    <span className="capitalize">{c.forma_pago?.replace('_', ' ')}</span>
                  </p>
                </div>
                <span className="text-sm font-semibold text-mazul-moss">
                  ${Number(c.total_cobrado).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, color = 'text-mazul-bark' }) {
  return (
    <div className="card p-3 text-center">
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] text-mazul-stone leading-tight mt-0.5">{label}</p>
    </div>
  )
}
