import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'

function fechaLocal(date) {
  return date.toISOString().split('T')[0]
}

export default function CajaPage() {
  const [fecha, setFecha]         = useState(fechaLocal(new Date()))
  const [resumen, setResumen]     = useState({ total: 0, cuentas: 0, ticket: 0 })
  const [cierres, setCierres]     = useState([])
  const [abiertas, setAbiertas]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { fetchCaja() }, [fecha])

  async function fetchCaja() {
    setLoading(true)
    const inicio = new Date(fecha + 'T00:00:00').toISOString()
    const fin    = new Date(fecha + 'T23:59:59').toISOString()

    const [{ data: cerradas }, { data: openData }] = await Promise.all([
      supabase.from('cuentas')
        .select('*, abierta:profiles!cuentas_abierta_por_fkey(nombre), cerrada:profiles!cuentas_cerrada_por_fkey(nombre)')
        .eq('estado', 'cerrada')
        .gte('closed_at', inicio)
        .lte('closed_at', fin)
        .order('closed_at', { ascending: false }),
      supabase.from('cuentas_activas').select('*').order('created_at', { ascending: false }),
    ])

    const lista = cerradas ?? []
    const total = lista.reduce((s, c) => s + Number(c.total_cobrado ?? 0), 0)

    setResumen({ total, cuentas: lista.length, ticket: lista.length > 0 ? total / lista.length : 0 })
    setCierres(lista)
    setAbiertas(openData ?? [])
    setLoading(false)
  }

  const esHoy = fecha === fechaLocal(new Date())

  const porPago = {}
  cierres.forEach(c => {
    const fp = c.forma_pago ?? 'sin_registrar'
    porPago[fp] = (porPago[fp] || 0) + Number(c.total_cobrado ?? 0)
  })

  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  function imprimirCorte() {
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

    const filasCerradas = cierres.map(c => `
      <tr>
        <td>
          <strong>${c.nombre}</strong><br>
          <span style="font-size:10px;color:#7A6E5F">
            Abierta por: ${c.abierta?.nombre ?? '—'} &nbsp;·&nbsp;
            Cerrada por: ${c.cerrada?.nombre ?? '—'}
          </span>
          ${c.nota_cierre ? `<br><span style="font-size:10px;color:#7A6E5F">${c.nota_cierre}</span>` : ''}
        </td>
        <td>${new Date(c.closed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="text-align:right;text-transform:capitalize">${(c.forma_pago ?? '').replace('_', ' ')}</td>
        <td style="text-align:right">$${Number(c.total_cobrado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('')

    const filasAbiertas = abiertas.map(c => `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.tipo}</td>
        <td style="text-align:right">${c.num_cargos} cargos</td>
        <td style="text-align:right">$${Number(c.total_acumulado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('')

    const filasPago = Object.entries(porPago).map(([fp, monto]) => `
      <tr>
        <td style="text-transform:capitalize">${fp.replace('_', ' ')}</td>
        <td style="text-align:right;font-weight:600">$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Corte · ${fechaLabel} · Mazul</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px; color:#2C2416; padding:24px; max-width:600px; margin:0 auto; }
    .header { text-align:center; border-bottom:2px solid #2C2416; padding-bottom:16px; margin-bottom:20px; }
    .logo { font-size:28px; font-weight:300; letter-spacing:6px; text-transform:uppercase; }
    .sub { font-size:10px; color:#7A6E5F; letter-spacing:2px; margin-top:4px; }
    .fecha { font-size:11px; color:#7A6E5F; margin-top:8px; }
    .section { margin-bottom:20px; }
    .section-title { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:1.5px; color:#7A6E5F; border-bottom:0.5px solid #E8DCC8; padding-bottom:6px; margin-bottom:10px; }
    table { width:100%; border-collapse:collapse; }
    td { padding:7px 4px; border-bottom:0.5px solid #F0EDE8; vertical-align:top; line-height:1.5; }
    tr:last-child td { border-bottom:none; }
    .kpi-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
    .kpi { border:0.5px solid #E8DCC8; border-radius:8px; padding:10px; text-align:center; }
    .kpi-val { font-size:18px; font-weight:600; color:#1D4A2A; }
    .kpi-lbl { font-size:9px; color:#7A6E5F; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
    .total-row { display:flex; justify-content:space-between; align-items:center; background:#2C2416; color:#F5F0E8; padding:12px 16px; border-radius:8px; margin-top:16px; }
    .total-lbl { font-size:11px; font-weight:500; letter-spacing:1px; text-transform:uppercase; }
    .total-val { font-size:22px; font-weight:600; }
    .footer { text-align:center; font-size:9px; color:#7A6E5F; margin-top:24px; padding-top:12px; border-top:0.5px solid #E8DCC8; }
    .badge-abierta { background:#FFF3CD; color:#856404; padding:2px 6px; border-radius:4px; font-size:9px; }
    @media print { body { padding:12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">MAZUL</div>
    <div class="sub">Puerto Escondido · Oaxaca</div>
    <div class="fecha">Corte del día · ${fechaLabel}${esHoy ? ' · ' + hora : ''}</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-val">$${(resumen.total/1000).toFixed(1)}k</div><div class="kpi-lbl">Total</div></div>
    <div class="kpi"><div class="kpi-val">${resumen.cuentas}</div><div class="kpi-lbl">Cuentas cerradas</div></div>
    <div class="kpi"><div class="kpi-val">$${resumen.ticket.toFixed(0)}</div><div class="kpi-lbl">Ticket prom.</div></div>
  </div>

  <div class="section">
    <div class="section-title">Desglose por forma de pago</div>
    <table>${filasPago || '<tr><td colspan="2" style="color:#7A6E5F">Sin cierres</td></tr>'}</table>
    <div class="total-row">
      <span class="total-lbl">Total en caja</span>
      <span class="total-val">$${resumen.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cuentas cerradas (${cierres.length})</div>
    <table>
      <tr style="font-size:10px;color:#7A6E5F"><td>Cuenta</td><td>Hora</td><td style="text-align:right">Pago</td><td style="text-align:right">Total</td></tr>
      ${filasCerradas || '<tr><td colspan="4" style="color:#7A6E5F">Sin cierres</td></tr>'}
    </table>
  </div>

  ${esHoy ? `<div class="section">
    <div class="section-title">Cuentas abiertas (${abiertas.length}) <span class="badge-abierta">pendientes</span></div>
    <table>
      <tr style="font-size:10px;color:#7A6E5F"><td>Cuenta</td><td>Tipo</td><td style="text-align:right">Cargos</td><td style="text-align:right">Acumulado</td></tr>
      ${filasAbiertas || '<tr><td colspan="4" style="color:#7A6E5F">No hay cuentas abiertas</td></tr>'}
    </table>
  </div>` : ''}

  <div class="footer">
    Sistema Mazul · Generado el ${new Date().toLocaleDateString('es-MX')} a las ${hora}<br>
    Este documento es de uso interno
  </div>
</body>
</html>`

    const ventana = window.open('', '_blank')
    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => ventana.print(), 500)
  }

  return (
    <div className="pb-24">
      <AppHeader
        title="Caja"
        subtitle={esHoy ? 'Hoy' : fechaLabel}
        action={
          <button onClick={imprimirCorte} className="text-xs bg-mazul-bark text-mazul-cream px-3 py-1.5 rounded-lg font-medium">
            🖨️ Corte
          </button>
        }
      />

      {/* Selector de fecha */}
      <div className="px-4 py-3 bg-white border-b border-mazul-sand/60 flex items-center gap-3">
        <button
          onClick={() => {
            const d = new Date(fecha + 'T12:00:00')
            d.setDate(d.getDate() - 1)
            setFecha(fechaLocal(d))
          }}
          className="w-8 h-8 rounded-lg bg-mazul-mist text-mazul-stone flex items-center justify-center text-sm"
        >‹</button>
        <input
          type="date"
          value={fecha}
          max={fechaLocal(new Date())}
          onChange={e => setFecha(e.target.value)}
          className="flex-1 text-center text-sm font-medium text-mazul-bark bg-transparent border-none outline-none"
        />
        <button
          onClick={() => {
            const d = new Date(fecha + 'T12:00:00')
            d.setDate(d.getDate() + 1)
            if (fechaLocal(d) <= fechaLocal(new Date())) setFecha(fechaLocal(d))
          }}
          className={`w-8 h-8 rounded-lg bg-mazul-mist flex items-center justify-center text-sm ${esHoy ? 'opacity-30' : 'text-mazul-stone'}`}
          disabled={esHoy}
        >›</button>
        {!esHoy && (
          <button
            onClick={() => setFecha(fechaLocal(new Date()))}
            className="text-xs text-mazul-moss font-medium"
          >
            Hoy
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricCard label="Total" value={`$${resumen.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`} color="text-mazul-moss" />
          <MetricCard label="Cuentas" value={resumen.cuentas} />
          <MetricCard label="Ticket prom." value={`$${resumen.ticket.toFixed(0)}`} />
        </div>

        <div className="card p-4 mb-4">
          <p className="section-title">Por forma de pago</p>
          {Object.entries(porPago).length === 0 ? (
            <p className="text-xs text-mazul-stone text-center py-2">Sin cierres este día</p>
          ) : Object.entries(porPago).map(([fp, monto]) => (
            <div key={fp} className="flex justify-between items-center py-2 border-b border-mazul-sand/40 last:border-0">
              <span className="text-sm text-mazul-bark capitalize">{fp.replace('_', ' ')}</span>
              <span className="text-sm font-semibold text-mazul-bark">${monto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>

        {esHoy && abiertas.length > 0 && (
          <div className="card p-4 mb-4 border-amber-200">
            <p className="section-title">⏳ Cuentas abiertas ({abiertas.length})</p>
            <div className="space-y-2">
              {abiertas.map(c => (
                <div key={c.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-mazul-bark">{c.nombre}</p>
                    <p className="text-xs text-mazul-stone">{c.num_cargos} cargos · {c.dias_abierta === 0 ? 'hoy' : `${c.dias_abierta}d`}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-700">${Number(c.total_acumulado).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="section-title">Cierres del día</p>
        {loading ? (
          <div className="text-center py-8 text-mazul-stone text-sm">Cargando…</div>
        ) : cierres.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🌿</p>
            <p className="text-sm text-mazul-stone">Sin cierres este día</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cierres.map(c => (
              <div key={c.id} className="card-compact">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-mazul-bark">{c.nombre}</p>
                    <p className="text-xs text-mazul-stone">
                      {new Date(c.closed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}<span className="capitalize">{c.forma_pago?.replace('_', ' ')}</span>
                    </p>
                    <p className="text-xs text-mazul-stone/70">
                      Abierta: {c.abierta?.nombre ?? '—'} · Cerrada: {c.cerrada?.nombre ?? '—'}
                    </p>
                    {c.nota_cierre && <p className="text-xs text-mazul-amber">{c.nota_cierre}</p>}
                  </div>
                  <span className="text-sm font-semibold text-mazul-moss ml-3 flex-shrink-0">
                    ${Number(c.total_cobrado).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </span>
                </div>
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
