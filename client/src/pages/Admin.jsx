import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

function Admin() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [forwardModal, setForwardModal] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [forwardMethod, setForwardMethod] = useState('email')
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0 })

  useEffect(() => {
    fetchLeads()
    fetchProviders()
  }, [token])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/providers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers || [])
      }
    } catch (error) {
      console.error('Error fetching providers:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/quotes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.status === 401) {
        logout()
        navigate('/login')
        return
      }
      const data = await response.json()
      setLeads(data.quotes || [])

      // Calculate stats
      const quotes = data.quotes || []
      const total = quotes.length
      const newCount = quotes.filter(l => l.status === 'new').length
      const accepted = quotes.filter(l => l.status === 'accepted').length
      const completed = quotes.filter(l => l.status === 'completed').length
      setStats({ total, new: newCount, accepted, completed })
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (id, status) => {
    try {
      await fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
      fetchLeads()
    } catch (error) {
      console.error('Error updating lead:', error)
    }
  }

  const handleForward = async () => {
    if (!selectedLead || !selectedProviderId) return

    try {
      await fetch(`/api/quotes/${selectedLead.id}/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerId: selectedProviderId,
          method: forwardMethod
        })
      })

      // Update status to in_review
      await updateLeadStatus(selectedLead.id, 'in_review')
      setForwardModal(false)
      setSelectedLead(null)
      setSelectedProviderId('')
    } catch (error) {
      console.error('Error forwarding lead:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700'
      case 'in_review': return 'bg-yellow-100 text-yellow-700'
      case 'accepted': return 'bg-purple-100 text-purple-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile Optimized */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link to="/" className="flex items-center gap-2">
                <LogoMark size={32} />
              </Link>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Admin</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Manage leads and track performance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-1.5 bg-gray-100 px-3 py-2 rounded-lg active:scale-95">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Site</span>
                <span className="sm:hidden">Site</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-1.5 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg active:scale-95 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Grid - Mobile Optimized */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
            <div className="text-2xl sm:text-3xl font-black text-gray-900">{stats.total}</div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium">Total</div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
            <div className="text-2xl sm:text-3xl font-black text-blue-600">{stats.new}</div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium">New</div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
            <div className="text-2xl sm:text-3xl font-black text-yellow-600">{stats.accepted}</div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium">Accepted</div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
            <div className="text-2xl sm:text-3xl font-black text-green-600">{stats.completed}</div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium">Completed</div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">All Leads</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No leads yet</p>
              <p className="text-gray-400 text-sm">Leads will appear here when customers submit the quote form</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {leads.map(lead => (
                  <div key={lead.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.address}</div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium">
                        {lead.service_name || lead.service}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm mb-3">
                      <a href={`tel:${lead.phone}`} className="text-blue-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {lead.phone}
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedLead(lead)
                          setForwardModal(true)
                        }}
                        className="flex-1 bg-orange-500 text-white py-2 px-3 rounded-lg text-sm font-semibold active:scale-[0.98]"
                      >
                        Forward Lead
                      </button>
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white"
                      >
                        <option value="new">New</option>
                        <option value="in_review">In Review</option>
                        <option value="accepted">Accepted</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
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
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium">
                            {lead.service_name || lead.service}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{lead.phone}</div>
                          <div className="text-sm text-gray-500">{lead.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(lead.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedLead(lead)
                                setForwardModal(true)
                              }}
                              className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                            >
                              Forward
                            </button>
                            <select
                              value={lead.status}
                              onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
                            >
                              <option value="new">New</option>
                              <option value="in_review">In Review</option>
                              <option value="accepted">Accepted</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Forward Modal - Mobile Optimized */}
      {forwardModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setForwardModal(false)} />
          <div className="relative bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Forward Lead</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Send to a service provider</p>
              </div>
              <button
                onClick={() => setForwardModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Lead Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="font-semibold text-gray-900">{selectedLead.name}</div>
                <div className="text-sm text-gray-600">{selectedLead.service}</div>
                <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-2">
                  <a href={`tel:${selectedLead.phone}`} className="text-blue-600">{selectedLead.phone}</a>
                  <span className="text-gray-300">|</span>
                  <span>{selectedLead.email}</span>
                </div>
              </div>

              {/* Select Provider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Provider</label>
                {providers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No providers registered. Add providers first.</p>
                ) : (
                  <select
                    value={selectedProviderId}
                    onChange={(e) => setSelectedProviderId(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-base bg-white"
                  >
                    <option value="">Choose a provider...</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} - {provider.email || provider.phone}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Send Method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Send via</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${forwardMethod === 'email' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="method"
                      value="email"
                      checked={forwardMethod === 'email'}
                      onChange={(e) => setForwardMethod(e.target.value)}
                      className="sr-only"
                    />
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Email</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${forwardMethod === 'sms' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="method"
                      value="sms"
                      checked={forwardMethod === 'sms'}
                      onChange={(e) => setForwardMethod(e.target.value)}
                      className="sr-only"
                    />
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="text-sm font-medium">SMS</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setForwardModal(false)}
                  className="flex-1 py-3.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForward}
                  disabled={!selectedProviderId}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 active:scale-[0.98]"
                >
                  Send Lead
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes slide-up {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @media (min-width: 640px) {
              @keyframes slide-up {
                from { transform: translateY(20px) scale(0.95); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
              }
            }
            .animate-slide-up { animation: slide-up 0.3s ease-out; }
          `}</style>
        </div>
      )}
    </div>
  )
}

export default Admin
