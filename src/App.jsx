/**
 * App.jsx - Root component with routing and layout
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import BillingPage from './pages/BillingPage'
import NewBillPage from './pages/NewBillPage'
import ReportsPage from './pages/ReportsPage'
import CustomersPage from './pages/CustomersPage'
import SettingsPage from './pages/SettingsPage'

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  const initAuth = useAuthStore(s => s.initAuth)

  useEffect(() => { initAuth() }, [initAuth])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<DashboardPage />} />
        <Route path="products"   element={<ProductsPage />} />
        <Route path="billing"    element={<BillingPage />} />
        <Route path="billing/new" element={<NewBillPage />} />
        <Route path="reports"    element={<ReportsPage />} />
        <Route path="customers"  element={<CustomersPage />} />
        <Route path="settings"   element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
