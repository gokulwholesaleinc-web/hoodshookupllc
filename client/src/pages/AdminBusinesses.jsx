import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark, Modal } from '../components'
import { useAuth } from '../context/AuthContext'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const defaultHours = DAYS.map((_, i) => ({
  dayOfWeek: i, openTime: '08:00', closeTime: '17:00', isClosed: i === 0
}))

const defaultFormData = {
  name: '', description: '', categoryId: '', email: '', phone: '',
  address: '', city: '', state: 'IL', zip: '', website: '',
  serviceRadiusMiles: 25, acceptsNewLeads: true, hours: defaultHours, services: []
}

// Reusable form input
const Input = ({ label, type = 'text', value, onChange, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
      {...props}
    />
  </div>
)

function AdminBusinesses() {
  const { token } = useAuth()
  const [businesses, setBusinesses] = useState([])
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState(null)
  const [formData, setFormData] = useState(defaultFormData)
  const [error, setError] = useState(null)

  useEffect(() => { fetchData() }, [token])

  const apiFetch = async (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers }
    })
  }

  const fetchData = async () => {
    try {
      const [bizRes, catRes, svcRes] = await Promise.all([
        apiFetch('/api/businesses?active=true'),
        apiFetch('/api/business-categories'),
        apiFetch('/api/services')
      ])
      if (bizRes.ok) setBusinesses((await bizRes.json()).businesses || [])
      if (catRes.ok) setCategories((await catRes.json()).categories || [])
      if (svcRes.ok) setServices((await svcRes.json()).services || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const url = editingBusiness ? `/api/businesses/${editingBusiness.id}` : '/api/businesses'
      const res = await apiFetch(url, {
        method: editingBusiness ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        closeForm()
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save business')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingBusiness(null)
    setFormData(defaultFormData)
    setError(null)
  }

  const editBusiness = async (business) => {
    try {
      const res = await apiFetch(`/api/businesses/${business.id}`)
      if (res.ok) {
        const data = await res.json()
        const b = data.business
        setFormData({
          name: b.name || '', description: b.description || '',
          categoryId: b.category_id || '', email: b.email || '',
          phone: b.phone || '', address: b.address || '',
          city: b.city || '', state: b.state || 'IL', zip: b.zip || '',
          website: b.website || '', serviceRadiusMiles: b.service_radius_miles || 25,
          acceptsNewLeads: b.accepts_new_leads !== false,
          hours: data.hours?.length > 0
            ? data.hours.map(h => ({
                dayOfWeek: h.day_of_week,
                openTime: h.open_time?.slice(0, 5) || '08:00',
                closeTime: h.close_time?.slice(0, 5) || '17:00',
                isClosed: h.is_closed
              }))
            : defaultHours,
          services: data.services?.map(s => ({ serviceId: s.service_id, basePrice: s.base_price })) || []
        })
        setEditingBusiness(business)
        setShowForm(true)
      }
    } catch (err) {
      console.error('Error loading business:', err)
    }
  }

  const toggleActive = async (id, active) => {
    await apiFetch(`/api/businesses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active })
    })
    fetchData()
  }

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))
  const updateHour = (i, field, value) => {
    const hours = [...formData.hours]
    hours[i] = { ...hours[i], [field]: value }
    setFormData(prev => ({ ...prev, hours }))
  }
  const toggleService = (id) => {
    const exists = formData.services.find(s => s.serviceId === id)
    const services = exists
      ? formData.services.filter(s => s.serviceId !== id)
      : [...formData.services, { serviceId: id, basePrice: null }]
    setFormData(prev => ({ ...prev, services }))
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><LogoMark size={32} /></Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900">Business Directory</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Manage service providers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="text-gray-600 bg-gray-100 px-3 py-2 rounded-lg text-sm">
              Back
            </Link>
            <button onClick={() => { setFormData(defaultFormData); setShowForm(true) }} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">
              + Add
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {businesses.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No businesses yet. Add your first one.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {businesses.map(b => (
                <div key={b.id} className="p-4 sm:p-6 hover:bg-gray-50 flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{b.name}</h3>
                    <p className="text-sm text-gray-500">{b.category_name}</p>
                    <p className="text-sm text-gray-400 mt-1">{b.city}, {b.state}</p>
                    {b.phone && <p className="text-sm text-blue-600 mt-1">{b.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editBusiness(b)} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm">Edit</button>
                    <button onClick={() => toggleActive(b.id, b.active)} className={`px-3 py-1.5 rounded-lg text-sm ${b.active ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                      {b.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Business Form Modal */}
      <Modal isOpen={showForm} onClose={closeForm} title={editingBusiness ? 'Edit Business' : 'Add Business'} maxWidth="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          {/* Basic Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Business Name *" required value={formData.name} onChange={v => updateField('name', v)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={formData.categoryId} onChange={e => updateField('categoryId', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200">
                <option value="">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Phone" type="tel" value={formData.phone} onChange={v => updateField('phone', v)} />
            <Input label="Email" type="email" value={formData.email} onChange={v => updateField('email', v)} />
            <Input label="Website" type="url" value={formData.website} onChange={v => updateField('website', v)} />
          </div>

          {/* Address */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Input placeholder="Street" value={formData.address} onChange={v => updateField('address', v)} /></div>
              <Input placeholder="City" value={formData.city} onChange={v => updateField('city', v)} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="State" value={formData.state} onChange={v => updateField('state', v)} />
                <Input placeholder="ZIP" value={formData.zip} onChange={v => updateField('zip', v)} />
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Hours</h4>
            <div className="space-y-2">
              {DAYS.map((day, i) => (
                <div key={i} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-24">
                    <input type="checkbox" checked={!formData.hours[i]?.isClosed} onChange={e => updateHour(i, 'isClosed', !e.target.checked)} className="rounded text-orange-500" />
                    <span className="text-sm">{day.slice(0, 3)}</span>
                  </label>
                  {!formData.hours[i]?.isClosed && (
                    <>
                      <input type="time" value={formData.hours[i]?.openTime || '08:00'} onChange={e => updateHour(i, 'openTime', e.target.value)} className="px-2 py-1 rounded border text-sm" />
                      <span className="text-gray-400">to</span>
                      <input type="time" value={formData.hours[i]?.closeTime || '17:00'} onChange={e => updateHour(i, 'closeTime', e.target.value)} className="px-2 py-1 rounded border text-sm" />
                    </>
                  )}
                  {formData.hours[i]?.isClosed && <span className="text-sm text-gray-400">Closed</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Services</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {services.map(s => (
                <label key={s.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${formData.services.find(x => x.serviceId === s.id) ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={!!formData.services.find(x => x.serviceId === s.id)} onChange={() => toggleService(s.id)} className="rounded text-orange-500" />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.acceptsNewLeads} onChange={e => updateField('acceptsNewLeads', e.target.checked)} className="rounded text-orange-500" />
              <span className="text-sm">Accepts leads</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm">Radius:</span>
              <input type="number" value={formData.serviceRadiusMiles} onChange={e => updateField('serviceRadiusMiles', parseInt(e.target.value))} className="w-16 px-2 py-1 rounded border text-sm" />
              <span className="text-sm text-gray-500">mi</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={closeForm} className="flex-1 py-3 rounded-xl border text-gray-700 font-semibold">Cancel</button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold">{editingBusiness ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AdminBusinesses
