import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo'

function Admin() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [forwardModal, setForwardModal] = useState(false)
  const [forwardData, setForwardData] = useState({ method: 'email', contact: '' })
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0 })

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads')
      const data = await response.json()
      setLeads(data.leads || [])

      // Calculate stats
      const total = data.leads?.length || 0
      const newCount = data.leads?.filter(l => l.status === 'new').length || 0
      const contacted = data.leads?.filter(l => l.status === 'contacted').length || 0
      const converted = data.leads?.filter(l => l.status === 'converted').length || 0
      setStats({ total, new: newCount, contacted, converted })
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (id, status) => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      fetchLeads()
    } catch (error) {
      console.error('Error updating lead:', error)
    }
  }

  const handleForward = async () => {
    if (!selectedLead || !forwardData.contact) return

    try {
      await fetch('/api/leads/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          method: forwardData.method,
          contact: forwardData.contact
        })
      })

      // Update status to contacted
      await updateLeadStatus(selectedLead.id, 'contacted')
      setForwardModal(false)
      setSelectedLead(null)
      setForwardData({ method: 'email', contact: '' })
    } catch (error) {
      console.error('Error forwarding lead:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700'
      case 'contacted': return 'bg-yellow-100 text-yellow-700'
      case 'converted': return 'bg-green-100 text-green-700'
      case 'closed': return 'bg-gray-100 text-gray-700'
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <LogoMark size={40} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage leads and track performance</p>
              </div>
            </div>
            <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Site
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-black text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500 font-medium">Total Leads</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-black text-blue-600">{stats.new}</div>
            <div className="text-sm text-gray-500 font-medium">New</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-black text-yellow-600">{stats.contacted}</div>
            <div className="text-sm text-gray-500 font-medium">Contacted</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-black text-green-600">{stats.converted}</div>
            <div className="text-sm text-gray-500 font-medium">Converted</div>
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
            <div className="overflow-x-auto">
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
                          {lead.service}
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
                        {formatDate(lead.createdAt)}
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
                            <option value="contacted">Contacted</option>
                            <option value="converted">Converted</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Forward Modal */}
      {forwardModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setForwardModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Forward Lead</h3>
            <p className="text-gray-600 text-sm mb-6">
              Send lead details to a service provider
            </p>

            {/* Lead Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="font-medium text-gray-900">{selectedLead.name}</div>
              <div className="text-sm text-gray-600">{selectedLead.service}</div>
              <div className="text-sm text-gray-500 mt-1">{selectedLead.phone} | {selectedLead.email}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Send via</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="method"
                      value="email"
                      checked={forwardData.method === 'email'}
                      onChange={(e) => setForwardData({ ...forwardData, method: e.target.value })}
                      className="text-orange-500"
                    />
                    <span className="text-sm text-gray-700">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="method"
                      value="sms"
                      checked={forwardData.method === 'sms'}
                      onChange={(e) => setForwardData({ ...forwardData, method: e.target.value })}
                      className="text-orange-500"
                    />
                    <span className="text-sm text-gray-700">SMS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {forwardData.method === 'email' ? 'Provider Email' : 'Provider Phone'}
                </label>
                <input
                  type={forwardData.method === 'email' ? 'email' : 'tel'}
                  value={forwardData.contact}
                  onChange={(e) => setForwardData({ ...forwardData, contact: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  placeholder={forwardData.method === 'email' ? 'provider@example.com' : '(555) 123-4567'}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setForwardModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForward}
                disabled={!forwardData.contact}
                className="flex-1 py-3 px-4 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                Send Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
