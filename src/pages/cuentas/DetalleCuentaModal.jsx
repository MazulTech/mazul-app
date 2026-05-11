import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import NuevoCargoModal from './NuevoCargoModal'

const PAGOS = [
  { id: 'efectivo',      label: 'Efectivo',     icon: '💵' },
  { id: 'tarjeta',       label: 'Tarjeta',       icon: '💳' },
  { id: 'transferencia', label: 'Transferencia', icon: '📲' },
  { id: 'a_la_villa',    label: 'A la villa',    icon: '🏡' },
]

export default function DetalleCuentaModal({ cuenta, onClose, onUpdated }) {
  const { user, isDueno } = useAuth()
  const [cargos, setCargos]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [showCargo, setShowCargo]   = useState(false)
  const [showCierre, setShowCierre] = useState(false)
  const [formaPago, setFormaPago]   = useState('efectivo')
  const [descuento, setDescuento]   = useState('')
  const [tipoDesc, setTipoDesc]     = useState('pct')
  const [cerrando, setCerrando]     = useState(false)
  const [borrando, setBorrando]     = useState(null)
  const [confirmBorrar, setConfirmBorrar] = useState(null)

  useEffect(() => { fetchCargos() }, [])

  async function fetchCargos() {
    setLoading(true)
    const { data } = await supabase
      .from('cargos')
      .select('*, platillos(nombre, emoji), registrado:profiles!cargos_registrado_por_fkey(nombre)')
      .eq('cuenta_id', cuenta.id)
      .order('created_at', { ascending: false })
    setCargos(data ?? [])
    setLoading(false)
  }

  const subtotal  = cargos.reduce((s, c) => s + Number(c.subtotal), 0)
  const descVal   = Number(descuento) || 0
  const descMonto = tipoDesc === 'pct' ? subtotal * (descVal / 100) : Math.min(descVal, subtotal)
  const total     = Math.max(0, subtotal - descMonto)

  async function handleBorrarCargo(cargoId) {
    setBorrando(cargoId)
    await supabase.from('cargos').delete().eq('id', cargoId)
    setBorrando(null)
    setConfirmBorrar(null)
    fetchCargos()
    onUpdated()
  }

  async function handleCerrar() {
    setCerrando(true)
    const { error } = await supabase.from('cuentas').update({
      estado:        'cerrada',
      forma_pago:    formaPago,
      total_cobrado: total,
      cerrada_por:   user.id,
      closed_at:     new Date().toISOString(),
      nota_cierre:   descMonto > 0
        ? `Descuento: ${tipoDesc === 'pct' ? `${descVal}%` : `$${descMonto.toFixed(0)}`} (-$${descMonto.toFixed(0)})`
        : null,
    }).eq('id', cuenta.id)
    setCerrando(false)
    if (!error) onUpdated()
  }

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
              <p className="text-xl font-semibold text-mazul-bark">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
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
                <div key={c.id} className={`card-compact ${confirmBorrar === c.id ? 'border-red-200 bg-red-50/30' : ''}`}>
                  {confirmBorrar === c.id ? (
                    /* Confirmación de borrado */
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-700">¿Borrar este cargo?</p>
                      <p className="text-xs text-mazul-stone">{c.platillos?.emoji} {c.platillos?.nombre} ×{c.cantidad} — ${Number(c.subtotal).toLocaleString('es-MX')}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBorrarCargo(c.id)}
                          disabled={borrando === c.id}
                          className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-medium"
                        >
                          {borrando === c.id ? 'Borrando…' : 'Sí, borrar'}
                        </button>
                        <button
                          onClick={() => setConfirmBorrar(null)}
                          className="flex-1 py-2 border border-mazul-sand text-mazul-stone rounded-lg text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.platillos?.emoji || '🍽️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-mazul-bark truncate">{c.platillos?.nombre}</p>
                        <p className="text-xs text-mazul-stone">
                          ×{c.cantidad} · {new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          {c.registrado?.nombre && ` · ${c.registrado.nombre}`}
                          {c.nota && ` · ${c.nota}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-mazul-moss">+${Number(c.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                        {isDueno && (
                          <button
                            onClick={() => setConfirmBorrar(c.id)}
                            className="w-6 h-6 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-xs hover:bg-red-100"
                            title="Borrar cargo"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Panel de cierre */}
        {showCierre && (
          <div className="px-5 pb-3 flex-shrink-0 border-t border-mazul-sand/60">
            <p className="section-title mt-4">Forma de cobro</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
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

            <p className="section-title">Descuento <span className="normal-case font-normal text-mazul-stone">(opcional)</span></p>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setTipoDesc('pct')} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${tipoDesc === 'pct' ? 'bg-mazul-moss text-mazul-cream border-mazul-moss' : 'border-mazul-sand text-mazul-stone bg-white/60'}`}>% Porcentaje</button>
              <button onClick={() => setTipoDesc('monto')} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${tipoDesc === 'monto' ? 'bg-mazul-moss text-mazul-cream border-mazul-moss' : 'border-mazul-sand text-mazul-stone bg-white/60'}`}>$ Monto fijo</button>
            </div>
            <div className="relative mb-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mazul-stone text-sm">{tipoDesc === 'pct' ? '%' : '$'}</span>
              <input className="input pl-8" type="number" min="0" max={tipoDesc === 'pct' ? '100' : subtotal} placeholder="0" value={descuento} onChange={e => setDescuento(e.target.value)} />
            </div>

            <div className="bg-mazul-bark rounded-xl p-4 mb-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-mazul-cream/60 text-xs">Subtotal</span>
                <span className="text-mazul-cream/80 text-sm">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
              </div>
              {descMonto > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-mazul-amber text-xs">Descuento {tipoDesc === 'pct' ? `${descVal}%` : ''}</span>
                  <span className="text-mazul-amber text-sm">-${descMonto.toFixed(0)}</span>
                </div>
              )}
              <div className="border-t border-mazul-cream/20 pt-2 flex justify-between items-center">
                <span className="text-mazul-cream text-sm font-medium">Total a cobrar</span>
                <span className="text-mazul-cream text-xl font-semibold">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
              </div>
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
