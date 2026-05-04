/**
 * Billing Page - Invoice history with search, filter, PDF download
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Download, XCircle, Receipt, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { formatCurrency, formatDateTime } from '../utils/api'
import clsx from 'clsx'

const statusColors = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  draft:     'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

export default function BillingPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['bills', page, search],
    queryFn: () => api.get('/billing', { params: { page, page_size: 20, search: search || undefined } }).then(r => r.data),
    keepPreviousData: true,
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/billing/${id}/cancel`),
    onSuccess: () => { toast.success('Bill cancelled'); qc.invalidateQueries(['bills']) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const downloadPDF = async (bill) => {
    try {
      const res = await api.get(`/billing/${bill.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `${bill.invoice_number}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF generation failed')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search invoice number, customer…" className="input pl-10" />
        </div>
        <Link to="/billing/new" className="btn-primary">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Invoice</th><th>Customer</th><th>Items</th>
                <th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-10">
                  <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
                </td></tr>
              )}
              {data?.items?.map(b => (
                <tr key={b.id}>
                  <td><span className="font-mono text-xs font-semibold text-primary-600">{b.invoice_number}</span></td>
                  <td>{b.customer_name || (b.customer?.name) || <span className="text-slate-400 italic">Walk-in</span>}</td>
                  <td className="text-slate-500">{b.items?.length} items</td>
                  <td><span className="font-bold">{formatCurrency(b.grand_total)}</span></td>
                  <td className="capitalize text-slate-500 text-xs">{b.payment_method?.replace('_', ' ')}</td>
                  <td>
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', statusColors[b.status])}>
                      {b.status}
                    </span>
                  </td>
                  <td className="text-slate-400 text-xs whitespace-nowrap">{formatDateTime(b.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => downloadPDF(b)} title="Download PDF"
                        className="p-1.5 text-slate-400 hover:text-primary-500 transition-colors">
                        <Download size={15} />
                      </button>
                      {b.status === 'completed' && (
                        <button onClick={() => { if (confirm('Cancel this bill?')) cancelMutation.mutate(b.id) }}
                          title="Cancel Bill"
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.items?.length && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  <Receipt size={36} className="mx-auto mb-2 opacity-30" />
                  No invoices yet. <Link to="/billing/new" className="text-primary-500 underline">Create one</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-400">Total: {data.total} invoices</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">Prev</button>
              <span className="btn-secondary py-1.5 px-3 text-sm">{page}/{data.total_pages}</span>
              <button disabled={page === data.total_pages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
