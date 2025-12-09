import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogoMark, Modal, StatusSelect, StatusBadge, ChatDrawer } from '../components'
import { formatDate } from '../utils'
import { useAuth } from '../context/AuthContext'

// Stats card component
const StatCard = ({ value, label, color = 'gray' }) => (
  <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
    <div className={`text-2xl sm:text-3xl font-black text-${color}-600`}>{value}</div>
    <div className="text-xs sm:text-sm text-gray-500 font-medium">{label}</div>
  </div>
)

// Lead summary component used in modals
const LeadSummary = ({ lead }) => (
  <div className="bg-gray-50 rounded-xl p-4">
    <div className="font-semibold text-gray-900">{lead.name}</div>
    <div className="text-sm text-gray-600">{lead.service_name || lead.service}</div>
    <div className="text-sm text-gray-500 mt-1">{lead.address}</div>
  </div>
)

// Form input component
const FormField = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      {label}{required && ' *'}
    </label>
    {children}
  </div>
)

function Admin() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [providers, setProviders] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [forwardModal, setForwardModal] = useState(false)
  const [priceModal, setPriceModal] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [forwardMethod, setForwardMethod] = useState('email')
  const [stats, setStats] = useState({ total: 0, new: 0, accepted: 0, completed: 0 })
  const [priceForm, setPriceForm] = useState({
    price: '', priceDescription: '', message: '', businessId: '', validUntil: ''
  })
  const [chatLead, setChatLead] = useState(null)

  useEffect(() => {
    fetchLeads()
    fetchProviders()
    fetchBusinesses()
  }, [token])

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { 'Authorization': `Bearer ${token}`, ...options.headers }
    })
    if (res.status === 401) { logout(); navigate('/login'); return null }
    return res
  }

  const fetchBusinesses = async () => {
    const res = await apiFetch('/api/businesses')
    if (res?.ok) setBusinesses((await res.json()).businesses || [])
  }

  const fetchProviders = async () => {
    const res = await apiFetch('/api/providers')
    if (res?.ok) setProviders((await res.json()).providers || [])
  }

  const fetchLeads = async () => {
    try {
      const res = await apiFetch('/api/quotes')
      if (!res) return
      const data = await res.json()
      const quotes = data.quotes || []
      setLeads(quotes)
      setStats({
        total: quotes.length,
        new: quotes.filter(l => l.status === 'new').length,
        accepted: quotes.filter(l => l.status === 'accepted').length,
        completed: quotes.filter(l => l.status === 'completed').length
      })
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (id, status) => {
    await apiFetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    fetchLeads()
  }

  const handleForward = async () => {
    if (!selectedLead || !selectedProviderId) return
    await apiFetch(`/api/quotes/${selectedLead.id}/forward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: selectedProviderId, method: forwardMethod })
    })
    await updateLeadStatus(selectedLead.id, 'in_review')
    closeModal('forward')
  }

  const handleSendPrice = async () => {
    if (!selectedLead || !priceForm.price) return
    const res = await apiFetch(`/api/quotes/${selectedLead.id}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: parseFloat(priceForm.price),
        priceDescription: priceForm.priceDescription,
        message: priceForm.message,
        businessId: priceForm.businessId || null,
        validUntil: priceForm.validUntil || null
      })
    })
    if (res?.ok) {
      closeModal('price')
      fetchLeads()
    }
  }

  const closeModal = (type) => {
    if (type === 'forward') {
      setForwardModal(false)
      setSelectedProviderId('')
    } else {
      setPriceModal(false)
      setPriceForm({ price: '', priceDescription: '', message: '', businessId: '', validUntil: '' })
    }
    setSelectedLead(null)
  }

  const openModal = (lead, type) => {
    setSelectedLead(lead)
    type === 'forward' ? setForwardModal(true) : setPriceModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/"><LogoMark size={32} /></Link>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Admin</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Manage leads</p>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              {[
                { to: '/admin/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Analytics' },
                { to: '/admin/businesses', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', label: 'Businesses' },
                { to: '/', icon: 'M10 19l-7-7m0 0l7-7m-7 7h18', label: 'Site' }
              ].map(nav => (
                <Link key={nav.to} to={nav.to} className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1.5 bg-gray-100 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={nav.icon} />
                  </svg>
                  <span className="hidden sm:inline">{nav.label}</span>
                </Link>
              ))}
              <button onClick={() => { logout(); navigate('/') }} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
          <StatCard value={stats.total} label="Total" />
          <StatCard value={stats.new} label="New" color="blue" />
          <StatCard value={stats.accepted} label="Accepted" color="yellow" />
          <StatCard value={stats.completed} label="Completed" color="green" />
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">All Leads</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No leads yet</div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-100">
                {leads.map(lead => (
                  <div key={lead.id} className="p-4">
                    <div className="flex justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.address}</div>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium">
                        {lead.service_name || lead.service}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                    </div>
                    <a href={`tel:${lead.phone}`} className="text-blue-600 text-sm mb-3 block">{lead.phone}</a>
                    <div className="flex gap-2">
                      <button onClick={() => setChatLead(lead)} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold">Chat</button>
                      <button onClick={() => openModal(lead, 'price')} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-semibold">Price</button>
                      <button onClick={() => openModal(lead, 'forward')} className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold">Fwd</button>
                    </div>
                    <StatusSelect value={lead.status} onChange={(s) => updateLeadStatus(lead.id, s)} className="w-full mt-2" />
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <table className="hidden md:table w-full">
                <thead className="bg-gray-50 text-left text-sm font-medium text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Service</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-[200px]">{lead.address}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium">
                          {lead.service_name || lead.service}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-gray-900">{lead.phone}</div>
                        <div className="text-gray-500">{lead.email}</div>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={lead.status} /></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(lead.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setChatLead(lead)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Chat</button>
                          <button onClick={() => openModal(lead, 'price')} className="text-green-600 hover:text-green-700 text-sm font-medium">Price</button>
                          <button onClick={() => openModal(lead, 'forward')} className="text-orange-600 hover:text-orange-700 text-sm font-medium">Fwd</button>
                          <StatusSelect value={lead.status} onChange={(s) => updateLeadStatus(lead.id, s)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </main>

      {/* Forward Modal */}
      <Modal isOpen={forwardModal && !!selectedLead} onClose={() => closeModal('forward')} title="Forward Lead" subtitle="Send to a service provider">
        {selectedLead && (
          <div className="space-y-4">
            <LeadSummary lead={selectedLead} />
            <FormField label="Select Provider">
              {providers.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No providers registered</p>
              ) : (
                <select value={selectedProviderId} onChange={(e) => setSelectedProviderId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
                  <option value="">Choose a provider...</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name} - {p.email || p.phone}</option>)}
                </select>
              )}
            </FormField>
            <FormField label="Send via">
              <div className="grid grid-cols-2 gap-2">
                {['email', 'sms'].map(m => (
                  <label key={m} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer ${forwardMethod === m ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <input type="radio" name="method" value={m} checked={forwardMethod === m} onChange={(e) => setForwardMethod(e.target.value)} className="sr-only" />
                    <span className="text-sm font-medium capitalize">{m}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => closeModal('forward')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold">Cancel</button>
              <button onClick={handleForward} disabled={!selectedProviderId} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-50">Send</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Price Modal */}
      <Modal isOpen={priceModal && !!selectedLead} onClose={() => closeModal('price')} title="Send Price Quote" subtitle="Send a price to the customer">
        {selectedLead && (
          <div className="space-y-4">
            <LeadSummary lead={selectedLead} />
            <FormField label="Price" required>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input type="number" value={priceForm.price} onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })} placeholder="0.00" className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20" />
              </div>
            </FormField>
            <FormField label="Price Description">
              <input type="text" value={priceForm.priceDescription} onChange={(e) => setPriceForm({ ...priceForm, priceDescription: e.target.value })} placeholder="e.g., Includes labor and materials" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20" />
            </FormField>
            <FormField label="Message to Customer">
              <textarea value={priceForm.message} onChange={(e) => setPriceForm({ ...priceForm, message: e.target.value })} placeholder="Add notes..." rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none" />
            </FormField>
            <FormField label="Assign Business (Optional)">
              <select value={priceForm.businessId} onChange={(e) => setPriceForm({ ...priceForm, businessId: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
                <option value="">No specific business</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </FormField>
            <FormField label="Quote Valid Until">
              <input type="date" value={priceForm.validUntil} onChange={(e) => setPriceForm({ ...priceForm, validUntil: e.target.value })} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20" />
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => closeModal('price')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold">Cancel</button>
              <button onClick={handleSendPrice} disabled={!priceForm.price} className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold disabled:opacity-50">Send Quote</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Chat Drawer */}
      <ChatDrawer
        quoteId={chatLead?.id}
        quoteName={chatLead ? `${chatLead.name} - ${chatLead.service_name || chatLead.service}` : ''}
        isOpen={!!chatLead}
        onClose={() => setChatLead(null)}
      />
    </div>
  )
}

export default Admin
