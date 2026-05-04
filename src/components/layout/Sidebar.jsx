/**
 * Sidebar - Collapsible navigation with role-based links
 */

import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Receipt, BarChart2,
  Users, Settings, LogOut, Zap, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../hooks/useAuth'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products',   icon: Package,         label: 'Stock' },
  { to: '/billing',    icon: Receipt,         label: 'Billing' },
  { to: '/reports',    icon: BarChart2,       label: 'Reports' },
  { to: '/customers',  icon: Users,           label: 'Customers' },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className={clsx(
      'flex flex-col bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 transition-all duration-300 relative',
      collapsed ? 'w-[72px]' : 'w-[260px]'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex-shrink-0 w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/30">
          <Zap size={18} className="text-white" fill="white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-display font-bold text-primary-700 dark:text-primary-300 text-sm leading-tight">Electrical</p>
            <p className="font-display font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight">Shop Manager</p>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'active', collapsed && 'justify-center px-0')
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-slate-100 dark:border-slate-700 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium',
            collapsed && 'justify-center'
          )}>
          <LogOut size={16} />
          {!collapsed && 'Logout'}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
