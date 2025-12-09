import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function AdminBusinesses() {
  const { token } = useAuth()
  const [businesses, setBusinesses] = useState([])
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState(null)
  const [formData, setFormData] = useState({
    name: '', description: '', categoryId: '', email: '', phone: '',
    address: '', city: '', state: 'IL', zip: '', website: '',
    serviceRadiusMiles: 25, acceptsNewLeads: true,
    hours: DAYS.map((_, i) => ({ dayOfWeek: i, openTime: '08:00', closeTime: '17:00', isClosed: i === 0 })),
    services: []
  })

  useEffect(() => {
    fetchData()
  }, [token])

  const fetchData = async () => {
    try {
      const [bizRes, catRes, svcRes] = await Promise.all([
        fetch('/api/businesses?active=true', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/business-categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } })
      ])

      if (bizRes.ok) setBusinesses((await bizRes.json()).businesses || [])
      if (catRes.ok) setCategories((await catRes.json()).categories || [])
      if (svcRes.ok) setServices((await svcRes.json()).services || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingBusiness ? `/api/businesses/${editingBusiness.id}` : '/api/businesses'
      const method = editingBusiness ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowForm(false)
        setEditingBusiness(null)
        resetForm()
        fetchData()
      }
    } catch (error) {
      console.error('Error saving business:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '', description: '', categoryId: '', email: '', phone: '',
      address: '', city: '', state: 'IL', zip: '', website: '',
      serviceRadiusMiles: 25, acceptsNewLeads: true,
      hours: DAYS.map((_, i) => ({ dayOfWeek: i, openTime: '08:00', closeTime: '17:00', isClosed: i === 0 })),
      services: []
    })
  }

  const editBusiness = async (business) => {
    try {
      const response = await fetch(`/api/businesses/${business.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFormData({
          name: data.business.name || '',
          description: data.business.description || '',
          categoryId: data.business.category_id || '',
          email: data.business.email || '',
          phone: data.business.phone || '',
          address: data.business.address || '',
          city: data.business.city || '',
          state: data.business.state || 'IL',
          zip: data.business.zip || '',
          website: data.business.website || '',
          serviceRadiusMiles: data.business.service_radius_miles || 25,
          acceptsNewLeads: data.business.accepts_new_leads !== false,
          hours: data.hours.length > 0
            ? data.hours.map(h => ({
                dayOfWeek: h.day_of_week,
                openTime: h.open_time?.slice(0, 5) || '08:00',
                closeTime: h.close_time?.slice(0, 5) || '17:00',
                isClosed: h.is_closed
              }))
            : DAYS.map((_, i) => ({ dayOfWeek: i, openTime: '08:00', closeTime: '17:00', isClosed: i === 0 })),
          services: data.services.map(s => ({ serviceId: s.service_id, basePrice: s.base_price }))
        })
        setEditingBusiness(business)
        setShowForm(true)
      }
    } catch (error) {
      console.error('Error loading business:', error)
    }
  }

  const toggleBusinessActive = async (id, currentActive) => {
    try {
      await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !currentActive })
      })
      fetchData()
    } catch (error) {
      console.error('Error toggling business:', error)
    }
  }

  const updateHour = (dayIndex, field, value) => {
    const newHours = [...formData.hours]
    newHours[dayIndex] = { ...newHours[dayIndex], [field]: value }
    setFormData({ ...formData, hours: newHours })
  }

  const toggleService = (serviceId) => {
    const exists = formData.services.find(s => s.serviceId === serviceId)
    if (exists) {
      setFormData({ ...formData, services: formData.services.filter(s => s.serviceId !== serviceId) })
    } else {
      setFormData({ ...formData, services: [...formData.services, { serviceId, basePrice: null }] })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link to="/" className="flex items-center gap-2">
                <LogoMark size={32} />
              </Link>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Business Directory</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Manage service providers</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-1.5 bg-gray-100 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Admin</span>
              </Link>
              <button
                onClick={() => { resetForm(); setEditingBusiness(null); setShowForm(true) }}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-600"
              >
                + Add Business
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Business List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {businesses.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No businesses yet. Add your first service provider.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {businesses.map(business => (
                <div key={business.id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{business.name}</h3>
                      <p className="text-sm text-gray-500">{business.category_name}</p>
                      <p className="text-sm text-gray-400 mt-1">{business.city}, {business.state}</p>
                      {business.phone && <p className="text-sm text-blue-600 mt-1">{business.phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editBusiness(business)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1.5 bg-blue-50 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleBusinessActive(business.id, business.active)}
                        className={`font-medium text-sm px-3 py-1.5 rounded-lg ${
                          business.active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {business.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Business Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 sm:p-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingBusiness ? 'Edit Business' : 'Add New Business'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="ZIP"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Business Hours</h4>
                <div className="space-y-2">
                  {DAYS.map((day, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 w-28">
                        <input
                          type="checkbox"
                          checked={!formData.hours[i]?.isClosed}
                          onChange={(e) => updateHour(i, 'isClosed', !e.target.checked)}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{day.slice(0, 3)}</span>
                      </label>
                      {!formData.hours[i]?.isClosed && (
                        <>
                          <input
                            type="time"
                            value={formData.hours[i]?.openTime || '08:00'}
                            onChange={(e) => updateHour(i, 'openTime', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="time"
                            value={formData.hours[i]?.closeTime || '17:00'}
                            onChange={(e) => updateHour(i, 'closeTime', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                          />
                        </>
                      )}
                      {formData.hours[i]?.isClosed && (
                        <span className="text-sm text-gray-400">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Services Offered */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Services Offered</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {services.map(service => (
                    <label
                      key={service.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.services.find(s => s.serviceId === service.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!formData.services.find(s => s.serviceId === service.id)}
                        onChange={() => toggleService(service.id)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.acceptsNewLeads}
                    onChange={(e) => setFormData({ ...formData, acceptsNewLeads: e.target.checked })}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Accepts new leads</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Service radius:</label>
                  <input
                    type="number"
                    value={formData.serviceRadiusMiles}
                    onChange={(e) => setFormData({ ...formData, serviceRadiusMiles: parseInt(e.target.value) })}
                    className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                  <span className="text-sm text-gray-500">miles</span>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600"
                >
                  {editingBusiness ? 'Save Changes' : 'Add Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBusinesses
