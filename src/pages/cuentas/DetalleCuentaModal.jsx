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
  const [cargos, setCargos]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [showCargo, setShowCargo]         = useState(false)
  const [showCierre, setShowCierre]       = useState(false)
  const [montosPago, setMontosPago]       = useState({ efectivo: '', tarjeta: '', transferencia: '', a_la_villa: '' })
  const [descuento, setDescuento]         = useState('')
  const [tipoDesc, setTipoDesc]           = useState('pct')
  const [cerrando, setCerrando]           = useState(false)
  const [borrando, setBorrando]           = useState(null)
  const [confirmBorrar, setConfirmBorrar] = useState(null)
  const [comprobante, setComprobante]     = useState(null)
  const [subiendoFoto, setSubiendoFoto]   = useState(false)
  const [comprobanteUrl, setComprobanteUrl] = useState(null)

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

  const subtotal   = cargos.reduce((s, c) => s + Number(c.subtotal), 0)
  const descVal    = Number(descuento) || 0
  const descMonto  = tipoDesc === 'pct' ? subtotal * (descVal / 100) : Math.min(descVal, subtotal)
  const total      = Math.max(0, subtotal - descMonto)

  // Calcular total de pagos ingresados
  const totalPagado = Object.values(montosPago).reduce((s, v) => s + (Number(v) || 0), 0)
  const diferencia  = total - totalPagado
  const pagoValido  = Math.abs(diferencia) < 0.01

  // Formas de pago con monto > 0
  const pagosUsados = PAGOS.filter(p => Number(montosPago[p.id]) > 0)
  const formaPagoResumen = pagosUsados.map(p => p.id).join('+') || 'efectivo'

  function setMonto(id, val) {
    setMontosPago(prev => ({ ...prev, [id]: val }))
  }

  // Autocompletar el último campo pendiente
  function autocompletar(id) {
    const otrosTotal = PAGOS.filter(p => p.id !== id).reduce((s, p) => s + (Number(montosPago[p.id]) || 0), 0)
    const restante = total - otrosTotal
    if (restante > 0) setMonto(id, restante.toFixed(2))
  }

  async function handleSeleccionarFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setComprobante(file)
    setComprobanteUrl(URL.createObjectURL(file))
  }

  async function handleBorrarCargo(cargoId) {
    setBorrando(cargoId)
    await supabase.from('cargos').delete().eq('id', cargoId)
    setBorrando(null)
    setConfirmBorrar(null)
    fetchCargos()
    onUpdated()
  }

  async function handleCerrar() {
    if (!pagoValido) return
    setCerrando(true)

    let urlFoto = null
    if (comprobante) {
      setSubiendoFoto(true)
      const ext      = comprobante.name.split('.').pop()
      const fileName = `${cuenta.id}-${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, comprobante, { contentType: comprobante.type })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName)
        urlFoto = urlData?.publicUrl ?? null
      }
      setSubiendoFoto(false)
    }

    // Nota de cierre con desglose de pagos mixtos
    const notaPagos = pagosUsados.length > 1
      ? pagosUsados.map(p => `${p.label}: $${Number(montosPago[p.id]).toFixed(0)}`).join(' · ')
      : null
    const notaDesc = descMonto > 0
      ? `Descuento: ${tipoDesc === 'pct' ? `${descVal}%` : `$${descMonto.toFixed(0)}`} (-$${descMonto.toFixed(0)})`
      : null
    const notaCierre = [notaPagos, notaDesc].filter(Boolean).join(' | ') || null

    const { error } = await supabase.from('cuentas').update({
      estado:          'cerrada',
      forma_pago:      formaPagoResumen,
      total_cobrado:   total,
      cerrada_por:     user.id,
      closed_at:       new Date().toISOString(),
      nota_cierre:     notaCierre,
      comprobante_url: urlFoto,
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
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-700">¿Borrar este cargo?</p>
                      <p className="text-xs text-mazul-stone">{c.platillos?.emoji} {c.platillos?.nombre} ×{c.cantidad} — ${Number(c.subtotal).toLocaleString('es-MX')}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleBorrarCargo(c.id)} disabled={borrando === c.id} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-medium">
                          {borrando === c.id ? 'Borrando…' : 'Sí, borrar'}
                        </button>
                        <button onClick={() => setConfirmBorrar(null)} className="flex-1 py-2 border border-mazul-sand text-mazul-stone rounded-lg text-xs">Cancelar</button>
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
                          <button onClick={() => setConfirmBorrar(c.id)} className="w-6 h-6 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-xs">×</button>
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
          <div className="px-5 pb-3 flex-shrink-0 border-t border-mazul-sand/60 overflow-y-auto" style={{ maxHeight: '65vh' }}>

            {/* Descuento */}
            <p className="section-title mt-4">Descuento <span className="normal-case font-normal text-mazul-stone">(opcional)</span></p>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setTipoDesc('pct')} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${tipoDesc==='pct'?'bg-mazul-moss text-mazul-cream border-mazul-moss':'border-mazul-sand text-mazul-stone bg-white/60'}`}>% Porcentaje</button>
              <button onClick={() => setTipoDesc('monto')} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${tipoDesc==='monto'?'bg-mazul-moss text-mazul-cream border-mazul-moss':'border-mazul-sand text-mazul-stone bg-white/60'}`}>$ Monto fijo</button>
            </div>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mazul-stone text-sm">{tipoDesc==='pct'?'%':'$'}</span>
              <input className="input pl-8" type="number" min="0" placeholder="0" value={descuento} onChange={e => setDescuento(e.target.value)} />
            </div>

            {/* Total a pagar */}
            <div className="bg-mazul-bark/10 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
              <span className="text-sm text-mazul-bark font-medium">Total a cobrar</span>
              <span className="text-lg font-bold text-mazul-bark">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
            </div>

            {/* Pagos mixtos */}
            <p className="section-title">¿Cómo paga? <span className="normal-case font-normal text-mazul-stone">— puede ser más de una forma</span></p>
            <div className="space-y-2 mb-3">
              {PAGOS.map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-base w-6 flex-shrink-0">{p.icon}</span>
                  <span className="text-sm text-mazul-bark w-28 flex-shrink-0">{p.label}</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mazul-stone text-xs">$</span>
                    <input
                      className={`input pl-7 py-2 text-sm ${Number(montosPago[p.id]) > 0 ? 'border-mazul-moss' : ''}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={montosPago[p.id]}
                      onChange={e => setMonto(p.id, e.target.value)}
                    />
                  </div>
                  {Number(montosPago[p.id]) === 0 && diferencia > 0 && (
                    <button
                      onClick={() => autocompletar(p.id)}
                      className="text-[10px] text-mazul-moss font-medium flex-shrink-0"
                    >
                      +${diferencia.toFixed(0)}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Validación de montos */}
            <div className={`rounded-xl px-4 py-3 mb-3 flex justify-between items-center ${pagoValido ? 'bg-emerald-50 border border-emerald-200' : diferencia > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
              <span className={`text-xs font-medium ${pagoValido ? 'text-emerald-700' : diferencia > 0 ? 'text-amber-700' : 'text-red-600'}`}>
                {pagoValido ? '✓ Monto correcto' : diferencia > 0 ? `Faltan $${diferencia.toFixed(0)}` : `Excede $${Math.abs(diferencia).toFixed(0)}`}
              </span>
              <span className={`text-sm font-semibold ${pagoValido ? 'text-emerald-700' : 'text-mazul-stone'}`}>
                ${totalPagado.toFixed(0)} / ${total.toFixed(0)}
              </span>
            </div>

            {/* Comprobante */}
            <p className="section-title">Comprobante <span className="normal-case font-normal text-mazul-stone">(opcional)</span></p>
            {comprobanteUrl ? (
              <div className="relative mb-3">
                <img src={comprobanteUrl} alt="Comprobante" className="w-full rounded-xl object-cover max-h-36" />
                <button onClick={() => { setComprobante(null); setComprobanteUrl(null) }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm">×</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-mazul-sand rounded-xl text-sm text-mazul-stone mb-3 cursor-pointer hover:border-mazul-moss hover:text-mazul-moss transition-colors">
                📷 Foto del comprobante
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSeleccionarFoto} />
              </label>
            )}

            <button className="btn-primary" onClick={handleCerrar} disabled={!pagoValido || cerrando || subiendoFoto}>
              {subiendoFoto ? 'Subiendo foto…' : cerrando ? 'Cerrando…' : '✓ Confirmar cobro y cerrar cuenta'}
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
