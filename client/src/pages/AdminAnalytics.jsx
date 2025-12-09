import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

function AdminAnalytics() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [quoteStats, setQuoteStats] = useState(null)
  const [revenueStats, setRevenueStats] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [token])

  const fetchAnalytics = async () => {
    try {
      const [dashboardRes, quotesRes, revenueRes] = await Promise.all([
        fetch('/api/admin/analytics/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics/quotes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics/revenue', { headers: { Authorization: `Bearer ${token}` } })
      ])

      if (dashboardRes.ok) setDashboard(await dashboardRes.json())
      if (quotesRes.ok) setQuoteStats(await quotesRes.json())
      if (revenueRes.ok) setRevenueStats(await revenueRes.json())
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (type) => {
    try {
      const response = await fetch(`/api/admin/export/${type}?format=csv`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading analytics...</div>
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
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Analytics</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Business insights and metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-1.5 bg-gray-100 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Admin</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['overview', 'quotes', 'revenue', 'export'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboard && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-black text-gray-900">{dashboard.quotes?.total || 0}</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">Total Quotes</div>
                <div className="text-xs text-blue-600 mt-1">{dashboard.quotes?.today || 0} today</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-black text-blue-600">{dashboard.quotes?.new || 0}</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">New Leads</div>
                <div className="text-xs text-gray-400 mt-1">{dashboard.quotes?.thisWeek || 0} this week</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-black text-green-600">{dashboard.appointments?.upcoming || 0}</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">Upcoming Appts</div>
                <div className="text-xs text-gray-400 mt-1">{dashboard.appointments?.today || 0} today</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-black text-purple-600">${dashboard.revenue?.last30Days || '0.00'}</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">Revenue (30d)</div>
                <div className="text-xs text-gray-400 mt-1">${dashboard.revenue?.totalApproved || '0.00'} total</div>
              </div>
            </div>

            {/* Notifications Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4">Notification Status</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{dashboard.notifications?.total || 0}</div>
                  <div className="text-xs text-gray-500">Total Sent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{dashboard.notifications?.today || 0}</div>
                  <div className="text-xs text-gray-500">Today</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{dashboard.notifications?.failed || 0}</div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quotes Tab */}
        {activeTab === 'quotes' && quoteStats && (
          <div className="space-y-6">
            {/* Conversion Funnel */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4">Conversion Funnel</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Quotes', value: quoteStats.stats?.funnel?.totalQuotes || 0, color: 'bg-gray-200' },
                  { label: 'Responded', value: quoteStats.stats?.funnel?.responded || 0, color: 'bg-blue-200' },
                  { label: 'Accepted', value: quoteStats.stats?.funnel?.accepted || 0, color: 'bg-yellow-200' },
                  { label: 'Scheduled', value: quoteStats.stats?.funnel?.scheduled || 0, color: 'bg-purple-200' },
                  { label: 'Completed', value: quoteStats.stats?.funnel?.completed || 0, color: 'bg-green-200' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-gray-600">{item.label}</div>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all`}
                        style={{ width: `${quoteStats.stats?.funnel?.totalQuotes ? (item.value / quoteStats.stats.funnel.totalQuotes * 100) : 0}%` }}
                      />
                    </div>
                    <div className="w-12 text-sm font-semibold text-gray-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Rates */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4">Conversion Rates</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { label: 'Response', value: quoteStats.stats?.conversionRates?.responseRate },
                  { label: 'Acceptance', value: quoteStats.stats?.conversionRates?.acceptanceRate },
                  { label: 'Scheduling', value: quoteStats.stats?.conversionRates?.schedulingRate },
                  { label: 'Completion', value: quoteStats.stats?.conversionRates?.completionRate },
                  { label: 'Overall', value: quoteStats.stats?.conversionRates?.overallConversion }
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{item.value || 0}%</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Service */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4">Quotes by Service</h3>
              <div className="space-y-2">
                {(quoteStats.byService || []).slice(0, 10).map((service, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="font-medium text-gray-900">{service.serviceName}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{service.totalQuotes} quotes</span>
                      <span className="text-green-600">{service.conversionRate}% conv</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && revenueStats && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-black text-gray-900">${revenueStats.summary?.totalQuoted || '0.00'}</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">Total Quoted</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-black text-green-600">${revenueStats.summary?.approvedValue || '0.00'}</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">Approved Value</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-black text-blue-600">${revenueStats.summary?.avgPrice || '0.00'}</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">Avg Price</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-black text-purple-600">{revenueStats.summary?.approvalRate || 0}%</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">Approval Rate</div>
              </div>
            </div>

            {/* By Service */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4">Revenue by Service</h3>
              <div className="space-y-2">
                {(revenueStats.byService || []).slice(0, 10).map((service, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="font-medium text-gray-900">{service.serviceName}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{service.quoteCount} quotes</span>
                      <span className="text-green-600 font-semibold">${service.approvedValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4">Monthly Revenue</h3>
              <div className="space-y-2">
                {(revenueStats.monthly || []).map((month, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="font-medium text-gray-900">{month.month}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{month.deals} deals</span>
                      <span className="text-green-600 font-semibold">${month.revenue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4">Export Data</h3>
              <p className="text-sm text-gray-500 mb-6">Download your data as CSV files for external analysis.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => exportData('quotes')}
                  className="flex items-center justify-center gap-2 bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Quotes
                </button>
                <button
                  onClick={() => exportData('appointments')}
                  className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Appointments
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminAnalytics
