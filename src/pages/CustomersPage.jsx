/**
 * Customers Page
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api, { formatDate } from '../utils/api'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => api.get('/customers', { params: { page, page_size: 20, search: search || undefined } }).then(r => r.data),
    keepPreviousData: true,
  })

  const addMutation = useMutation({
    mutationFn: (d) => api.post('/customers', d),
    onSuccess: () => { toast.success('Customer added'); qc.invalidateQueries(['customers']); setShowModal(false); reset() },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search customers…" className="input pl-10" />
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Customer</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>GSTIN</th><th>Since</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="text-center py-10"><div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>}
              {data?.items?.map(c => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td className="font-mono text-xs">{c.gstin || '—'}</td>
                  <td className="text-slate-400 text-xs">{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {!isLoading && !data?.items?.length && (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                  <Users size={36} className="mx-auto mb-2 opacity-30" />No customers yet
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title="Add Customer" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="space-y-4">
            <div><label className="label">Name *</label><input {...register('name', { required: true })} className="input" /></div>
            <div><label className="label">Phone</label><input {...register('phone')} className="input" type="tel" /></div>
            <div><label className="label">Email</label><input {...register('email')} className="input" type="email" /></div>
            <div><label className="label">Address</label><textarea {...register('address')} className="input resize-none" rows={2} /></div>
            <div><label className="label">GSTIN</label><input {...register('gstin')} className="input" /></div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center">Add Customer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default CustomersPage

/**
 * Settings Page
 */
export function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4">Shop Information</h2>
        <div className="space-y-4">
          {[
            { label: 'Shop Name', placeholder: 'Electrical Shop' },
            { label: 'Address', placeholder: '123 Main Road, Chennai' },
            { label: 'Phone', placeholder: '+91 98765 43210' },
            { label: 'GST Number', placeholder: '33AAAAA0000A1Z5' },
          ].map(f => (
            <div key={f.label}>
              <label className="label">{f.label}</label>
              <input placeholder={f.placeholder} className="input" />
            </div>
          ))}
          <button className="btn-primary">Save Settings</button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4">Tax Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Default GST Rate (%)</label>
            <select className="input"><option>18</option><option>12</option><option>5</option><option>0</option><option>28</option></select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input"><option>INR (₹)</option><option>USD ($)</option></select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display font-bold text-lg mb-2">Database Backup</h2>
        <p className="text-slate-500 text-sm mb-4">Export a full backup of your database for safekeeping.</p>
        <div className="flex gap-3">
          <button className="btn-secondary">Export Backup</button>
          <button className="btn-secondary">Import Backup</button>
        </div>
      </div>
    </div>
  )
}
