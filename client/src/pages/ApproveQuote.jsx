import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

function ApproveQuote() {
  const { responseId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [quoteResponse, setQuoteResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchQuoteResponse()
  }, [responseId])

  const fetchQuoteResponse = async () => {
    try {
      const response = await fetch(`/api/approve/${responseId}`)
      if (response.ok) {
        const data = await response.json()
        setQuoteResponse(data.quoteResponse)
      } else {
        setError('Quote not found or has expired')
      }
    } catch (err) {
      setError('Failed to load quote details')
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (status) => {
    if (!token) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/approve/${responseId}`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/quote-responses/${responseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        if (status === 'approved') {
          setSuccess('approved')
          // Redirect to scheduling page after a delay
          setTimeout(() => {
            navigate(`/schedule/${responseId}`)
          }, 2000)
        } else {
          setSuccess('rejected')
        }
      } else {
        setError('Failed to submit response. Please try again.')
      }
    } catch (err) {
      setError('Failed to submit response. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-500">Loading quote details...</div>
      </div>
    )
  }

  if (error && !quoteResponse) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Quote Not Found</h1>
          <p className="text-stone-500">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className={`w-16 h-16 ${success === 'approved' ? 'bg-green-100' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {success === 'approved' ? (
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">
            {success === 'approved' ? 'Quote Approved!' : 'Quote Declined'}
          </h1>
          <p className="text-stone-500">
            {success === 'approved'
              ? "Great! Redirecting you to schedule your appointment..."
              : "Thanks for letting us know. Feel free to request another quote anytime."}
          </p>
        </div>
      </div>
    )
  }

  const alreadyResponded = quoteResponse?.status !== 'pending'

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-stone-900 text-white py-4 px-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <LogoMark size={32} />
          <div>
            <div className="font-bold">Hoods Hookups</div>
            <div className="text-stone-400 text-xs">Quote Approval</div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 py-8">
        {alreadyResponded ? (
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-stone-900 mb-2">Already Responded</h1>
            <p className="text-stone-500">
              This quote has already been {quoteResponse.status}.
              {quoteResponse.status === 'approved' && (
                <button
                  onClick={() => navigate(`/schedule/${responseId}`)}
                  className="block w-full mt-4 bg-orange-500 text-white py-3 rounded-xl font-semibold"
                >
                  Schedule Appointment
                </button>
              )}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Quote Details */}
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-xl font-bold text-stone-900 mb-1">Your Quote is Ready</h1>
              <p className="text-stone-500 text-sm">Review the details below and approve to schedule your service.</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Service */}
              <div className="bg-orange-50 rounded-xl p-4">
                <div className="text-sm text-orange-600 font-medium">Service</div>
                <div className="text-lg font-bold text-stone-900">{quoteResponse.service_name}</div>
              </div>

              {/* Price */}
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-sm text-green-600 font-medium">Quote Price</div>
                <div className="text-3xl font-black text-green-700">${quoteResponse.price}</div>
                {quoteResponse.price_description && (
                  <div className="text-sm text-green-600 mt-1">{quoteResponse.price_description}</div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Address</span>
                  <span className="text-stone-900 font-medium">{quoteResponse.address}</span>
                </div>
                {quoteResponse.business_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Provider</span>
                    <span className="text-stone-900 font-medium">{quoteResponse.business_name}</span>
                  </div>
                )}
                {quoteResponse.valid_until && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Valid Until</span>
                    <span className="text-stone-900 font-medium">
                      {new Date(quoteResponse.valid_until).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Message */}
              {quoteResponse.message && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm text-gray-600 font-medium mb-1">Message from provider</div>
                  <p className="text-stone-700 text-sm">{quoteResponse.message}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
              <button
                onClick={() => handleResponse('approved')}
                disabled={submitting}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Approve & Schedule'}
              </button>
              <button
                onClick={() => handleResponse('rejected')}
                disabled={submitting}
                className="w-full bg-white hover:bg-gray-100 text-stone-600 py-3 rounded-xl font-semibold border border-gray-200 transition-colors disabled:opacity-50"
              >
                Decline Quote
              </button>
              <p className="text-xs text-center text-stone-400">
                By approving, you agree to proceed with the service at the quoted price.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ApproveQuote
