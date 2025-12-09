import { useState } from 'react'

const services = [
  'Muffler & Exhaust',
  'Junk Removal',
  'Plumbing',
  'Painting',
  'Demolition',
  'Carpentry',
  'Landscaping',
  'Snow Removal',
  'Other'
]

const neighborhoods = [
  'Rogers Park',
  'Wicker Park',
  'Lincoln Park',
  'Andersonville',
  'Edgewater',
  'Evanston',
  'Skokie',
  'Niles',
  'Other'
]

function LeadForm({ service, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    neighborhood: '',
    address: '',
    service: service?.title || '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Full screen on mobile, centered on desktop */}
      <div className="relative bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-stone-900 px-4 sm:px-6 py-4 sm:py-5 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Get a Free Quote</h2>
              <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
                {service ? service.title : "We'll get back to you today"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors active:scale-95"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-72px)] sm:max-h-[calc(90vh-80px)] overscroll-contain">
          {submitted ? (
            /* Success State */
            <div className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900 mb-2">Got it!</h3>
              <p className="text-stone-600 text-sm sm:text-base mb-6">
                We'll get back to you within a few hours. If it's urgent, give us a call at (773) 555-1234.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white py-4 px-6 rounded-xl font-bold transition-colors active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Your Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 text-base"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 text-base"
                  placeholder="(773) 555-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 text-base"
                  placeholder="you@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Neighborhood</label>
                <select
                  name="neighborhood"
                  required
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 bg-white text-base appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a8a29e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                >
                  <option value="">Select your area...</option>
                  {neighborhoods.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Address</label>
                <input
                  type="text"
                  name="address"
                  required
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 text-base"
                  placeholder="123 N Clark St"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">What do you need?</label>
                <select
                  name="service"
                  required
                  value={formData.service}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 bg-white text-base appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a8a29e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                >
                  <option value="">Select a service...</option>
                  {services.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Tell us more (optional)</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 resize-none text-base"
                  placeholder="Any details that would help..."
                />
              </div>

              {/* Sticky submit button on mobile */}
              <div className="sticky bottom-0 bg-white pt-3 pb-1 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-stone-100 sm:border-0 sm:static sm:pt-2 sm:pb-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 py-4 px-6 rounded-xl font-bold text-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Request'
                  )}
                </button>

                <p className="text-xs text-stone-500 text-center pt-3 pb-2">
                  We respect your privacy. No spam, ever.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @media (min-width: 640px) {
          @keyframes slide-up {
            from {
              transform: translateY(20px) scale(0.95);
              opacity: 0;
            }
            to {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default LeadForm
