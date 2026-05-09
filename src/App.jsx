import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage      from './pages/auth/LoginPage'
import CuentasPage    from './pages/cuentas/CuentasPage'
import MenuPage       from './pages/menu/MenuPage'
import CajaPage       from './pages/caja/CajaPage'
import ReportesPage   from './pages/reportes/ReportesPage'
import InventarioPage from './pages/inventario/InventarioPage'
import BottomNav      from './components/layout/BottomNav'

function AppRoutes() {
  const { user, loading, isDueno } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mazul-cream">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-mazul-bark flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-mazul-cream text-lg">M</span>
          </div>
          <p className="text-xs text-mazul-stone tracking-widest uppercase">Mazul</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <div className="max-w-md mx-auto min-h-screen relative">
      <Routes>
        <Route path="/"            element={<Navigate to="/cuentas" replace />} />
        <Route path="/cuentas"     element={<CuentasPage />} />
        <Route path="/menu"        element={<MenuPage />} />
        <Route path="/caja"        element={<CajaPage />} />
        <Route path="/inventario"  element={<InventarioPage />} />
        {isDueno && <Route path="/reportes" element={<ReportesPage />} />}
        <Route path="*"            element={<Navigate to="/cuentas" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
