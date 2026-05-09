import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/layout/AppHeader'
import { useAuth } from '../../context/AuthContext'

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
  const [platillos, setPlatillos] = useState([])
  const [cat, setCat]             = useState('todos')
  const [loading, setLoading]     = useState(true)

  useEffect(() => { fetchPlatillos() }, [])

  async function fetchPlatillos() {
    setLoading(true)
    const { data } = await supabase
      .from('platillos_con_costo')
      .select('*')
      .eq('activo', true)
      .order('categoria')
      .order('nombre')
    setPlatillos(data ?? [])
    setLoading(false)
  }

  const filtrados = cat === 'todos'
    ? platillos
    : platillos.filter(p => p.categoria === cat)

  return (
    <div className="pb-24">
      <AppHeader
        title="Menú"
        subtitle={`${platillos.length} platillos activos`}
        action={isDueno && (
          <button className="text-xs bg-mazul-moss text-mazul-cream px-3 py-1.5 rounded-lg font-medium">
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
              cat === c.key
                ? 'bg-mazul-moss text-mazul-cream'
                : 'bg-mazul-mist text-mazul-stone'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-mazul-stone text-sm">Cargando…</div>
        ) : filtrados.map(p => (
          <PlatilloRow key={p.id} platillo={p} isDueno={isDueno} />
        ))}
      </div>
    </div>
  )
}

function PlatilloRow({ platillo: p, isDueno }) {
  const margen = Number(p.margen_pct ?? 0)
  const costo  = Number(p.costo_calculado ?? 0)
  const mgClass = margen >= 65 ? 'badge-green' : margen >= 55 ? 'badge-amber' : 'badge-red'

  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-mazul-mist flex items-center justify-center text-xl flex-shrink-0">
        {p.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-mazul-bark truncate">{p.nombre}</p>
        {isDueno ? (
          <p className="text-xs text-mazul-stone">Costo ${costo.toFixed(0)} · margen <span className={mgClass}>{margen.toFixed(0)}%</span></p>
        ) : (
          <p className="text-xs text-mazul-stone capitalize">{p.categoria?.replace('_', ' ')}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-mazul-bark">${p.precio_venta}</p>
      </div>
    </div>
  )
}
