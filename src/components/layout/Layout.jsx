/**
 * Layout - Main app shell with sidebar + header + content area
 */

import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Sun, Moon, Bell } from 'lucide-react'
import Sidebar from './Sidebar'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/products':  'Stock Management',
  '/billing':   'Billing',
  '/billing/new': 'New Invoice',
  '/reports':   'Reports & Analytics',
  '/customers': 'Customers',
  '/settings':  'Settings',
}

export default function Layout() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const title = pageTitles[location.pathname] || 'Electrical Shop'

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl text-slate-800 dark:text-slate-100">{title}</h1>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Bell size={18} className="text-slate-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-500" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 animate-fadeIn">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
