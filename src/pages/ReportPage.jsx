/**
 * Reports Page - Sales analytics, date filtering, CSV export
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Download, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { formatCurrency } from '../utils/api'

export default function ReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: summary } = useQuery({
    queryKey: ['report-summary', from, to],
    queryFn: () => api.get('/reports/summary', { params: { date_from: from || undefined, date_to: to || undefined } }).then(r => r.data),
  })

  const { data: chartData } = useQuery({
    queryKey: ['sales-chart-monthly'],
    queryFn: () => api.get('/dashboard/sales-chart?period=monthly').then(r => r.data),
  })

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/reports/export/csv', {
        params: { date_from: from || undefined, date_to: to || undefined },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = 'sales_report.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Export failed') }
  }

  const pieData = [
    { name: 'Revenue', value: summary?.total_revenue || 0, color: '#2563eb' },
    { name: 'Tax',     value: summary?.total_tax || 0,     color: '#10b981' },
    { name: 'Discount',value: summary?.total_discount || 0,color: '#f59e0b' },
  ]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">From Date</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">To Date</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" />
          </div>
          <button onClick={handleExportCSV} className="btn-secondary gap-2">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(summary?.total_revenue), color: 'text-primary-600' },
          { label: 'Total Tax (GST)', value: formatCurrency(summary?.total_tax), color: 'text-emerald-600' },
          { label: 'Total Discounts', value: formatCurrency(summary?.total_discount), color: 'text-amber-600' },
          { label: 'Total Invoices', value: summary?.total_bills ?? '—', color: 'text-slate-700' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-slate-500 text-sm">{s.label}</p>
            <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <div className="card xl:col-span-2">
          <h2 className="font-display font-bold text-lg mb-5 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-500" /> Monthly Revenue (Last 12 Months)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
              <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h2 className="font-display font-bold text-lg mb-5">Revenue Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-semibold">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
