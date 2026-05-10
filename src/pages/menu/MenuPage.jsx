import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'
import { useAuth } from '../../context/AuthContext'
import PlatilloModal from './PlatilloModal'
import RecetaModal from './RecetaModal'

const CATS = [
  { key: 'todos',          label: 'Todos'     },
  { key: 'platos_fuertes', label: 'Platos'    },
  { key: 'antojitos',      label: 'Antojitos' },
  { key: 'bebidas',        label: 'Bebidas'   },
  { key: 'postres',        label: 'Postres'   },
  { key: 'extras',         label: 'Extras'    },
]

export default function MenuPage() {
  const { isDueno } = useAuth()
  const [platillos, setPlatillos]       = useState([])
  const [cat, setCat]                   = useState('todos')
  const [loading, setLoading]           = useState(true)
  const [showNuevo, setShowNuevo]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [verReceta, setVerReceta]       = useState(null)
  const [verInactivos, setVerInactivos] = useState(false)

  useEffect(() => { fetchPlatillos() }, [verInactivos])

  async function fetchPlatillos() {
    setLoading(true)
    let query = supabase.from('platillos_con_costo').select('*').order('categoria').order('nombre')
    if (!verInactivos) query = query.eq('activo', true)
    const { data } = await query
    setPlatillos(data ?? [])
    setLoading(false)
  }

  const filtrados = cat === 'todos' ? platillos : platillos.filter(p => p.categoria === cat)
  const activos   = platillos.filter(p => p.activo).length
  const inactivos = platillos.filter(p => !p.activo).length

  return (
    <div className="pb-24">
      <AppHeader
        title="Menú"
        subtitle={`${activos} activos${inactivos > 0 ? ` · ${inactivos} inactivos` : ''}`}
        action={isDueno && (
          <button onClick={() => setShowNuevo(true)} className="text-xs bg-mazul-moss text-mazul-cream px-3 py-1.5 rounded-lg font-medium">
            + Platillo
          </button>
        )}
      />

      {/* Categorías */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-mazul-sand/60">
        {CATS.map(c => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              cat === c.key ? 'bg-mazul-moss text-mazul-cream' : 'bg-mazul-mist text-mazul-stone'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isDueno && inactivos > 0 && (
        <div className="px-4 pt-3">
          <button onClick={() => setVerInactivos(!verInactivos)} className="text-xs text-mazul-stone underline">
            {verInactivos ? 'Ocultar inactivos' : `Ver ${inactivos} platillo(s) inactivo(s)`}
          </button>
        </div>
      )}

      <div className="px-4 pt-3 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-mazul-stone text-sm">Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-mazul-stone text-sm">Sin platillos en esta categoría</p>
          </div>
        ) : filtrados.map(p => (
          <PlatilloRow
            key={p.id}
            platillo={p}
            isDueno={isDueno}
            onEdit={() => setEditando(p)}
            onReceta={() => setVerReceta(p)}
          />
        ))}
      </div>

      {showNuevo && (
        <PlatilloModal onClose={() => setShowNuevo(false)} onSaved={() => { setShowNuevo(false); fetchPlatillos() }} />
      )}
      {editando && (
        <PlatilloModal platillo={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); fetchPlatillos() }} />
      )}
      {verReceta && (
        <RecetaModal platillo={verReceta} onClose={() => { setVerReceta(null); fetchPlatillos() }} />
      )}
    </div>
  )
}

function PlatilloRow({ platillo: p, isDueno, onEdit, onReceta }) {
  const margen  = Number(p.margen_pct ?? 0)
  const costo   = Number(p.costo_calculado ?? 0)
  const mgClass = margen >= 65 ? 'badge-green' : margen >= 55 ? 'badge-amber' : margen > 0 ? 'badge-red' : 'badge-stone'
  const sinReceta = costo === 0

  return (
    <div className={`card p-3 ${!p.activo ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-mazul-mist flex items-center justify-center text-xl flex-shrink-0">
          {p.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-mazul-bark truncate">{p.nombre}</p>
            {!p.activo && <span className="badge-red flex-shrink-0">inactivo</span>}
          </div>
          {isDueno ? (
            <p className="text-xs text-mazul-stone">
              {sinReceta
                ? <span className="text-amber-500">Sin receta — toca 🧾 para agregar</span>
                : <>Costo ${costo.toFixed(0)} · <span className={mgClass}>margen {margen.toFixed(0)}%</span></>
              }
            </p>
          ) : (
            <p className="text-xs text-mazul-stone capitalize">{p.categoria?.replace('_', ' ')}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="text-sm font-semibold text-mazul-bark">${p.precio_venta}</p>
          {isDueno && (
            <div className="flex gap-1">
              <button
                onClick={onReceta}
                className="w-7 h-7 rounded-lg bg-mazul-mist flex items-center justify-center text-sm"
                title="Ver receta"
              >
                🧾
              </button>
              <button
                onClick={onEdit}
                className="w-7 h-7 rounded-lg bg-mazul-mist flex items-center justify-center"
                title="Editar platillo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
