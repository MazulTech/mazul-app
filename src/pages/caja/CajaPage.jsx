import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'

export default function CajaPage() {
  const [resumen, setResumen] = useState({ total: 0, cuentas: 0, ticket: 0 })
  const [cierres, setCierres]   = useState([])
  const [abiertas, setAbiertas] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { fetchCaja() }, [])

  async function fetchCaja() {
    setLoading(true)
    const hoy    = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    const [{ data: cerradas }, { data: openData }] = await Promise.all([
      supabase.from('cuentas').select('*').eq('estado', 'cerrada').gte('closed_at', inicio).order('closed_at', { ascending: false }),
      supabase.from('cuentas_activas').select('*').order('created_at', { ascending: false }),
    ])

    const lista = cerradas ?? []
    const total = lista.reduce((s, c) => s + Number(c.total_cobrado ?? 0), 0)

    setResumen({ total, cuentas: lista.length, ticket: lista.length > 0 ? total / lista.length : 0 })
    setCierres(lista)
    setAbiertas(openData ?? [])
    setLoading(false)
  }

  const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Totales por forma de pago
  const porPago = {}
  cierres.forEach(c => {
    const fp = c.forma_pago ?? 'sin_registrar'
    porPago[fp] = (porPago[fp] || 0) + Number(c.total_cobrado ?? 0)
  })

  function imprimirCorte() {
    const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const hora  = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

    const filasCerradas = cierres.map(c => `
      <tr>
        <td>${c.nombre}</td>
        <td>${new Date(c.closed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="text-align:right">${(c.forma_pago ?? '').replace('_', ' ')}</td>
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Corte del día · Mazul</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #2C2416; padding: 24px; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #2C2416; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { font-size: 28px; font-weight: 300; letter-spacing: 6px; text-transform: uppercase; }
    .sub { font-size: 10px; color: #7A6E5F; letter-spacing: 2px; margin-top: 4px; }
    .fecha { font-size: 11px; color: #7A6E5F; margin-top: 8px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #7A6E5F; border-bottom: 0.5px solid #E8DCC8; padding-bottom: 6px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 4px; border-bottom: 0.5px solid #F0EDE8; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .kpi { border: 0.5px solid #E8DCC8; border-radius: 8px; padding: 10px; text-align: center; }
    .kpi-val { font-size: 18px; font-weight: 600; color: #1D4A2A; }
    .kpi-lbl { font-size: 9px; color: #7A6E5F; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; background: #2C2416; color: #F5F0E8; padding: 12px 16px; border-radius: 8px; margin-top: 16px; }
    .total-lbl { font-size: 11px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; }
    .total-val { font-size: 22px; font-weight: 600; }
    .footer { text-align: center; font-size: 9px; color: #7A6E5F; margin-top: 24px; padding-top: 12px; border-top: 0.5px solid #E8DCC8; }
    .badge-abierta { background: #FFF3CD; color: #856404; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
    @media print {
      body { padding: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">MAZUL</div>
    <div class="sub">Puerto Escondido · Oaxaca</div>
    <div class="fecha">Corte del día · ${fecha} · ${hora}</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-val">$${(resumen.total/1000).toFixed(1)}k</div>
      <div class="kpi-lbl">Total</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">${resumen.cuentas}</div>
      <div class="kpi-lbl">Cuentas cerradas</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">$${resumen.ticket.toFixed(0)}</div>
      <div class="kpi-lbl">Ticket prom.</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Desglose por forma de pago</div>
    <table>
      ${filasPago || '<tr><td colspan="2" style="color:#7A6E5F">Sin cierres hoy</td></tr>'}
    </table>
    <div class="total-row">
      <span class="total-lbl">Total en caja</span>
      <span class="total-val">$${resumen.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cuentas cerradas hoy (${cierres.length})</div>
    <table>
      <tr style="font-size:10px;color:#7A6E5F"><td>Cuenta</td><td>Hora</td><td style="text-align:right">Pago</td><td style="text-align:right">Total</td></tr>
      ${filasCerradas || '<tr><td colspan="4" style="color:#7A6E5F">Sin cierres hoy</td></tr>'}
    </table>
  </div>

  <div class="section">
    <div class="section-title">Cuentas abiertas (${abiertas.length}) <span class="badge-abierta">pendientes</span></div>
    <table>
      <tr style="font-size:10px;color:#7A6E5F"><td>Cuenta</td><td>Tipo</td><td style="text-align:right">Cargos</td><td style="text-align:right">Acumulado</td></tr>
      ${filasAbiertas || '<tr><td colspan="4" style="color:#7A6E5F">No hay cuentas abiertas</td></tr>'}
    </table>
  </div>

  <div class="footer">
    Sistema Mazul · Generado el ${fecha} a las ${hora}<br>
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
        title="Caja del día"
        subtitle={hoy}
        action={
          <button
            onClick={imprimirCorte}
            className="text-xs bg-mazul-bark text-mazul-cream px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
          >
            🖨️ Corte
          </button>
        }
      />

      {/* Resumen */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricCard label="Total del día" value={`$${resumen.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`} color="text-mazul-moss" />
          <MetricCard label="Cuentas cerradas" value={resumen.cuentas} />
          <MetricCard label="Ticket promedio" value={`$${resumen.ticket.toFixed(0)}`} />
        </div>

        {/* Forma de pago */}
        <div className="card p-4 mb-4">
          <p className="section-title">Por forma de pago</p>
          {Object.entries(porPago).length === 0 ? (
            <p className="text-xs text-mazul-stone text-center py-2">Sin cierres hoy</p>
          ) : Object.entries(porPago).map(([fp, monto]) => (
            <div key={fp} className="flex justify-between items-center py-2 border-b border-mazul-sand/40 last:border-0">
              <span className="text-sm text-mazul-bark capitalize">{fp.replace('_', ' ')}</span>
              <span className="text-sm font-semibold text-mazul-bark">
                ${monto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>

        {/* Cuentas abiertas */}
        {abiertas.length > 0 && (
          <div className="card p-4 mb-4 border-amber-200">
            <p className="section-title">⏳ Cuentas abiertas ({abiertas.length})</p>
            <div className="space-y-2">
              {abiertas.map(c => (
                <div key={c.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-mazul-bark">{c.nombre}</p>
                    <p className="text-xs text-mazul-stone">{c.num_cargos} cargos · {c.dias_abierta === 0 ? 'hoy' : `${c.dias_abierta}d`}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-700">
                    ${Number(c.total_acumulado).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    {c.nota_cierre && ` · ${c.nota_cierre}`}
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
