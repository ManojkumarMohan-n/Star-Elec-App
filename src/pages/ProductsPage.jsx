/**
 * Products Page - Add, edit, delete, search products with stock tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import api, { formatCurrency } from '../utils/api'
import clsx from 'clsx'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, lowStockOnly],
    queryFn: () => api.get('/products', {
      params: { page, page_size: 20, search: search || undefined, low_stock: lowStockOnly || undefined }
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const saveMutation = useMutation({
    mutationFn: (d) => editing
      ? api.put(`/products/${editing.id}`, d)
      : api.post('/products', d),
    onSuccess: () => {
      toast.success(editing ? 'Product updated' : 'Product added')
      qc.invalidateQueries(['products'])
      setShowModal(false)
      setEditing(null)
      reset()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { toast.success('Product removed'); qc.invalidateQueries(['products']) },
  })

  const openAdd = () => { setEditing(null); reset({}); setShowModal(true) }
  const openEdit = (p) => { setEditing(p); reset(p); setShowModal(true) }

  const onSubmit = (d) => saveMutation.mutate(d)

  const stockBadge = (p) => {
    if (p.quantity === 0) return <span className="badge-out">Out of Stock</span>
    if (p.is_low_stock)   return <span className="badge-low">Low Stock</span>
    return <span className="badge-ok">In Stock</span>
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search products, SKU, barcode…" className="input pl-10" />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)}
            className="rounded" />
          <AlertTriangle size={14} className="text-amber-500" /> Low Stock Only
        </label>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Category</th>
                <th>Price</th><th>Qty</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-10">
                  <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
                </td></tr>
              )}
              {data?.items?.map(p => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{p.name}</p>
                      {p.supplier && <p className="text-xs text-slate-400">{p.supplier.name}</p>}
                    </div>
                  </td>
                  <td><span className="font-mono text-xs text-slate-500">{p.sku}</span></td>
                  <td>{p.category?.name || '—'}</td>
                  <td className="font-semibold">{formatCurrency(p.selling_price)}</td>
                  <td><span className={clsx('font-bold', p.quantity === 0 ? 'text-red-500' : p.is_low_stock ? 'text-amber-500' : 'text-green-600')}>{p.quantity}</span></td>
                  <td>{stockBadge(p)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-primary-500 transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p.id) }}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.items?.length && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                  <Package size={36} className="mx-auto mb-2 opacity-30" />
                  No products found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-400">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">Prev</button>
              <button disabled={page === data.total_pages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Product Name *</label>
                <input {...register('name', { required: true })} className="input" placeholder="e.g. LED Bulb 9W" />
              </div>
              <div>
                <label className="label">SKU *</label>
                <input {...register('sku', { required: true })} className="input" placeholder="e.g. LED-9W-001" />
              </div>
              <div>
                <label className="label">Barcode</label>
                <input {...register('barcode')} className="input" placeholder="Scan or type" />
              </div>
              <div>
                <label className="label">Purchase Price (₹) *</label>
                <input {...register('purchase_price', { required: true, valueAsNumber: true })} type="number" step="0.01" className="input" />
              </div>
              <div>
                <label className="label">Selling Price (₹) *</label>
                <input {...register('selling_price', { required: true, valueAsNumber: true })} type="number" step="0.01" className="input" />
              </div>
              <div>
                <label className="label">Quantity</label>
                <input {...register('quantity', { valueAsNumber: true })} type="number" className="input" defaultValue={0} />
              </div>
              <div>
                <label className="label">Low Stock Alert At</label>
                <input {...register('low_stock_level', { valueAsNumber: true })} type="number" className="input" defaultValue={10} />
              </div>
              <div>
                <label className="label">Unit</label>
                <select {...register('unit')} className="input">
                  <option value="piece">Piece</option>
                  <option value="meter">Meter</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="roll">Roll</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea {...register('description')} className="input resize-none" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">
                {saveMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
