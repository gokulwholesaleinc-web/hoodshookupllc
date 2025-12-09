import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'

function Dashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('quotes')

  useEffect(() => {
    fetchData()
  }, [token])

  const fetchData = async () => {
    try {
      const [quotesRes, invoicesRes] = await Promise.all([
        fetch('/api/users/me/quotes', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/users/me/invoices', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (quotesRes.ok) {
        const quotesData = await quotesRes.json()
        setQuotes(quotesData.quotes || [])
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData.invoices || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700'
      case 'in_review': return 'bg-yellow-100 text-yellow-700'
      case 'accepted': return 'bg-green-100 text-green-700'
      case 'scheduled': return 'bg-purple-100 text-purple-700'
      case 'completed': return 'bg-emerald-100 text-emerald-700'
      case 'closed': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getInvoiceStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'issued': return 'bg-blue-100 text-blue-700'
      case 'paid': return 'bg-green-100 text-green-700'
      case 'void': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <LogoMark size={32} />
            </Link>
            <div>
              <h1 className="font-bold text-stone-900">My Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="text-sm text-amber-600 font-medium hover:text-amber-700"
              >
                Admin Panel
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-stone-600 hover:text-stone-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'quotes'
                ? 'bg-amber-500 text-stone-900'
                : 'bg-white text-stone-600 border border-stone-200'
            }`}
          >
            My Quotes ({quotes.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'invoices'
                ? 'bg-amber-500 text-stone-900'
                : 'bg-white text-stone-600 border border-stone-200'
            }`}
          >
            Invoices ({invoices.length})
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-stone-500">
            Loading...
          </div>
        ) : activeTab === 'quotes' ? (
          <div className="space-y-3">
            {quotes.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-stone-200">
                <p className="text-stone-500 mb-4">No quotes yet</p>
                <Link
                  to="/"
                  className="inline-block bg-amber-500 hover:bg-amber-400 text-stone-900 px-6 py-3 rounded-xl font-bold"
                >
                  Get a Quote
                </Link>
              </div>
            ) : (
              quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white rounded-xl p-4 border border-stone-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-semibold text-stone-900">
                        {quote.service_name || quote.service}
                      </div>
                      <div className="text-sm text-stone-500">{quote.address}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(quote.status)}`}>
                      {quote.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-400">{formatDate(quote.created_at)}</span>
                    {quote.message && (
                      <span className="text-stone-500 truncate max-w-[200px]">{quote.message}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-stone-200">
                <p className="text-stone-500">No invoices yet</p>
                <p className="text-sm text-stone-400 mt-1">
                  Invoices will appear here once your service is complete
                </p>
              </div>
            ) : (
              invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white rounded-xl p-4 border border-stone-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-semibold text-stone-900">
                        Invoice #{invoice.id}
                      </div>
                      <div className="text-sm text-stone-500">
                        {invoice.quote_name || 'Service'} - {invoice.quote_address || ''}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getInvoiceStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-sm">
                      {invoice.due_date ? `Due ${formatDate(invoice.due_date)}` : formatDate(invoice.created_at)}
                    </span>
                    <span className="font-bold text-stone-900">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
