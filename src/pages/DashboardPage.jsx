/**
 * Dashboard Page - Sales KPIs, stock summary, charts, recent bills
 */

import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, Package, AlertTriangle, ShoppingCart, IndianRupee, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import api, { formatCurrency, formatDateTime } from '../utils/api'
import clsx from 'clsx'

function StatCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
        <p className="font-display font-bold text-2xl text-slate-800 dark:text-white mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-green-500 text-xs font-semibold">
          <ArrowUpRight size={14} /> {trend}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [chartPeriod, setChartPeriod] = useState('monthly')

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: chartData } = useQuery({
    queryKey: ['sales-chart', chartPeriod],
    queryFn: () => api.get(`/dashboard/sales-chart?period=${chartPeriod}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  )

  const { sales, stock, recent_bills, low_stock_products } = dash || {}

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Today's Sales"    value={formatCurrency(sales?.today)}      subtitle={`${sales?.today_count} transactions`} icon={IndianRupee} color="bg-primary-500" />
        <StatCard title="Monthly Revenue"  value={formatCurrency(sales?.this_month)} subtitle={`${sales?.month_count} bills`}         icon={TrendingUp}   color="bg-emerald-500" />
        <StatCard title="Total Products"   value={stock?.total_products ?? 0}        subtitle={`Stock value: ${formatCurrency(stock?.total_value)}`} icon={Package} color="bg-violet-500" />
        <StatCard title="Low Stock Alerts" value={stock?.low_stock_count ?? 0}       subtitle={`${stock?.out_of_stock_count} out of stock`} icon={AlertTriangle} color="bg-amber-500" />
      </div>

      {/* Sales Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white">Sales Analytics</h2>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            {['daily', 'monthly', 'yearly'].map(p => (
              <button key={p} onClick={() => setChartPeriod(p)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
                  chartPeriod === p
                    ? 'bg-white dark:bg-slate-600 text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData || []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
            <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
            <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} fill="url(#grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <div className="card">
          <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white mb-4">Recent Bills</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th><th>Customer</th><th>Amount</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent_bills?.map(b => (
                  <tr key={b.id}>
                    <td><span className="font-mono text-xs text-primary-600">{b.invoice_number}</span></td>
                    <td>{b.customer_name || 'Walk-in'}</td>
                    <td><span className="font-semibold">{formatCurrency(b.grand_total)}</span></td>
                    <td className="text-slate-400 text-xs">{formatDateTime(b.created_at)}</td>
                  </tr>
                ))}
                {!recent_bills?.length && (
                  <tr><td colSpan={4} className="text-center text-slate-400 py-8">No bills yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Low Stock Alerts
          </h2>
          <div className="space-y-2">
            {low_stock_products?.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <div>
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.sku}</p>
                </div>
                <div className="text-right">
                  <span className={p.quantity === 0 ? 'badge-out' : 'badge-low'}>
                    {p.quantity === 0 ? 'Out of Stock' : `${p.quantity} left`}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Min: {p.low_stock_level}</p>
                </div>
              </div>
            ))}
            {!low_stock_products?.length && (
              <p className="text-center text-slate-400 py-8">All stock levels are healthy ✓</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
