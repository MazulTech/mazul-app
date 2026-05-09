import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'

const EMOJI = { villa: '🏡', externo: '👤' }

export default function CuentasPage() {
  const [cuentas, setCuentas] = useState([])
  const [tab, setTab]         = useState('villas')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCuentas() }, [])

  async function fetchCuentas() {
    setLoading(true)
    const { data } = await supabase
      .from('cuentas_activas')
      .select('*')
      .order('created_at', { ascending: false })
    setCuentas(data ?? [])
    setLoading(false)
  }

  const filtradas = cuentas.filter(c =>
    tab === 'villas' ? c.tipo === 'villa' : c.tipo === 'externo'
  )

  return (
    <div className="pb-24">
      <AppHeader
        title="Cuentas abiertas"
        subtitle={`${cuentas.filter(c=>c.tipo==='villa').length} villas · ${cuentas.filter(c=>c.tipo==='externo').length} externos`}
        action={
          <button className="text-xs bg-mazul-moss text-mazul-cream px-3 py-1.5 rounded-lg font-medium">
            + Cuenta
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-mazul-sand/60 bg-white sticky top-[57px] z-30">
        {['villas','externos'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-mazul-moss text-mazul-moss'
                : 'border-transparent text-mazul-stone'
            }`}
          >
            {t === 'villas' ? '🏡 Villas' : '👤 Externos'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-mazul-stone text-sm">Cargando…</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-mazul-stone text-sm">No hay cuentas abiertas</p>
          </div>
        ) : (
          filtradas.map(c => <CuentaCard key={c.id} cuenta={c} onRefresh={fetchCuentas} />)
        )}
      </div>
    </div>
  )
}

function CuentaCard({ cuenta, onRefresh }) {
  const dias = cuenta.dias_abierta ?? 0
  const alerta = dias >= 2

  return (
    <div className={`card p-4 ${alerta ? 'border-amber-200' : ''}`}>
      {alerta && (
        <div className="flex items-center gap-2 mb-3 bg-amber-50 rounded-lg px-3 py-2">
          <span className="text-amber-500 text-sm">⚠️</span>
          <p className="text-xs text-amber-700 font-medium">{dias} días sin cerrar</p>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-mazul-bark text-sm truncate">
            {EMOJI[cuenta.tipo]} {cuenta.nombre}
          </p>
          <p className="text-xs text-mazul-stone mt-0.5">
            {cuenta.num_cargos} cargos · abierta hace {dias === 0 ? 'hoy' : `${dias}d`}
          </p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-base font-semibold text-mazul-bark">
            ${Number(cuenta.total_acumulado).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
          <span className="badge-stone">abierta</span>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button className="btn-secondary text-xs py-2">Ver detalle</button>
        <button className="btn-primary text-xs py-2">+ Cargo</button>
      </div>
    </div>
  )
}
