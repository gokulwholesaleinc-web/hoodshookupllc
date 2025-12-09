import { useState } from 'react'
import { Link } from 'react-router-dom'
import LeadForm from './components/LeadForm'
import Logo, { LogoMark } from './components/Logo'

const services = [
  { id: 1, title: 'Muffler & Exhaust', icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12' },
  { id: 2, title: 'Junk Removal', icon: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0' },
  { id: 3, title: 'Plumbing', icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z' },
  { id: 4, title: 'Painting', icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42' },
  { id: 5, title: 'Demolition', icon: 'M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z' },
  { id: 6, title: 'Carpentry', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' },
  { id: 7, title: 'Landscaping', icon: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' },
  { id: 8, title: 'Snow Removal', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707' }
]

const neighborhoods = [
  'Rogers Park',
  'Wicker Park',
  'Lincoln Park',
  'Andersonville',
  'Edgewater',
  'Evanston',
  'Skokie',
  'Niles'
]

function App() {
  const [showForm, setShowForm] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleServiceClick = (service) => {
    setSelectedService(service)
    setShowForm(true)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header - Mobile Optimized */}
      <header className="bg-stone-900 text-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark size={36} />
            <div className="hidden xs:block">
              <div className="font-bold text-base leading-tight">Hoods Hookups</div>
              <div className="text-stone-400 text-[10px]">Chicago's North Side</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+17735551234" className="flex items-center gap-2 text-stone-300 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="font-medium">(773) 555-1234</span>
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="bg-amber-500 hover:bg-amber-400 text-stone-900 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Free Quote
            </button>
          </div>

          {/* Mobile Buttons */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href="tel:+17735551234"
              className="w-10 h-10 flex items-center justify-center bg-stone-800 rounded-lg active:bg-stone-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="bg-amber-500 hover:bg-amber-400 text-stone-900 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors active:scale-95"
            >
              Quote
            </button>
          </div>
        </div>
      </header>

      {/* Hero - Mobile Optimized */}
      <section className="bg-stone-900 text-white pb-10 pt-6 md:pb-16 md:pt-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-amber-500 font-semibold text-sm mb-2">Locally Owned & Operated</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-4">
              Your neighbors on the North Side who actually pick up the phone.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-stone-300 mb-6 leading-relaxed">
              We're Carlo and the crew from Rogers Park. Been helping folks from
              Wicker Park to Evanston with everything from busted pipes to snow-covered driveways.
            </p>

            {/* CTA Buttons - Stacked on mobile */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={() => setShowForm(true)}
                className="bg-amber-500 hover:bg-amber-400 text-stone-900 px-6 py-4 rounded-xl font-bold text-lg transition-colors active:scale-[0.98] w-full sm:w-auto"
              >
                Get a Free Quote
              </button>
              <a
                href="tel:+17735551234"
                className="bg-stone-800 hover:bg-stone-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 active:scale-[0.98] w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Us Direct
              </a>
            </div>

            {/* Neighborhoods - Scrollable on mobile */}
            <div className="overflow-x-auto -mx-4 px-4 pb-2">
              <div className="flex gap-2 min-w-max">
                {neighborhoods.map(n => (
                  <span key={n} className="bg-stone-800 text-stone-300 px-3 py-1.5 rounded-full text-sm whitespace-nowrap">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Carlo - Mobile Optimized */}
      <section className="py-8 md:py-12 px-4 border-b border-stone-200">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm border border-stone-200">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-stone-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 mb-2">Meet Carlo</h2>
                <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                  "I've lived on the North Side my whole life. Started doing odd jobs for neighbors
                  in high school, and it just grew from there. Now I've got a network of the best
                  tradespeople in Chicago. When you call us, you're getting me or someone from my team
                  who knows these streets."
                </p>
                <p className="text-stone-500 text-sm mt-2">- Carlo Hood, Founder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services - Mobile Grid */}
      <section id="services" className="py-8 md:py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mb-1">What We Can Help With</h2>
            <p className="text-stone-600 text-sm sm:text-base">Tap any service to get a free quote.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {services.map(service => (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className="bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-xl p-3 sm:p-4 text-left transition-all group active:scale-[0.98]"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-stone-400 group-hover:text-amber-600 mb-1.5 sm:mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={service.icon} />
                </svg>
                <div className="font-semibold text-stone-900 text-xs sm:text-sm leading-tight">{service.title}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - Mobile Optimized */}
      <section className="py-8 md:py-12 px-4 bg-white border-y border-stone-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mb-6">How It Works</h2>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { step: '1', title: 'Tell us what you need', desc: 'Fill out the form or give us a call. Takes 30 seconds.' },
              { step: '2', title: 'We find the right person', desc: 'We match you with a trusted pro from our network.' },
              { step: '3', title: 'Job done right', desc: 'Quality work from people who care about their reputation.' }
            ].map((item, i) => (
              <div key={i} className="flex gap-3 sm:gap-4">
                <div className="w-10 h-10 bg-amber-500 text-stone-900 rounded-lg flex items-center justify-center font-bold flex-shrink-0 text-sm">{item.step}</div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base mb-0.5">{item.title}</h3>
                  <p className="text-stone-600 text-xs sm:text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Mobile Cards */}
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mb-6">From the Neighborhood</h2>

          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-stone-700 text-sm mb-2">"My furnace died on the coldest day of the year. Carlo had someone at my place in Andersonville within 2 hours. Saved my pipes from freezing."</p>
              <p className="text-stone-500 text-xs">- Maria K., Andersonville</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-stone-700 text-sm mb-2">"We've used them for snow removal all winter and landscaping in the summer. They just handle it. No chasing people down."</p>
              <p className="text-stone-500 text-xs">- Dave & Linda T., Evanston</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Mobile Optimized */}
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-stone-900 rounded-2xl p-6 sm:p-8 md:p-12 text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">Need something done?</h2>
            <p className="text-stone-400 text-sm sm:text-base mb-5 max-w-md mx-auto">
              Get a free quote in 30 seconds. We'll get back to you today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowForm(true)}
                className="bg-amber-500 hover:bg-amber-400 text-stone-900 px-6 py-3.5 rounded-xl font-bold transition-colors active:scale-[0.98] w-full sm:w-auto"
              >
                Get Free Quote
              </button>
              <a
                href="tel:+17735551234"
                className="bg-stone-800 hover:bg-stone-700 text-white px-6 py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                (773) 555-1234
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Mobile Optimized */}
      <footer className="bg-stone-900 text-stone-400 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <LogoMark size={28} />
              <span className="font-bold text-white text-sm">Hoods Hookups LLC</span>
            </div>
            <div className="text-xs sm:text-sm">
              <p>Serving Chicago's North Side & Suburbs</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-800 text-center text-xs text-stone-500">
            &copy; 2024 Hoods Hookups LLC. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating CTA on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-lg border-t border-stone-200 md:hidden z-30">
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 py-4 rounded-xl font-bold text-lg transition-colors active:scale-[0.98] shadow-lg shadow-amber-500/20"
        >
          Get a Free Quote
        </button>
      </div>

      {/* Bottom padding for floating CTA */}
      <div className="h-20 md:hidden" />

      {/* Lead Form Modal */}
      {showForm && (
        <LeadForm
          service={selectedService}
          onClose={() => {
            setShowForm(false)
            setSelectedService(null)
          }}
        />
      )}
    </div>
  )
}

export default App
