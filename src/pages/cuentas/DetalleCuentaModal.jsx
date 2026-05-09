import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import NuevoCargoModal from './NuevoCargoModal'

const PAGOS = [
  { id: 'efectivo',      label: 'Efectivo',       icon: '💵' },
  { id: 'tarjeta',       label: 'Tarjeta',         icon: '💳' },
  { id: 'transferencia', label: 'Transferencia',   icon: '📲' },
  { id: 'a_la_villa',    label: 'A la villa',       icon: '🏡' },
]

export default function DetalleCuentaModal({ cuenta, onClose, onUpdated }) {
  const { user } = useAuth()
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCargo, setShowCargo] = useState(false)
  const [showCierre, setShowCierre] = useState(false)
  const [formaPago, setFormaPago] = useState('efectivo')
  const [cerrando, setCerrando] = useState(false)

  useEffect(() => { fetchCargos() }, [])

  async function fetchCargos() {
    setLoading(true)
    const { data } = await supabase
      .from('cargos')
      .select('*, platillos(nombre, emoji)')
      .eq('cuenta_id', cuenta.id)
      .order('created_at', { ascending: false })
    setCargos(data ?? [])
    setLoading(false)
  }

  const total = cargos.reduce((s, c) => s + Number(c.subtotal), 0)

  async function handleCerrar() {
    setCerrando(true)
    const { error } = await supabase.from('cuentas').update({
      estado: 'cerrada',
      forma_pago: formaPago,
      total_cobrado: total,
      cerrada_por: user.id,
      closed_at: new Date().toISOString(),
    }).eq('id', cuenta.id)
    setCerrando(false)
    if (!error) onUpdated()
  }

  // Agrupar por platillo para resumen
  const resumen = cargos.reduce((acc, c) => {
    const key = c.platillos?.nombre || 'Desconocido'
    if (!acc[key]) acc[key] = { emoji: c.platillos?.emoji || '🍽️', total: 0, unidades: 0 }
    acc[key].total += Number(c.subtotal)
    acc[key].unidades += c.cantidad
    return acc
  }, {})

  if (showCargo) return (
    <NuevoCargoModal
      cuenta={cuenta}
      onClose={() => setShowCargo(false)}
      onSaved={() => { setShowCargo(false); fetchCargos(); onUpdated() }}
    />
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-mazul-cream w-full max-w-md rounded-t-3xl flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="p-5 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-mazul-sand rounded-full mx-auto mb-4" />
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-medium text-mazul-bark">{cuenta.nombre}</h2>
              <p className="text-xs text-mazul-stone capitalize">{cuenta.tipo} · {cuenta.dias_abierta === 0 ? 'abierta hoy' : `${cuenta.dias_abierta} día(s)`}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-mazul-bark">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
              <p className="text-xs text-mazul-stone">{cargos.length} cargos</p>
            </div>
          </div>
        </div>

        {/* Cargos */}
        <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-3">
          {loading ? (
            <p className="text-center text-mazul-stone text-sm py-8">Cargando…</p>
          ) : cargos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🌿</p>
              <p className="text-sm text-mazul-stone">Sin cargos todavía</p>
            </div>
          ) : (
            <>
              <p className="section-title">Historial de consumo</p>
              {cargos.map(c => (
                <div key={c.id} className="card-compact flex items-center gap-3">
                  <span className="text-xl">{c.platillos?.emoji || '🍽️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-mazul-bark truncate">{c.platillos?.nombre}</p>
                    <p className="text-xs text-mazul-stone">
                      ×{c.cantidad} · {new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      {c.nota && ` · ${c.nota}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-mazul-moss">+${Number(c.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Cierre */}
        {showCierre && (
          <div className="px-5 pb-3 flex-shrink-0 border-t border-mazul-sand/60">
            <p className="section-title mt-4">Forma de cobro</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PAGOS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFormaPago(p.id)}
                  className={`py-3 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                    formaPago === p.id
                      ? 'bg-mazul-moss text-mazul-cream border-mazul-moss'
                      : 'border-mazul-sand text-mazul-stone bg-white/60'
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
            <div className="bg-mazul-bark rounded-xl p-3 mb-3 flex justify-between items-center">
              <span className="text-mazul-cream/70 text-sm">Total a cobrar</span>
              <span className="text-mazul-cream text-lg font-semibold">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
            </div>
            <button className="btn-primary" onClick={handleCerrar} disabled={cerrando}>
              {cerrando ? 'Cerrando…' : '✓ Confirmar cobro y cerrar cuenta'}
            </button>
            <button className="btn-secondary mt-2" onClick={() => setShowCierre(false)}>Cancelar</button>
          </div>
        )}

        {/* Botones principales */}
        {!showCierre && (
          <div className="p-5 pt-3 flex-shrink-0 border-t border-mazul-sand/60 space-y-2">
            <button className="btn-primary" onClick={() => setShowCargo(true)}>+ Agregar cargo</button>
            {cargos.length > 0 && (
              <button className="btn-danger" onClick={() => setShowCierre(true)}>Cerrar y cobrar cuenta</button>
            )}
            <button className="btn-secondary" onClick={onClose}>← Volver</button>
          </div>
        )}
      </div>
    </div>
  )
}
