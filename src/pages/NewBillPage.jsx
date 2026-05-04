/**
 * New Bill Page - Interactive billing with live totals, GST, and PDF download
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Search, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { formatCurrency } from '../utils/api'

const GST_RATE = 18

function ProductSearch({ onSelect }) {
  const [q, setQ] = useState('')
  const { data } = useQuery({
    queryKey: ['product-search', q],
    queryFn: () => api.get('/products', { params: { search: q, page_size: 8 } }).then(r => r.data),
    enabled: q.length > 1,
  })

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search product by name or SKU…" className="input pl-9" />
      </div>
      {data?.items?.length > 0 && q.length > 1 && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl mt-1 z-30 overflow-hidden">
          {data.items.map(p => (
            <button key={p.id} type="button"
              onClick={() => { onSelect(p); setQ('') }}
              className="w-full text-left px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors"
            >
              <div>
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-slate-400">{p.sku} · {p.unit}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary-600">{formatCurrency(p.selling_price)}</p>
                <p className={`text-xs ${p.quantity < 5 ? 'text-red-500' : 'text-slate-400'}`}>Stock: {p.quantity}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewBillPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [customer, setCustomer] = useState('')
  const [discountPct, setDiscountPct] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  const addProduct = useCallback((product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        unit_price: product.selling_price,
        quantity: 1,
        discount_pct: 0,
        gst_rate: GST_RATE,
        max_qty: product.quantity,
      }]
    })
  }, [])

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: Number(value) } : item))
  }

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  // Live calculation
  const calcLine = (item) => {
    const lineTotal = item.quantity * item.unit_price
    const afterDisc = lineTotal * (1 - item.discount_pct / 100)
    const tax = afterDisc * item.gst_rate / 100
    return { afterDisc, tax, total: afterDisc + tax }
  }

  const subtotal = items.reduce((s, i) => s + calcLine(i).afterDisc, 0)
  const totalTax  = items.reduce((s, i) => s + calcLine(i).tax, 0)
  const discountAmt = subtotal * discountPct / 100
  const grandTotal  = subtotal - discountAmt + totalTax

  const createBill = useMutation({
    mutationFn: (data) => api.post('/billing', data),
    onSuccess: (res) => {
      toast.success(`Invoice ${res.data.invoice_number} created!`)
      navigate('/billing')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to create bill'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!items.length) return toast.error('Add at least one product')
    createBill.mutate({
      customer_name: customer || undefined,
      items: items.map(({ product_id, quantity, unit_price, discount_pct, gst_rate }) =>
        ({ product_id, quantity, unit_price, discount_pct, gst_rate })
      ),
      discount_pct: Number(discountPct),
      payment_method: paymentMethod,
      amount_paid: grandTotal,
      notes,
    })
  }

  return (
    <div className="max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header info */}
        <div className="card">
          <h2 className="font-display font-bold text-base mb-4">Bill Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Customer Name</label>
              <input value={customer} onChange={e => setCustomer(e.target.value)}
                placeholder="Walk-in customer" className="input" />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="label">Bill-level Discount (%)</label>
              <input type="number" value={discountPct} onChange={e => setDiscountPct(e.target.value)}
                min={0} max={100} step={0.5} className="input" />
            </div>
          </div>
        </div>

        {/* Product Search */}
        <div className="card">
          <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <Plus size={16} className="text-primary-500" /> Add Products
          </h2>
          <ProductSearch onSelect={addProduct} />
        </div>

        {/* Items Table */}
        {items.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th className="min-w-[200px]">Product</th>
                    <th>Qty</th><th>Unit Price</th><th>Disc%</th>
                    <th>GST%</th><th>Tax</th><th>Total</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const { afterDisc, tax, total } = calcLine(item)
                    return (
                      <tr key={idx}>
                        <td>
                          <p className="font-semibold">{item.product_name}</p>
                          <p className="text-xs text-slate-400">{item.sku}</p>
                        </td>
                        <td>
                          <input type="number" value={item.quantity} min={1} max={item.max_qty}
                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                            className="input w-20 text-center py-1.5" />
                        </td>
                        <td>
                          <input type="number" value={item.unit_price} step={0.01} min={0}
                            onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                            className="input w-28 py-1.5" />
                        </td>
                        <td>
                          <input type="number" value={item.discount_pct} min={0} max={100}
                            onChange={e => updateItem(idx, 'discount_pct', e.target.value)}
                            className="input w-16 text-center py-1.5" />
                        </td>
                        <td>
                          <select value={item.gst_rate} onChange={e => updateItem(idx, 'gst_rate', e.target.value)}
                            className="input w-20 py-1.5">
                            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="text-slate-500 text-sm">{formatCurrency(tax)}</td>
                        <td className="font-bold text-primary-600">{formatCurrency(total)}</td>
                        <td>
                          <button type="button" onClick={() => removeItem(idx)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-slate-100 dark:border-slate-700 p-5 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discountPct > 0 && <div className="flex justify-between text-green-600"><span>Discount ({discountPct}%)</span><span>-{formatCurrency(discountAmt)}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">CGST</span><span>{formatCurrency(totalTax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">SGST</span><span>{formatCurrency(totalTax / 2)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                  <span>Grand Total</span>
                  <span className="text-primary-600">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="card">
          <label className="label">Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            className="input resize-none" rows={2} placeholder="Any notes for this bill…" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/billing')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={createBill.isPending || !items.length} className="btn-primary px-8">
            <Printer size={16} />
            {createBill.isPending ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
