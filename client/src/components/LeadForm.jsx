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
      const response = await fetch('/api/leads', {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-stone-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Get a Free Quote</h2>
              <p className="text-stone-400 text-sm mt-1">
                {service ? service.title : "We'll get back to you today"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {submitted ? (
            /* Success State */
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Got it!</h3>
              <p className="text-stone-600 mb-6">
                We'll get back to you within a few hours. If it's urgent, give us a call at (773) 555-1234.
              </p>
              <button onClick={onClose} className="w-full bg-stone-900 hover:bg-stone-800 text-white py-3 px-6 rounded-xl font-bold transition-colors">
                Done
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Your Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900"
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900"
                    placeholder="(773) 555-1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900"
                    placeholder="you@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Neighborhood</label>
                <select
                  name="neighborhood"
                  required
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 bg-white"
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
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900"
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 bg-white"
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-stone-900 resize-none"
                  placeholder="Any details that would help us give you an accurate quote..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 py-4 px-6 rounded-xl font-bold text-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
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

              <p className="text-xs text-stone-500 text-center pt-2">
                We respect your privacy. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}

export default LeadForm
